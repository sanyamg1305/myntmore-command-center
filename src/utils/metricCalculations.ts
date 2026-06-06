import { ALL_METRICS } from '../data/metrics'

import { readNum, readBool, readText, calcRateCapped, calcRateUncapped } from './readMetric'

import { fmt, fmtPct } from './format'

export const readMetricValue = readNum

// Format a metric value for display
export function formatMetricDisplay(
  val: number | string | boolean | null,
  metricId: string
): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? '✅' : '❌'
  if (typeof val === 'string') return val.length > 0 ? val : '—'
  if (isNaN(Number(val))) return '—'
  const n = Number(val)
  if (n === 0) return '0'
  return fmt(n)
}

// Format percentage metrics
export function formatPct(val: number | null): string {
  return fmt(val, { unit: '%' })
}

// Live calculate acceptance rate
export const calcAcceptanceRate = (accepted: number | null, sent: number | null) => calcRateCapped(accepted, sent)
export const calcResponseRate = (answered: number | null, accepted: number | null) => calcRateCapped(answered, accepted)
export const calcMeetingShowUpRate = (showedUp: number | null, booked: number | null) => calcRateCapped(showedUp, booked)

// Uncapped rates
export const calcPositiveRate = (positive: number | null, answered: number | null) => calcRateUncapped(positive, answered)
export const calcExistingConnRate = (replied: number | null, sent: number | null) => calcRateCapped(replied, sent) // wait, existing connections replied/sent should also be capped. We will cap it.

// Build complete metrics object for a week row including live-calculated rates
export function buildWeekMetrics(weekRow: any) {
  if (!weekRow) return null

  const cm = weekRow.content_metrics ?? {}
  const lm = weekRow.leadgen_metrics ?? {}

  const result: Record<string, any> = {}

  ALL_METRICS.forEach(m => {
    const rawMetrics = m.category === 'content' ? cm : lm

    // Check if submitted for client weekly_data
    if (weekRow.client_id) {
      const isSubmitted = m.category === 'content'
        ? !!weekRow.content_submitted_at
        : !!weekRow.leadgen_submitted_at

      if (!isSubmitted) {
        result[m.id] = null
        return
      }
    }

    let val: any = null

    // Handle auto-calculated metrics
    if (m.type === 'auto' && m.autoFormula) {
      // Parse and evaluate the formula (e.g. 'C06+C07+C08')
      let formulaVal: number | null = null
      try {
        // Replace metric IDs with their values, defaulting to 0 if null
        let expr = m.autoFormula
        m.dependsOn?.forEach(depId => {
          const depVal = result[depId] ?? 0
          expr = expr.replace(new RegExp(`\\b${depId}\\b`, 'g'), String(depVal))
        })
        // Safely evaluate the arithmetic expression
        formulaVal = Number(eval(expr))
        val = isNaN(formulaVal) ? null : formulaVal
      } catch {
        val = null
      }
    } else if (m.type === 'number' || m.type === 'slider' || m.type === 'percentage') {
      val = readNum(rawMetrics, m.id)
    } else if (m.type === 'boolean') {
      val = readBool(rawMetrics, m.id)
    } else {
      val = readText(rawMetrics, m.id)
    }

    result[m.id] = val
  })

  const C09 = result.C09
  const C10 = result.C10
  const L02 = result.L02
  const L03 = result.L03
  const L10 = result.L10
  const L11 = result.L11
  const L13 = result.L13
  const L15 = result.L15
  const L19 = result.L19
  const L20 = result.L20
  const L24 = result.L24
  const L25 = result.L25

  // 2. Overwrite with live calculations
  result.impressionsPerPost = C09 && C09 > 0 && C10 ? Math.round(C10 / C09) : null
  
  result.L05 = L02 !== null && L03 !== null ? calcRateCapped(L03, L02) : null
  result.L12 = calcAcceptanceRate(L11, L10)
  result.L14 = calcResponseRate(L13, L11)
  result.L17 = calcPositiveRate(L15, L13)
  result.L21 = calcExistingConnRate(L20, L19)
  result.L26 = calcMeetingShowUpRate(L25, L24)

  return result
}

