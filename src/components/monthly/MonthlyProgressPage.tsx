import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth'
import { ALL_METRICS } from '@/data/metrics'
import { readNum } from '@/utils/readMetric'
import { buildWeekMetrics } from '@/utils/metricCalculations'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, Target, TrendingUp, AlertTriangle, CheckCircle2, Minus, ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'

// ─── helpers ─────────────────────────────────────────────────────────────────

function getMonthOptions(count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - i)
    return {
      period: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    }
  })
}

/** Returns all Monday week-starts that fall fully or partially inside the month */
function getWeeksInMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)) // last day of month

  // Start from the Monday on or before the 1st of the month
  const cursor = new Date(Date.UTC(year, month - 1, 1))
  const dow = cursor.getUTCDay()
  cursor.setUTCDate(cursor.getUTCDate() - (dow === 0 ? 6 : dow - 1))

  const weeks: string[] = []
  while (cursor <= lastDay) {
    const weekEnd = new Date(cursor)
    weekEnd.setUTCDate(cursor.getUTCDate() + 6)
    // Include if week overlaps with the month at all
    const overlap = cursor.getUTCMonth() + 1 === month ||
      (cursor.getUTCFullYear() * 12 + cursor.getUTCMonth()) < (year * 12 + month - 1) &&
      weekEnd.getUTCMonth() + 1 === month
    if (overlap || weekEnd >= new Date(Date.UTC(year, month - 1, 1))) {
      weeks.push(cursor.toISOString().split('T')[0])
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return weeks
}

/** How many weeks have started on or before today */
function weeksElapsed(weekStarts: string[]): number {
  const today = new Date().toISOString().split('T')[0]
  return weekStarts.filter(w => w <= today).length
}

function fmt(v: number | null): string {
  if (v === null) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return v.toLocaleString('en-IN')
  return String(Math.round(v * 10) / 10)
}

type Status = 'hit' | 'on_track' | 'slightly_behind' | 'behind' | 'no_data'

function getStatus(actual: number | null, target: number, elapsed: number, total: number): Status {
  if (actual === null || actual === 0) return 'no_data'
  const pct = actual / target
  if (pct >= 1) return 'hit'
  const expectedFraction = total > 0 ? elapsed / total : 0
  const ratio = expectedFraction > 0 ? pct / expectedFraction : pct
  if (ratio >= 1) return 'on_track'
  if (ratio >= 0.75) return 'slightly_behind'
  return 'behind'
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string; barColor: string; icon: React.ReactNode }> = {
  hit:             { label: 'Hit!',            color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   barColor: 'bg-blue-500',   icon: <CheckCircle2 className="w-3 h-3" /> },
  on_track:        { label: 'On Track',        color: 'text-green-700',  bg: 'bg-green-50 border-green-200', barColor: 'bg-green-500',  icon: <TrendingUp className="w-3 h-3" /> },
  slightly_behind: { label: 'Slightly Behind', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200', barColor: 'bg-amber-400',  icon: <AlertTriangle className="w-3 h-3" /> },
  behind:          { label: 'Behind',          color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     barColor: 'bg-red-500',    icon: <AlertTriangle className="w-3 h-3" /> },
  no_data:         { label: 'No Data',         color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',   barColor: 'bg-gray-300',   icon: <Minus className="w-3 h-3" /> },
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface MetricRowProps {
  metricId: string
  metricName: string
  target: number
  actual: number | null
  weeklyActuals: Record<string, number | null>   // weekStart → value
  weekStarts: string[]
  elapsed: number
  unit?: string
}

function MetricRow({ metricId, metricName, target, actual, weeklyActuals, weekStarts, elapsed, unit }: MetricRowProps) {
  const [open, setOpen] = useState(false)
  const pct = actual !== null ? Math.min(Math.round((actual / target) * 100), 100) : 0
  const expectedPct = weekStarts.length > 0 ? Math.round((elapsed / weekStarts.length) * 100) : 0
  const status = getStatus(actual, target, elapsed, weekStarts.length)
  const meta = STATUS_META[status]

  return (
    <div className="border-b last:border-b-0 border-gray-100">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        {/* Name */}
        <div className="w-52 shrink-0">
          <span className="text-sm font-semibold text-gray-900">{metricName}</span>
          <span className="ml-1.5 text-[10px] text-gray-400 font-mono">{metricId}</span>
        </div>

        {/* Progress bar with expected marker */}
        <div className="flex-1 relative">
          <div className="h-2.5 bg-gray-100 rounded-full overflow-visible relative">
            {/* Actual fill */}
            <div
              className={cn('h-full rounded-full transition-all duration-500', meta.barColor)}
              style={{ width: `${pct}%` }}
            />
            {/* Expected-by-now marker */}
            {expectedPct > 0 && expectedPct < 100 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-400 rounded-full"
                style={{ left: `${expectedPct}%` }}
                title={`Expected by now: ${expectedPct}%`}
              />
            )}
          </div>
        </div>

        {/* Actual / Target */}
        <div className="w-28 text-right shrink-0">
          <span className={cn('text-sm font-black tabular-nums', status === 'no_data' ? 'text-gray-400' : 'text-gray-900')}>
            {fmt(actual)}{unit === '%' ? '%' : ''}
          </span>
          <span className="text-gray-400 text-xs"> / {fmt(target)}{unit === '%' ? '%' : ''}</span>
        </div>

        {/* % */}
        <div className="w-12 text-right shrink-0 tabular-nums text-sm font-bold text-gray-600">
          {actual !== null ? `${Math.round((actual / target) * 100)}%` : '—'}
        </div>

        {/* Status badge */}
        <div className={cn('flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0', meta.color, meta.bg)}>
          {meta.icon}
          {meta.label}
        </div>

        {/* Expand toggle */}
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </div>

      {/* Week breakdown */}
      {open && (
        <div className="px-4 pb-3 flex gap-3 flex-wrap bg-gray-50/40">
          {weekStarts.map(ws => {
            const v = weeklyActuals[ws]
            const d = new Date(ws + 'T00:00:00Z')
            const lbl = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
            return (
              <div key={ws} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-gray-400 font-semibold uppercase">{lbl}</span>
                <span className={cn(
                  'text-sm font-black tabular-nums',
                  v === null ? 'text-gray-300' : v > 0 ? 'text-gray-800' : 'text-gray-400'
                )}>
                  {v !== null ? fmt(v) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export function MonthlyProgressPage() {
  const { session } = useAuth()
  const monthOptions = useMemo(() => getMonthOptions(12), [])

  const [monthIdx, setMonthIdx] = useState(0)           // index into monthOptions
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [targets, setTargets] = useState<Record<string, number>>({})       // metricId → target
  const [weeklyRows, setWeeklyRows] = useState<Record<string, Record<string, unknown>>>({})  // weekStart → metrics obj
  const [loading, setLoading] = useState(false)
  const [hasTargets, setHasTargets] = useState<boolean | null>(null)      // null = unknown

  const selectedMonth = monthOptions[monthIdx].period
  const weekStarts = useMemo(() => getWeeksInMonth(selectedMonth), [selectedMonth])
  const elapsed = useMemo(() => weeksElapsed(weekStarts), [weekStarts])

  // Fetch clients once
  useEffect(() => {
    supabase.from('clients').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => {
        setClients(data ?? [])
        if (data && data.length > 0) setSelectedClientId(data[0].id)
      })
  }, [])

  // Fetch targets + weekly data when client or month changes
  const fetchData = useCallback(async () => {
    if (!selectedClientId || !selectedMonth) return
    setLoading(true)
    try {
      const [{ data: targetRows }, { data: dataRows }] = await Promise.all([
        supabase
          .from('targets')
          .select('metric_id, target_value')
          .eq('client_id', selectedClientId)
          .eq('target_type', 'monthly')
          .eq('period', selectedMonth),
        supabase
          .from('weekly_data')
          .select('week_start, content_metrics, leadgen_metrics')
          .eq('client_id', selectedClientId)
          .in('week_start', weekStarts),
      ])

      const tMap: Record<string, number> = {}
      targetRows?.forEach(t => { if (t.target_value !== null) tMap[t.metric_id] = t.target_value })
      setTargets(tMap)
      setHasTargets(Object.keys(tMap).length > 0)

      const wMap: Record<string, Record<string, unknown>> = {}
      dataRows?.forEach(r => {
        wMap[r.week_start] = {
          content_metrics: r.content_metrics,
          leadgen_metrics: r.leadgen_metrics,
        }
      })
      setWeeklyRows(wMap)
    } finally {
      setLoading(false)
    }
  }, [selectedClientId, selectedMonth, weekStarts])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Compute actuals ────────────────────────────────────────────────────────
  const { metricActuals, weeklyActuals } = useMemo(() => {
    const metricActuals: Record<string, number | null> = {}
    // weeklyActuals[metricId][weekStart] = value
    const weeklyActuals: Record<string, Record<string, number | null>> = {}

    const metricsWithTargets = ALL_METRICS.filter(m => targets[m.id] !== undefined)

    for (const metric of metricsWithTargets) {
      weeklyActuals[metric.id] = {}
      let total: number | null = null
      let count = 0
      const isRate = metric.unit === '%'

      for (const ws of weekStarts) {
        const rowData = weeklyRows[ws]
        if (!rowData) { weeklyActuals[metric.id][ws] = null; continue }

        // Build a fake weekRow object for buildWeekMetrics
        const fakeRow = {
          client_id: selectedClientId,
          content_metrics: rowData.content_metrics,
          leadgen_metrics: rowData.leadgen_metrics,
          content_submitted_at: true, // treat as submitted so buildWeekMetrics reads values
          leadgen_submitted_at: true,
        }

        let val: number | null = null
        if (metric.type === 'auto') {
          const built = (buildWeekMetrics(fakeRow) ?? {}) as Record<string, number | null>
          val = built[metric.id] ?? null
        } else {
          const col = metric.category === 'content'
            ? rowData.content_metrics as Record<string, unknown>
            : rowData.leadgen_metrics as Record<string, unknown>
          val = readNum(col as Record<string, unknown>, metric.id)
        }

        weeklyActuals[metric.id][ws] = val
        if (val !== null) { total = (total ?? 0) + val; count++ }
      }

      metricActuals[metric.id] = total !== null && isRate ? total / count : total
    }

    return { metricActuals, weeklyActuals }
  }, [targets, weeklyRows, weekStarts, selectedClientId])

  // ── Summary counts ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const counts: Record<Status, number> = { hit: 0, on_track: 0, slightly_behind: 0, behind: 0, no_data: 0 }
    for (const [mid, target] of Object.entries(targets)) {
      const s = getStatus(metricActuals[mid] ?? null, target, elapsed, weekStarts.length)
      counts[s]++
    }
    return counts
  }, [targets, metricActuals, elapsed, weekStarts.length])

  const targetedMetrics = ALL_METRICS.filter(m => targets[m.id] !== undefined)
  const contentMetrics = targetedMetrics.filter(m => m.category === 'content')
  const leadgenMetrics = targetedMetrics.filter(m => m.category === 'leadgen')

  const daysLeft = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(Date.UTC(y, m, 0))
    const today = new Date()
    const diff = Math.max(0, Math.ceil((lastDay.getTime() - today.getTime()) / 86400000))
    return diff
  }, [selectedMonth])

  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Monthly Targets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Month-to-date progress vs monthly targets
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled={monthIdx >= monthOptions.length - 1}
            onClick={() => setMonthIdx(i => i + 1)}
            className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-base font-black min-w-[140px] text-center px-2">
            {monthOptions[monthIdx].label}
          </div>
          <button
            disabled={monthIdx <= 0}
            onClick={() => setMonthIdx(i => i - 1)}
            className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Client tabs ──────────────────────────────────────────────── */}
      {clients.length > 0 && (
        <div className="flex gap-1 flex-wrap border-b pb-0">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className={cn(
                'px-3 py-2 text-sm font-bold rounded-t-md border-b-2 transition-colors whitespace-nowrap',
                selectedClientId === c.id
                  ? 'border-[#FFC947] text-foreground bg-[#FFC947]/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      )}

      {!loading && hasTargets === false && (
        <div className="py-16 text-center space-y-3">
          <Target className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">No monthly targets set for this client + month.</p>
          <Link
            to="/settings/targets"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFC947] hover:underline underline-offset-2"
          >
            Set targets in Settings <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {!loading && hasTargets === true && (
        <>
          {/* ── Status summary + month stats ──────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status chips */}
            {(Object.entries(summary) as [Status, number][])
              .filter(([, count]) => count > 0)
              .map(([status, count]) => {
                const meta = STATUS_META[status]
                return (
                  <span key={status} className={cn('flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-bold', meta.color, meta.bg)}>
                    {meta.icon}
                    {count} {meta.label}
                  </span>
                )
              })
            }

            <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground font-medium">
              <span>Week {elapsed} of {weekStarts.length}</span>
              <span className="w-px h-4 bg-border" />
              <span>{Math.round((elapsed / weekStarts.length) * 100)}% of month elapsed</span>
              {isCurrentMonth && daysLeft > 0 && (
                <>
                  <span className="w-px h-4 bg-border" />
                  <span className={cn('font-bold', daysLeft <= 7 ? 'text-red-600' : 'text-foreground')}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Progress table ─────────────────────────────────────────── */}
          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="w-52 shrink-0">Metric</div>
            <div className="flex-1">Progress</div>
            <div className="w-28 text-right shrink-0">MTD / Target</div>
            <div className="w-12 text-right shrink-0">%</div>
            <div className="w-28 shrink-0 text-center">Status</div>
            <div className="w-5 shrink-0" />
          </div>

          {/* Content section */}
          {contentMetrics.length > 0 && (
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <div className="bg-muted/40 px-4 py-2 border-b">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Content</span>
              </div>
              {contentMetrics.map(m => (
                <MetricRow
                  key={m.id}
                  metricId={m.id}
                  metricName={m.name}
                  target={targets[m.id]}
                  actual={metricActuals[m.id] ?? null}
                  weeklyActuals={weeklyActuals[m.id] ?? {}}
                  weekStarts={weekStarts}
                  elapsed={elapsed}
                  unit={m.unit}
                />
              ))}
            </div>
          )}

          {/* Leadgen section */}
          {leadgenMetrics.length > 0 && (
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <div className="bg-muted/40 px-4 py-2 border-b">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lead Generation</span>
              </div>
              {leadgenMetrics.map(m => (
                <MetricRow
                  key={m.id}
                  metricId={m.id}
                  metricName={m.name}
                  target={targets[m.id]}
                  actual={metricActuals[m.id] ?? null}
                  weeklyActuals={weeklyActuals[m.id] ?? {}}
                  weekStarts={weekStarts}
                  elapsed={elapsed}
                  unit={m.unit}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
