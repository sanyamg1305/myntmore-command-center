import { supabase } from '@/integrations/supabase/client'
import { calcAcceptanceRate, calcResponseRate, calcPositiveRate } from './metricCalculations'
import { readNum } from './readMetric'

const TRACKED_METRICS = [
  { id: 'C03', name: 'Posts Drafted', category: 'content' },
  { id: 'C09', name: 'Total Posts Posted', category: 'content' },
  { id: 'C10', name: 'Impressions', category: 'content' },
  { id: 'C13', name: 'Engagement Total', category: 'content' },
  { id: 'C14', name: 'Profile Views', category: 'content' },
  { id: 'C15', name: 'New Followers', category: 'content' },
  { id: 'C16', name: 'Total Follower Count', category: 'content' },
  { id: 'C17', name: 'Engagement on Other Profiles', category: 'content' },
  { id: 'L10', name: 'Connection Requests Sent', category: 'leadgen' },
  { id: 'L11', name: 'Accepted Invitations', category: 'leadgen' },
  { id: 'L13', name: 'Answered Messages', category: 'leadgen' },
  { id: 'L15', name: 'Positive Replies', category: 'leadgen' },
  { id: 'L16', name: 'Negative Replies', category: 'leadgen' },
  { id: 'L19', name: 'Existing Conn Messages Sent', category: 'leadgen' },
  { id: 'L20', name: 'Existing Conn Answered', category: 'leadgen' },
  { id: 'L24', name: 'Meetings Booked', category: 'leadgen' },
]

export async function detectAndUpdateHighScores(
  clientId: string,
  weekStart: string,
  contentMetrics: Record<string, any>,
  leadgenMetrics: Record<string, any>
): Promise<string[]> {

  // Build values map
  const values: Record<string, { value: number; name: string }> = {}

  TRACKED_METRICS.forEach(({ id, name, category }) => {
    const col = category === 'content' ? contentMetrics : leadgenMetrics
    const val = readNum(col, id)
    if (val !== null && val > 0) {
      values[id] = { value: val, name }
    }
  })

  // Add live-calculated rates
  const L10 = readNum(leadgenMetrics, 'L10')
  const L11 = readNum(leadgenMetrics, 'L11')
  const L13 = readNum(leadgenMetrics, 'L13')
  const L15 = readNum(leadgenMetrics, 'L15')

  const accRate = calcAcceptanceRate(L10, L11)
  const respRate = calcResponseRate(L11, L13)
  const posRate = calcPositiveRate(L13, L15)

  if (accRate && accRate > 0) values['L12'] = { value: accRate, name: 'Acceptance Rate' }
  if (respRate && respRate > 0) values['L14'] = { value: respRate, name: 'Response Rate' }
  if (posRate && posRate > 0) values['L17'] = { value: posRate, name: 'Positive Response Rate' }

  if (Object.keys(values).length === 0) return []

  // Fetch all existing high scores for this client in ONE query
  const { data: existing } = await supabase
    .from('high_scores')
    .select('metric_id, lifetime_high, achieved_week')
    .eq('client_id', clientId)

  const existingMap: Record<string, { lifetime_high: number | null; achieved_week: string | null }> = {}
  existing?.forEach(s => { existingMap[s.metric_id] = s })

  // Find which ones are new records
  const newRecords: string[] = []
  const upsertRows: any[] = []

  for (const [metricId, { value, name }] of Object.entries(values)) {
    const current = existingMap[metricId]
    if (!current || current.lifetime_high === null || value > current.lifetime_high) {
      upsertRows.push({
        client_id: clientId,
        metric_id: metricId,
        metric_name: name,
        lifetime_high: value,
        achieved_week: weekStart,
        previous_high: current?.lifetime_high ?? null,
        updated_at: new Date().toISOString()
      })
      newRecords.push(name)
    }
  }

  // Batch upsert in one query
  if (upsertRows.length > 0) {
    const { error } = await supabase
      .from('high_scores')
      .upsert(upsertRows, { onConflict: 'client_id,metric_id' })

    if (error) {
      console.error('High score upsert failed:', error.message)
    } else {
      console.log(`✅ High scores updated: ${upsertRows.length} records checked, ${newRecords.length} new highs`)
    }
  }

  return newRecords
}
