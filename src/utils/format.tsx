import React from 'react'
import { calcDelta, calcRateCapped, fmtRate } from './readMetric'

/**
 * Format any numeric value for display.
 * Rules:
 * - Percentages: 1 decimal place max, e.g. 37.6%
 * - Large numbers: rounded to 1 decimal with K/M suffix
 * - Small numbers: rounded to nearest integer
 * - Zero: show 0
 * - Null/undefined/NaN: show —
 */

export function fmt(
  val: number | string | null | undefined,
  options: {
    unit?: '%' | '₹' | 'hrs' | 'K'
    decimals?: number       // force specific decimal places
    compact?: boolean       // use K/M suffix (default true for numbers >= 1000)
  } = {}
): string {
  if (val === null || val === undefined || val === '') return '—'
  const n = Number(val)
  if (isNaN(n)) return '—'

  const { unit, decimals, compact = true } = options

  // Percentage
  if (unit === '%') {
    return (decimals !== undefined ? n.toFixed(decimals) : n.toFixed(1)) + '%'
  }

  // Hours
  if (unit === 'hrs') {
    return n.toFixed(1) + ' hrs'
  }

  // Rupees
  if (unit === '₹') {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
    return '₹' + Math.round(n).toLocaleString('en-IN')
  }

  // Large numbers with K/M
  if (compact) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  }

  // Default: integer for whole numbers, 1 decimal for floats
  if (decimals !== undefined) return n.toFixed(decimals)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(1)
}

/**
 * Format a delta (change from previous value).
 * Always shows sign, rounded, never raw decimals.
 */
export function fmtDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  options: {
    unit?: '%' | '₹' | 'hrs'
    asPercent?: boolean
  } = {}
): { text: string; color: string; isPositive: boolean | null } {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return { text: '—', color: '#999', isPositive: null }
  }

  const curr = Number(current)
  const prev = Number(previous)
  if (isNaN(curr) || isNaN(prev)) return { text: '—', color: '#999', isPositive: null }

  const delta = calcDelta(curr, prev)
  if (delta === null) return { text: '—', color: '#999', isPositive: null }

  const isPositive = delta > 0
  const isNeutral = delta === 0
  const color = isNeutral ? '#999' : isPositive ? '#22C55E' : '#EF4444'

  if (isNeutral) return { text: '—', color: '#999', isPositive: null }

  const sign = isPositive ? '+' : ''

  if (options.unit === '%') {
    return { text: `${sign}${delta.toFixed(1)}%`, color, isPositive }
  }
  if (options.unit === 'hrs') {
    return { text: `${sign}${delta.toFixed(1)} hrs`, color, isPositive }
  }

  // Compact format for deltas too
  let formatted: string
  const abs = Math.abs(delta)
  if (abs >= 1000000) formatted = (delta / 1000000).toFixed(1) + 'M'
  else if (abs >= 1000) formatted = (delta / 1000).toFixed(1) + 'K'
  else if (!Number.isInteger(delta)) formatted = delta.toFixed(1)
  else formatted = delta.toString()

  return { text: `${sign}${formatted}`, color, isPositive }
}

/**
 * Format a live-calculated percentage (acceptance rate, response rate etc.)
 * Always 1 decimal place.
 */
export function fmtPct(
  numerator: number | null | undefined,
  denominator: number | null | undefined
): string {
  if (numerator === null || numerator === undefined) return '—'
  if (denominator === null || denominator === undefined || Number(denominator) === 0) return '—'
  const rate = calcRateCapped(Number(numerator), Number(denominator))
  return fmtRate(rate)
}

/**
 * Format a delta between two percentages.
 * e.g. acceptance rate went from 32.1% to 37.6% -> +5.5%
 */
export function fmtPctDelta(
  currNum: number | null | undefined, currDen: number | null | undefined,
  prevNum: number | null | undefined, prevDen: number | null | undefined
): { text: string; color: string } {
  if (currNum === null || currNum === undefined || currDen === null || currDen === undefined) return { text: '—', color: '#999' }
  if (prevNum === null || prevNum === undefined || prevDen === null || prevDen === undefined) return { text: '—', color: '#999' }
  
  const curr = calcRateCapped(Number(currNum), Number(currDen))
  const prev = calcRateCapped(Number(prevNum), Number(prevDen))
  
  const delta = calcDelta(curr, prev)
  if (delta === null) return { text: '—', color: '#999' }
  
  if (Math.abs(delta) < 0.05) return { text: '—', color: '#999' }
  const sign = delta > 0 ? '+' : ''
  const color = delta > 0 ? '#22C55E' : '#EF4444'
  return { text: `${sign}${delta.toFixed(1)}%`, color }
}

export function Delta({ current, previous, unit }: {
  current: number | null | undefined
  previous: number | null | undefined
  unit?: '%' | '₹' | 'hrs'
}) {
  const { text, color } = fmtDelta(current, previous, { unit })
  if (text === '—') return null
  return (
    <span style={{
      fontSize: '11px',
      color,
      fontWeight: '600',
      marginLeft: '4px',
    }}>
      {text}
    </span>
  )
}

export function fmtMetricCell(
  row: any,
  metricId: string,
  category: 'content_metrics' | 'leadgen_metrics'
): string {
  if (!row) return '—'
  const field = row?.[category]?.[metricId]
  if (field === null || field === undefined) return '—'
  const val = typeof field === 'object' && 'value' in field ? field.value : field
  if (val === null || val === undefined || val === '') return '—'

  // Booleans
  const boolMetrics = ['C18', 'C19', 'C20', 'C21', 'C22', 'C23']
  if (boolMetrics.includes(metricId)) {
    if (val === true || val === 'true' || val === 1) return '✅'
    if (val === false || val === 'false' || val === 0) return '❌'
  }

  // Text
  if (typeof val === 'string') {
    if (val.trim() === '' || val === '-') return '—'
    return val.length > 35 ? val.slice(0, 35) + '...' : val
  }

  // Numbers
  const n = Number(val)
  if (isNaN(n)) return '—'
  if (n === 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

export function readVal(
  metrics: Record<string, any> | null | undefined,
  metricId: string
): number | string | boolean | null {
  if (!metrics) return null
  const field = metrics[metricId]
  if (field === null || field === undefined) return null
  
  // Handle object format: { value: x, note: "", target: 0 }
  if (typeof field === 'object' && field !== null && 'value' in field) {
    const v = field.value
    if (v === null || v === undefined || v === '') return null
    return v
  }
  
  // Handle raw value format (legacy)
  return field
}

export function readNum(
  metrics: Record<string, any> | null | undefined,
  metricId: string
): number | null {
  const val = readVal(metrics, metricId)
  if (val === null || val === undefined) return null
  if (typeof val === 'boolean') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}


export function formatDashboardValue(val: number | null, metricId: string): string {
  if (val === null || val === undefined) return '—'  // not entered
  if (val === 0) return '0'     // explicitly entered as 0
  
  // Percentage metrics
  const pctMetrics = ['L12','L14','L17','L18','L21','L26','L30','L34','L05', 'C05']
  if (pctMetrics.includes(metricId)) {
    return Number(val).toFixed(1) + '%'
  }

  const n = Number(val)
  if (isNaN(n)) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return n.toLocaleString('en-IN')
  return String(n)
}
