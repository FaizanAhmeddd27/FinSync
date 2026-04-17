import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EmailService } from '../services/email.service';

/**
 * NGROK INSTRUCTIONS:
 * 1. Keep your terminal running 'ngrok http 5000' (or your local port).
 * 2. If Ngrok restarts, the URL (e.g., https://ducky-garland-blunderer.ngrok-free.dev) will change.
 *    - Update the BACKEND_URL in your .env.
 *    - Go to Vapi Dashboard > Tools > transferMoney > Server URL and update it to:
 *      [YOUR_NEW_NGROK_URL]/api/vapi/webhook
 */
export const handleVapiWebhook = async (req: Request, res: Response) => {
  // Bypass Ngrok browser warning for AI agents
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('bypass-tunnel-reminder', 'true');

  try {
    // 1. Verification (Temporarily disabled for demo simplicity)
    /*
    const secret = req.headers['x-vapi-secret'];
    if (secret !== env.VAPI_SECRET_TOKEN) {
      logger.warn('Vapi Webhook: Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    */

    const { message } = req.body;

    // DEBUG: Print the exact payload from Vapi to the terminal
    console.log('--- VAPI WEBHOOK DATA ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('-------------------------');

    logger.info(`Vapi Webhook Received: ${message?.type || 'direct-tool-request'}`);

    const senderId = extractSenderId(req.body);
    const toolCalls = extractToolCalls(req.body);
    const isDirectToolRequest = !message;

    const isToolMessage =
      isDirectToolRequest ||
      message?.type === 'tool-call' ||
      message?.type === 'tool-calls';

    if (isToolMessage) {

      if (!senderId || senderId === 'guest') {
        logger.warn('Vapi transfer rejected: missing authenticated user context');
        return res.status(401).json({
          error: 'Missing authenticated user context for voice transfer',
        });
      }

      if (toolCalls.length === 0) {
        return res.status(400).json({ error: 'No tool calls provided' });
      }

      let topLevelNewBalance: number | undefined;

      const results = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          const toolName = getToolName(toolCall).toLowerCase();
          const argsRaw = getToolArgs(toolCall);
          const args = typeof argsRaw === 'string' ? safelyParseArgs(argsRaw) : argsRaw;

          if (toolName.includes('transfer') || toolName.includes('money')) {
            const amount = Number(args?.amount);
            const accountNumber = String(args?.accountNumber || '').trim();
            const sourceAccountTypeRaw =
              args?.sourceAccountType ??
              args?.accountType ??
              args?.fromAccountType ??
              args?.account ??
              args?.fromAccount;
            const sourceAccountType = sourceAccountTypeRaw
              ? String(sourceAccountTypeRaw)
              : undefined;

            try {
              const transfer = await executeVoiceTransfer(
                senderId,
                amount,
                accountNumber,
                sourceAccountType
              );

              topLevelNewBalance = transfer.newBalance;

              return {
                toolCallId: toolCall.id,
                result: `SUCCESS: Transferred ${transfer.amount.toFixed(2)} ${transfer.currency} from ${transfer.sourceAccount} (${transfer.sourceAccountType.replace('_', ' ')}) to ${transfer.recipientAccount}. New balance: ${transfer.newBalance.toFixed(2)} ${transfer.currency}`,
                success: true,
                newBalance: transfer.newBalance,
                balance: transfer.newBalance,
                currency: transfer.currency,
                referenceId: transfer.referenceId,
                sourceAccountType: transfer.sourceAccountType,
              };
            } catch (err: any) {
              const reason = err?.message || 'Transfer could not be completed';
              logger.error(`Voice transfer failed: ${reason}`);

              return {
                toolCallId: toolCall.id,
                result: `FAILED: ${reason}`,
                success: false,
                reason,
                needsSourceAccountType: reason.toLowerCase().includes('source account type'),
              };
            }
          }

          if (toolName.includes('balance')) {
            try {
              const accountTypeRaw = args?.accountType ?? args?.account;
              const accountType = accountTypeRaw ? String(accountTypeRaw) : undefined;
              const result = await getVoiceBalance(senderId, accountType);
              topLevelNewBalance = result.balance;

              return {
                toolCallId: toolCall.id,
                result: `SUCCESS: Your current balance is ${result.balance.toFixed(2)} ${result.currency}`,
                success: true,
                balance: result.balance,
                newBalance: result.balance,
                currency: result.currency,
              };
            } catch (err: any) {
              const reason = err?.message || 'Unable to fetch balance right now';
              return {
                toolCallId: toolCall.id,
                result: `FAILED: ${reason}`,
                success: false,
              };
            }
          }

          return {
            toolCallId: toolCall.id,
            result: 'FAILED: Unsupported tool name',
            success: false,
          };
        })
      );

      const responseBody: Record<string, unknown> = { results };
      if (typeof topLevelNewBalance === 'number' && Number.isFinite(topLevelNewBalance)) {
        // Expose top-level value for Vapi response variable mapping.
        responseBody.newBalance = topLevelNewBalance;
      }

      const hasFailure = results.some((r) => r?.success === false);
      const firstFailure = results.find((r) => r?.success === false);
      if (firstFailure?.reason) {
        responseBody.reason = firstFailure.reason;
      }
      if (firstFailure?.needsSourceAccountType) {
        responseBody.needsSourceAccountType = true;
      }

      if (isDirectToolRequest && results.length === 1) {
        const firstResult = results[0];
        if (hasFailure) {
          return res.status(422).json({
            success: false,
            error: firstResult.result,
            result: firstResult.result,
            reason: firstResult.reason,
            needsSourceAccountType: firstResult.needsSourceAccountType,
          });
        }

        return res.status(200).json({
          success: true,
          result: firstResult.result,
          newBalance: topLevelNewBalance,
        });
      }

      console.log('--- FINAL RESPONSE TO VAPI ---', JSON.stringify(responseBody, null, 2));
      return res.status(hasFailure ? 422 : 201).json(responseBody);
    }

    // Default response for other message types (e.g. end-of-call-report)
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Vapi Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Executes a transfer based on voice parameters
 */
async function executeVoiceTransfer(senderId: string, amount: number, accountNumber: string, accountType?: string) {
  if (!senderId || senderId === 'guest') {
    throw new Error('Missing authenticated user context');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid transfer amount');
  }

  // Normalize spoken account number fragments like "f s 86064046" and trailing punctuation.
  let cleanAccountNumber = accountNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Fix common hearing errors for the 'FS' prefix
  if (cleanAccountNumber.startsWith('FAS')) cleanAccountNumber = 'FS' + cleanAccountNumber.substring(3);
  if (cleanAccountNumber.startsWith('FSS')) cleanAccountNumber = 'FS' + cleanAccountNumber.substring(3);
  if (cleanAccountNumber.startsWith('FF')) cleanAccountNumber = 'FS' + cleanAccountNumber.substring(2);
  if (cleanAccountNumber.startsWith('F') && !cleanAccountNumber.startsWith('FS')) cleanAccountNumber = 'FS' + cleanAccountNumber.substring(1);
  if (!cleanAccountNumber.startsWith('FS') && cleanAccountNumber.length > 0) cleanAccountNumber = 'FS' + cleanAccountNumber;

  if (cleanAccountNumber.length < 4 || cleanAccountNumber.length > 20) {
    throw new Error('Invalid recipient account number');
  }

  const normalizedSourceType = normalizeSourceAccountType(accountType);
  if (!normalizedSourceType) {
    throw new Error('Please specify source account type: wallet, savings, checking, or fixed deposit');
  }

  logger.info(`TRANSFER DEBUG: Original=${accountNumber}, Cleaned=${cleanAccountNumber}`);

  // 1. Find sender account strictly for authenticated user and selected account type.
  // If multiple accounts of same type exist, use the one with highest balance.
  const { data: senderAccountList, error: senderErr } = await supabaseAdmin
    .from('accounts')
    .select('id, balance, currency, account_type, account_number, user_id')
    .eq('user_id', senderId)
    .eq('status', 'active')
    .eq('account_type', normalizedSourceType)
    .order('balance', { ascending: false })
    .limit(1);

  if (senderErr || !senderAccountList || senderAccountList.length === 0) {
    throw new Error(`No active ${normalizedSourceType.replace('_', ' ')} account found for transfer`);
  }

  const senderAccount = senderAccountList[0];

  logger.info(`ACCOUNT SELECTED: ${senderAccount.account_number} (${normalizedSourceType}) with balance=${senderAccount.balance}`);

  const currentBalance = Number(senderAccount.balance);
  const transferAmount = Number(amount);

  logger.info(`BALANCE CHECK: currentBalance=${currentBalance} (type=${typeof currentBalance}), transferAmount=${transferAmount} (type=${typeof transferAmount}), comparison: ${currentBalance} < ${transferAmount} = ${currentBalance < transferAmount}`);

  // 2. Find recipient by exact normalized account number.
  const { data: recipientAccount, error: recipientErr } = await supabaseAdmin
    .from('accounts')
    .select('id, user_id, currency, account_number')
    .eq('account_number', cleanAccountNumber)
    .eq('status', 'active')
    .single();

  if (recipientErr || !recipientAccount) {
    throw new Error('Recipient account not found or inactive');
  }

  if (recipientAccount.user_id === senderId || recipientAccount.id === senderAccount.id) {
    throw new Error('Cannot transfer to your own account');
  }

  if (currentBalance < transferAmount) {
    logger.error(`BALANCE INSUFFICIENT: ${currentBalance} < ${transferAmount}`);
    throw new Error('Insufficient balance');
  }

  // 3. Execute transfer atomically via DB RPC.
  const referenceId = `VAPI-${Date.now()}`;
  const { error: xferErr } = await supabaseAdmin.rpc('execute_transfer', {
    p_from_account_id: senderAccount.id,
    p_to_account_id: recipientAccount.id,
    p_amount: transferAmount,
    p_from_currency: senderAccount.currency,
    p_to_currency: recipientAccount.currency,
    p_exchange_rate: 1.0,
    p_converted_amount: transferAmount,
    p_note: `Voice transfer to ${cleanAccountNumber}`,
    p_reference_id: referenceId,
    p_category: 'Transfer',
  });

  if (xferErr) {
    logger.error(`RPC Transfer Error: ${xferErr.message}`);
    throw new Error(xferErr.message);
  }

  const { data: refreshedSender } = await supabaseAdmin
    .from('accounts')
    .select('balance')
    .eq('id', senderAccount.id)
    .single();

  const { data: refreshedRecipient } = await supabaseAdmin
    .from('accounts')
    .select('balance')
    .eq('id', recipientAccount.id)
    .single();

  const { data: senderUser } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', senderId)
    .single();

  const { data: recipientUser } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', recipientAccount.user_id)
    .single();

  const newBalance = Number(refreshedSender?.balance ?? currentBalance - transferAmount);
  const recipientNewBalance = Number(refreshedRecipient?.balance ?? 0);

  const [senderNotificationInsert, recipientNotificationInsert, senderEmailSent, recipientEmailSent] = await Promise.all([
    supabaseAdmin.from('notifications').insert({
      user_id: senderId,
      type: 'transaction',
      title: 'Transfer Successful',
      message: `You sent ${senderAccount.currency} ${transferAmount.toFixed(2)} to ${cleanAccountNumber}.`,
      status: 'unread',
      metadata: {
        reference_id: referenceId,
        amount: transferAmount,
        currency: senderAccount.currency,
        account_number: cleanAccountNumber,
      },
    }),
    supabaseAdmin.from('notifications').insert({
      user_id: recipientAccount.user_id,
      type: 'transaction',
      title: 'Money Received',
      message: `You received ${recipientAccount.currency} ${transferAmount.toFixed(2)} from ${senderAccount.account_number}.`,
      status: 'unread',
      metadata: {
        reference_id: referenceId,
        amount: transferAmount,
        currency: recipientAccount.currency,
        account_number: senderAccount.account_number,
      },
    }),
    senderUser?.email
      ? EmailService.sendTransactionAlert(
          senderUser.email,
          senderUser.name || 'User',
          'debit',
          transferAmount,
          senderAccount.currency,
          `Voice transfer to ${cleanAccountNumber}`,
          newBalance
        )
      : Promise.resolve(),
    recipientUser?.email
      ? EmailService.sendTransactionAlert(
          recipientUser.email,
          recipientUser.name || 'User',
          'credit',
          transferAmount,
          recipientAccount.currency,
          `Voice transfer from ${senderAccount.account_number}`,
          recipientNewBalance
        )
      : Promise.resolve(),
  ]);

  if (senderNotificationInsert.error) {
    logger.warn(`Voice transfer sender notification insert failed: ${senderNotificationInsert.error.message}`);
  }

  if (recipientNotificationInsert.error) {
    logger.warn(`Voice transfer recipient notification insert failed: ${recipientNotificationInsert.error.message}`);
  }

  if (senderUser?.email && senderEmailSent !== true) {
    logger.warn(`Voice transfer sender email failed for ${senderUser.email}`);
  }

  if (recipientUser?.email && recipientEmailSent !== true) {
    logger.warn(`Voice transfer recipient email failed for ${recipientUser.email}`);
  }

  return {
    amount: transferAmount,
    currency: senderAccount.currency,
    recipientAccount: cleanAccountNumber,
    sourceAccount: senderAccount.account_number,
    newBalance,
    referenceId,
    sourceAccountType: normalizedSourceType,
  };
}

/**
 * Retrieves aggregated balance for a user's account type.
 * If account type is provided and user has multiple accounts of that type,
 * returns the sum across all active accounts.
 */
async function getVoiceBalance(userId: string, accountType?: string) {
  try {
    if (accountType) {
      const normalizedType = normalizeSourceAccountType(accountType);
      if (!normalizedType) {
        throw new Error('Please specify a valid account type: wallet, savings, checking, or fixed deposit');
      }

      const { data: accountList, error } = await supabaseAdmin
        .from('accounts')
        .select('balance, currency, account_number')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('account_type', normalizedType);

      if (error || !accountList || accountList.length === 0) {
        throw new Error(`No active ${normalizedType.replace('_', ' ')} account found`);
      }

      const totalBalance = accountList.reduce(
        (sum, account) => sum + Number(account.balance || 0),
        0
      );

      const currency = accountList[0].currency;
      logger.info(
        `BALANCE CHECK: ${normalizedType} accounts=${accountList.length}, total=${totalBalance}`
      );

      return {
        balance: totalBalance,
        currency,
      };
    }

    const { data: accountList, error } = await supabaseAdmin
      .from('accounts')
      .select('balance, currency, account_number')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error || !accountList || accountList.length === 0) {
      throw new Error('No active accounts found');
    }

    const totalBalance = accountList.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0
    );

    const currency = accountList[0].currency;
    logger.info(`BALANCE CHECK: all active accounts=${accountList.length}, total=${totalBalance}`);

    return {
      balance: totalBalance,
      currency,
    };
  } catch (err: any) {
    logger.error(`getVoiceBalance error: ${err.message}`);
    throw err;
  }
}

function safelyParseArgs(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getToolName(toolCall: any): string {
  return (
    toolCall?.function?.name ||
    toolCall?.tool?.name ||
    toolCall?.name ||
    ''
  );
}

function getToolArgs(toolCall: any): any {
  return (
    toolCall?.function?.arguments ??
    toolCall?.arguments ??
    toolCall?.parameters ??
    {}
  );
}

function extractSenderId(body: any): string | undefined {
  const message = body?.message;

  return (
    message?.call?.variableValues?.userId ||
    message?.call?.assistantOverrides?.variableValues?.userId ||
    message?.call?.metadata?.userId ||
    message?.customer?.variableValues?.userId ||
    message?.call?.customer?.variableValues?.userId ||
    message?.call?.customer?.id ||
    body?.call?.variableValues?.userId ||
    body?.call?.assistantOverrides?.variableValues?.userId ||
    body?.call?.metadata?.userId ||
    body?.customer?.variableValues?.userId ||
    body?.customer?.id ||
    body?.variableValues?.userId ||
    body?.metadata?.userId ||
    body?.userId
  );
}

function extractToolCalls(body: any): any[] {
  const message = body?.message;

  if (Array.isArray(message?.toolCalls)) return message.toolCalls;
  if (message?.toolCall) return [message.toolCall];

  if (Array.isArray(body?.toolCalls)) return body.toolCalls;
  if (body?.toolCall) return [body.toolCall];

  // Handle direct Vapi server tool payloads.
  if (body?.function || body?.name || body?.tool || body?.parameters || body?.arguments) {
    return [
      {
        id: body?.id || body?.toolCallId || `direct-${Date.now()}`,
        function: {
          name: body?.function?.name || body?.name || body?.tool?.name,
          arguments: body?.function?.arguments ?? body?.arguments ?? body?.parameters ?? {},
        },
      },
    ];
  }

  return [];
}

function normalizeSourceAccountType(value?: string):
  | 'wallet'
  | 'savings'
  | 'checking'
  | 'fixed_deposit'
  | null {
  if (!value) return null;

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (normalized.includes('wallet')) return 'wallet';
  if (normalized.includes('saving')) return 'savings';
  if (normalized.includes('current') || normalized.includes('checking')) return 'checking';
  if (normalized.includes('fixed') || normalized === 'fd') return 'fixed_deposit';

  if (normalized === 'savings') return 'savings';
  if (normalized === 'checking') return 'checking';
  if (normalized === 'fixed deposit') return 'fixed_deposit';

  return null;
}
