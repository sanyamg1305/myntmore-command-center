import { supabase } from "@/integrations/supabase/client"
import * as XLSX from 'xlsx'
import { CONTENT_METRICS, LEADGEN_METRICS } from "@/data/metrics"
import {
  TJ_INSTAGRAM_METRICS, TJ_YOUTUBE_METRICS, TJ_PODCAST_METRICS, TJ_VIDEO_METRICS,
  MM_LINKEDIN_METRICS, MM_INSTAGRAM_METRICS, MM_WEBSITE_METRICS, MM_OTHER_METRICS,
} from "@/data/company_metrics"
import { readNum, readText, readBool } from "@/utils/readMetric"
import { buildWeekMetrics } from "@/utils/metricCalculations"

// ─── helpers ────────────────────────────────────────────────────────────────

function n(v: number | null | undefined): number | string {
  return v ?? ''
}

function readField(metrics: Record<string, unknown>, id: string): number | string | boolean | null {
  const raw = metrics as Record<string, unknown>
  const field = raw[id] as Record<string, unknown> | number | string | boolean | null | undefined
  if (field === null || field === undefined) return ''
  if (typeof field === 'object' && 'value' in field) {
    const v = (field as { value: unknown }).value
    if (v === null || v === undefined || v === '') return ''
    if (typeof v === 'boolean') return v
    const num = Number(v)
    return isNaN(num) ? String(v) : num
  }
  if (typeof field === 'boolean') return field
  if (typeof field === 'number') return field
  if (typeof field === 'string') return field.trim() || ''
  return ''
}

function asRecord(json: unknown): Record<string, unknown> {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return json as Record<string, unknown>
  }
  return {}
}

function pct(num: number | null, den: number | null): string {
  if (num === null || den === null || den === 0) return ''
  const r = (num / den) * 100
  return (Math.min(r, 100)).toFixed(1) + '%'
}

function autoWidth(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  const cols: { wch: number }[] = []
  for (let C = range.s.c; C <= range.e.c; C++) {
    let max = 10
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
      if (cell?.v != null) {
        const len = String(cell.v).length
        if (len > max) max = len
      }
    }
    cols.push({ wch: Math.min(max + 2, 40) })
  }
  ws['!cols'] = cols
}

// ─── sheet builders ──────────────────────────────────────────────────────────

function buildClientSheet(
  weeklyRows: ReturnType<typeof Object.values>,
  clients: { id: string; name: string; company: string | null }[],
  healthScores: { client_id: string | null; week_start: string; health_score: number | null; previous_score: number | null }[],
) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  const rows = (weeklyRows as any[])
    .sort((a, b) => {
      const nameA = clientMap[a.client_id]?.name ?? ''
      const nameB = clientMap[b.client_id]?.name ?? ''
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return a.week_start.localeCompare(b.week_start)
    })
    .map((row: any) => {
      const client = clientMap[row.client_id] ?? { name: 'Unknown', company: '' }
      const cm = asRecord(row.content_metrics)
      const lm = asRecord(row.leadgen_metrics)
      const built = (buildWeekMetrics(row) ?? {}) as Record<string, number | null>

      // Rates
      const L05 = built.L05
      const L12 = built.L12
      const L14 = built.L14
      const L17 = built.L17
      const L21 = built.L21
      const L26 = built.L26
      const C09  = built.C09 ?? (readNum(cm, 'C06') ?? 0) + (readNum(cm, 'C07') ?? 0) + (readNum(cm, 'C08') ?? 0)

      const health = healthScores.find(
        h => h.client_id === row.client_id && h.week_start === row.week_start,
      )

      const base: Record<string, unknown> = {
        'Client': client.name,
        'Company': client.company ?? '',
        'Week Start': row.week_start,
        'Week Label': row.week_label ?? '',
        'Content Submitted': row.content_submitted_at ? 'Yes' : 'No',
        'Leadgen Submitted': row.leadgen_submitted_at ? 'Yes' : 'No',
      }

      // Content metrics
      for (const m of CONTENT_METRICS) {
        if (m.type === 'auto') continue // add computed below
        const label = `[C] ${m.name}`
        base[label] = readField(cm, m.id)
      }
      base['[C] Total Posts (calc)'] = n(C09)

      // Leadgen metrics
      for (const m of LEADGEN_METRICS) {
        if (m.type === 'auto') continue
        const label = `[L] ${m.name}`
        base[label] = readField(lm, m.id)
      }
      // Computed rates
      base['[L] InMail Acceptance %'] = L05 != null ? L05.toFixed(1) + '%' : ''
      base['[L] Acceptance Rate %']   = L12 != null ? L12.toFixed(1) + '%' : ''
      base['[L] Response Rate %']     = L14 != null ? L14.toFixed(1) + '%' : ''
      base['[L] Positive Rate %']     = L17 != null ? L17.toFixed(1) + '%' : ''
      base['[L] Existing Conn Rate %']= L21 != null ? L21.toFixed(1) + '%' : ''
      base['[L] Show-Up Rate %']      = L26 != null ? L26.toFixed(1) + '%' : ''

      // Health
      base['Health Score'] = n(health?.health_score)
      base['Prev Score']   = n(health?.previous_score)
      base['Score Delta']  = health?.health_score != null && health?.previous_score != null
        ? health.health_score - health.previous_score
        : ''

      return base
    })

  return rows
}

function buildTjSheet(rows: any[]) {
  return rows
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((row: any) => {
      const ig = asRecord(row.instagram)
      const yt = asRecord(row.youtube)
      const nl = asRecord(row.linkedin_newsletter)
      const em = asRecord(row.email_newsletter)
      const pod = asRecord(row.podcast)
      const vid = asRecord(row.video_pipeline)

      const base: Record<string, unknown> = {
        'Week Start': row.week_start,
        'Week Label': row.week_label ?? '',
      }
      for (const m of TJ_INSTAGRAM_METRICS)  base[`[IG] ${m.name}`]      = readField(ig, m.id)
      for (const m of TJ_YOUTUBE_METRICS)    base[`[YT] ${m.name}`]      = readField(yt, m.id)
      for (const m of TJ_PODCAST_METRICS)    base[`[Newsletter] ${m.name}`] = readField({ ...nl, ...em, ...pod }, m.id)
      for (const m of TJ_VIDEO_METRICS)      base[`[Video] ${m.name}`]   = readField(vid, m.id)
      return base
    })
}

function buildMmSheet(rows: any[]) {
  return rows
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((row: any) => {
      const li  = asRecord(row.linkedin)
      const ig  = asRecord(row.instagram)
      const web = asRecord(row.website)
      const qr  = asRecord(row.quora)
      const rd  = asRecord(row.reddit)

      const base: Record<string, unknown> = {
        'Week Start': row.week_start,
        'Week Label': row.week_label ?? '',
      }
      for (const m of MM_LINKEDIN_METRICS)   base[`[LI] ${m.name}`]  = readField(li, m.id)
      for (const m of MM_INSTAGRAM_METRICS)  base[`[IG] ${m.name}`]  = readField(ig, m.id)
      for (const m of MM_WEBSITE_METRICS)    base[`[Web] ${m.name}`] = readField(web, m.id)
      for (const m of MM_OTHER_METRICS) {
        const prefix = m.id.startsWith('MMO0') && parseInt(m.id.slice(3)) <= 4 ? '[Quora]' : '[Reddit]'
        base[`${prefix} ${m.name}`] = readField(m.id.startsWith('MMO0') && parseInt(m.id.slice(3)) <= 4 ? qr : rd, m.id)
      }
      return base
    })
}

function buildSalesSheet(rows: any[]) {
  const SALES_FIELDS: Record<string, string> = {
    SO01: 'TJ: ICPs Identified',
    SO02: 'TJ: Conn Req Sent',
    SO03: 'TJ: Accepted',
    SO04: 'TJ: Messages Sent',
    SO05: 'TJ: Replied',
    SO06: 'TJ: Meetings Booked',
    SO07: 'TJ: Hot Leads',
    SO10: 'Jahnvi: ICPs Identified',
    SO11: 'Jahnvi: Conn Req Sent',
    SO12: 'Jahnvi: Accepted',
    SO13: 'Jahnvi: Messages Sent',
    SO14: 'Jahnvi: Replied',
    SO15: 'Jahnvi: Meetings Booked',
    SO16: 'Jahnvi: Hot Leads',
    SO20: 'Shirin: ICPs Identified',
    SO21: 'Shirin: Conn Req Sent',
    SO22: 'Shirin: Accepted',
    SO23: 'Shirin: Messages Sent',
    SO24: 'Shirin: Replied',
    SO25: 'Shirin: Meetings Booked',
    SO26: 'Shirin: Hot Leads',
    SO30: 'Cold Email: Sent',
    SO31: 'Cold Email: Opened',
    SO32: 'Cold Email: Replied',
    SO33: 'Cold Email: Hot Leads',
    SO40: 'Meetings: Booked',
    SO41: 'Meetings: Attended',
    SO42: 'Meetings: Proposals',
    SO43: 'Meetings: Proposals Sent',
    SO44: 'Meetings: Follow-ups',
    SO46: 'Meetings: Conversions',
    SO47: 'Revenue Per Deal (₹)',
    SO48: 'Avg Deal Value (₹)',
    SO49: 'Total Revenue (₹)',
  }

  return rows
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((row: any) => {
      const flat: Record<string, unknown> = {
        ...asRecord(row.tj_outreach),
        ...asRecord(row.jahnvi_outreach),
        ...asRecord(row.shirin_outreach),
        ...asRecord(row.cold_email),
        ...asRecord(row.meeting_tracker),
      }

      const base: Record<string, unknown> = {
        'Week Start': row.week_start,
        'Week Label': row.week_label ?? '',
      }
      for (const [id, label] of Object.entries(SALES_FIELDS)) {
        const v = flat[id]
        base[label] = v != null ? (typeof v === 'object' && 'value' in (v as object) ? (v as any).value : v) : ''
      }
      return base
    })
}

function buildHealthSheet(
  healthScores: any[],
  clients: { id: string; name: string; company: string | null }[],
) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  return healthScores
    .sort((a, b) => {
      const na = clientMap[a.client_id]?.name ?? ''
      const nb = clientMap[b.client_id]?.name ?? ''
      if (na !== nb) return na.localeCompare(nb)
      return a.week_start.localeCompare(b.week_start)
    })
    .map((h: any) => ({
      'Client': clientMap[h.client_id]?.name ?? '',
      'Company': clientMap[h.client_id]?.company ?? '',
      'Week Start': h.week_start,
      'Health Score': n(h.health_score),
      'Prev Score': n(h.previous_score),
      'Delta': h.health_score != null && h.previous_score != null ? h.health_score - h.previous_score : '',
      'On-Track Streak': n(h.on_track_streak),
      'Posts On-Target Streak': n(h.posts_on_target_streak),
    }))
}

function buildTargetsSheet(
  targets: any[],
  clients: { id: string; name: string }[],
) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const ALL = [...CONTENT_METRICS, ...LEADGEN_METRICS]
  const metricMap = Object.fromEntries(ALL.map(m => [m.id, m.name]))

  return targets
    .sort((a, b) => {
      const na = clientMap[a.client_id]?.name ?? ''
      const nb = clientMap[b.client_id]?.name ?? ''
      if (na !== nb) return na.localeCompare(nb)
      return a.period.localeCompare(b.period)
    })
    .map((t: any) => ({
      'Client': clientMap[t.client_id]?.name ?? '',
      'Metric ID': t.metric_id,
      'Metric Name': metricMap[t.metric_id] ?? t.metric_id,
      'Target Type': t.target_type ?? '',
      'Period': t.period,
      'Target Value': n(t.target_value),
    }))
}

function buildHighScoresSheet(
  highScores: any[],
  clients: { id: string; name: string }[],
) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  return highScores
    .sort((a, b) => (clientMap[a.client_id]?.name ?? '').localeCompare(clientMap[b.client_id]?.name ?? ''))
    .map((s: any) => ({
      'Client': clientMap[s.client_id]?.name ?? '',
      'Metric ID': s.metric_id,
      'Metric Name': s.metric_name ?? '',
      'Lifetime High': n(s.lifetime_high),
      'Previous High': n(s.previous_high),
      'Achieved Week': s.achieved_week ?? '',
      'Updated At': s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-GB') : '',
    }))
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function generateLifetimeExport(options: {
  upToDate: string          // inclusive end date (YYYY-MM-DD)
  fromDate?: string         // optional start date
  clientId?: string         // optional — filter to one client
}) {
  const { upToDate, fromDate, clientId } = options

  const [
    { data: clients },
    { data: weeklyData },
    { data: healthScores },
    { data: tjData },
    { data: mmData },
    { data: salesData },
    { data: targets },
    { data: highScores },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company, status')
      .order('name'),

    supabase
      .from('weekly_data')
      .select('*')
      .lte('week_start', upToDate)
      .gte('week_start', fromDate ?? '2000-01-01')
      .then(r => clientId ? { data: r.data?.filter(w => w.client_id === clientId) ?? [] } : r),

    supabase
      .from('client_health_scores')
      .select('*')
      .lte('week_start', upToDate)
      .gte('week_start', fromDate ?? '2000-01-01'),

    supabase
      .from('tj_weekly_data')
      .select('*')
      .lte('week_start', upToDate)
      .gte('week_start', fromDate ?? '2000-01-01')
      .order('week_start'),

    supabase
      .from('mm_weekly_data')
      .select('*')
      .lte('week_start', upToDate)
      .gte('week_start', fromDate ?? '2000-01-01')
      .order('week_start'),

    supabase
      .from('sales_weekly_data')
      .select('*')
      .lte('week_start', upToDate)
      .gte('week_start', fromDate ?? '2000-01-01')
      .order('week_start'),

    supabase
      .from('targets')
      .select('*')
      .then(r => clientId ? { data: r.data?.filter(t => t.client_id === clientId) ?? [] } : r),

    supabase
      .from('high_scores')
      .select('*')
      .then(r => clientId ? { data: r.data?.filter(h => h.client_id === clientId) ?? [] } : r),
  ])

  const allClients = clients ?? []
  const displayClients = clientId ? allClients.filter(c => c.id === clientId) : allClients

  const wb = XLSX.utils.book_new()

  // Sheet 1 — Client Weekly Data
  const clientRows = buildClientSheet(weeklyData ?? [], displayClients, healthScores ?? [])
  if (clientRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(clientRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Client Weekly Data')
  }

  // Sheet 2 — Health Scores
  const healthRows = buildHealthSheet(
    clientId
      ? (healthScores ?? []).filter(h => h.client_id === clientId)
      : healthScores ?? [],
    displayClients,
  )
  if (healthRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(healthRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Health Scores')
  }

  // Sheet 3 — TJ Brand (not filtered by client)
  if (!clientId && (tjData ?? []).length > 0) {
    const tjRows = buildTjSheet(tjData ?? [])
    const ws = XLSX.utils.json_to_sheet(tjRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'TJ Brand')
  }

  // Sheet 4 — MM Content (not filtered by client)
  if (!clientId && (mmData ?? []).length > 0) {
    const mmRows = buildMmSheet(mmData ?? [])
    const ws = XLSX.utils.json_to_sheet(mmRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'MM Content')
  }

  // Sheet 5 — Sales (not filtered by client)
  if (!clientId && (salesData ?? []).length > 0) {
    const salesRows = buildSalesSheet(salesData ?? [])
    const ws = XLSX.utils.json_to_sheet(salesRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Sales & Outreach')
  }

  // Sheet 6 — Targets
  const targetRows = buildTargetsSheet(targets ?? [], displayClients)
  if (targetRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(targetRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Targets')
  }

  // Sheet 7 — High Scores
  const hsRows = buildHighScoresSheet(highScores ?? [], displayClients)
  if (hsRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(hsRows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'High Scores')
  }

  // Summary sheet (always first)
  const summaryData = [
    ['Export Summary', ''],
    ['Generated At', new Date().toLocaleString('en-IN')],
    ['Up To Date', upToDate],
    ['From Date', fromDate ?? 'All time'],
    ['Client Filter', clientId ? (displayClients[0]?.name ?? clientId) : 'All clients'],
    ['', ''],
    ['Sheet', 'Row Count'],
    ['Client Weekly Data', clientRows.length],
    ['Health Scores', healthRows.length],
    ...(!clientId ? [
      ['TJ Brand', (tjData ?? []).length],
      ['MM Content', (mmData ?? []).length],
      ['Sales & Outreach', (salesData ?? []).length],
    ] : []),
    ['Targets', targetRows.length],
    ['High Scores', hsRows.length],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 24 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
  // Move Summary to first position
  wb.SheetNames = ['Summary', ...wb.SheetNames.filter(s => s !== 'Summary')]

  // Trigger download
  const clientLabel = clientId ? `_${displayClients[0]?.name?.replace(/\s+/g, '-') ?? clientId}` : ''
  const fileName = `myntmore-export${clientLabel}_upto-${upToDate}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ─── legacy weekly text summary (kept for backward compat) ──────────────────

export async function generateWeeklySummary(weekStart: string) {
  const [
    { data: healthScores },
    { data: weeklyData },
    { data: clients },
    { data: alerts },
    { data: records },
    { data: actionables },
    { data: tjData },
    { data: salesData },
  ] = await Promise.all([
    supabase.from('client_health_scores').select('*').eq('week_start', weekStart),
    supabase.from('weekly_data').select('*').eq('week_start', weekStart),
    supabase.from('clients').select('id, name, company').eq('status', 'active'),
    supabase.from('client_alerts').select('*, clients(name)').eq('week_start', weekStart).eq('is_resolved', false),
    supabase.from('high_scores').select('*').eq('achieved_week', weekStart),
    supabase.from('actionables').select('*').eq('week_start', weekStart),
    supabase.from('tj_weekly_data').select('*').eq('week_start', weekStart).maybeSingle(),
    supabase.from('sales_weekly_data').select('*').eq('week_start', weekStart).maybeSingle(),
  ])

  let text = `MYNTMORE WEEKLY REVIEW — ${new Date(weekStart).toLocaleDateString()} – ${new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  text += `CLIENT PERFORMANCE SNAPSHOT\n────────────────────────────\n`

  clients?.forEach(client => {
    const health = healthScores?.find(h => h.client_id === client.id)
    const data = weeklyData?.find(w => w.client_id === client.id)
    const score = health?.health_score ?? '-'
    const delta = health?.previous_score ? Number(score) - health.previous_score : 0
    const deltaText = delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : `→0`
    const meetings = (data?.leadgen_metrics as any)?.L24?.value ?? 0
    const positiveReplies = (data?.leadgen_metrics as any)?.L15?.value ?? 0
    const posts = (data?.content_metrics as any)?.C09?.value ?? 0
    text += `${client.name.split(' ')[0].padEnd(12)} | Score: ${score.toString().padEnd(3)} (${deltaText.padEnd(3)}) | Mtg: ${meetings.toString().padEnd(2)} | Pos Replies: ${positiveReplies.toString().padEnd(2)} | Posts: ${posts}/5 ${posts >= 5 ? '✓' : ''}\n`
  })

  if (tjData) {
    const tj = tjData as any
    text += `\nTJ PERSONAL BRAND\n────────────────────────────\n`
    text += `IG: ${tj.instagram?.TJI11?.value || '-'} followers (+${tj.instagram?.TJI10?.value || '0'})\n`
    text += `YT: ${tj.youtube?.TJY07?.value || '-'} subs (+${tj.youtube?.TJY06?.value || '0'})\n`
    text += `News: ${tj.linkedin_newsletter?.TJP01?.value || tj.email_newsletter?.TJP02?.value || '-'} subs | Pod: ${tj.podcast?.TJP03?.value || '-'} listens\n`
  }

  if (salesData) {
    text += `\nSALES & OUTREACH\n────────────────────────────\n`
    const m = (salesData as any).meeting_tracker || {}
    text += `Booked: ${m.SO40 || '0'} | Proposals: ${m.SO42 || '0'} | Conversions: ${m.SO46 || '0'}\n`
    text += `Revenue: ₹${(parseFloat(m.SO49 || 0) / 100000).toFixed(1)}L\n`
  }

  text += `\n⚠️ ALERTS\n`
  alerts?.forEach(alert => { text += `${(alert as any).clients?.name} — ${alert.alert_message}\n` })
  if (!alerts || alerts.length === 0) text += `No active alerts.\n`

  text += `\n🏆 NEW RECORDS THIS WEEK\n`
  records?.forEach((record: any) => {
    text += `${record.client_name} — ${record.metric_name}: ${record.lifetime_high} (prev best: ${record.previous_high || '-'})\n`
  })
  if (!records || records.length === 0) text += `No new records set.\n`

  const openActions = actionables?.filter(a => a.status !== 'done').length ?? 0
  text += `\n✅ OPEN ACTIONABLES: ${openActions}\n\n`
  text += `Generated by Myntmore Dashboard OS · command.myntmore.com`
  return text
}
