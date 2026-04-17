const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAccounts() {
  const { data: users } = await supabase.from('users').select('id, name').limit(1).single();
  if (users) {
     console.log('--- User Found ---');
     console.log(users.name, users.id);
     const { data: accounts } = await supabase.from('accounts').select('account_type, balance, account_number').eq('user_id', users.id);
     console.log('--- Accounts ---');
     console.log(JSON.stringify(accounts, null, 2));
  } else {
     console.log('No users found.');
  }
}

checkAccounts();
