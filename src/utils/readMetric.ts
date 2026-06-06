export function readNum(
  metrics: Record<string, any> | null | undefined,
  metricId: string
): number | null {
  if (!metrics) return null
  const field = metrics[metricId]
  if (field === null || field === undefined) return null

  // Object format: { value: x, note: "", target: 0 } OR { value: x }
  if (typeof field === 'object' && !Array.isArray(field)) {
    if ('value' in field) {
      const v = field.value
      if (v === null || v === undefined || v === '' || v === false || v === true) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }
    return null
  }

  // Raw number or string
  if (typeof field === 'number') return isNaN(field) ? null : field
  if (typeof field === 'string' && field.trim() !== '') {
    const n = Number(field)
    return isNaN(n) ? null : n
  }

  return null
}

export function readText(
  metrics: Record<string, any> | null | undefined,
  metricId: string
): string | null {
  if (!metrics) return null
  const field = metrics[metricId]
  if (field === null || field === undefined) return null
  if (typeof field === 'object' && 'value' in field) {
    const v = field.value
    return (v === null || v === undefined || v === '') ? null : String(v)
  }
  if (typeof field === 'string') return field.trim() || null
  return null
}

export function readBool(
  metrics: Record<string, any> | null | undefined,
  metricId: string
): boolean | null {
  if (!metrics) return null
  const field = metrics[metricId]
  if (field === null || field === undefined) return null
  if (typeof field === 'object' && 'value' in field) {
    const v = field.value
    if (typeof v === 'boolean') return v
    if (v === 'true' || v === 1) return true
    if (v === 'false' || v === 0) return false
    return null
  }
  if (typeof field === 'boolean') return field
  return null
}

export function fmt(val: number | null): string {
  if (val === null || val === undefined) return '—'
  if (val === 0) return '0'
  // Large numbers — no decimals needed
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return val.toLocaleString('en-IN')
  // Small numbers — show as integer (no decimal for counts)
  return String(Math.round(val))
}

export function fmtPct(num: number | null, den: number | null): string {
  if (num === null || den === null || den === 0) return '—'
  const rate = calcRateCapped(num, den)
  return fmtRate(rate)
}

// Safe percentage — caps at 100% for rates that can't exceed 100%
export function calcRateCapped(
  numerator: number | null,
  denominator: number | null
): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null
  if (numerator < 0 || denominator < 0) return null
  const rate = (numerator / denominator) * 100
  // Cap at 100% — if numerator > denominator something is wrong with the data
  // return null rather than an impossible number
  if (rate > 100) return null
  return Math.round(rate * 10) / 10  // 1 decimal place
}

// Uncapped percentage — for positive response rate etc
export function calcRateUncapped(
  numerator: number | null,
  denominator: number | null
): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null
  if (numerator < 0 || denominator < 0) return null
  return Math.round((numerator / denominator) * 100 * 10) / 10
}

// Safe delta — rounds to 1 decimal and handles floating point
export function calcDelta(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) return null
  return Math.round((current - previous) * 10) / 10
}

// Format a rate for display — shows — if null
export function fmtRate(val: number | null): string {
  if (val === null || val === undefined) return '—'
  return val.toFixed(1) + '%'
}

// Format delta with + or - sign
export function fmtDelta(current: number | null, previous: number | null): string {
  const d = calcDelta(current, previous)
  if (d === null) return '—'
  const rounded = Math.round(d * 10) / 10
  if (rounded === 0) return '0'
  return (rounded > 0 ? '+' : '') + rounded.toFixed(1)
}

// Format delta color
export function deltaColor(current: number | null, previous: number | null): string {
  const d = calcDelta(current, previous)
  if (d === null) return '#999'
  if (d > 0) return '#22C55E'
  if (d < 0) return '#EF4444'
  return '#999'
}

export function formatWeekDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  } catch { return dateStr ?? '—' }
}

export function readSalesNum(
  data: Record<string, any> | null | undefined,
  key: string
): number | null {
  if (!data) return null
  const val = data[key]
  if (val === null || val === undefined || val === '') return null
  // Handle string format "5" or number format 5
  if (typeof val === 'object' && 'value' in val) {
    const v = val.value
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }
  const n = Number(val)
  return isNaN(n) ? null : n
}
