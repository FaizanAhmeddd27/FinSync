const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'dca44f8e-917f-4487-8cdb-f75b12da124e';

(async () => {
  try {
    // Get wallet account
    const { data: walletAccount, error: walletErr } = await supabase
      .from('accounts')
      .select('id, account_number, account_type, balance, currency, status')
      .eq('user_id', userId)
      .eq('account_type', 'wallet')
      .single();

    console.log('=== WALLET ACCOUNT ===');
    console.log('Error:', walletErr);
    console.log('Account:', walletAccount);

    // Get all accounts for this user
    const { data: allAccounts, error: allErr } = await supabase
      .from('accounts')
      .select('id, account_number, account_type, balance, currency, status')
      .eq('user_id', userId);

    console.log('\n=== ALL ACCOUNTS FOR USER ===');
    console.log('Error:', allErr);
    console.log('Accounts:', allAccounts);

    // Get recent transactions for this user
    const { data: transactions, error: txnErr } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('\n=== RECENT TRANSACTIONS ===');
    console.log('Error:', txnErr);
    console.log('Transactions:', transactions);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
