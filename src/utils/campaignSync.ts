import { supabase } from "@/integrations/supabase/client"
import { getWeeksInSameMonth, getWeekOptions } from "@/utils/weekUtils"

// Prevents concurrent syncs for the same client+week from clobbering each other
const _syncInFlight = new Set<string>()

export const syncAllCampaignTotals = async (clientId: string, weekStart: string) => {
  const key = `${clientId}:${weekStart}`
  if (_syncInFlight.has(key)) return
  _syncInFlight.add(key)
  try {
    await _syncAllCampaignTotalsInner(clientId, weekStart)
  } finally {
    _syncInFlight.delete(key)
  }
}

const _syncAllCampaignTotalsInner = async (clientId: string, weekStart: string) => {
  // Fetch all campaign data for this client + week
  const { data: campaignRows } = await supabase
    .from('campaign_weekly_data')
    .select('*')
    .eq('client_id', clientId)
    .eq('week_start', weekStart)

  if (!campaignRows || campaignRows.length === 0) return

  // Sum across all campaigns
  let connReq = 0, accepted = 0, answered = 0
  let positive = 0, negative = 0, hotLeads = 0
  let meetings = 0, existSent = 0, existRply = 0

  campaignRows.forEach((row: any) => {
    connReq   += row.conn_requests_sent    ?? 0
    accepted  += row.accepted              ?? 0
    answered  += row.answered              ?? 0
    positive  += row.positive_replies      ?? 0
    negative  += row.negative_replies      ?? 0
    hotLeads  += row.hot_leads             ?? 0
    meetings  += row.meetings_booked       ?? 0
    existSent += row.existing_conn_sent    ?? 0
    existRply += row.existing_conn_replied ?? 0
  })

  // Get existing weekly_data to preserve qualitative fields
  const { data: existing } = await supabase
    .from('weekly_data')
    .select('leadgen_metrics')
    .eq('client_id', clientId)
    .eq('week_start', weekStart)
    .maybeSingle()

  const current = (existing?.leadgen_metrics as Record<string, any>) ?? {}

  // Merge — only update numeric fields, keep text/qualitative untouched
  const merged = {
    ...current,
    L10: { ...(typeof current.L10 === 'object' ? current.L10 : {}), value: connReq },
    L11: { ...(typeof current.L11 === 'object' ? current.L11 : {}), value: accepted },
    L13: { ...(typeof current.L13 === 'object' ? current.L13 : {}), value: answered },
    L15: { ...(typeof current.L15 === 'object' ? current.L15 : {}), value: positive },
    L16: { ...(typeof current.L16 === 'object' ? current.L16 : {}), value: negative },
    L23: { ...(typeof current.L23 === 'object' ? current.L23 : {}), value: hotLeads },
    L24: { ...(typeof current.L24 === 'object' ? current.L24 : {}), value: meetings },
    L19: { ...(typeof current.L19 === 'object' ? current.L19 : {}), value: existSent },
    L20: { ...(typeof current.L20 === 'object' ? current.L20 : {}), value: existRply },
  }
  
  const weekOptions = getWeekOptions(52)
  const weekInfo = weekOptions.find((w: any) => w.weekStart === weekStart)

  // Write back to weekly_data
  const { error } = await supabase
    .from('weekly_data')
    .upsert({
      client_id: clientId,
      week_start: weekStart,
      week_end: weekInfo?.weekEnd ?? (() => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + 6)
        return d.toISOString().split('T')[0]
      })(),
      week_label: weekInfo?.label ?? (() => {
        const start = new Date(weekStart)
        const end = new Date(weekStart)
        end.setDate(end.getDate() + 6)
        const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`
      })(),
      leadgen_metrics: merged,
      leadgen_submitted_at: new Date().toISOString(),
    }, { onConflict: 'client_id,week_start' })

  if (error) {
    console.error('campaignSync: failed to write weekly_data totals:', error.message)
    throw error
  }
}
