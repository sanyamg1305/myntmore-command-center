// src/utils/dataUtils.ts

import { buildWeekMetrics, formatMetricDisplay } from './metricCalculations'

export function readVal(metricsJson: any, metricId: string): any {
  if (!metricsJson) return null
  const field = metricsJson[metricId]
  if (field === null || field === undefined) return null
  if (typeof field === 'object' && 'value' in field) {
    return field.value
  }
  return field
}

export function readNum(metrics: any, metricId: string): number | null {
  if (!metrics) return null
  
  const field = metrics[metricId]
  if (field === null || field === undefined) return null
  
  // Format: { value: 1936, note: "", target: 0 }
  if (typeof field === 'object' && field !== null) {
    if ('value' in field) {
      const v = field.value
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }
  }
  
  // Raw number format (legacy seeded data)
  if (typeof field === 'number') return field
  if (typeof field === 'string' && field !== '') {
    const n = Number(field)
    return isNaN(n) ? null : n
  }
  
  return null
}

export function formatDashboardValue(val: any, metricId: string): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? '✅' : '❌'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n === 0) return '0'
  return formatMetricDisplay(val, metricId)
}


export function mv(
  weekRow: any,
  column: string,
  metricId: string
): number | null {
  const calculatedMetrics = ['L05', 'L12', 'L14', 'L17', 'L21', 'L26', 'C09']
  if (calculatedMetrics.includes(metricId)) {
    const built = buildWeekMetrics(weekRow)
    return built?.[metricId as keyof typeof built] as number | null ?? null
  }

  const field = weekRow?.[column]?.[metricId]
  if (field === null || field === undefined) return null
  // Handle both { value: 42 } format and raw number format
  if (typeof field === 'object' && 'value' in field) {
    const v = field.value
    return v === null || v === undefined || v === '' ? null : Number(v)
  }
  if (typeof field === 'number') return field
  if (typeof field === 'string' && field !== '') return Number(field)
  return null
}

export function sv(
  weekRow: any,
  column: string,
  metricId: string
): string | null {
  const field = weekRow?.[column]?.[metricId]
  if (!field) return null
  if (typeof field === 'object' && 'value' in field) {
    return field.value ? String(field.value) : null
  }
  if (typeof field === 'string') return field
  return null
}

export function readMetric(
  weekRow: any, 
  category: 'content_metrics' | 'leadgen_metrics', 
  metricId: string
) {
  const calculatedMetrics = ['L05', 'L12', 'L14', 'L17', 'L21', 'L26', 'C09']
  if (calculatedMetrics.includes(metricId)) {
    const built = buildWeekMetrics(weekRow)
    return built?.[metricId as keyof typeof built] ?? null
  }

  const field = weekRow?.[category]?.[metricId]
  if (!field && field !== 0) return null
  if (typeof field === 'object' && field !== null && 'value' in field) {
    return field.value !== '' ? field.value : null
  }
  return field
}

export function formatMetricValue(val: any, metricId: string): string {
  if (val === null || val === undefined || val === '') return '—'
  
  // Percentage metrics
  const pctMetrics = ['L12','L14','L17','L18','L21','L26','L30','L34','L05', 'C05'] // Added C05 just in case, but user specified some L codes. Wait, let's stick to user's list.
  const userPctMetrics = ['L12','L14','L17','L18','L21','L26','L30','L34','L05']
  if (userPctMetrics.includes(metricId)) {
    return Number(val).toFixed(1) + '%'
  }
  
  // Boolean metrics
  if (typeof val === 'boolean') return val ? '✅' : '❌'
  
  // Text metrics
  if (typeof val === 'string') return val
  
  // Large numbers
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n >= 1000) return n.toLocaleString('en-IN')
  return String(n)
}

export function mt(
  weekRow: any,
  column: string,
  metricId: string
): string | null {
  const field = weekRow?.[column]?.[metricId]
  if (!field) return null
  if (typeof field === 'object' && 'note' in field) return field.note || null
  return null
}

export function fmt(val: number | null, unit?: '%' | '₹' | 'K' | 'hrs'): string {
  if (val === null || val === undefined) return '—'
  if (unit === '%') return val.toFixed(1) + '%'
  if (unit === '₹') return '₹' + val.toLocaleString('en-IN')
  if (unit === 'K' && val >= 1000) return (val / 1000).toFixed(1) + 'K'
  if (unit === 'hrs') return val + ' hrs'
  
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
  return val.toString()
}

export function delta(current: number | null, prev: number | null): string {
  if (current === null || prev === null) return '—'
  const d = current - prev
  return (d > 0 ? '+' : '') + d
}

export function deltaColor(current: number | null, prev: number | null): string {
  if (current === null || prev === null) return '#999'
  if (current > prev) return '#22C55E'
  if (current < prev) return '#EF4444'
  return '#999'
}

// Special version for TJ and Sales which might have different row structures
export function tjVal(channelObj: any, metricId: string): number | null {
  const field = channelObj?.[metricId]
  if (field === null || field === undefined) return null
  if (typeof field === 'object' && 'value' in field) {
    const v = field.value
    return v === null || v === undefined || v === '' ? null : Number(v)
  }
  if (typeof field === 'number') return field
  if (typeof field === 'string' && field !== '') return Number(field)
  return null
}

export function salesVal(salesRow: any, section: string, metricId: string): number | null {
  const field = salesRow?.[section]?.[metricId]
  if (field === null || field === undefined) return null
  if (typeof field === 'object' && 'value' in field) {
    const v = field.value
    return v === null || v === undefined || v === '' ? null : Number(v)
  }
  if (typeof field === 'number') return field
  if (typeof field === 'string' && field !== '') return Number(field)
  return null
}
