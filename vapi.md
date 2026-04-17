# Vapi transferMoney tool setup for FinSync (real transfer, no fake success)

This guide is based on your current backend and frontend structure.

Goal:
- When user says "transfer money", assistant must report success only if database transfer actually happened.
- If transfer fails, assistant should say failure reason.

---

## 1) Why you are getting false success right now

In your current Vapi webhook controller, there are demo behaviors that always return success:

- Errors in transfer path are swallowed and still return Success.
- Fallback sender/recipient accounts are used even when real user/account is missing.
- Low balance path still returns a transfer processed sentence.

Because of this, voice says "money transferred" even when no real transfer happened.

---

## 2) Keep the current architecture (works with your code)

Your current call flow already passes `userId` from frontend to Vapi:
- frontend start call sends variableValues.userId
- backend webhook reads userId from message.call.*

Your transfer routes (`/api/transfers/initiate`, `/api/transfers/confirm`) are OTP based and require auth token in middleware.
For a single Vapi tool named transferMoney, use the Vapi webhook path and perform transfer through `execute_transfer` RPC only after strict checks.

---

## 3) Vapi dashboard tool config (transferMoney)

Create a Server Tool in Vapi Dashboard:

- Tool name: `transferMoney`
- Method: `POST`
- Server URL: `https://YOUR_DOMAIN/api/vapi/webhook`
  - local dev with ngrok: `https://YOUR_NGROK_URL/api/vapi/webhook`
- Timeout: 20s to 30s
- Wait for response: enabled

Tool parameters schema:

```json
{
  "type": "object",
  "properties": {
    "amount": {
      "type": "number",
      "minimum": 1,
      "description": "Amount to transfer"
    },
    "accountNumber": {
      "type": "string",
      "minLength": 4,
      "maxLength": 20,
      "description": "Recipient account number"
    },
    "accountType": {
      "type": "string",
      "description": "Optional source account type like savings/current"
    },
    "note": {
      "type": "string",
      "maxLength": 500,
      "description": "Optional transfer note"
    }
  },
  "required": ["amount", "accountNumber"],
  "additionalProperties": false
}
```

Assistant instruction for this tool:
- Call transferMoney only after repeating amount and account number back to user.
- If tool result says failed, do not claim success.
- Speak exact failure reason briefly.

---

## 4) Required backend behavior for transferMoney (strict, real transfer)

Implement these rules in your Vapi webhook transfer branch:

1. Extract real `userId` from Vapi message payload.
2. If userId missing or guest, return tool failure.
3. Validate amount > 0 and accountNumber format.
4. Find sender account strictly by `user_id = userId`, `status = active`.
5. Find recipient strictly by `account_number`, `status = active`.
6. Reject self transfer.
7. Reject if sender balance < amount.
8. Call `execute_transfer` RPC.
9. If RPC returns error, return failure.
10. Only on RPC success return success response.

Important:
- Do not use demo fallback sender.
- Do not use fallback recipient.
- Do not return success inside catch blocks.

---

## 5) Response format to send back to Vapi

Your handler should return HTTP 201 with:

```json
{
  "results": [
    {
      "toolCallId": "call_123",
      "result": "SUCCESS: Transferred 500 USD to FS12345678. New balance: 2300.50 USD"
    }
  ]
}
```

Failure example:

```json
{
  "results": [
    {
      "toolCallId": "call_123",
      "result": "FAILED: Insufficient balance"
    }
  ]
}
```

Keep result as clear string. Vapi can speak this directly.

---

## 6) Production-safe transfer function shape (drop demo logic)

Use this logic shape in your transfer executor (pseudo aligned to your Supabase schema):

```ts
async function transferMoneyStrict(userId: string, amount: number, accountNumber: string, accountType?: string, note?: string) {
  if (!userId || userId === 'guest') {
    throw new Error('Missing authenticated user context');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const clean = accountNumber.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 4 || clean.length > 20) {
    throw new Error('Invalid recipient account number');
  }

  let senderQuery = supabaseAdmin
    .from('accounts')
    .select('id,balance,currency,account_type,user_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  senderQuery = accountType
    ? senderQuery.ilike('account_type', `%${accountType}%`)
    : senderQuery.order('is_default', { ascending: false });

  const { data: sender, error: senderErr } = await senderQuery.limit(1).single();
  if (senderErr || !sender) throw new Error('Sender account not found');

  const { data: recipient, error: recErr } = await supabaseAdmin
    .from('accounts')
    .select('id,user_id,currency,account_number,status')
    .eq('account_number', clean)
    .eq('status', 'active')
    .single();

  if (recErr || !recipient) throw new Error('Recipient account not found');
  if (recipient.user_id === userId) throw new Error('Cannot transfer to your own account');
  if (Number(sender.balance) < amount) throw new Error('Insufficient balance');

  const reference = `VAPI-${Date.now()}`;

  const { error: rpcErr } = await supabaseAdmin.rpc('execute_transfer', {
    p_from_account_id: sender.id,
    p_to_account_id: recipient.id,
    p_amount: amount,
    p_from_currency: sender.currency,
    p_to_currency: recipient.currency,
    p_exchange_rate: 1,
    p_converted_amount: amount,
    p_note: note || `Voice transfer to ${clean}`,
    p_reference_id: reference
  });

  if (rpcErr) throw new Error(rpcErr.message);

  const newBalance = Number(sender.balance) - amount;
  return {
    reference,
    amount,
    currency: sender.currency,
    recipientAccount: clean,
    newBalance
  };
}
```

---

## 7) Webhook tool-call handling pattern (important)

For each tool call:
- try transferMoneyStrict
- return `SUCCESS: ...` only in try success path
- return `FAILED: ...` in catch
- never hardcode Success in catch

Pattern:

```ts
try {
  const out = await transferMoneyStrict(userId, amount, accountNumber, accountType, note);
  return {
    toolCallId,
    result: `SUCCESS: Transferred ${out.amount} ${out.currency} to ${out.recipientAccount}. New balance: ${out.newBalance.toFixed(2)} ${out.currency}`
  };
} catch (e: any) {
  return {
    toolCallId,
    result: `FAILED: ${e.message || 'Transfer could not be completed'}`
  };
}
```

---

## 8) End-to-end test checklist

1. Start backend.
2. Start ngrok and update Vapi tool server URL.
3. Start frontend and login with user having active account and balance.
4. Start call from CallAssistant.
5. Say: transfer 100 to account FS12345678.
6. Confirm in database:
   - new row in transfers
   - account balances updated
   - new transaction entries if your RPC writes them
7. Negative tests:
   - invalid account number
   - insufficient balance
   - guest user

Expected voice behavior:
- Success case: assistant confirms transfer.
- Failure case: assistant clearly says transfer failed and reason.

---

## 9) Security notes you should not skip

- Re-enable Vapi webhook secret verification (`x-vapi-secret`).
- Keep strict userId check; do not auto-pick first user.
- Keep strict account ownership check for sender account.
- Add request logging with transfer reference id.

---

## 10) If you want full OTP flow in voice (recommended for real banking)

A single transferMoney tool is less secure. Safer design:

- Tool 1: initiateTransferVoice
- Tool 2: confirmTransferVoiceOtp

This matches your existing `/api/transfers/initiate` and `/api/transfers/confirm` logic.
But if you need one-step transfer for now, keep strict checks from this document.
