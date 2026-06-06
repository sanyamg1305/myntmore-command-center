import React, { useState, useEffect, useMemo } from 'react'
import { Navigate, Link } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Users, Target, Activity, Instagram, Youtube, Mail, Mic, ArrowRight, LayoutDashboard, Send, Handshake, IndianRupee, FileText, Star, Globe, Linkedin, ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
// Removed lib/notifications import
import { Gift, Cake, Calendar, Bell, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getCurrentWeekStart, getPreviousWeekStart, getWeekLabel, getWeekOptions, getWeeksInSameMonth } from "@/utils/weekUtils"
import { CampaignMonthTable } from "../monday/CampaignMonthTable"
import { EditCampaignModal } from "../monday/EditCampaignModal"
import { CONTENT_METRICS, LEADGEN_METRICS, ALL_METRICS } from "@/data/metrics"
import { mv, mt, fmt, delta, deltaColor, tjVal, salesVal, sv, readMetric, formatMetricValue, formatDashboardValue } from "@/utils/dataUtils"

import { syncAllCampaignTotals } from '@/utils/campaignSync'
import { fmt as gFmt, fmtDelta, Delta, fmtPct, fmtPctDelta } from "@/utils/format"
import { calcRateCapped } from "@/utils/readMetric"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { buildWeekMetrics, formatMetricDisplay, formatPct } from "@/utils/metricCalculations"
import type {
  WeeklyData, WeeklyDataSummary, Profile, MetricTarget, HealthScore, Actionable,
  Campaign, MyntmoreProcess, ProcessUpdate, TjWeeklyData, SalesWeeklyData,
  MmWeeklyData, AppNotification, ClientAlertRow, ClientWithManagers,
} from '@/types'

// Helpers replaced by @/utils/dataUtils

// --- DeliverableAlertRow sub-component ---
interface DeliverableAlertItem {
  clientId: string
  clientName: string
  notSubmitted: boolean
  lacking: Array<{ metricId: string; metricName: string; actual: number | null; target: number; pct: number | null }>
  worstPct: number | null
}

function DeliverableAlertRow({ item, displayWeek }: { item: DeliverableAlertItem; displayWeek: string }) {
  const [expanded, setExpanded] = React.useState(false)

  const pctColor = (pct: number | null) => {
    if (pct === null) return 'text-red-600'
    if (pct < 50) return 'text-red-600'
    if (pct < 80) return 'text-amber-600'
    return 'text-amber-500'
  }

  const dotColor = item.notSubmitted ? 'bg-red-500 animate-pulse' :
    (item.worstPct === null || item.worstPct < 50) ? 'bg-red-500' :
    item.worstPct < 80 ? 'bg-amber-500' : 'bg-amber-400'

  return (
    <div className="transition-colors">
      {/* Collapsed row */}
      <div
        className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-50/60 cursor-pointer"
        onClick={() => !item.notSubmitted && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
          <span className="text-xs font-black text-amber-950 truncate">{item.clientName}</span>
          {item.notSubmitted ? (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 shrink-0">No data submitted</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 shrink-0">
              {item.lacking.length} metric{item.lacking.length > 1 ? 's' : ''} below target
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/data-entry"
            onClick={e => e.stopPropagation()}
            className="text-[10px] font-black text-amber-800 hover:text-amber-950 underline-offset-2 hover:underline"
          >
            Enter data →
          </Link>
          {!item.notSubmitted && (
            <ChevronDown className={cn('w-3 h-3 text-amber-600 transition-transform shrink-0', expanded && 'rotate-180')} />
          )}
        </div>
      </div>

      {/* Expanded metric breakdown */}
      {expanded && !item.notSubmitted && (
        <div className="px-8 pb-3 grid grid-cols-2 gap-x-6 gap-y-1.5 bg-amber-50/30">
          {item.lacking.map(m => (
            <div key={m.metricId} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-amber-900 font-semibold truncate">{m.metricName}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn('text-[10px] font-black tabular-nums', pctColor(m.pct))}>
                  {m.actual ?? 0} / {m.target}
                </span>
                <div className="w-16 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', m.pct !== null && m.pct >= 80 ? 'bg-amber-400' : m.pct !== null && m.pct >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${Math.min(m.pct ?? 0, 100)}%` }}
                  />
                </div>
                <span className={cn('text-[9px] font-bold tabular-nums', pctColor(m.pct))}>
                  {m.pct !== null ? `${m.pct}%` : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { session, loading: authLoading, profile, isAdmin } = useAuth()
  const [clients, setClients] = useState<ClientWithManagers[]>([])
  const [healthScores, setHealthScores] = useState<HealthScore[]>([])
  const [alerts, setAlerts] = useState<ClientAlertRow[]>([])
  const [tjData, setTjData] = useState<TjWeeklyData | null>(null)
  const [tjPrev, setTjPrev] = useState<TjWeeklyData | null>(null)
  const [salesData, setSalesData] = useState<SalesWeeklyData | null>(null)
  const [salesPrev, setSalesPrev] = useState<SalesWeeklyData | null>(null)
  const [mmData, setMmData] = useState<MmWeeklyData | null>(null)
  const [prevMmData, setPrevMmData] = useState<MmWeeklyData | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [prevWeeklyData, setPrevWeeklyData] = useState<WeeklyData[]>([])
  const [monthWeeklyData, setMonthWeeklyData] = useState<WeeklyDataSummary[]>([])
  const [targets, setTargets] = useState<MetricTarget[]>([])
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [actionables, setActionables] = useState<Actionable[]>([])
  const [processesData, setProcessesData] = useState<MyntmoreProcess[]>([])
  const [processesUpdates, setProcessesUpdates] = useState<ProcessUpdate[]>([])
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [loadingClients, setLoadingClients] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isMonthlyView, setIsMonthlyView] = useState(false)
  const [weeklyBreakdownClients, setWeeklyBreakdownClients] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success("Notification dismissed")
  }
  
  // Helper: days until next annual occurrence of a date
  const getDaysUntilNextOccurrence = (dateStr: string, today: Date): number => {
    const d = new Date(dateStr)
    const thisYear = today.getFullYear()
  
    let next = new Date(thisYear, d.getMonth(), d.getDate())
    next.setHours(0, 0, 0, 0)
  
    if (next < today) {
      next = new Date(thisYear + 1, d.getMonth(), d.getDate())
    }
  
    return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  const checkNotifications = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcoming: any[] = []
  
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, birthday, myntmore_start_date')
      .eq('status', 'active')
  
    clients?.forEach(client => {
      // Birthday check — 21 days ahead
      if (client.birthday) {
        const daysUntil = getDaysUntilNextOccurrence(client.birthday, today)
        if (daysUntil >= 0 && daysUntil <= 21) {
          upcoming.push({
            id: client.id + '_bday',
            clientId: client.id,
            clientName: client.name,
            type: 'birthday',
            daysUntil,
            severity: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
            message: daysUntil === 0
              ? `🎂 Today is ${client.name}'s birthday! Don't forget to wish them.`
              : `🎂 ${client.name}'s birthday is in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`
          })
        }
      }
  
      // Work anniversary check — 21 days ahead
      if (client.myntmore_start_date) {
        const start = new Date(client.myntmore_start_date)
        const daysUntil = getDaysUntilNextOccurrence(client.myntmore_start_date, today)
        const years = today.getFullYear() - start.getFullYear()
          - (getDaysUntilNextOccurrence(client.myntmore_start_date, today) > 0
            && new Date(today.getFullYear(), start.getMonth(), start.getDate()) > today ? 1 : 0)
  
        if (daysUntil >= 0 && daysUntil <= 21 && years > 0) {
          upcoming.push({
            id: client.id + '_anniv',
            clientId: client.id,
            clientName: client.name,
            type: 'work_anniversary',
            daysUntil,
            severity: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
            message: daysUntil === 0
              ? `🎉 Today is ${client.name}'s ${years}-year anniversary with Myntmore!`
              : `🎉 ${client.name}'s ${years}-year Myntmore anniversary is in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`
          })
        }
      }
    })
  
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
    setNotifications(upcoming)
  }

  const reloadClientWeekData = async (clientId: string, weekStart: string) => {
    const { data } = await supabase
      .from('weekly_data')
      .select('*')
      .eq('client_id', clientId)
      .eq('week_start', weekStart)
      .maybeSingle()
    if (data) {
      setWeeklyData(prev => {
        const next = [...prev]
        const idx = next.findIndex(r => r.client_id === clientId && r.week_start === weekStart)
        if (idx >= 0) next[idx] = data
        else next.push(data)
        return next
      })
    }
  }

  const toggleClient = async (id: string) => {
    const next = new Set(expandedClients)
    if (next.has(id)) {
      next.delete(id)
      setExpandedClients(next)
    } else {
      setLoadingClients(prev => new Set(prev).add(id))
      next.add(id)
      setExpandedClients(next)
      if (displayWeek) {
        await syncAllCampaignTotals(id, displayWeek)
        await reloadClientWeekData(id, displayWeek)
      }
      setLoadingClients(prev => {
        const nextSet = new Set(prev)
        nextSet.delete(id)
        return nextSet
      })
    }
  }

  const toggleWeeklyBreakdown = (id: string) => {
    const next = new Set(weeklyBreakdownClients)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setWeeklyBreakdownClients(next)
  }

  const toggleSection = (id: string) => {
    const next = new Set(collapsedSections)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCollapsedSections(next)
  }

  const SectionHeader = ({ title, id, icon: Icon }: { title: string, id: string, icon: any }) => (
    <div 
      className="flex items-center justify-between py-4 border-b-2 border-gold cursor-pointer select-none group"
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-gold" />
        <h2 className="text-xl font-black tracking-tight uppercase">{title}</h2>
      </div>
      {collapsedSections.has(id) ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
    </div>
  )

  const MetricTable = ({ 
    metrics, 
    currentData, 
    prevData, 
    category,
    clientTargets 
  }: { 
    metrics: any[], 
    currentData: any, 
    prevData: any, 
    category: 'content_metrics' | 'leadgen_metrics',
    clientTargets: any[]
  }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="text-[10px] font-black uppercase">Metric Name</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-center">This Week</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-center">Prev Week</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-center">Delta</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-center">Target</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-center">Ach%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map(m => {
            const currentBuilt = buildWeekMetrics(currentData)
            const prevBuilt = buildWeekMetrics(prevData)
            
            const current = currentBuilt?.[m.id as keyof typeof currentBuilt] ?? null
            const prev = prevBuilt?.[m.id as keyof typeof prevBuilt] ?? null
            const target = clientTargets.find(t => t.metric_id === m.id)?.target_value ?? null
            
            let ach = '—'
            if (target && current !== null && !isNaN(Number(current))) {
              ach = Math.round((Number(current) / Number(target)) * 100) + '%'
            }

            return (
              <TableRow key={m.id} className="h-8">
                <TableCell className="py-1 text-xs font-medium">{m.name}</TableCell>
                {m.type === 'textarea' ? (
                  <TableCell 
                    colSpan={5}
                    className="py-1 text-left" 
                    style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}
                  >
                    {current ? `"${String(current).slice(0, 100)}${String(current).length > 100 ? '...' : ''}"` : '—'}
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="py-1 text-center text-xs font-bold">
                      {['L12', 'L14', 'L17'].includes(m.id) ? formatPct(current as number) : formatDashboardValue(current, m.id)}
                    </TableCell>
                    <TableCell className="py-1 text-center text-xs text-muted-foreground">
                      {['L12', 'L14', 'L17'].includes(m.id) ? formatPct(prev as number) : formatDashboardValue(prev, m.id)}
                    </TableCell>
                    <TableCell className="py-1 text-center text-xs font-bold" style={{ color: fmtDelta(current as any, prev as any).color }}>
                        {fmtDelta(current as any, prev as any).text}
                    </TableCell>
                    <TableCell className="py-1 text-center text-xs text-muted-foreground">{formatMetricValue(target, m.id)}</TableCell>
                    <TableCell className="py-1 text-center text-xs font-black">{ach}</TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )

  const WeeklyBreakdown = ({ client, weeks }: { client: any, weeks: any[] }) => {
    // Calculate Monthly Totals
    const monthlyTotals: Record<string, number> = {}
    weeks.forEach(week => {
      ALL_METRICS.forEach(m => {
        const val = readMetric(week, m.category === 'content' ? 'content_metrics' : 'leadgen_metrics', m.id)
        if (val !== null && !isNaN(Number(val))) {
          monthlyTotals[m.id] = (monthlyTotals[m.id] ?? 0) + Number(val)
        }
      })
    })

    // Recalculate rates for monthly totals
    monthlyTotals['L12'] = calcRateCapped(monthlyTotals['L11'], monthlyTotals['L10']) || 0
    monthlyTotals['L14'] = calcRateCapped(monthlyTotals['L13'], monthlyTotals['L11']) || 0

    return (
      <div className="mt-6 border-t border-border overflow-x-auto w-full">
        <Table className="min-w-[600px] w-full border-collapse table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-[10px] font-black uppercase w-[200px]">Metric</TableHead>
              {weeks.map(w => (
                <TableHead key={w.week_start} className="text-[10px] font-black uppercase text-center">
                  {w.week_label?.split(' (')[0] || w.week_start}
                </TableHead>
              ))}
              <TableHead className="text-[10px] font-black uppercase text-center bg-gold/20 font-black">Monthly Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_METRICS.filter(m => m.type !== 'textarea').map(m => {
              return (
                <TableRow key={m.id} className="h-8 hover:bg-muted/5">
                  <TableCell className="py-1 text-[11px] font-medium border-r">{m.name}</TableCell>
                  {weeks.map((week, idx) => {
                    const built = buildWeekMetrics(week)
                    const val = built?.[m.id as keyof typeof built] ?? null
                    
                    const prevBuilt = idx > 0 ? buildWeekMetrics(weeks[idx-1]) : null
                    const prevVal = prevBuilt?.[m.id as keyof typeof prevBuilt] ?? null
                    
                    let color = 'inherit'
                    if (['L12', 'L14', 'L17'].includes(m.id) && val !== null && prevVal !== null) {
                      color = Number(val) > Number(prevVal) ? '#22C55E' : Number(val) < Number(prevVal) ? '#EF4444' : 'inherit'
                    }

                    return (
                      <TableCell 
                        key={week.week_start} 
                        className={cn(
                          "py-1 text-center text-[11px] font-bold",
                          (val === 0 || val === '0') && "text-muted-foreground/30"
                        )}
                        style={{ color }}
                      >
                        {['L12', 'L14', 'L17'].includes(m.id) ? formatPct(val as number) : formatDashboardValue(val, m.id)}
                      </TableCell>
                    )
                  })}
                  <TableCell className="py-1 text-center text-[11px] font-black bg-gold/5">
                    {['L12', 'L14', 'L17'].includes(m.id) ? '—' : formatDashboardValue(monthlyTotals[m.id], m.id)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const MonthComparisonView = () => {
    // Current month totals
    const prevMonthStr = new Date(new Date(displayWeek).setMonth(new Date(displayWeek).getMonth() - 1)).toISOString().slice(0, 7)
    
    const [prevMonthTotals, setPrevMonthTotals] = useState<Record<string, Record<string, number>>>({})
    const [loadingPrev, setLoadingPrev] = useState(true)

    useEffect(() => {
      const fetchPrevMonth = async () => {
        setLoadingPrev(true)
        const { data } = await supabase
          .from('weekly_data')
          .select('client_id, content_metrics, leadgen_metrics')
          .gte('week_start', `${prevMonthStr}-01`)
          .lte('week_start', `${prevMonthStr}-31`)
        
        const totals: Record<string, Record<string, number>> = {}
        data?.forEach(row => {
          const clientId = row.client_id
          if (!clientId) return
          if (!totals[clientId]) totals[clientId] = {}
          ALL_METRICS.forEach(m => {
            const val = readMetric(row, m.category === 'content' ? 'content_metrics' : 'leadgen_metrics', m.id)
            if (val !== null && !isNaN(Number(val))) {
              totals[clientId][m.id] = (totals[clientId][m.id] ?? 0) + Number(val)
            }
          })
        })

        // Recalculate rates correctly for month comparison
        Object.keys(totals).forEach(cid => {
          const t = totals[cid]
          t['L12'] = calcRateCapped(t['L11'], t['L10']) || 0
          t['L14'] = calcRateCapped(t['L13'], t['L11']) || 0
          t['L17'] = calcRateCapped(t['L15'], t['L13']) || 0
        })

        setPrevMonthTotals(totals)
        setLoadingPrev(false)
      }
      fetchPrevMonth()
    }, [])

    return (
      <div className="space-y-6 w-full box-border">
        {clients.map(client => {
          const cWeeks = monthWeeklyData.filter(w => w.client_id === client.id)
          const cTotals: Record<string, number> = {}
          cWeeks.forEach(week => {
            ALL_METRICS.forEach(m => {
              const val = readMetric(week, m.category === 'content' ? 'content_metrics' : 'leadgen_metrics', m.id)
              if (val !== null && !isNaN(Number(val))) {
                cTotals[m.id] = (cTotals[m.id] ?? 0) + Number(val)
              }
            })
          })
          cTotals['L12'] = calcRateCapped(cTotals['L11'], cTotals['L10']) || 0
          cTotals['L14'] = calcRateCapped(cTotals['L13'], cTotals['L11']) || 0

          const pTotals = prevMonthTotals[client.id] || {}

          return (
            <Card key={client.id} className="border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 py-3 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-widest">{client.name} — Monthly Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Metric</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Previous Month</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center bg-gold/5">Current Month</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ALL_METRICS.filter(m => m.type !== 'textarea' && m.type !== 'boolean').map(m => (
                      <TableRow key={m.id} className="h-8">
                        <TableCell className="py-1 text-[11px] font-medium">{m.name}</TableCell>
                        <TableCell className="py-1 text-center text-[11px] text-muted-foreground">
                          {['L12', 'L14', 'L17'].includes(m.id) ? formatPct(pTotals[m.id]) : gFmt(pTotals[m.id])}
                        </TableCell>
                        <TableCell className="py-1 text-center text-[11px] font-black bg-gold/5">
                          {['L12', 'L14', 'L17'].includes(m.id) ? formatPct(cTotals[m.id]) : gFmt(cTotals[m.id])}
                        </TableCell>
                        <TableCell className="py-1 text-center text-[11px] font-bold">
                          {['L12', 'L14', 'L17'].includes(m.id) ? (
                            <span style={{ color: fmtPctDelta(cTotals[m.id], 100, pTotals[m.id], 100).color }}>
                              {fmtPctDelta(cTotals[m.id], 100, pTotals[m.id], 100).text}
                            </span>
                          ) : (
                            <Delta current={cTotals[m.id]} previous={pTotals[m.id]} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const TJChannelCard = ({ title, icon: Icon, metrics, currentData, prevData }: { title: string, icon: any, metrics: any[], currentData: any, prevData: any }) => (
    <Card className="border shadow-sm bg-card h-full">
      <CardHeader className="py-3 border-b bg-muted/20">
        <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-wider">
          <Icon className="w-4 h-4 text-gold" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <div className="grid grid-cols-1 gap-1">
          {metrics.map((m: any) => {
            const current = tjVal(currentData, m.id)
            const prev = tjVal(prevData, m.id)
            return (
              <div key={m.id} className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">{m.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{gFmt(current, { unit: m.unit })}</span>
                  <Delta current={current} previous={prev} unit={m.unit} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  const SalesOutreachCard = ({ title, metrics, currentData }: { title: string, metrics: any[], currentData: any }) => (
    <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/50 flex-1 min-w-[300px]">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
            {metrics.map((m: any) => (
                <div key={m.id} className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{m.name}:</span>
                    <span className="text-sm font-black">{gFmt(tjVal(currentData, m.id), { unit: m.unit })}</span>
                </div>
            ))}
        </div>
    </div>
  )

  const MMContentRow = ({ title, icon: Icon, metrics, currentData, prevData }: { title: string, icon: any, metrics: any[], currentData: any, prevData: any }) => (
    <div className="space-y-3 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Icon className="w-3 h-3" /> {title}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {metrics.map((m: any) => {
                const val = tjVal(currentData, m.id)
                const prev = tjVal(prevData, m.id)
                return (
                    <div key={m.id} className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">{m.name}</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl font-black">{gFmt(val, { unit: m.unit })}</p>
                            <Delta current={val} previous={prev} unit={m.unit} />
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  )

  const [displayWeek, setDisplayWeek] = useState<string>('')
  
  const loadAllDashboardData = async (weekStart: string) => {
    setLoading(true)
    try {
      const prevDate = new Date(weekStart)
      prevDate.setDate(prevDate.getDate() - 7)
      const prevWeekStart = prevDate.toISOString().split('T')[0]

      const [
        { data: clientsData },
        { data: healthData },
        { data: alertsData },
        { data: weeklyDataRes },
        { data: prevWeeklyDataRes },
        { data: tjDataRes },
        { data: tjPrevRes },
        { data: salesDataRes },
        { data: salesPrevRes },
        { data: mmDataRes },
        { data: prevMmDataRes },
        { data: profilesData },
        { data: actionablesData },
        { data: targetsData },
        { data: monthWeeksRes },
        { data: pData },
        { data: pUpdates }
      ] = await Promise.all([
        supabase.from('clients').select('*, content_manager:profiles!content_manager_id(full_name), leadgen_manager:profiles!leadgen_manager_id(full_name)').eq('status', 'active').order('name'),
        supabase.from('client_health_scores').select('*').order('week_start', { ascending: false }),
        supabase.from('client_alerts').select('*, clients(name, company)').eq('is_resolved', false).order('created_at', { ascending: false }),
        supabase.from('weekly_data').select('*').eq('week_start', weekStart),
        supabase.from('weekly_data').select('*').eq('week_start', prevWeekStart),
        supabase.from('tj_weekly_data').select('*').eq('week_start', weekStart).maybeSingle(),
        supabase.from('tj_weekly_data').select('*').eq('week_start', prevWeekStart).maybeSingle(),
        supabase.from('sales_weekly_data').select('*').eq('week_start', weekStart).maybeSingle(),
        supabase.from('sales_weekly_data').select('*').eq('week_start', prevWeekStart).maybeSingle(),
        supabase.from('mm_weekly_data').select('*').eq('week_start', weekStart).maybeSingle(),
        supabase.from('mm_weekly_data').select('*').eq('week_start', prevWeekStart).maybeSingle(),
        supabase.from('profiles').select('*'),
        supabase.from('actionables').select('*').eq('status', 'todo'),
        supabase.from('targets').select('*').eq('period', weekStart).eq('target_type', 'weekly'),
        supabase.from('weekly_data').select('week_start, week_label, content_metrics, leadgen_metrics, client_id, content_submitted_at, leadgen_submitted_at')
          .gte('week_start', weekStart.slice(0, 7) + '-01')
          .lte('week_start', weekStart.slice(0, 7) + '-31')
          .order('week_start', { ascending: true }),
        supabase.from('myntmore_processes').select('*').eq('status', 'active').order('priority', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('process_weekly_updates').select('*, profiles(full_name)').eq('week_start', weekStart)
      ])

      setClients(clientsData || [])
      setHealthScores(healthData || [])
      setAlerts(alertsData || [])
      setWeeklyData(weeklyDataRes || [])
      setPrevWeeklyData(prevWeeklyDataRes || [])
      setMonthWeeklyData(monthWeeksRes || [])
      setTjData(tjDataRes)
      setTjPrev(tjPrevRes)
      setSalesData(salesDataRes)
      setSalesPrev(salesPrevRes)
      setMmData(mmDataRes)
      setPrevMmData(prevMmDataRes)
      setProfiles(profilesData || [])
      setActionables(actionablesData || [])
      setTargets(targetsData || [])
      setProcessesData(pData || [])
      setProcessesUpdates(pUpdates || [])

      // Check and fetch notifications
      await checkNotifications()

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initWeek = async () => {
      const thisWeek = getCurrentWeekStart()  // 2026-05-11
      const lastWeek = getPreviousWeekStart() // 2026-05-04

      // Check if this week has any data at all
      const { data } = await supabase
        .from('weekly_data')
        .select('id')
        .eq('week_start', thisWeek)
        .limit(1)

      const best = (data && data.length > 0) ? thisWeek : lastWeek
      console.log('Auto-selected week:', best)
      setDisplayWeek(best)
    }
    if (session) {
      initWeek()
    }
  }, [session])

  useEffect(() => {
    if (session && displayWeek) {
      loadAllDashboardData(displayWeek)
    }
  }, [session, displayWeek])

  // --- Deliverable gap alerts — must be declared BEFORE early returns (Rules of Hooks) ---
  const deliverableAlerts = useMemo(() => {
    if (!clients.length || !displayWeek) return []

    const targetMap: Record<string, Record<string, number>> = {}
    for (const t of targets) {
      if (!t.client_id || t.target_value === null) continue
      if (!targetMap[t.client_id]) targetMap[t.client_id] = {}
      targetMap[t.client_id][t.metric_id] = t.target_value
    }

    const results: Array<{
      clientId: string
      clientName: string
      notSubmitted: boolean
      lacking: Array<{ metricId: string; metricName: string; actual: number | null; target: number; pct: number | null }>
      worstPct: number | null
    }> = []

    for (const client of clients) {
      const clientTargets = targetMap[client.id]
      if (!clientTargets || Object.keys(clientTargets).length === 0) continue

      const weekRow = weeklyData.find(w => w.client_id === client.id) ?? null

      if (!weekRow) {
        results.push({ clientId: client.id, clientName: client.name, notSubmitted: true, lacking: [], worstPct: null })
        continue
      }

      const built = (buildWeekMetrics(weekRow) ?? {}) as Record<string, number | null>
      const lacking: typeof results[0]['lacking'] = []

      for (const [metricId, targetValue] of Object.entries(clientTargets)) {
        const metric = ALL_METRICS.find(m => m.id === metricId)
        if (!metric) continue
        if (metric.type === 'textarea' || metric.type === 'boolean' || metric.type === 'slider') continue

        let actual: number | null = null
        if (metricId in built) {
          actual = built[metricId]
        } else {
          const col = metric.category === 'content' ? 'content_metrics' : 'leadgen_metrics'
          actual = mv(weekRow, col, metricId)
        }

        if (actual === null || actual < targetValue) {
          const pct = actual !== null && targetValue > 0 ? Math.round((actual / targetValue) * 100) : null
          lacking.push({ metricId, metricName: metric.name, actual, target: targetValue, pct })
        }
      }

      if (lacking.length > 0) {
        lacking.sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1))
        results.push({ clientId: client.id, clientName: client.name, notSubmitted: false, lacking, worstPct: lacking[0].pct })
      }
    }

    return results.sort((a, b) => {
      if (a.notSubmitted !== b.notSubmitted) return a.notSubmitted ? -1 : 1
      return (a.worstPct ?? -1) - (b.worstPct ?? -1)
    })
  }, [clients, weeklyData, targets, displayWeek])

  if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  if (!session) return <Navigate to="/login" />

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('client_alerts')
        .update({ is_resolved: true, resolved_by: session.user.id, resolved_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      toast.success("Alert resolved")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Section 5: Team Submission Status logic
  const teamSubmissionStatus = profiles.map(p => {
    const assignedClients = clients.filter(c => c.content_manager_id === p.id || c.leadgen_manager_id === p.id)
    const clientIds = assignedClients.map(c => c.id)
    
    // Check if data is submitted for each assigned client
    const submittedClients = assignedClients.filter(c => {
        const data = weeklyData.find(w => w.client_id === c.id)
        const contentNeeded = c.content_manager_id === p.id
        const leadgenNeeded = c.leadgen_manager_id === p.id
        
        const contentDone = !contentNeeded || !!data?.content_submitted_at
        const leadgenDone = !leadgenNeeded || !!data?.leadgen_submitted_at
        
        return contentDone && leadgenDone
    })

    const status = assignedClients.length === 0 ? 'none' :
                 submittedClients.length === assignedClients.length ? 'all' :
                 submittedClients.length === 0 ? 'none' : 'partial'
                 
    return {
        name: p.full_name?.split(' ')[0] || 'Team',
        clients: assignedClients.map(c => c.name).join(', '),
        submittedCount: submittedClients.length,
        totalCount: assignedClients.length,
        status
    }
  }).filter(p => p.totalCount > 0)

  // Section 6: Actionables logic
  const actionablesByClient = clients.map(c => {
    const clientActions = actionables.filter(a => a.client_id === c.id)
    return {
        id: c.id,
        name: c.name,
        count: clientActions.length,
        carriedForward: clientActions.filter(a => a.week_start && a.week_start < displayWeek).length
    }
  }).filter(c => c.count > 0)

  return (
    <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b bg-background px-3">
            <SidebarTrigger />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Command Center Dashboard</span>
          </header>
          
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1200px] w-full box-border p-6 space-y-8 pb-20">
              
              {/* Header */}
              <div className="flex justify-between items-end border-b pb-6">
                <div>
                  <h1 className="text-4xl font-black tracking-tight">MYNTMORE COMMAND CENTER</h1>
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">Operational Performance Dashboard — {getWeekLabel(displayWeek)}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Period:</span>
                    <select
                      value={displayWeek}
                      onChange={(e) => setDisplayWeek(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-sm font-bold bg-background cursor-pointer hover:border-gold transition-colors"
                    >
                      {getWeekOptions(12).map(w => (
                        <option key={w.weekStart} value={w.weekStart}>
                          {w.label}
                          {w.weekStart === getPreviousWeekStart() ? ' ← Last Week' : ''}
                          {w.weekStart === getCurrentWeekStart() ? ' ← This Week' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {process.env.NODE_ENV === 'development' && (
                    <div style={{ fontSize: '11px', color: '#999', padding: '4px 0' }}>
                      Debug: displayWeek={displayWeek} | rows={weeklyData.length} | 
                      Aditya row={weeklyData.find(r => r.client_id === 'a396561e-c0e2-4c33-a798-3ce49ee2c8b3') ? 'FOUND' : 'NOT FOUND'}
                    </div>
                  )}
                  
                  {notifications.length > 0 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="relative font-bold border-gold/30 h-9 bg-gold/5 hover:bg-gold/10">
                          <Bell className="w-4 h-4 mr-2 text-gold animate-pulse" />
                          Milestones
                          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-white h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-black">
                            {notifications.length}
                          </Badge>
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px]">
                        <SheetHeader className="border-b pb-4 mb-6">
                          <SheetTitle className="flex items-center gap-2 uppercase tracking-widest text-sm font-black">
                            <Gift className="w-5 h-5 text-gold" /> Upcoming Milestones
                          </SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4">
                          {notifications.map(notif => {
                            const getBorderColor = (severity: string) => {
                              if (severity === 'high') return '#EF4444'   // red — within 3 days
                              if (severity === 'medium') return '#EAB308' // amber — within 7 days
                              return '#FFC947'                             // gold — within 21 days
                            }
                            return (
                            <div key={notif.id} className="p-4 rounded-xl border bg-card hover:border-gold/30 transition-all group relative">
                              <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                                  {notif.type === 'birthday' ? <Cake className="w-5 h-5 text-gold" /> : <Target className="w-5 h-5 text-gold" />}
                                </div>
                                <div className="space-y-1 pr-8">
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: getBorderColor(notif.severity) }}>
                                    {notif.daysUntil === 0 ? 'TODAY' : `In ${notif.daysUntil} days`}
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#333' }}>{notif.message}</div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDismissNotification(notif.id)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          )})}
                          {notifications.length === 0 && (
                            <div className="text-center py-20 opacity-40">
                              <Bell className="w-12 h-12 mx-auto mb-4" />
                              <p className="font-bold uppercase tracking-widest text-xs">No upcoming milestones</p>
                            </div>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}

                  <div className="flex gap-2">
                      <Button 
                        variant={isMonthlyView ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setIsMonthlyView(!isMonthlyView)}
                        className="font-bold border-gold/30 h-9"
                      >
                        {isMonthlyView ? "Weekly View" : "Monthly View"}
                      </Button>
                      <Button asChild size="sm" className="bg-gold text-black hover:bg-gold/90 font-black h-9">
                          <Link to="/data-entry">Quick Data Entry</Link>
                      </Button>
                  </div>
                </div>
              </div>

              {/* Section 2 — Active Alerts Panel */}
              {alerts.length > 0 && (
                <Card className="border-2 border-red-100 shadow-sm overflow-hidden bg-red-50/20">
                    <CardHeader className="bg-red-50 py-2 border-b border-red-100 flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black text-red-900 flex items-center gap-2 uppercase tracking-widest">
                            <AlertCircle className="w-3 h-3" /> ACTIVE ALERTS ({alerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-red-50">
                        {alerts.map(alert => (
                            <div key={alert.id} className="flex items-center justify-between p-3 hover:bg-red-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        alert.severity === 'high' ? "bg-red-500 animate-pulse" : "bg-amber-500"
                                    )} />
                                    <p className="text-xs font-bold text-red-950">
                                        <span className="opacity-60 mr-2">{alert.clients?.name} —</span>
                                        {alert.alert_message}
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleResolveAlert(alert.id)} className="h-7 text-[10px] text-red-900 font-bold hover:bg-red-100 px-2">Resolve ✓</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
              )}

              {/* Section 3 — Deliverables Check */}
              {deliverableAlerts.length > 0 && (
                <Card className="border-2 border-amber-100 shadow-sm overflow-hidden bg-amber-50/20">
                  <CardHeader className="bg-amber-50 py-2 border-b border-amber-100 flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-amber-900 flex items-center gap-2 uppercase tracking-widest">
                      <AlertTriangle className="w-3 h-3" /> DELIVERABLES CHECK ({deliverableAlerts.length} client{deliverableAlerts.length > 1 ? 's' : ''} need attention)
                    </CardTitle>
                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">vs weekly targets · {displayWeek}</span>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-amber-50">
                    {deliverableAlerts.map(item => (
                      <DeliverableAlertRow
                        key={item.clientId}
                        item={item}
                        displayWeek={displayWeek}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* SECTION: CLIENT PERFORMANCE */}
              <div className="space-y-4">
                <SectionHeader title="Client Performance" id="clients" icon={Activity} />
                {!collapsedSections.has('clients') && (
                  isMonthlyView ? <MonthComparisonView /> : (
                  <div className="space-y-4">
                    {clients.map(client => {
                      const currentData = weeklyData.find(w => w.client_id === client.id)
                      const prevData = prevWeeklyData.find(w => w.client_id === client.id)
                      const health = healthScores.find(h => h.client_id === client.id && h.week_start === displayWeek)
                      const score = health?.health_score ?? '-'
                      const isExpanded = expandedClients.has(client.id)
                      const clientTargets = targets.filter(t => t.client_id === client.id)

                      return (
                        <Card key={client.id} className={cn("border shadow-sm overflow-hidden transition-all", isExpanded ? "ring-2 ring-gold/20" : "")}>
                          {/* Collapsed Row */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors flex-nowrap min-w-0 gap-4"
                            onClick={() => toggleClient(client.id)}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
                              <div className="w-10 h-10 shrink-0 rounded bg-gold/10 flex items-center justify-center font-black text-gold">
                                {client.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <h3 className="font-black text-base truncate">{client.name}</h3>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">{client.company}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] font-black uppercase tracking-wider h-7 px-2 border border-gold/20 hover:bg-gold/10 shrink-0 whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleWeeklyBreakdown(client.id)
                                  if (!isExpanded) toggleClient(client.id)
                                }}
                              >
                                {weeklyBreakdownClients.has(client.id) ? '▲ Close Breakdown' : '▼ Weekly Breakdown'}
                              </Button>
                              <div className="flex items-center gap-6 shrink-0">
                                {(() => {
                                  const built = (buildWeekMetrics(currentData) ?? {}) as Record<string, any>
                                  const acceptanceRate = built.L12
                                  return (
                                    <>
                                      <div className="text-center w-12 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Health</p>
                                        <Badge className={cn(
                                            "font-black text-[10px] min-w-[32px] justify-center",
                                            score === '-' ? "bg-muted text-muted-foreground" : Number(score) >= 75 ? "bg-status-on text-white" : Number(score) >= 50 ? "bg-status-risk text-white" : "bg-status-off text-white"
                                        )}>{score}</Badge>
                                      </div>
                                      <div className="text-center w-12 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Posts</p>
                                        <p className="text-sm font-black">{formatDashboardValue(built?.C09, 'C09')}</p>
                                      </div>
                                      <div className="text-center w-14 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Impr.</p>
                                        <p className="text-sm font-black">{formatDashboardValue(built?.C10, 'C10')}</p>
                                      </div>
                                      <div className="text-center w-14 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Conn Req</p>
                                        <p className="text-sm font-black">{formatDashboardValue(built?.L10, 'L10')}</p>
                                      </div>
                                      <div className="text-center w-14 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Acc Rate</p>
                                        <p className={cn("text-sm font-black", acceptanceRate !== null && acceptanceRate !== undefined ? "text-foreground" : "text-muted-foreground")}>{acceptanceRate !== null && acceptanceRate !== undefined ? formatPct(acceptanceRate as number) : '—'}</p>
                                      </div>
                                      <div className="text-center w-14 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Hot Leads</p>
                                        <p className="text-sm font-black">{formatDashboardValue(built?.L23, 'L23')}</p>
                                      </div>
                                      <div className="text-center w-12 shrink-0">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Booked</p>
                                        <p className="text-sm font-black text-gold">{formatDashboardValue(built?.L24, 'L24')}</p>
                                      </div>
                                    </>
                                  )
                                })()}
                                 <div className="text-center w-14 shrink-0">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Status</p>
                                  <div className="flex justify-center gap-1 mt-1">
                                      <div className={cn("w-2 h-2 rounded-full", !!currentData?.content_submitted_at ? "bg-status-on" : "bg-muted")} title="Content Data" />
                                      <div className={cn("w-2 h-2 rounded-full", !!currentData?.leadgen_submitted_at ? "bg-status-on" : "bg-muted")} title="Lead Gen Data" />
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t bg-muted/10 p-6 animate-in slide-in-from-top-2 duration-200">
                                {loadingClients.has(client.id) ? (
                                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground animate-pulse gap-3">
                                    <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-black uppercase tracking-widest">Loading latest client metrics...</p>
                                  </div>
                                ) : (
                                  <>
                                    {weeklyBreakdownClients.has(client.id) && (
                                  <div className="mb-8 border-b pb-8">
                                    <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <Activity className="w-4 h-4 text-gold" /> Weekly Breakdown (Month)
                                    </h4>
                                    <WeeklyBreakdown client={client} weeks={monthWeeklyData.filter(w => w.client_id === client.id)} />
                                  </div>
                                )}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                  {/* Content Metrics */}
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-muted">
                                      <FileText className="w-4 h-4 text-gold" />
                                      <h4 className="text-xs font-black uppercase tracking-widest">Content Metrics</h4>
                                    </div>
                                    <MetricTable 
                                      metrics={CONTENT_METRICS.filter(m => m.group !== 'Qualitative')}
                                      currentData={currentData}
                                      prevData={prevData}
                                      category="content_metrics"
                                      clientTargets={clientTargets}
                                    />
                                  </div>

                                  {/* Lead Gen Metrics */}
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-muted">
                                      <Users className="w-4 h-4 text-gold" />
                                      <h4 className="text-xs font-black uppercase tracking-widest">Lead Gen Metrics</h4>
                                    </div>
                                    <MetricTable 
                                      metrics={LEADGEN_METRICS.filter(m => m.group !== 'Qualitative')}
                                      currentData={currentData}
                                      prevData={prevData}
                                      category="leadgen_metrics"
                                      clientTargets={clientTargets}
                                    />
                                  </div>
                                </div>
                                
                                <DashboardCampaignsSection clientId={client.id} displayWeek={displayWeek} onEditCampaign={setEditingCampaign} />

                                {/* Qualitative Cards */}
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="p-4 bg-background border rounded-lg shadow-sm">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-status-on" /> What's Working (Content)
                                    </p>
                                    <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                                      {sv(currentData, 'content_metrics', 'C24') || 'No input provided.'}
                                    </p>
                                  </div>
                                  <div className="p-4 bg-background border rounded-lg shadow-sm">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                                      <AlertTriangle className="w-3 h-3 text-status-risk" /> What's Not Working / Blockers
                                    </p>
                                    <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                                      {sv(currentData, 'leadgen_metrics', 'L29') || 'No input provided.'}
                                    </p>
                                  </div>
                                  <div className="p-4 bg-background border rounded-lg shadow-sm">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                                      <Target className="w-3 h-3 text-gold" /> Happiness Index & Notes
                                    </p>
                                    <div className="flex items-center gap-4">
                                      <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center font-black text-lg",
                                        !mv(currentData, 'leadgen_metrics', 'L30') ? "bg-muted text-muted-foreground" :
                                        (mv(currentData, 'leadgen_metrics', 'L30') || 0) >= 7 ? "bg-status-on/10 text-status-on" :
                                        (mv(currentData, 'leadgen_metrics', 'L30') || 0) >= 4 ? "bg-status-risk/10 text-status-risk" :
                                        "bg-status-off/10 text-status-off"
                                      )}>
                                        {mv(currentData, 'leadgen_metrics', 'L30') ?? '-'}/10
                                      </div>
                                      <p className="text-[11px] font-bold text-muted-foreground leading-tight">
                                        Overall client sentiment for this week.
                                      </p>
                                    </div>
                                  </div>
                                  </div>
                                  </>
                                )}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                  )
                )}
              </div>

              {!isMonthlyView && (
                <>
              {/* SECTION: TJ PERSONAL BRAND */}
              <div className="space-y-4">
                <SectionHeader title="TJ Personal Brand" id="tj" icon={Star} />
                {!collapsedSections.has('tj') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {tjData ? (
                      <>
                        <TJChannelCard 
                          title="Instagram" 
                          icon={Instagram} 
                          metrics={[
                            { id: 'TJI11', name: 'Total Followers' },
                            { id: 'TJI10', name: 'Followers Gained' },
                            { id: 'TJI05', name: 'Impressions', unit: 'K' },
                            { id: 'TJI04', name: 'Total Posts' },
                            { id: 'TJI01', name: 'Stories' },
                            { id: 'TJI02', name: 'Carousels' },
                            { id: 'TJI03', name: 'Reels' },
                            { id: 'TJI06', name: 'Likes' },
                            { id: 'TJI07', name: 'Comments' },
                            { id: 'TJI08', name: 'Shares' },
                            { id: 'TJI09', name: 'Saves' },
                          ]} 
                          currentData={tjData.instagram} 
                          prevData={tjPrev?.instagram}
                        />
                        <TJChannelCard 
                          title="YouTube" 
                          icon={Youtube} 
                          metrics={[
                            { id: 'TJY07', name: 'Total Subscribers' },
                            { id: 'TJY06', name: 'New Subscribers' },
                            { id: 'TJY02', name: 'Views', unit: 'K' },
                            { id: 'TJY01', name: 'Shorts Uploaded' },
                            { id: 'TJY03', name: 'Impressions', unit: 'K' },
                            { id: 'TJY04', name: 'Likes' },
                            { id: 'TJY05', name: 'Comments' },
                            { id: 'TJY08', name: 'Watch Time', unit: 'hrs' },
                          ]} 
                          currentData={tjData.youtube} 
                          prevData={tjPrev?.youtube}
                        />
                        <TJChannelCard 
                          title="Newsletter & Podcast" 
                          icon={Mail} 
                          metrics={[
                            { id: 'TJP01', name: 'LinkedIn Subs' },
                            { id: 'TJP02', name: 'Email Subs' },
                            { id: 'TJP03', name: 'Podcast Listens' },
                            { id: 'TJP04', name: 'Downloads' },
                          ]} 
                          currentData={tjData.podcast} 
                          prevData={tjPrev?.podcast}
                        />
                        <TJChannelCard 
                          title="Video Pipeline" 
                          icon={Mic} 
                          metrics={[
                            { id: 'TJV01', name: 'Videos Shot' },
                            { id: 'TJV02', name: 'Videos Edited' },
                            { id: 'TJV03', name: 'Videos Scheduled' },
                          ]} 
                          currentData={tjData.video_pipeline} 
                          prevData={tjPrev?.video_pipeline}
                        />
                      </>
                    ) : (
                      <Card className="col-span-full border border-dashed py-10 flex flex-col items-center justify-center bg-muted/5">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No data submitted for this week</p>
                        <Button asChild variant="link" className="text-gold font-bold mt-2">
                          <Link to="/tj-personal-brand">Go to TJ Brand Entry →</Link>
                        </Button>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION: SALES & OUTREACH */}
              <div className="space-y-4">
                <SectionHeader title="Sales & Outreach" id="sales" icon={TrendingUp} />
                {!collapsedSections.has('sales') && (
                  <div className="space-y-4">
                    {salesData ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <SalesOutreachCard 
                            title="TJ Outreach" 
                            metrics={[
                              { id: 'SO02', name: 'Sent' },
                              { id: 'SO03', name: 'Accepted' },
                              { id: 'SO05', name: 'Answered' },
                              { id: 'SO07', name: 'Hot Leads' },
                              { id: 'SO08', name: 'Meetings' },
                            ]} 
                            currentData={salesData.tj_outreach} 
                          />
                          <SalesOutreachCard 
                            title="Jahnvi Outreach" 
                            metrics={[
                              { id: 'SO11', name: 'Sent' },
                              { id: 'SO12', name: 'Accepted' },
                              { id: 'SO14', name: 'Answered' },
                              { id: 'SO16', name: 'Hot Leads' },
                              { id: 'SO17', name: 'Meetings' },
                            ]} 
                            currentData={salesData.jahnvi_outreach} 
                          />
                          <SalesOutreachCard 
                            title="Shirin Outreach" 
                            metrics={[
                              { id: 'SO20', name: 'Sent' },
                              { id: 'SO21', name: 'Accepted' },
                              { id: 'SO23', name: 'Answered' },
                              { id: 'SO25', name: 'Hot Leads' },
                              { id: 'SO26', name: 'Meetings' },
                            ]} 
                            currentData={salesData.shirin_outreach} 
                          />
                        </div>
                        <Card className="border shadow-sm p-6 bg-card">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 border-b pb-2">Meeting Tracker</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6">
                            {[
                              { label: 'Via LinkedIn', val: salesVal(salesData, 'meeting_tracker', 'MT01') },
                              { label: 'Via Cold Email', val: salesVal(salesData, 'meeting_tracker', 'MT02') },
                              { label: 'Via Referral', val: salesVal(salesData, 'meeting_tracker', 'MT03') },
                              { label: 'Total Booked', val: salesVal(salesData, 'meeting_tracker', 'MT05') },
                              { label: 'Completed', val: salesVal(salesData, 'meeting_tracker', 'MT06') },
                              { label: 'No-Shows', val: salesVal(salesData, 'meeting_tracker', 'MT07') },
                              { label: 'Proposals', val: salesVal(salesData, 'meeting_tracker', 'MT09') },
                              { label: 'Follow-ups', val: salesVal(salesData, 'meeting_tracker', 'MT10') },
                              { label: 'Conversions', val: salesVal(salesData, 'meeting_tracker', 'MT11') },
                              { label: 'Revenue', val: salesVal(salesData, 'meeting_tracker', 'MT12'), unit: '₹' },
                            ].map((m, i) => (
                              <div key={i} className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{m.label}</p>
                                <p className="text-lg font-black">{fmt(m.val, m.unit as any)}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </>
                    ) : (
                      <Card className="border border-dashed py-10 flex flex-col items-center justify-center bg-muted/5">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No sales data submitted for this week</p>
                        <Button asChild variant="link" className="text-gold font-bold mt-2">
                          <Link to="/sales">Go to Sales Entry →</Link>
                        </Button>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION: MM COMPANY CONTENT */}
              <div className="space-y-4">
                <SectionHeader title="MM Company Content" id="mm" icon={Globe} />
                {!collapsedSections.has('mm') && (
                  <Card className="border shadow-sm divide-y">
                    {mmData ? (
                      <>
                        <MMContentRow title="LinkedIn Presence" icon={Linkedin} metrics={[
                            { id: 'MML01', name: 'Posts' },
                            { id: 'MML02', name: 'Impressions', unit: 'K' },
                            { id: 'MML03', name: 'Reactions' },
                            { id: 'MML04', name: 'Comments' },
                            { id: 'MML05', name: 'New Followers' },
                            { id: 'MML06', name: 'Total Followers' },
                            { id: 'MML07', name: 'Page Views' },
                          ]} currentData={mmData.linkedin} prevData={prevMmData?.linkedin} 
                        />
                        <MMContentRow title="Instagram Presence" icon={Instagram} metrics={[
                            { id: 'MMI01', name: 'Posts' },
                            { id: 'MMI02', name: 'Stories' },
                            { id: 'MMI03', name: 'Reels' },
                            { id: 'MMI04', name: 'Impressions', unit: 'K' },
                            { id: 'MMI07', name: 'New Followers' },
                            { id: 'MMI08', name: 'Total Followers' },
                            { id: 'MMI09', name: 'ORM Replies' },
                          ]} currentData={mmData.instagram} prevData={prevMmData?.instagram}
                        />
                        <MMContentRow title="Website Analytics" icon={Globe} metrics={[
                            { id: 'MMW01', name: 'Active Users' },
                            { id: 'MMW02', name: 'New Users' },
                            { id: 'MMW03', name: 'Avg Session', unit: 's' },
                            { id: 'MMW04', name: 'Bounce Rate', unit: '%' },
                            { id: 'MMW05', name: 'Blogs Published' },
                          ]} currentData={mmData.website} prevData={prevMmData?.website}
                        />
                        <MMContentRow title="Other Channels (Quora/Reddit)" icon={MessageSquare} metrics={[
                            { id: 'MMO01', name: 'Quora Ans' },
                            { id: 'MMO02', name: 'Quora Views', unit: 'K' },
                            { id: 'MMO05', name: 'Reddit Posts' },
                            { id: 'MMO08', name: 'Reddit Views', unit: 'K' },
                          ]} currentData={mmData.reddit} prevData={prevMmData?.reddit}
                        />
                      </>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center bg-muted/5">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No company content data submitted for this week</p>
                        <Button asChild variant="link" className="text-gold font-bold mt-2">
                          <Link to="/mm-content">Go to MM Content Entry →</Link>
                        </Button>
                      </div>
                    )}
                  </Card>
                )}
              </div>

              {/* SECTION: MYNTMORE PROCESSES */}
              <div className="space-y-4">
                <SectionHeader title="Myntmore Processes" id="processes" icon={LayoutDashboard} />
                {!collapsedSections.has('processes') && (
                  <Card className="border shadow-sm p-4 space-y-4">
                    {processesData.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">No active processes found.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processesData.map(p => {
                          const update = processesUpdates.find(u => u.process_id === p.id)
                          return (
                            <div key={p.id} className="p-3 border rounded-lg bg-muted/20">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs ${p.priority === 'high' ? 'text-red-500' : p.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                                  {p.priority === 'high' ? '🔴' : p.priority === 'medium' ? '🟡' : '🟢'}
                                </span>
                                <span className="font-bold text-sm truncate">{p.title}</span>
                              </div>
                              <p className="text-xs text-muted-foreground italic line-clamp-2">
                                {update ? `"${update.update_text}"` : "No update this week."}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )}
              </div>

              {/* SECTION: TEAM SUBMISSION STATUS */}
              <div className="space-y-4">
                <SectionHeader title="Team Submission Status" id="team" icon={Users} />
                {!collapsedSections.has('team') && (
                  <Card className="border shadow-sm divide-y">
                      {teamSubmissionStatus.map(p => (
                          <div key={p.name} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                              <div className="space-y-1">
                                  <p className="text-sm font-black">{p.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-medium truncate max-w-md">{p.clients}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-muted-foreground">{p.submittedCount}/{p.totalCount} submitted</span>
                                  {p.status === 'all' ? (
                                      <Badge className="bg-status-on/10 text-status-on border-none font-bold gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> ✓ All submitted
                                      </Badge>
                                  ) : p.status === 'partial' ? (
                                      <Badge className="bg-status-risk/10 text-status-risk border-none font-bold gap-1">
                                          <AlertTriangle className="w-3 h-3" /> ⚠️ Partial
                                      </Badge>
                                  ) : (
                                      <Badge className="bg-status-off/10 text-status-off border-none font-bold gap-1">
                                          <AlertCircle className="w-3 h-3" /> ✗ None
                                      </Badge>
                                  )}
                              </div>
                          </div>
                      ))}
                  </Card>
                )}
              </div>

              {/* SECTION: OPEN ACTIONABLES */}
              <div className="space-y-4">
                <SectionHeader title="Open Actionables" id="actionables" icon={CheckCircle2} />
                {!collapsedSections.has('actionables') && (
                  <Card className="border shadow-sm p-6 bg-card relative">
                      <div className="space-y-4">
                          {actionablesByClient.map(c => (
                              <div key={c.id} className="flex justify-between items-center group border-b pb-3 last:border-0 last:pb-0">
                                  <span className="font-bold text-sm group-hover:text-gold transition-colors">{c.name}</span>
                                  <div className="flex items-center gap-3">
                                      {c.carriedForward > 0 && <span className="text-[10px] text-red-500 font-bold italic">({c.carriedForward} carried forward)</span>}
                                      <span className="w-6 h-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-black">{c.count}</span>
                                  </div>
                              </div>
                          ))}
                          {actionablesByClient.length === 0 && (
                              <div className="py-10 text-center italic text-muted-foreground">All clear! No open actionables.</div>
                          )}
                      </div>
                      <Button asChild variant="ghost" size="sm" className="absolute top-2 right-2 text-[10px] font-black h-7">
                          <Link to="/actionables">View All →</Link>
                      </Button>
                  </Card>
                )}
              </div>
                </>
              )}
            </div>
          </main>
          {editingCampaign && (
            <EditCampaignModal
              campaign={editingCampaign}
              onSave={() => {
                loadAllDashboardData(displayWeek)
              }}
              onClose={() => setEditingCampaign(null)}
            />
          )}
    </div>
  )
}

function DashboardCampaignsSection({ clientId, displayWeek, onEditCampaign }: { clientId: string, displayWeek: string, onEditCampaign: (c: any) => void }) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const monthWeeks = getWeeksInSameMonth(displayWeek)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

      if (!data || data.length === 0) {
        setCampaigns([])
        return
      }

      const weekStarts = monthWeeks.map((w: any) => w.weekStart)
      const { data: cdata } = await supabase
        .from('campaign_weekly_data')
        .select('*')
        .in('campaign_id', data.map(c => c.id))
        .in('week_start', weekStarts)

      const enriched = data.map(c => {
        const byWeek: Record<string, any> = {}
        cdata?.filter(r => r.campaign_id === c.id).forEach(r => {
          byWeek[r.week_start] = r
        })
        return { ...c, byWeek }
      })

      setCampaigns(enriched)
    }
    load()
  }, [clientId, displayWeek])

  if (campaigns.length === 0) return null

  return (
    <div className="mt-8 border-t pt-8">
      <div className="flex items-center gap-2 pb-4">
        <Users className="w-4 h-4 text-gold" />
        <h4 className="text-xs font-black uppercase tracking-widest">Active Campaigns</h4>
      </div>
      <div className="space-y-4">
        {campaigns.map(c => (
          <CampaignMonthTable
            key={c.id}
            campaign={c}
            monthWeeks={monthWeeks}
            onEdit={onEditCampaign}
          />
        ))}
      </div>
    </div>
  )
}
