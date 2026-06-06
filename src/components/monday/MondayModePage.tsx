import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { 
  TJ_INSTAGRAM_METRICS, 
  TJ_YOUTUBE_METRICS, 
  TJ_PODCAST_METRICS, 
  TJ_VIDEO_METRICS,
  MM_LINKEDIN_METRICS,
  MM_INSTAGRAM_METRICS,
  MM_WEBSITE_METRICS,
  MM_OTHER_METRICS
} from "@/data/company_metrics"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  BarChart2,
  TrendingUp,
  LayoutDashboard,
  Globe,
  Star,
  Volume2,
  VolumeX,
  Trophy
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts'
import { cn } from "@/lib/utils"
import { getCurrentWeekStart, getPreviousWeekStart, getWeekLabel, getWeeksInSameMonth, getWeekStart } from "@/utils/weekUtils"
import { CampaignMonthTable } from "./CampaignMonthTable"
import { calcRateUncapped, calcRateCapped, fmtRate, fmt, fmtDelta, deltaColor } from '../../utils/readMetric'
import { syncAllCampaignTotals } from '../../utils/campaignSync'
import { formatWeekDate } from '@/utils/dateUtils'
import { fmtPct, fmtMetricCell } from "@/utils/format"
import { EditCampaignModal } from "./EditCampaignModal"
import { mv, sv, readMetric, formatMetricValue, readNum } from "@/utils/dataUtils"
import {
  readMetricValue,
  formatMetricDisplay,
  formatPct,
  calcAcceptanceRate,
  calcResponseRate,
  calcPositiveRate,
  buildWeekMetrics
} from "@/utils/metricCalculations"
import type { WeeklyData, MetricTarget, Campaign, CampaignWeeklyData, MyntmoreProcess, ProcessUpdate, TjWeeklyData, SalesWeeklyData, MmWeeklyData, ClientWithManagers } from '@/types'

const GOLD = '#FFC947'

const WEEK_OPTIONS = [
  {
    weekStart: getCurrentWeekStart(),
    label: getWeekLabel(getCurrentWeekStart()) + ' (This Week)',
  },
  ...Array.from({ length: 7 }, (_, i) => {
    const weekStart = getWeekStart(i + 1)
    return {
      weekStart,
      label: getWeekLabel(weekStart) + (i === 0 ? ' (Last Week)' : ''),
    }
  })
]

const CONTENT_ROWS = [
  { id: 'C03', label: 'Posts Drafted',        category: 'content_metrics' },
  { id: 'C09', label: 'Posts Posted',          category: 'content_metrics' },
  { id: 'C10', label: 'Impressions',           category: 'content_metrics' },
  { id: 'C_IMP_POST', label: 'Impr. / Post',  category: 'content_metrics', calc: true },
  { id: 'C15', label: 'New Followers',         category: 'content_metrics' },
  { id: 'C14', label: 'Profile Views',         category: 'content_metrics' },
  { id: 'C18', label: 'Comment Replies Done',  category: 'content_metrics' },
  { id: 'C13', label: 'Engagement Total',      category: 'content_metrics' },
  { id: 'C20', label: 'EOM Sent',             category: 'content_metrics' },
  { id: 'C25', label: 'Blockers',             category: 'content_metrics' },
]

const LEADGEN_ROWS = [
  { id: 'L07',      label: 'ICP Targeted',       category: 'leadgen_metrics' },
  { id: 'L10',      label: 'Conn Notes Sent',     category: 'leadgen_metrics' },
  { id: 'L11',      label: 'Accepted',            category: 'leadgen_metrics' },
  { id: 'L12_calc', label: 'Acceptance Rate',     category: 'leadgen_metrics', calc: true },
  { id: 'L13',      label: 'Responded',           category: 'leadgen_metrics' },
  { id: 'L14_calc', label: 'Response Rate',       category: 'leadgen_metrics', calc: true },
  { id: 'L15',      label: 'Positive Responses',  category: 'leadgen_metrics' },
  { id: 'L17_calc', label: 'Positive Rate',       category: 'leadgen_metrics', calc: true },
  { id: 'L16',      label: 'Negative Responses',  category: 'leadgen_metrics' },
  { id: 'L24',      label: 'Meetings Booked',     category: 'leadgen_metrics' },
]

const EXISTING_CONN_ROWS = [
  { id: 'L19', label: 'Existing Conn Sent',     category: 'leadgen_metrics' },
  { id: 'L20', label: 'Existing Conn Replied',  category: 'leadgen_metrics' },
  { id: 'L21_calc', label: 'Response Rate',     category: 'leadgen_metrics', calc: true },
]

function resolveCell(row: any, metricId: string, weekRow: any): string {
  if (!weekRow) return '—'
  const cm = weekRow.content_metrics ?? {}
  const lm = weekRow.leadgen_metrics ?? {}

  // Calculated fields
  if (metricId === 'C_IMP_POST') {
    const imp = Number(readNum(cm, 'C10') ?? 0)
    const posts = Number(readNum(cm, 'C09') ?? 0)
    return posts > 0 ? Math.round(imp / posts).toString() : '—'
  }
  if (metricId === 'L12_calc') return fmtPct(readNum(lm, 'L11'), readNum(lm, 'L10'))
  if (metricId === 'L14_calc') return fmtPct(readNum(lm, 'L13'), readNum(lm, 'L11'))
  if (metricId === 'L17_calc') return fmtPct(readNum(lm, 'L15'), readNum(lm, 'L13'))
  if (metricId === 'L21_calc') return fmtPct(readNum(lm, 'L20'), readNum(lm, 'L19'))

  // Standard fields
  const category = metricId.startsWith('C') ? 'content_metrics' : 'leadgen_metrics'
  return fmtMetricCell(weekRow, metricId, category as 'content_metrics' | 'leadgen_metrics')
}

function playGreeting(weekLabel: string) {
  try {
    if ('speechSynthesis' in window) {
      const text = `Starting Monday Mode Metric Review for the week of ${weekLabel.split(' - ')[0]}`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  } catch (e) {
    console.error('Speech synthesis failed:', e)
  }
}

export function MondayModePage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientWithManagers[]>([])
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState<MetricTarget[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [showEntryOverlay, setShowEntryOverlay] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(WEEK_OPTIONS[1].weekStart)

  // Data State
  const [currentData, setCurrentData] = useState<WeeklyData | null>(null)
  const [prevData, setPrevData] = useState<WeeklyData | null>(null)
  const [highScoreMap, setHighScoreMap] = useState<Record<string, { value: number, week: string }>>({})
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyData[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignHistory, setCampaignHistory] = useState<CampaignWeeklyData[]>([])

  // Company Data State
  const [tjData, setTjData] = useState<TjWeeklyData | null>(null)
  const [tjPrev, setTjPrev] = useState<TjWeeklyData | null>(null)
  const [tjHistory, setTjHistory] = useState<TjWeeklyData[]>([])
  const [salesData, setSalesData] = useState<SalesWeeklyData | null>(null)
  const [salesHistory, setSalesHistory] = useState<SalesWeeklyData[]>([])
  const [mmData, setMmData] = useState<MmWeeklyData | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const [processesData, setProcessesData] = useState<MyntmoreProcess[]>([])
  const [processesUpdates, setProcessesUpdates] = useState<ProcessUpdate[]>([])
  const [channelOwners, setChannelOwners] = useState<Record<string, string>>({})

  const sidebarItems = useMemo(() => {
    const items = [
      ...clients.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: 'client', 
        sub: c.company,
        contentManager: c.content_manager?.full_name || 'Unassigned',
        leadgenManager: c.leadgen_manager?.full_name || 'Unassigned'
      })),
      { id: 'tj', name: 'TJ Personal Brand', type: 'tj', sub: 'Tejas Jhaveri', contentManager: '', leadgenManager: '' },
      { id: 'sales', name: 'Sales & Outreach', type: 'sales', sub: 'Myntmore Internal Pipeline', contentManager: '', leadgenManager: '' },
      { id: 'mm', name: 'MM Company Content', type: 'mm', sub: 'Brand & Digital Presence', contentManager: '', leadgenManager: '' },
      { id: 'processes', name: '⚙️ Myntmore Processes', type: 'processes', sub: 'Company SOPs & Tasks', contentManager: '', leadgenManager: '' }
    ]
    return items
  }, [clients])

  const currentItem = sidebarItems[selectedItemIndex]

  // Auto-detect best display week
  const findBestDisplayWeek = async (): Promise<string> => {
    const currentWeekStart = getCurrentWeekStart()   // 2026-05-11
    const previousWeekStart = getPreviousWeekStart() // 2026-05-04

    // Check if current week has any submitted data
    const { data: currentWeekData } = await supabase
      .from('weekly_data')
      .select('id')
      .eq('week_start', currentWeekStart)
      .not('content_submitted_at', 'is', null)
      .limit(1)

    // If current week has data, show it — otherwise show previous week
    if (currentWeekData && currentWeekData.length > 0) {
      return currentWeekStart
    }
    return previousWeekStart
  }

  useEffect(() => {
    findBestDisplayWeek().then(week => setSelectedWeek(week))
  }, [])

  // Initialize clients
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from('clients')
        .select(`
          *,
          content_manager:profiles!content_manager_id(full_name),
          leadgen_manager:profiles!leadgen_manager_id(full_name)
        `)
        .eq('status', 'active')
        .order('name')
      setClients(data || [])
    }
    init()
  }, [])

  // Main Data Fetcher
  useEffect(() => {
    if (!currentItem) return

    const fetchData = async () => {
      setLoading(true)
      
      const selected = new Date(selectedWeek)
      const prevWeekDate = new Date(selected)
      prevWeekDate.setDate(selected.getDate() - 7)
      const prevWeekStart = prevWeekDate.toISOString().split('T')[0]

      const monthWeeks = getWeeksInSameMonth(selectedWeek)
      const weekStarts = monthWeeks.map(w => w.weekStart)

      if (currentItem.type === 'client') {
        await syncAllCampaignTotals(currentItem.id, selectedWeek)
        
        const [
          currentRes,
          prevRes,
          targetsRes,
          highScoresRes,
          historyRes,
          campaignsRes,
          campaignHistoryRes
        ] = await Promise.all([
          supabase.from('weekly_data').select('*').eq('client_id', currentItem.id).eq('week_start', selectedWeek).maybeSingle(),
          supabase.from('weekly_data').select('*').eq('client_id', currentItem.id).eq('week_start', prevWeekStart).maybeSingle(),
          supabase.from('targets').select('*').eq('client_id', currentItem.id),
          supabase.from('high_scores').select('metric_id, lifetime_high, achieved_week').eq('client_id', currentItem.id),
          supabase.from('weekly_data').select('*').eq('client_id', currentItem.id).in('week_start', weekStarts).order('week_start', { ascending: true }),
          supabase.from('campaigns').select('*').eq('client_id', currentItem.id).neq('status', 'completed'),
          supabase.from('campaign_weekly_data').select('*').eq('client_id', currentItem.id).in('week_start', weekStarts)
        ])

        // Temporary debug
        console.log('Fetched week rows:', historyRes.data?.length, 'for weeks:', weekStarts)
        console.log('Error:', historyRes.error)
        console.log('Rows:', historyRes.data)

        setCurrentData(currentRes.data)
        setPrevData(prevRes.data)
        setTargets(targetsRes.data || [])
        
        // Ensure monthWeeks are matched with correct data and padded with empty arrays if no data
        const dataMap: Record<string, any> = {}
        historyRes.data?.forEach((r: any) => { dataMap[r.week_start] = r })
        const sortedHistory = monthWeeks.map(w => dataMap[w.weekStart] || { week_start: w.weekStart, week_label: w.shortLabel })
        setWeeklyHistory(sortedHistory)

        const hsMap: Record<string, { value: number, week: string }> = {}
        highScoresRes.data?.forEach(h => {
          hsMap[h.metric_id] = { value: h.lifetime_high ?? 0, week: h.achieved_week ?? '' }
        })
        setHighScoreMap(hsMap)
        setCampaigns(campaignsRes.data || [])
        setCampaignHistory(campaignHistoryRes.data || [])

      } else if (currentItem.type === 'tj') {
        const [curr, prev, hist] = await Promise.all([
          supabase.from('tj_weekly_data').select('*').eq('week_start', selectedWeek).maybeSingle(),
          supabase.from('tj_weekly_data').select('*').eq('week_start', prevWeekStart).maybeSingle(),
          supabase.from('tj_weekly_data').select('*').in('week_start', weekStarts).order('week_start', { ascending: true })
        ])
        setTjData(curr.data)
        setTjPrev(prev.data)
        setTjHistory(hist.data || [])
      } else if (currentItem.type === 'sales') {
        const [curr, hist] = await Promise.all([
          supabase.from('sales_weekly_data').select('*').eq('week_start', selectedWeek).maybeSingle(),
          supabase.from('sales_weekly_data').select('*').in('week_start', weekStarts).order('week_start', { ascending: true })
        ])
        setSalesData(curr.data)
        setSalesHistory(hist.data || [])
      } else if (currentItem.type === 'mm') {
        const { data } = await supabase.from('mm_weekly_data').select('*').eq('week_start', selectedWeek).maybeSingle()
        setMmData(data)
      } else if (currentItem.type === 'processes') {
        const { data: pData } = await supabase.from('myntmore_processes').select('*').eq('status', 'active').order('priority', { ascending: true }).order('created_at', { ascending: true })
        const { data: uData } = await supabase.from('process_weekly_updates').select('*, profiles(full_name)').in('process_id', pData?.map(p => p.id) ?? []).order('week_start', { ascending: false })
        setProcessesData(pData || [])
        setProcessesUpdates(uData || [])
      }
      
      setLoading(false)
    }
    fetchData()
  }, [currentItem, selectedWeek])

  const getStepCount = (item: any) => {
    if (item.type === 'client') return 4
    if (item.type === 'tj') return 4
    if (item.type === 'sales') return 1
    if (item.type === 'mm') return 1
    return 1
  }

  const handleNext = () => {
    const steps = getStepCount(currentItem)
    if (currentStep < steps - 1) {
      setCurrentStep(currentStep + 1)
    } else if (selectedItemIndex < sidebarItems.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1)
      setCurrentStep(0)
    } else {
      setIsComplete(true)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1)
      const prevItem = sidebarItems[selectedItemIndex - 1]
      setCurrentStep(getStepCount(prevItem) - 1)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showEntryOverlay || isComplete) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'Escape') {
        window.history.back()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItemIndex, currentStep, showEntryOverlay, isComplete])

  const formatWeekLabel = (weekStart: string) => {
    const d = new Date(weekStart)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const renderClientView = () => {
    // Targets are stored with period = weekStart (YYYY-MM-DD), not week-number format
    const weekPeriod = selectedWeek
    const monthWeeks = getWeeksInSameMonth(selectedWeek)

    if (currentStep === 0) {
      const weekMetrics = buildWeekMetrics(currentData)
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{currentItem.name} - {currentItem.sub}</h2>
              <div className="flex gap-6 mt-1">
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Content:</span> {currentItem.contentManager}</p>
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Lead Gen:</span> {currentItem.leadgenManager}</p>
              </div>
              <p className="text-muted-foreground font-bold flex items-center gap-2 mt-2">Content Review <Badge className="bg-gold text-black font-bold">Step 1 of 4</Badge></p>
            </div>
          </div>
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase w-[200px]">Metric</TableHead>
                  {monthWeeks.map(w => (
                    <TableHead key={w.weekStart} className={cn("text-center font-black text-[10px] uppercase", w.weekStart === selectedWeek && "bg-gold/10 text-gold")}>
                      {w.shortLabel}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase">Target</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Ach%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONTENT_ROWS.slice(0, 8).map(m => {
                  const built = buildWeekMetrics(currentData)
                  const currentVal = m.id === 'C_IPP' ? built?.impressionsPerPost : built?.[m.id as keyof typeof built]
                  const target = targets.find(t => t.metric_id === m.id && t.target_type === 'weekly' && t.period === weekPeriod)?.target_value ?? null
                  const ach = (target && currentVal !== null) ? Math.round((Number(currentVal) / target) * 100) : null
                  const highScore = highScoreMap[m.id]

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold text-xs py-3 border-r">
                        {m.label}
                        {highScore && (
                          <div className="text-[9px] text-gold mt-0.5 flex items-center gap-1 font-black">
                            <Trophy className="w-2.5 h-2.5" /> Best: {formatMetricDisplay(highScore.value, m.id)}
                          </div>
                        )}
                      </TableCell>
                      {monthWeeks.map(w => {
                        const rowData = weeklyHistory.find(r => r.week_start === w.weekStart)
                        const wBuilt = buildWeekMetrics(rowData)
                        const val = m.id === 'C_IPP' ? wBuilt?.impressionsPerPost : wBuilt?.[m.id as keyof typeof wBuilt]
                        return (
                          <TableCell key={w.weekStart} className={cn("text-center text-sm font-black", w.weekStart === selectedWeek && "bg-gold/5")}>
                            {m.id === 'C_IPP' ? fmt(val) : fmt(val)}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center text-muted-foreground font-bold border-l">{fmt(target)}</TableCell>
                      <TableCell className="text-center font-black">{ach ? `${ach}%` : '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="p-4 bg-muted/20 border rounded-xl flex justify-between items-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">EOM Report Sent</p>
              <p className="text-xl font-black">{weekMetrics?.C20 ? '-' : '-'}</p>
            </div>
            <div className="p-4 bg-muted/20 border rounded-xl">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Blockers</p>
              <p className="text-sm font-medium italic">"{weekMetrics?.C25 || 'No blockers reported.'}"</p>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">
              Next: Lead Gen Review <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{currentItem.name} - {currentItem.sub}</h2>
              <div className="flex gap-6 mt-1">
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Content:</span> {currentItem.contentManager}</p>
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Lead Gen:</span> {currentItem.leadgenManager}</p>
              </div>
              <p className="text-muted-foreground font-bold flex items-center gap-2 mt-2">Lead Gen + Campaigns <Badge className="bg-gold text-black font-bold">Step 2 of 4</Badge></p>
            </div>
          </div>
          
          <LeadGenCampaignsStep
            client={currentItem}
            weekData={currentData}
            monthWeeks={monthWeeks}
            weeklyHistory={weeklyHistory}
            highScoreMap={highScoreMap}
            onEditCampaign={(c: any) => setEditingCampaign(c)}
          />

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrev} className="font-bold h-12 px-8 border-gold/20 hover:bg-gold/5">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back: Content
            </Button>
            <Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">
              Next: Performance Charts <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    }

    if (currentStep === 2) {
      const chartData = weeklyHistory.filter(d => d.week_start).map(d => {
        const built = buildWeekMetrics(d)
        return {
          week: d.week_label?.split(' - ')[0] || '',
          L10: built?.L10 || 0,
          C10: built?.C10 || 0,
          L24: built?.L24 || 0,
          C15: built?.C15 || 0,
        }
      })
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{currentItem.name} - {currentItem.sub}</h2>
              <div className="flex gap-6 mt-1">
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Content:</span> {currentItem.contentManager}</p>
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Lead Gen:</span> {currentItem.leadgenManager}</p>
              </div>
              <p className="text-muted-foreground font-bold flex items-center gap-2 mt-2">Performance Charts <Badge className="bg-gold text-black font-bold">Step 3 of 4</Badge></p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="p-4 h-[300px]"><CardHeader className="p-2 pb-4"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Connection Requests</CardTitle></CardHeader><ResponsiveContainer width="100%" height="80%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={9} /><Tooltip /><Line type="monotone" dataKey="L10" stroke={GOLD} strokeWidth={3} dot={{ fill: GOLD }} /></LineChart></ResponsiveContainer></Card>
             <Card className="p-4 h-[300px]"><CardHeader className="p-2 pb-4"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Impressions Trend</CardTitle></CardHeader><ResponsiveContainer width="100%" height="80%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={9} /><Tooltip /><Area type="monotone" dataKey="C10" stroke={GOLD} fill={GOLD} fillOpacity={0.1} strokeWidth={3} /></AreaChart></ResponsiveContainer></Card>
             <Card className="p-4 h-[300px]"><CardHeader className="p-2 pb-4"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Meetings Booked</CardTitle></CardHeader><ResponsiveContainer width="100%" height="80%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={9} /><Tooltip /><Bar dataKey="L24" fill={GOLD} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
             <Card className="p-4 h-[300px]"><CardHeader className="p-2 pb-4"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">New Followers</CardTitle></CardHeader><ResponsiveContainer width="100%" height="80%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={9} /><Tooltip /><Line type="monotone" dataKey="C15" stroke={GOLD} strokeWidth={3} dot={{ fill: GOLD }} /></LineChart></ResponsiveContainer></Card>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrev} className="font-bold h-12 px-8 border-gold/20 hover:bg-gold/5">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back: Lead Gen
            </Button>
            <Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">
              Next: Notes & Actions <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{currentItem.name} - {currentItem.sub}</h2>
              <div className="flex gap-6 mt-1">
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Content:</span> {currentItem.contentManager}</p>
                <p className="text-[11px] text-muted-foreground font-bold"><span className="text-black uppercase">Lead Gen:</span> {currentItem.leadgenManager}</p>
              </div>
              <p className="text-muted-foreground font-bold flex items-center gap-2 mt-2">Notes & Actions <Badge className="bg-gold text-black font-bold">Step 4 of 4</Badge></p>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border p-8 space-y-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Strategic Notes</h3>
              <div className="p-4 bg-muted/20 rounded-lg min-h-[100px] border border-dashed">
                <p className="text-sm text-muted-foreground italic">No specific strategic notes for this week.</p>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Next Week Action Plan</h3>
              <div className="p-4 bg-muted/20 rounded-lg min-h-[100px] border border-dashed">
                <p className="text-sm text-muted-foreground italic">Action plan pending manager review.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrev} className="font-bold h-12 px-8 border-gold/20 hover:bg-gold/5">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back: Charts
            </Button>
            <Button onClick={handleNext} className="bg-black text-white font-black h-12 px-10 hover:bg-black/90 shadow-lg">
              - Done - Next Client <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    }
    return null
  }

  const renderTJBrandView = () => {
    const renderMetricTable = (metrics: any[], current: any, prev: any) => (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-black text-[10px] uppercase">Metric</TableHead>
              <TableHead className="text-center font-black text-[10px] uppercase">This Week</TableHead>
              <TableHead className="text-center font-black text-[10px] uppercase">Last Week</TableHead>
              <TableHead className="text-center font-black text-[10px] uppercase">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map(m => {
              const val = readNum(current, m.id) ?? 0
              const pVal = readNum(prev, m.id) ?? 0
              const dVal = fmtDelta(val, pVal)
              const dColor = deltaColor(val, pVal)
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-bold text-sm">{m.name}</TableCell>
                  <TableCell className="text-center text-lg font-black">{fmt(val)}{m.unit}</TableCell>
                  <TableCell className="text-center text-muted-foreground font-medium">{fmt(pVal)}{m.unit}</TableCell>
                  <TableCell className="text-center font-bold" style={{ color: dColor }}>{dVal}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )

    if (currentStep === 0) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">TJ Personal Brand</h2>
              <p className="text-muted-foreground font-bold flex items-center gap-2">Instagram + YouTube <Badge className="bg-gold text-black font-bold">Step 1 of 4</Badge></p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Instagram <span className="lowercase font-normal">({channelOwners.instagram ?? 'Unassigned'})</span>
              </h3>
              {renderMetricTable(TJ_INSTAGRAM_METRICS, tjData?.instagram, tjPrev?.instagram)}
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                YouTube <span className="lowercase font-normal">({channelOwners.youtube ?? 'Unassigned'})</span>
              </h3>
              {renderMetricTable(TJ_YOUTUBE_METRICS, tjData?.youtube, tjPrev?.youtube)}
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">Next: Newsletter + Podcast <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
        </div>
      )
    }
    if (currentStep === 1) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4 mb-4">
            <div><h2 className="text-2xl font-black uppercase tracking-tight">TJ Personal Brand</h2><p className="text-muted-foreground font-bold flex items-center gap-2">Newsletter + Podcast <span className="lowercase font-normal text-sm">({channelOwners.linkedin_newsletter ?? 'Unassigned'})</span> <Badge className="bg-gold text-black font-bold">Step 2 of 4</Badge></p></div>
          </div>
          {renderMetricTable(TJ_PODCAST_METRICS, { ...(tjData?.linkedin_newsletter as Record<string, unknown> || {}), ...(tjData?.email_newsletter as Record<string, unknown> || {}), ...(tjData?.podcast as Record<string, unknown> || {}) }, { ...(tjPrev?.linkedin_newsletter as Record<string, unknown> || {}), ...(tjPrev?.email_newsletter as Record<string, unknown> || {}), ...(tjPrev?.podcast as Record<string, unknown> || {}) })}
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={handlePrev} className="font-bold h-12 px-8 border-gold/20 hover:bg-gold/5"><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button><Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">Next: Video Pipeline <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
        </div>
      )
    }
    if (currentStep === 2) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4 mb-4">
            <div><h2 className="text-2xl font-black uppercase tracking-tight">TJ Personal Brand</h2><p className="text-muted-foreground font-bold flex items-center gap-2">Video Pipeline <span className="lowercase font-normal text-sm">({channelOwners.video_pipeline ?? 'Unassigned'})</span> <Badge className="bg-gold text-black font-bold">Step 3 of 4</Badge></p></div>
          </div>
          {renderMetricTable(TJ_VIDEO_METRICS, tjData?.video_pipeline, tjPrev?.video_pipeline)}
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={handlePrev} className="font-bold h-12 px-8 border-gold/20 hover:bg-gold/5"><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button><Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">Next: Charts <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
        </div>
      )
    }
    if (currentStep === 3) {
      const chartData = tjHistory.map(h => ({
        week: h.week_label?.split(' - ')[0],
        followers: readNum(h.instagram, 'TJI11') ?? 0,
        views: readNum(h.youtube, 'TJY02') ?? 0
      }))
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-end border-b pb-4">
            <div><h2 className="text-2xl font-black uppercase tracking-tight">TJ Personal Brand</h2><p className="text-muted-foreground font-bold flex items-center gap-2">Trend Analysis <Badge className="bg-gold text-black font-bold">Step 4 of 4</Badge></p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="p-4 h-[300px]"><CardHeader className="p-2 pb-4"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Follower Growth (IG)</CardTitle></CardHeader><ResponsiveContainer width="100%" height="80%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={9} domain={['auto', 'auto']} /><Tooltip /><Line type="monotone" dataKey="followers" stroke={GOLD} strokeWidth={3} dot={{ fill: GOLD }} /></LineChart></ResponsiveContainer></Card>
             <Card className="p-4 h-[300px]"><CardHeader className="p-2 pb-4"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">YouTube Views</CardTitle></CardHeader><ResponsiveContainer width="100%" height="80%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={9} /><Tooltip /><Area type="monotone" dataKey="views" stroke={GOLD} fill={GOLD} fillOpacity={0.1} strokeWidth={3} /></AreaChart></ResponsiveContainer></Card>
          </div>
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={handlePrev} className="font-bold h-12 px-8 border-gold/20 hover:bg-gold/5"><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button><Button onClick={handleNext} className="bg-black text-white font-black h-12 px-10 hover:bg-black/90 shadow-lg">- Done - Next Section <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
        </div>
      )
    }
    return null
  }

  const renderSalesView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-end border-b pb-4">
        <div><h2 className="text-2xl font-black uppercase tracking-tight">Sales & Outreach</h2><p className="text-muted-foreground font-bold">Myntmore Internal Pipeline</p></div>
      </div>
      <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/5">
        <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
        <p className="text-muted-foreground font-bold italic">Sales review is being optimized for the new guided flow.</p>
      </div>
      <div className="flex justify-end pt-4"><Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">Next Section <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
    </div>
  )

  const renderMMContentView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-end border-b pb-4">
        <div><h2 className="text-2xl font-black uppercase tracking-tight">MM Company Content</h2><p className="text-muted-foreground font-bold">Brand Presence</p></div>
      </div>
      <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/5">
        <Globe className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
        <p className="text-muted-foreground font-bold italic">MM Content review is being optimized for the new guided flow.</p>
      </div>
      <div className="flex justify-end pt-4"><Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">Next Section <ChevronRight className="w-4 h-4 ml-2" /></Button></div>
    </div>
  )

  const renderProcessesView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-end border-b pb-4">
        <div><h2 className="text-2xl font-black uppercase tracking-tight">MYNTMORE PROCESSES</h2><p className="text-muted-foreground font-bold">Active Systems & SOPs</p></div>
      </div>
      
      <div className="space-y-4">
        {processesData.map(p => {
          const pUpdates = processesUpdates.filter(u => u.process_id === p.id)
          const currentUpdate = pUpdates.find(u => u.week_start === selectedWeek)
          const previousUpdates = pUpdates.filter(u => u.week_start !== selectedWeek).slice(0, 3)

          return (
            <div key={p.id} className="border p-4 rounded-xl bg-card shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs ${p.priority === 'high' ? 'text-red-500' : p.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                      {p.priority === 'high' ? '🔴 HIGH' : p.priority === 'medium' ? '🟡 MED' : '🟢 LOW'}
                    </span>
                    <h3 className="text-lg font-bold">{p.title}</h3>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 mt-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">THIS WEEK ({formatWeekLabel(selectedWeek)}):</h4>
                  {currentUpdate ? (
                    <p className="text-sm bg-muted/30 p-3 rounded-lg border font-medium">"{currentUpdate.update_text}"</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No update submitted yet.</p>
                  )}
                </div>

                {previousUpdates.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">PREVIOUS WEEKS:</h4>
                    <div className="space-y-2 pl-2 border-l-2 border-muted">
                      {previousUpdates.map((u: any) => (
                        <div key={u.id} className="text-sm">
                          <span className="font-bold">{formatWeekLabel(u.week_start)}:</span> <span className="italic text-muted-foreground">"{u.update_text}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {processesData.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">No active processes found.</div>
        )}
      </div>

      <div className="flex justify-end pt-4"><Button onClick={handleNext} className="bg-gold text-black font-black h-12 px-10 hover:bg-gold/90 shadow-lg">Finish Review <CheckCircle2 className="w-4 h-4 ml-2" /></Button></div>
    </div>
  )

  const handleStart = () => {
    setShowEntryOverlay(false)
    if (!isMuted) playGreeting(getWeekLabel(selectedWeek))
  }

  if (showEntryOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
        <div className="max-w-md w-full p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-gold rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,201,71,0.3)]"><LayoutDashboard className="w-12 h-12 text-black" /></div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Monday Mode</h1>
            <p className="text-gold font-bold tracking-widest uppercase text-xs">Guided Metric Review Flow</p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-left space-y-4">
             <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-gold" /><p className="text-white/80 text-sm font-medium">Guided walkthrough per client</p></div>
             <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-gold" /><p className="text-white/80 text-sm font-medium">Focused 8-week performance trends</p></div>
             <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-gold" /><p className="text-white/80 text-sm font-medium">Use <span className="text-gold font-bold">Space / Arrows</span> to navigate</p></div>
          </div>
          <div className="flex flex-col gap-4">
            <Button onClick={handleStart} className="w-full h-16 bg-gold text-black font-black text-lg uppercase tracking-widest hover:bg-gold/90 shadow-xl">Start Review Flow</Button>
            <div className="flex justify-center gap-6">
              <button onClick={() => setIsMuted(!isMuted)} className="text-white/40 hover:text-white transition-colors">
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gold">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"><CheckCircle2 className="w-16 h-16 text-gold" /></div>
          <h1 className="text-6xl font-black text-black italic uppercase tracking-tighter">Review Complete!</h1>
          <p className="text-black/60 font-black uppercase tracking-widest text-sm">All clients and sections have been reviewed.</p>
          <Button onClick={() => window.history.back()} className="h-14 px-12 bg-black text-white font-black uppercase tracking-widest hover:bg-black/80">Exit Monday Mode</Button>
        </div>
      </div>
    )
  }

  const totalSteps = sidebarItems.reduce((acc, item) => acc + getStepCount(item), 0)
  const currentOverallStep = sidebarItems.slice(0, selectedItemIndex).reduce((acc, item) => acc + getStepCount(item), 0) + currentStep + 1

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="w-72 border-r bg-muted/10 flex flex-col">
        <div className="p-6 border-b">
           <div className="mb-4 space-y-2">
             <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Monday Mode Flow</h2>
             <select
               value={selectedWeek}
               onChange={(e) => setSelectedWeek(e.target.value)}
               className="w-full bg-background border border-gold/30 rounded-md px-2 py-1.5 text-[11px] font-black uppercase text-gold cursor-pointer hover:border-gold transition-colors"
             >
               {WEEK_OPTIONS.map(w => (
                 <option key={w.weekStart} value={w.weekStart}>{w.label}</option>
               ))}
             </select>
           </div>
           <div className="space-y-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${(currentOverallStep / totalSteps) * 100}%` }} /></div>
              <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground"><span>Step {currentOverallStep} of {totalSteps}</span><span>{Math.round((currentOverallStep / totalSteps) * 100)}%</span></div>
           </div>
        </div>
        <ScrollArea className="flex-1">
           <div className="p-4 space-y-8">
              <div>
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 px-2">Client List</h3>
                <div className="space-y-1">
                  {sidebarItems.filter(i => i.type === 'client').map((item) => {
                    const absIdx = sidebarItems.findIndex(si => si.id === item.id)
                    const isDone = absIdx < selectedItemIndex
                    const isCurrent = absIdx === selectedItemIndex
                    return (
                      <div key={item.id} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all", isCurrent ? "bg-gold text-black shadow-sm" : isDone ? "text-muted-foreground/60" : "text-muted-foreground")}>
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-status-on" /> : isCurrent ? <div className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-black animate-pulse" /></div> : <div className="w-4 h-4 rounded-full border-2 border-muted" />}
                        <div className="flex-1 truncate">
                          <p className="leading-tight truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{item.sub}</p>
                          {item.type === 'client' && (
                            <p className="text-[9px] text-muted-foreground/40 truncate">
                              {item.contentManager} - {item.leadgenManager}
                            </p>
                          )}
                          {isCurrent && <div className="flex gap-1 mt-1">{[0,1,2,3].map(s => <div key={s} className={cn("h-1 flex-1 rounded-full", currentStep >= s ? "bg-black" : "bg-black/10")} />)}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 px-2">Company Sections</h3>
                <div className="space-y-1">
                  {sidebarItems.filter(i => i.type !== 'client').map((item) => {
                    const absIdx = sidebarItems.findIndex(si => si.id === item.id)
                    const isDone = absIdx < selectedItemIndex
                    const isCurrent = absIdx === selectedItemIndex
                    const Icon = item.id === 'tj' ? Star : item.id === 'sales' ? TrendingUp : Globe
                    return (
                      <div key={item.id} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all", isCurrent ? "bg-gold text-black shadow-sm" : isDone ? "text-muted-foreground/60" : "text-muted-foreground")}>
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-status-on" /> : <Icon className={cn("w-4 h-4", isCurrent ? "text-black" : "text-muted-foreground")} />}
                        <p className="flex-1 truncate leading-tight">{item.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
           </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-10 h-10 animate-spin text-gold" /><p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Updating section data...</p></div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-12 pb-32 max-w-6xl mx-auto">
              {currentItem?.type === 'client' && renderClientView()}
              {currentItem?.type === 'tj' && renderTJBrandView()}
              {currentItem?.type === 'sales' && renderSalesView()}
              {currentItem?.type === 'mm' && renderMMContentView()}
              {currentItem?.type === 'processes' && renderProcessesView()}
            </div>
          </ScrollArea>
        )}
      </div>
      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          onSave={() => {
            // Data will be re-fetched by the useEffect if needed, or we just rely on parent component reloading
            const cb = async () => {
              const { data } = await supabase.from('campaigns').select('*').eq('client_id', currentItem.id).neq('status', 'completed')
              setCampaigns(data || [])
            }
            cb()
          }}
          onClose={() => setEditingCampaign(null)}
        />
      )}
    </div>
  )
}

function LeadGenCampaignsStep({ client, weekData, monthWeeks, weeklyHistory, highScoreMap, onEditCampaign }: any) {
  const built = buildWeekMetrics(weekData)

  // Helper: get actual DB row for a given week metadata object
  const getRow = (w: any) => weeklyHistory?.find((r: any) => r.week_start === (w.weekStart || w.week_start)) ?? null

  return (
    <div className="space-y-12">
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#666',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
          Overall Lead Gen - All Campaigns Combined
        </h3>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-[#FFC947]">
              <TableRow>
                <TableHead style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '700', width: '200px', color: 'black' }}>
                  METRIC
                </TableHead>
                {monthWeeks.map((w: any) => (
                  <TableHead key={w.weekStart || w.week_start} style={{
                    padding: '10px', textAlign: 'center', fontSize: '12px',
                    fontWeight: w.isSelected ? '900' : '700',
                    color: w.isSelected ? '#000' : 'black',
                    background: w.isSelected ? '#FFFBF0' : '#FFC947',
                    borderBottom: w.isSelected ? '3px solid #FFC947' : undefined,
                    whiteSpace: 'nowrap',
                  }}>
                    {w.shortLabel || w.week_label?.split(' – ')[0] || w.weekStart}
                    {w.isSelected && <div style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', marginTop: '2px' }}>SELECTED</div>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEADGEN_ROWS.map(row => (
                <LeadGenTableRow
                  key={row.id}
                  row={row}
                  monthWeeks={monthWeeks}
                  weeklyHistory={weeklyHistory}
                  highScore={highScoreMap[row.id]}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Auto-calculated rates for current week */}
        {built && (
          <div style={{ display: 'flex', gap: '32px', padding: '24px',
            background: '#F9F9F9', borderRadius: '12px', marginTop: '24px', border: '1px solid #F0F0F0' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                Acceptance Rate
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: (built.L12 && built.L12 >= 40) ? '#22C55E' : '#EF4444' }}>
                {built.L12 !== null ? formatPct(built.L12) : '-'}
              </div>
            </div>
            <div className="w-px bg-muted" />
            <div>
              <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                Response Rate
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: (built.L14 && built.L14 >= 30) ? '#22C55E' : '#EF4444' }}>
                {built.L14 !== null ? formatPct(built.L14) : '-'}
              </div>
            </div>
            <div className="w-px bg-muted" />
            {built.L17 !== null && (
              <div>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                  Positive Rate
                </div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#000' }}>
                  {formatPct(built.L17)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

            <div style={{ marginTop: '48px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#666',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
          Existing Connections (Client-Level)
        </h3>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '700', width: '200px', color: 'black' }}>
                  METRIC
                </TableHead>
                {monthWeeks.map((w: any) => (
                  <TableHead key={w.weekStart || w.week_start} style={{
                    padding: '10px', textAlign: 'center', fontSize: '12px',
                    fontWeight: w.isSelected ? '900' : '700',
                    color: '#333',
                    background: w.isSelected ? '#FFFBF0' : '#F5F5F5',
                    whiteSpace: 'nowrap',
                  }}>
                    {w.shortLabel || w.week_label?.split(' – ')[0] || w.weekStart}
                    {w.isSelected && <div style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', marginTop: '2px' }}>SELECTED</div>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'Messages Sent', getValue: (w: any) => buildWeekMetrics(getRow(w))?.L19 ?? null },
                { label: 'Replies Received', getValue: (w: any) => buildWeekMetrics(getRow(w))?.L20 ?? null },
                { label: 'Response Rate', isCalc: true, getValue: (w: any) => {
                  const built = buildWeekMetrics(getRow(w))
                  return fmtRate(calcRateCapped(built?.L20 ?? null, built?.L19 ?? null))
                }}
              ].map((r, i) => (
                <TableRow key={i}>
                  <TableCell style={{ padding: '10px', fontSize: '12px', fontWeight: '700', color: '#666' }}>
                    {r.label}
                  </TableCell>
                  {monthWeeks.map((w: any, idx: number) => {
                    const isCurrentWeek = idx === monthWeeks.length - 1
                    const val = r.getValue(w)
                    return (
                      <TableCell key={w.week_start || w.weekStart || idx} style={{ 
                        padding: '10px', 
                        textAlign: 'center', 
                        fontSize: '14px', 
                        fontWeight: '700',
                        color: isCurrentWeek ? '#000' : '#666',
                        backgroundColor: isCurrentWeek ? '#FAFAFA' : 'transparent',
                        borderLeft: isCurrentWeek ? '2px solid #FFC947' : '1px solid #E5E5E5',
                        borderRight: isCurrentWeek ? '2px solid #FFC947' : 'none',
                      }}>
                        {r.isCalc ? val : (val === null ? '—' : fmt(val))}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>


      <CampaignsSection clientId={client.id} monthWeeks={monthWeeks} onEditCampaign={onEditCampaign} />
    </div>
  )
}

function LeadGenTableRow({ row, monthWeeks, weeklyHistory, highScore }: any) {
  const cells = monthWeeks.map((w: any) => {
    const dbRow = weeklyHistory?.find((r: any) => r.week_start === (w.weekStart || w.week_start)) ?? null
    const built = buildWeekMetrics(dbRow)
    if (!built) return { display: '-', raw: null, isCurrentWeek: false }

    let raw: number | string | null = null
    let display = '-'

    if (row.isText) {
      const val = built[row.id as keyof typeof built]
      display = val ? String(val).slice(0, 30) + (String(val).length > 30 ? '...' : '') : '-'
      return { display, raw: null, isCurrentWeek: w === monthWeeks[monthWeeks.length - 1] }
    }

    if (row.isCalc) {
      raw = built[row.id as keyof typeof built] as number | null
      display = raw !== null ? formatPct(raw) : '-'
    } else {
      raw = built[row.id as keyof typeof built] as number | null
      display = raw !== null ? formatMetricDisplay(raw, row.id) : '-'
    }

    return { display, raw, isCurrentWeek: w === monthWeeks[monthWeeks.length - 1] }
  })

  return (
    <TableRow style={{ borderBottom: '1px solid #F0F0F0' }}>
      <TableCell style={{ padding: '12px 10px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#000' }}>
          {row.label}
        </div>
        {highScore && !row.isText && !row.isCalc && (
          <span className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">
            -- BEST: {row.unit === '%' ? formatPct(highScore.value) : highScore.value.toLocaleString()} - {formatWeekDate(highScore.week)}
          </span>
        )}
      </TableCell>
      {cells.map((cell: any, idx: number) => {
        const prevRaw = idx > 0 ? cells[idx - 1].raw : null
        const isBetter = cell.raw !== null && prevRaw !== null && Number(cell.raw) > Number(prevRaw)
        const isWorse = cell.raw !== null && prevRaw !== null && Number(cell.raw) < Number(prevRaw)
        const isSelected = idx === monthWeeks.length - 1

        return (
          <TableCell key={idx} style={{
            padding: '12px 10px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: isSelected ? '900' : '500',
            color: cell.display === '-' ? '#ccc' : '#000',
            background: isSelected
              ? '#FFFBF0'
              : isBetter
              ? '#F0FDF4'
              : isWorse
              ? '#FEF2F2'
              : 'white',
          }}>
            {cell.display}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

function CampaignsSection({ clientId, monthWeeks, onEditCampaign }: any) {
  const [campaigns, setCampaigns] = useState<any[]>([])

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
  }, [clientId, monthWeeks])

  if (campaigns.length === 0) return (
    <div style={{ padding: '24px', color: '#999', fontSize: '13px', fontStyle: 'italic', background: '#F9F9F9', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
      No active campaigns found for this client.
    </div>
  )

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#666',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
        Campaigns Breakdown
      </h3>

      <div className="space-y-6">
        {campaigns.map(campaign => (
          <CampaignMonthTable
            key={campaign.id}
            campaign={campaign}
            monthWeeks={monthWeeks}
            onEdit={onEditCampaign}
          />
        ))}
      </div>
    </div>
  )
}

