export function getWeeksInSameMonth(selectedWeekStart: string) {
  const selected = new Date(selectedWeekStart + 'T00:00:00Z')
  const year = selected.getUTCFullYear()
  const month = selected.getUTCMonth()

  const weeks: { weekStart: string; shortLabel: string; isSelected: boolean }[] = []

  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const firstDow = firstOfMonth.getUTCDay()
  const daysBack = firstDow === 0 ? 6 : firstDow - 1
  const cursor = new Date(firstOfMonth)
  cursor.setUTCDate(firstOfMonth.getUTCDate() - daysBack)

  while (true) {
    const weekEnd = new Date(cursor)
    weekEnd.setUTCDate(cursor.getUTCDate() + 6)
    const startsInMonth = cursor.getUTCMonth() === month && cursor.getUTCFullYear() === year
    const endsInMonth = weekEnd.getUTCMonth() === month && weekEnd.getUTCFullYear() === year

    if (!startsInMonth && !endsInMonth) {
      if (cursor.getUTCMonth() > month || cursor.getUTCFullYear() > year) break
      cursor.setUTCDate(cursor.getUTCDate() + 7)
      continue
    }

    const ws = cursor.toISOString().split('T')[0]
    weeks.push({
      weekStart: ws,
      shortLabel: cursor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      isSelected: ws === selectedWeekStart,
    })

    cursor.setUTCDate(cursor.getUTCDate() + 7)
    if (cursor.getUTCMonth() > month && cursor.getUTCFullYear() >= year) break
  }

  return weeks
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().split('T')[0]
}

export function getWeekLabel(weekStart: string): string {
  const monday = new Date(weekStart + 'T00:00:00Z')
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmtShort = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const fmtFull = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${fmtShort(monday)} – ${fmtFull(sunday)}`
}

export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().split('T')[0]
}

export function getPreviousWeekStart(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1) - 7)
  return monday.toISOString().split('T')[0]
}

export function getWeekOptions(count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const now = new Date()
    const day = now.getUTCDay()
    const monday = new Date(now)
    monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1) - (i * 7))
    const weekStart = monday.toISOString().split('T')[0]
    return {
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      label: getWeekLabel(weekStart),
    }
  })
}

export function getWeekStart(offsetWeeks: number): string {
  const now = new Date()
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1) - (offsetWeeks * 7))
  return monday.toISOString().split('T')[0]
}


export function getWeekValue(date: Date = new Date()): string {
  const d = new Date(date)
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}
