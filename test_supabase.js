const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://mydhcolbccdbbpamvzws.supabase.co', 'sb_publishable_UnlFJw591uI63wNErHKXww_33sT9Dwc');

async function run() {
  const { data, error } = await supabase.from('blood_tests').select('biomarkers, summary, created_at').order('created_at', { ascending: false }).limit(2);
  console.log("Error object:", error);
  console.dir(data, { depth: null });
}
run();
