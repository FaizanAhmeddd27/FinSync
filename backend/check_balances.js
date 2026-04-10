const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBalances() {
  console.log('Checking accounts...');
  
  const { data, error } = await supabase
    .from('accounts')
    .select('id, balance, currency, status, user_id');
    
  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  
  console.log(`Found ${data.length} accounts total.`);
  
  const stats = data.reduce((acc, curr) => {
    const status = curr.status;
    const currency = curr.currency;
    const balance = Number(curr.balance);
    
    if (!acc[status]) acc[status] = {};
    if (!acc[status][currency]) acc[status][currency] = 0;
    
    acc[status][currency] += balance;
    return acc;
  }, {});
  
  console.log('Stats by Status and Currency:');
  console.log(JSON.stringify(stats, null, 2));
  
  const activeAccounts = data.filter(a => a.status === 'active');
  console.log(`Active accounts: ${activeAccounts.length}`);
}

checkBalances();
