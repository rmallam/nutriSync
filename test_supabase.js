const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://mydhcolbccdbbpamvzws.supabase.co';
const supabaseKey = 'sb_publishable_UnlFJw591uI63wNErHKXww_33sT9Dwc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('user_habits').select('*').limit(1);
  console.log("Error object:", error);
}
run();
