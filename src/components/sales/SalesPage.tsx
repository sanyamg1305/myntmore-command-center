import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Plus, 
  Target, 
  TrendingUp, 
  Users, 
  Mail, 
  LayoutDashboard, 
  List, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  History, 
  Check, 
  Save, 
  Loader2,
  Trophy
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/ui/BackButton"
import { getCurrentWeekStart, getWeekOptions } from "@/utils/weekUtils"
import { readSalesNum } from "@/utils/readMetric"
import { useAutoSave } from "@/hooks/useAutoSave"
import { SaveIndicator } from "@/components/ui/SaveIndicator"
import type { HotLead, SalesWeeklyData } from '@/types'

const GOLD = '#FFC947'

export function SalesOutreachPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('weekly-data')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const weekOptions = useMemo(() => getWeekOptions(12), [])
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart())

  const { triggerSave, saveStatus, lastSaved } = useAutoSave({
    table: 'sales_weekly_data',
    matchColumns: { week_start: selectedWeek },
    debounceMs: 1500
  })
  const [formData, setFormData] = useState<any>({
    tj_outreach: {},
    jahnvi_outreach: {},
    shirin_outreach: {},
    cold_email: {},
    meeting_tracker: {}
  })

  // Hot Leads State
  const [hotLeads, setHotLeads] = useState<HotLead[]>([])
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<HotLead | null>(null)
  const [leadForm, setLeadForm] = useState({
    lead_name: '',
    company: '',
    source: 'LinkedIn',
    owner_id: user?.id || '',
    status: 'New',
    probability: 50,
    deal_value: 0,
    notes: ''
  })

  // Dashboard State
  const [salesHistory, setSalesHistory] = useState<SalesWeeklyData[]>([])

  useEffect(() => {
    fetchWeeklyData()
    fetchHotLeads()
    fetchSalesHistory()
  }, [selectedWeek])

  const fetchWeeklyData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sales_weekly_data')
        .select('*')
        .eq('week_start', selectedWeek)
        .maybeSingle()
      
      if (data) {
        const flat: Record<string, any> = { ...((data.tj_outreach as any) ?? {}), ...((data.jahnvi_outreach as any) ?? {}), ...((data.shirin_outreach as any) ?? {}), ...((data.cold_email as any) ?? {}), ...((data.meeting_tracker as any) ?? {}) }
        setFormData({
          tj_outreach: { SO01: flat.SO01, SO02: flat.SO02, SO03: flat.SO03, SO04: flat.SO04, SO05: flat.SO05, SO06: flat.SO06, SO07: flat.SO07, SO08: flat.SO08, SO09: flat.SO09 },
          jahnvi_outreach: { SO10: flat.SO10, SO11: flat.SO11, SO12: flat.SO12, SO13: flat.SO13, SO14: flat.SO14, SO15: flat.SO15, SO16: flat.SO16, SO17: flat.SO17 },
          shirin_outreach: { SO18: flat.SO18, SO19: flat.SO19, SO20: flat.SO20, SO21: flat.SO21, SO22: flat.SO22, SO23: flat.SO23, SO24: flat.SO24, SO25: flat.SO25, SO26: flat.SO26, SO27: flat.SO27, SO28: flat.SO28 },
          cold_email: { SO29: flat.SO29, SO30: flat.SO30, SO31: flat.SO31, SO32: flat.SO32, SO33: flat.SO33, SO34: flat.SO34, SO35: flat.SO35 },
          meeting_tracker: { SO36: flat.SO36, SO37: flat.SO37, SO38: flat.SO38, SO39: flat.SO39, SO40: flat.SO40, SO41: flat.SO41, SO42: flat.SO42, SO43: flat.SO43, SO44: flat.SO44, SO45: flat.SO45, SO46: flat.SO46, SO47: flat.SO47, SO48: flat.SO48, SO49: flat.SO49 }
        })
      } else {
        setFormData({
          tj_outreach: {},
          jahnvi_outreach: {},
          shirin_outreach: {},
          cold_email: {},
          meeting_tracker: {}
        })
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchHotLeads = async () => {
    try {
      const { data } = await supabase
        .from('hot_leads')
        .select('*')
        .order('weighted_value', { ascending: false })
      setHotLeads(data || [])
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const fetchSalesHistory = async () => {
    try {
      const { data } = await supabase
        .from('sales_weekly_data')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(8)
      setSalesHistory(data || [])
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleSaveLead = async () => {
    const weighted = (leadForm.deal_value * leadForm.probability) / 100
    try {
      if (editingLead) {
        const { error } = await supabase
          .from('hot_leads')
          .update({ ...leadForm, weighted_value: weighted })
          .eq('id', editingLead.id)
        if (error) throw error
        toast.success("Lead updated")
      } else {
        const { error } = await supabase
          .from('hot_leads')
          .insert({ ...leadForm, weighted_value: weighted })
        if (error) throw error
        toast.success("Lead added")
      }
      setIsLeadModalOpen(false)
      setEditingLead(null)
      fetchHotLeads()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return
    try {
      const { error } = await supabase.from('hot_leads').delete().eq('id', id)
      if (error) throw error
      toast.success("Lead deleted")
      fetchHotLeads()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const extractSection = (data: Record<string, any>, keys: string[]) => {
    const result: Record<string, any> = {}
    keys.forEach(k => { if (data[k] !== undefined) result[k] = data[k] })
    return result
  }

  const updateMetric = (section: string, metric: string, value: string) => {
    if (!selectedWeek) {
      toast.error('Please select a week first.')
      return
    }
    setFormData((prev: any) => {
      const updatedSection = { ...(prev[section] || {}), [metric]: value }
      const updated = { ...prev, [section]: updatedSection }

      const weekInfo = weekOptions.find(w => w.weekStart === selectedWeek)

      triggerSave({
        tj_outreach: extractSection({ ...updated.tj_outreach }, ['SO01','SO02','SO03','SO04','SO05','SO06','SO07','SO08','SO09']),
        jahnvi_outreach: extractSection({ ...updated.jahnvi_outreach }, ['SO10','SO11','SO12','SO13','SO14','SO15','SO16','SO17']),
        shirin_outreach: extractSection({ ...updated.shirin_outreach }, ['SO18','SO19','SO20','SO21','SO22','SO23','SO24','SO25','SO26','SO27','SO28']),
        cold_email: extractSection({ ...updated.cold_email }, ['SO29','SO30','SO31','SO32','SO33','SO34','SO35']),
        meeting_tracker: extractSection({ ...updated.meeting_tracker }, ['SO36','SO37','SO38','SO39','SO40','SO41','SO42','SO43','SO44','SO45','SO46','SO47','SO48','SO49']),
        week_end: weekInfo?.weekEnd || '',
        week_label: weekInfo?.label || '',
        submitted_by: user?.id
      })

      return updated
    })
  }

  // Calc helpers
  const getRate = (num: any, den: any) => {
    const n = parseFloat(num) || 0
    const d = parseFloat(den) || 0
    return d > 0 ? Math.round((n / d) * 1000) / 10 : 0
  }

  const getSum = (...args: any[]) => {
    return args.reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Won': return 'bg-status-on text-white'
      case 'Lost': return 'bg-gray-400 text-white line-through opacity-50'
      case 'Meeting Booked':
      case 'Proposal Sent': return 'bg-gold text-black font-bold'
      case 'New':
      case 'Contacted': return 'bg-black text-white'
      case 'Negotiation': return 'bg-blue-600 text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const renderDashboard = () => {
    // Calc MTD totals
    const currentMonth = new Date().toISOString().substring(0, 7)
    const mtdData = salesHistory.filter(h => h.week_start.startsWith(currentMonth))
    
    const totalMeetings = mtdData.reduce((acc, h) => {
      const flat = { ...(h.tj_outreach as Record<string, unknown> ?? {}), ...(h.jahnvi_outreach as Record<string, unknown> ?? {}), ...(h.shirin_outreach as Record<string, unknown> ?? {}), ...(h.cold_email as Record<string, unknown> ?? {}), ...(h.meeting_tracker as Record<string, unknown> ?? {}) }
      return acc + (readSalesNum(flat, 'SO40') ?? 0)
    }, 0)
    
    const totalHotLeads = mtdData.reduce((acc, h) => {
      const flat = { ...(h.tj_outreach as Record<string, unknown> ?? {}), ...(h.jahnvi_outreach as Record<string, unknown> ?? {}), ...(h.shirin_outreach as Record<string, unknown> ?? {}), ...(h.cold_email as Record<string, unknown> ?? {}), ...(h.meeting_tracker as Record<string, unknown> ?? {}) }
      return acc + (readSalesNum(flat, 'SO07') ?? 0) + (readSalesNum(flat, 'SO16') ?? 0) + (readSalesNum(flat, 'SO27') ?? 0) + (readSalesNum(flat, 'SO33') ?? 0)
    }, 0)

    const conversions = mtdData.reduce((acc, h) => {
      const flat = { ...(h.tj_outreach as Record<string, unknown> ?? {}), ...(h.jahnvi_outreach as Record<string, unknown> ?? {}), ...(h.shirin_outreach as Record<string, unknown> ?? {}), ...(h.cold_email as Record<string, unknown> ?? {}), ...(h.meeting_tracker as Record<string, unknown> ?? {}) }
      return acc + (readSalesNum(flat, 'SO46') ?? 0)
    }, 0)

    const conversionRate = totalMeetings > 0 ? Math.round((conversions / totalMeetings) * 1000) / 10 : 0
    
    const revenue = mtdData.reduce((acc, h) => {
      const flat = { ...(h.tj_outreach as Record<string, unknown> ?? {}), ...(h.jahnvi_outreach as Record<string, unknown> ?? {}), ...(h.shirin_outreach as Record<string, unknown> ?? {}), ...(h.cold_email as Record<string, unknown> ?? {}), ...(h.meeting_tracker as Record<string, unknown> ?? {}) }
      return acc + ((readSalesNum(flat, 'SO46') ?? 0) * (readSalesNum(flat, 'SO48') ?? 0))
    }, 0)

    const chartData = [...salesHistory].reverse().map(h => {
      const flat = { ...(h.tj_outreach as Record<string, unknown> ?? {}), ...(h.jahnvi_outreach as Record<string, unknown> ?? {}), ...(h.shirin_outreach as Record<string, unknown> ?? {}), ...(h.cold_email as Record<string, unknown> ?? {}), ...(h.meeting_tracker as Record<string, unknown> ?? {}) }
      return {
        week: h.week_label?.split(' – ')[0] || '',
        meetings: readSalesNum(flat, 'SO40') ?? 0,
        hotLeads: (readSalesNum(flat, 'SO07') ?? 0) + (readSalesNum(flat, 'SO16') ?? 0) + (readSalesNum(flat, 'SO27') ?? 0) + (readSalesNum(flat, 'SO33') ?? 0)
      }
    })

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Meetings Booked', value: totalMeetings, sub: 'MTD' },
            { label: 'Hot Leads (MTD)', value: totalHotLeads, sub: 'All Sources' },
            { label: 'Conversions (MTD)', value: conversions, sub: 'New Clients' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, sub: 'Meetings → Deals' },
            { label: 'Revenue Closed ₹', value: `₹${revenue.toLocaleString()}`, sub: 'MTD' },
          ].map((m, i) => (
            <Card key={i} className="border-2 border-gold/10">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{m.label}</p>
                <p className="text-3xl font-black text-gold">{m.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground mt-1">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase">Meetings Booked per Week</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="meetings" stroke={GOLD} fill={GOLD} fillOpacity={0.1} strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase">Hot Leads per Week</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="hotLeads" stroke={GOLD} fill={GOLD} fillOpacity={0.1} strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/dashboard" label="Back to Dashboard" />
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
            <TrendingUp className="w-3 h-3 text-gold" />
            <span>Sales & Outreach</span>
            <span className="text-foreground ml-2">Myntmore Pipeline</span>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight">SALES & OUTREACH</h1>
          <p className="text-muted-foreground font-medium">Internal growth tracking and CRM.</p>
        </div>
        {activeTab === 'weekly-data' && (
           <div className="flex flex-col gap-1 min-w-[240px]">
             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Select Week</Label>
             <Select value={selectedWeek} onValueChange={setSelectedWeek}>
               <SelectTrigger className="bg-background font-bold h-11">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {weekOptions.map(w => <SelectItem key={w.weekStart} value={w.weekStart}>{w.label}</SelectItem>)}
               </SelectContent>
             </Select>
           </div>
        )}
        {activeTab === 'hot-leads' && (
          <Button onClick={() => { setEditingLead(null); setLeadForm({ lead_name: '', company: '', source: 'LinkedIn', owner_id: user?.id || '', status: 'New', probability: 50, deal_value: 0, notes: '' }); setIsLeadModalOpen(true); }} className="bg-gold text-black font-black hover:bg-gold/90">
            <Plus className="w-4 h-4 mr-2" /> Add Lead
          </Button>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="weekly-data" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black">Weekly Data Entry</TabsTrigger>
          <TabsTrigger value="hot-leads" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black">Hot Leads</TabsTrigger>
          <TabsTrigger value="dashboard" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black">Dashboard</TabsTrigger>
          <TabsTrigger value="meeting-tracker" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black">Meeting Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly-data" className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-gold" />
              <p className="text-muted-foreground font-medium">Fetching sales records...</p>
            </div>
          ) : (
            <>
              <Accordion type="multiple" defaultValue={['tj', 'jj', 'shirin', 'email', 'meetings']} className="space-y-4">
                {/* TJ Section */}
                <AccordionItem value="tj" className="border rounded-lg bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline font-bold text-lg">TJ Outreach</AccordionTrigger>
                  <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-full space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO01 - ICP Targeted This Week</Label>
                      <Textarea value={formData.tj_outreach.SO01 || ''} onChange={e => updateMetric('tj_outreach', 'SO01', e.target.value)} placeholder="Enter details..." className="h-20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO02 - Conn Requests Sent</Label>
                      <Input type="number" value={formData.tj_outreach.SO02 || ''} onChange={e => updateMetric('tj_outreach', 'SO02', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO03 - Accepted Invitations</Label>
                      <Input type="number" value={formData.tj_outreach.SO03 || ''} onChange={e => updateMetric('tj_outreach', 'SO03', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO04 - Acceptance Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.tj_outreach.SO03, formData.tj_outreach.SO02)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO05 - Answered Messages</Label>
                      <Input type="number" value={formData.tj_outreach.SO05 || ''} onChange={e => updateMetric('tj_outreach', 'SO05', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO06 - Response Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.tj_outreach.SO05, formData.tj_outreach.SO03)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO07 - Hot Leads</Label>
                      <Input type="number" value={formData.tj_outreach.SO07 || ''} onChange={e => updateMetric('tj_outreach', 'SO07', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO08 - Negative Replies</Label>
                      <Input type="number" value={formData.tj_outreach.SO08 || ''} onChange={e => updateMetric('tj_outreach', 'SO08', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO09 - Meetings Booked</Label>
                      <Input type="number" value={formData.tj_outreach.SO09 || ''} onChange={e => updateMetric('tj_outreach', 'SO09', e.target.value)} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* JJ Section */}
                <AccordionItem value="jj" className="border rounded-lg bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline font-bold text-lg">Jahnvi (JJ) Outreach</AccordionTrigger>
                  <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-full space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO10 - ICP Targeted This Week</Label>
                      <Textarea value={formData.jahnvi_outreach.SO10 || ''} onChange={e => updateMetric('jahnvi_outreach', 'SO10', e.target.value)} placeholder="Enter details..." className="h-20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO11 - Conn Requests Sent</Label>
                      <Input type="number" value={formData.jahnvi_outreach.SO11 || ''} onChange={e => updateMetric('jahnvi_outreach', 'SO11', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO12 - Accepted Invitations</Label>
                      <Input type="number" value={formData.jahnvi_outreach.SO12 || ''} onChange={e => updateMetric('jahnvi_outreach', 'SO12', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO13 - Acceptance Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.jahnvi_outreach.SO12, formData.jahnvi_outreach.SO11)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO14 - Answered Messages</Label>
                      <Input type="number" value={formData.jahnvi_outreach.SO14 || ''} onChange={e => updateMetric('jahnvi_outreach', 'SO14', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO15 - Response Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.jahnvi_outreach.SO14, formData.jahnvi_outreach.SO12)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO16 - Hot Leads</Label>
                      <Input type="number" value={formData.jahnvi_outreach.SO16 || ''} onChange={e => updateMetric('jahnvi_outreach', 'SO16', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO17 - Negative Replies</Label>
                      <Input type="number" value={formData.jahnvi_outreach.SO17 || ''} onChange={e => updateMetric('jahnvi_outreach', 'SO17', e.target.value)} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Shirin Section */}
                <AccordionItem value="shirin" className="border rounded-lg bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline font-bold text-lg">Shirin Outreach (InMail + LinkedIn)</AccordionTrigger>
                  <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="col-span-full space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO18 - InMail ICP Targeted</Label>
                      <Textarea value={formData.shirin_outreach.SO18 || ''} onChange={e => updateMetric('shirin_outreach', 'SO18', e.target.value)} placeholder="Enter details..." className="h-20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO19 - InMails Sent</Label>
                      <Input type="number" value={formData.shirin_outreach.SO19 || ''} onChange={e => updateMetric('shirin_outreach', 'SO19', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO20 - InMails Accepted</Label>
                      <Input type="number" value={formData.shirin_outreach.SO20 || ''} onChange={e => updateMetric('shirin_outreach', 'SO20', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO21 - InMail Acceptance Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.shirin_outreach.SO20, formData.shirin_outreach.SO19)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO22 - LinkedIn Conn Requests Sent</Label>
                      <Input type="number" value={formData.shirin_outreach.SO22 || ''} onChange={e => updateMetric('shirin_outreach', 'SO22', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO23 - LinkedIn Accepted</Label>
                      <Input type="number" value={formData.shirin_outreach.SO23 || ''} onChange={e => updateMetric('shirin_outreach', 'SO23', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO24 - LinkedIn Acceptance Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.shirin_outreach.SO23, formData.shirin_outreach.SO22)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO25 - Answered Messages</Label>
                      <Input type="number" value={formData.shirin_outreach.SO25 || ''} onChange={e => updateMetric('shirin_outreach', 'SO25', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO26 - Response Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.shirin_outreach.SO25, formData.shirin_outreach.SO23)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO27 - Hot Leads</Label>
                      <Input type="number" value={formData.shirin_outreach.SO27 || ''} onChange={e => updateMetric('shirin_outreach', 'SO27', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO28 - Negative Replies</Label>
                      <Input type="number" value={formData.shirin_outreach.SO28 || ''} onChange={e => updateMetric('shirin_outreach', 'SO28', e.target.value)} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Cold Email Section */}
                <AccordionItem value="email" className="border rounded-lg bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline font-bold text-lg">Cold Email — Waalaxy (Myntmore Internal)</AccordionTrigger>
                  <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO29 - Emails Sent</Label>
                      <Input type="number" value={formData.cold_email.SO29 || ''} onChange={e => updateMetric('cold_email', 'SO29', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO30 - Emails Opened</Label>
                      <Input type="number" value={formData.cold_email.SO30 || ''} onChange={e => updateMetric('cold_email', 'SO30', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO31 - Open Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.cold_email.SO30, formData.cold_email.SO29)}%</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO32 - Replies Received</Label>
                      <Input type="number" value={formData.cold_email.SO32 || ''} onChange={e => updateMetric('cold_email', 'SO32', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO33 - Positive Replies (Hot Leads)</Label>
                      <Input type="number" value={formData.cold_email.SO33 || ''} onChange={e => updateMetric('cold_email', 'SO33', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO34 - Negative Replies</Label>
                      <Input type="number" value={formData.cold_email.SO34 || ''} onChange={e => updateMetric('cold_email', 'SO34', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO35 - Response Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">{getRate(formData.cold_email.SO32, formData.cold_email.SO29)}%</div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Meeting Tracker Section */}
                <AccordionItem value="meetings" className="border rounded-lg bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline font-bold text-lg">Meeting Tracker</AccordionTrigger>
                  <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO36 - Booked via LinkedIn</Label>
                      <Input type="number" value={formData.meeting_tracker.SO36 || ''} onChange={e => updateMetric('meeting_tracker', 'SO36', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO37 - Booked via Cold Email</Label>
                      <Input type="number" value={formData.meeting_tracker.SO37 || ''} onChange={e => updateMetric('meeting_tracker', 'SO37', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO38 - Booked via Referral</Label>
                      <Input type="number" value={formData.meeting_tracker.SO38 || ''} onChange={e => updateMetric('meeting_tracker', 'SO38', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO39 - Booked via Other</Label>
                      <Input type="number" value={formData.meeting_tracker.SO39 || ''} onChange={e => updateMetric('meeting_tracker', 'SO39', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO40 - Total Meetings Booked</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">
                        {getSum(formData.meeting_tracker.SO36, formData.meeting_tracker.SO37, formData.meeting_tracker.SO38, formData.meeting_tracker.SO39)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO41 - Meetings Completed</Label>
                      <Input type="number" value={formData.meeting_tracker.SO41 || ''} onChange={e => updateMetric('meeting_tracker', 'SO41', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO42 - No-Show / Rescheduled</Label>
                      <Input type="number" value={formData.meeting_tracker.SO42 || ''} onChange={e => updateMetric('meeting_tracker', 'SO42', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO43 - Completion Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">
                        {getRate(formData.meeting_tracker.SO41, getSum(formData.meeting_tracker.SO36, formData.meeting_tracker.SO37, formData.meeting_tracker.SO38, formData.meeting_tracker.SO39))}%
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO44 - Proposals Sent</Label>
                      <Input type="number" value={formData.meeting_tracker.SO44 || ''} onChange={e => updateMetric('meeting_tracker', 'SO44', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO45 - Follow-ups Sent</Label>
                      <Input type="number" value={formData.meeting_tracker.SO45 || ''} onChange={e => updateMetric('meeting_tracker', 'SO45', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO46 - Conversions (New Clients)</Label>
                      <Input type="number" value={formData.meeting_tracker.SO46 || ''} onChange={e => updateMetric('meeting_tracker', 'SO46', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO47 - Conversion Rate</Label>
                      <div className="h-10 bg-muted/50 rounded-md flex items-center px-3 font-bold text-lg">
                        {getRate(formData.meeting_tracker.SO46, getSum(formData.meeting_tracker.SO36, formData.meeting_tracker.SO37, formData.meeting_tracker.SO38, formData.meeting_tracker.SO39))}%
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO48 - Average Deal Size ₹</Label>
                      <Input type="number" value={formData.meeting_tracker.SO48 || ''} onChange={e => updateMetric('meeting_tracker', 'SO48', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase opacity-60">SO49 - Total Revenue Closed</Label>
                      <div className="h-10 bg-gold/10 border border-gold/30 rounded-md flex items-center px-3 font-bold text-lg text-gold">
                        ₹{( (parseFloat(formData.meeting_tracker.SO46) || 0) * (parseFloat(formData.meeting_tracker.SO48) || 0) ).toLocaleString()}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end pt-4 mb-10">
                <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="hot-leads" className="space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-bold">Lead Name</TableHead>
                      <TableHead className="font-bold">Company</TableHead>
                      <TableHead className="font-bold">Source</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold text-right">Probability</TableHead>
                      <TableHead className="font-bold text-right">Deal Value</TableHead>
                      <TableHead className="font-bold text-right text-gold">Weighted Value</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotLeads.map(lead => (
                      <TableRow key={lead.id} onClick={() => { setEditingLead(lead); setLeadForm({ lead_name: lead.lead_name, company: lead.company ?? '', source: lead.source ?? 'LinkedIn', owner_id: lead.owner_id ?? '', status: lead.status ?? 'New', probability: lead.probability ?? 50, deal_value: lead.deal_value ?? 0, notes: lead.notes ?? '' }); setIsLeadModalOpen(true); }} className="cursor-pointer hover:bg-muted/20">
                        <TableCell className="font-bold">{lead.lead_name}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.company}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{lead.source}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn("px-2 py-0.5", getStatusColor(lead.status ?? ''))}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{lead.probability}%</TableCell>
                        <TableCell className="text-right font-bold">₹{(lead.deal_value ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-black text-gold text-lg">₹{(lead.weighted_value ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {hotLeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic">No hot leads tracked yet. Add one to get started.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          {renderDashboard()}
        </TabsContent>

        <TabsContent value="meeting-tracker">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                      <TableHead>Week</TableHead>
                      <TableHead>LinkedIn</TableHead>
                      <TableHead>Cold Email</TableHead>
                      <TableHead>Referral</TableHead>
                      <TableHead>Other</TableHead>
                      <TableHead className="text-gold">Total Booked</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>No-Show</TableHead>
                      <TableHead>Proposals</TableHead>
                      <TableHead className="bg-gold/5 text-gold">Conversions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory.map(h => {
                      const flat = { ...(h.tj_outreach as Record<string, unknown> ?? {}), ...(h.jahnvi_outreach as Record<string, unknown> ?? {}), ...(h.shirin_outreach as Record<string, unknown> ?? {}), ...(h.cold_email as Record<string, unknown> ?? {}), ...(h.meeting_tracker as Record<string, unknown> ?? {}) }
                      const l = readSalesNum(flat, 'SO36') ?? 0
                      const ce = readSalesNum(flat, 'SO37') ?? 0
                      const r = readSalesNum(flat, 'SO38') ?? 0
                      const o = readSalesNum(flat, 'SO39') ?? 0
                      const booked = readSalesNum(flat, 'SO40') ?? (l + ce + r + o > 0 ? l + ce + r + o : 0)

                      return (
                      <TableRow key={h.id}>
                        <TableCell className="font-bold text-xs">{h.week_label?.split(' – ')[0]}</TableCell>
                        <TableCell className="font-medium">{l}</TableCell>
                        <TableCell className="font-medium">{ce}</TableCell>
                        <TableCell className="font-medium">{r}</TableCell>
                        <TableCell className="font-medium">{o}</TableCell>
                        <TableCell className="font-black text-gold">{booked}</TableCell>
                        <TableCell className="font-medium">{readSalesNum(flat, 'SO41') ?? 0}</TableCell>
                        <TableCell className="font-medium">{readSalesNum(flat, 'SO42') ?? 0}</TableCell>
                        <TableCell className="font-medium">{readSalesNum(flat, 'SO44') ?? 0}</TableCell>
                        <TableCell className="font-black bg-gold/5 text-gold">{readSalesNum(flat, 'SO46') ?? 0}</TableCell>
                      </TableRow>
                    )})}
                    {salesHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-20 text-muted-foreground italic">No meeting history recorded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Lead Modal */}
      <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{editingLead ? 'Edit Hot Lead' : 'Add New Hot Lead'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold">Lead Name*</Label>
                <Input value={leadForm.lead_name} onChange={e => setLeadForm({...leadForm, lead_name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">Company*</Label>
                <Input value={leadForm.company} onChange={e => setLeadForm({...leadForm, company: e.target.value})} placeholder="Company name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold">Source</Label>
                <Select value={leadForm.source} onValueChange={v => setLeadForm({...leadForm, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Cold Email">Cold Email</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Exhibition">Exhibition</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">Status</Label>
                <Select value={leadForm.status} onValueChange={v => setLeadForm({...leadForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Meeting Booked">Meeting Booked</SelectItem>
                    <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold">Probability (%)</Label>
                <Input type="number" value={leadForm.probability} onChange={e => setLeadForm({...leadForm, probability: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold">Deal Value (₹)</Label>
                <Input type="number" value={leadForm.deal_value} onChange={e => setLeadForm({...leadForm, deal_value: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Weighted Value (₹)</Label>
              <div className="p-3 bg-gold/10 border border-gold/30 rounded-lg text-gold font-black text-xl">
                ₹{((leadForm.deal_value * leadForm.probability) / 100).toLocaleString()}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Notes</Label>
              <Textarea value={leadForm.notes} onChange={e => setLeadForm({...leadForm, notes: e.target.value})} placeholder="Context about the lead..." className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveLead} className="bg-gold text-black font-black w-full h-12 shadow-lg">
              {editingLead ? 'Update Lead' : 'Add to Pipeline'} →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
