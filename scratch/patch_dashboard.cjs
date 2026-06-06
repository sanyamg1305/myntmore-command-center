const fs = require('fs');

let content = fs.readFileSync('src/components/dashboard/DashboardPage.tsx', 'utf-8');

// Replace the autoSelect useEffect
const target = `  useEffect(() => {
    const autoSelect = async () => {
      if (!session) return
      
      const options = getWeekOptions(4)
      for (const opt of options) {
        const { data } = await supabase
          .from('weekly_data')
          .select('id')
          .eq('week_start', opt.weekStart)
          .limit(1)
        
        if (data && data.length > 0) {
          if (opt.weekStart !== getPreviousWeekStart()) {
            setDisplayWeek(opt.weekStart)
            toast.info(\`Showing data for \${getWeekLabel(opt.weekStart)} (Latest available)\`)
          }
          break
        }
      }
    }
    autoSelect()
  }, [session])`;

const replacement = `  const findBestDisplayWeek = async (): Promise<string> => {
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
    if (session) {
      findBestDisplayWeek().then(week => setDisplayWeek(week))
    }
  }, [session])`;

// Normalize line endings to do search
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  // Restore \r\n endings to be polite to the repo format
  fs.writeFileSync('src/components/dashboard/DashboardPage.tsx', newContent.replace(/\n/g, '\r\n'), 'utf-8');
  console.log("Successfully patched DashboardPage.tsx autoSelect!");
} else {
  console.log("Could not find autoSelect target in DashboardPage.tsx");
}
