const fs = require('fs');

let content = fs.readFileSync('src/components/monday/MondayModePage.tsx', 'utf-8');

// Replace the initWeek useEffect
const target = `  // Auto-detect best display week
  useEffect(() => {
    const initWeek = async () => {
      const currentWeekStart = getCurrentWeekStart()
      const tables = ['weekly_data', 'tj_weekly_data', 'sales_weekly_data', 'mm_weekly_data']
      let currentWeekHasData = false

      for (const table of tables) {
        const { data } = await supabase
          .from(table as any)
          .select('id')
          .eq('week_start', currentWeekStart)
          .limit(1)

        if (data && data.length > 0) {
          currentWeekHasData = true
          break
        }
      }

      if (currentWeekHasData) {
        setSelectedWeek(currentWeekStart)
      } else {
        setSelectedWeek(getPreviousWeekStart())
      }
    }
    initWeek()
  }, [])`;

const replacement = `  // Auto-detect best display week
  const findBestDisplayWeek = async (): Promise<string> => {
    const currentWeekStart = getCurrentWeekStart()   // 2026-05-11
    const previousWeekStart = getPreviousWeekStart() // 2026-05-04

    // Check if current week has any submitted data
    const { data: currentWeekData } = await supabase
      .from('weekly_data')
      .select('id')
      .eq('week_start', currentWeekStart)
      .not('content_submitted_at', 'is', null)
      .limit(1)

    // If current week has data, show it — otherwise show previous week
    if (currentWeekData && currentWeekData.length > 0) {
      return currentWeekStart
    }
    return previousWeekStart
  }

  useEffect(() => {
    findBestDisplayWeek().then(week => setSelectedWeek(week))
  }, [])`;

// Normalise line endings to do search
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync('src/components/monday/MondayModePage.tsx', newContent.replace(/\n/g, '\r\n'), 'utf-8');
  console.log("Successfully patched MondayModePage.tsx week auto-detection!");
} else {
  console.log("Could not find MondayModePage.tsx initWeek target");
}
