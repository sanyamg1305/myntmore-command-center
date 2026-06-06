const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://dwqwqeaueqavhxhsnyet.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cXdxZWF1ZXFhdmh4aHNueWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNzAyNDUsImV4cCI6MjA5Mzk0NjI0NX0.nzsnn9eGDQdx7Pn13yJ1SaO-bKQSRLIapOOFZZhjbUs'
);

async function run() {
  const { data, error } = await supabase
    .from('weekly_data')
    .select('week_start, content_metrics, leadgen_metrics, content_submitted_at')
    .eq('client_id', 'a396561e-c0e2-4c33-a798-3ce49ee2c8b3')
    .order('week_start', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data.map(r => ({
      week_start: r.week_start,
      post_ideation: r.content_metrics?.C01?.value,
      total_posts: r.content_metrics?.C09?.value,
      impressions: r.content_metrics?.C10?.value,
      conn_req: r.leadgen_metrics?.L10?.value,
      accepted: r.leadgen_metrics?.L11?.value,
      content_submitted_at: r.content_submitted_at
    })), null, 2));
  }
}
run();
