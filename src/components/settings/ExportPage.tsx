import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { generateLifetimeExport, generateWeeklySummary } from "@/lib/export"
import { supabase } from "@/integrations/supabase/client"
import {
  Copy, Download, Loader2, FileText, ArrowLeft,
  Table2, CalendarRange, User,
} from "lucide-react"
import { toast } from "sonner"
import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

function getWeekOptions(count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7) - i * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return {
      weekStart: monday.toISOString().split('T')[0],
      label: `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`,
    }
  })
}

// ISO date of the very first Monday on or before a given date
function toMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  return d.toISOString().split('T')[0]
}

type ExportMode = 'lifetime' | 'weekly'

export function ExportPage() {
  const weekOptions = useMemo(() => getWeekOptions(12), [])
  const today = new Date().toISOString().split('T')[0]

  // ── Lifetime export state ──────────────────────────────────────
  const [upToDate, setUpToDate] = useState(today)
  const [fromDate, setFromDate] = useState('')          // empty = all time
  const [clientFilter, setClientFilter] = useState('all')
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loadingExport, setLoadingExport] = useState(false)

  // ── Weekly text summary state ──────────────────────────────────
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0].weekStart)
  const [loadingText, setLoadingText] = useState(false)
  const [summaryText, setSummaryText] = useState('')

  // ── Tab ────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ExportMode>('lifetime')

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setClients(data ?? []))
  }, [])

  const handleLifetimeExport = async () => {
    setLoadingExport(true)
    try {
      await generateLifetimeExport({
        upToDate: toMonday(upToDate),
        fromDate: fromDate ? toMonday(fromDate) : undefined,
        clientId: clientFilter !== 'all' ? clientFilter : undefined,
      })
      toast.success('Export downloaded!')
    } catch (err: any) {
      console.error(err)
      toast.error('Export failed: ' + (err.message ?? 'Unknown error'))
    } finally {
      setLoadingExport(false)
    }
  }

  const handleGenerateText = async () => {
    setLoadingText(true)
    try {
      const text = await generateWeeklySummary(selectedWeek)
      setSummaryText(text)
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setLoadingText(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link to="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
        <h1 className="text-3xl font-black tracking-tight">Export</h1>
        <p className="text-muted-foreground text-sm">Download your data or generate a weekly text summary.</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 border-b">
        {(['lifetime', 'weekly'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'pb-2 px-1 text-sm font-black uppercase tracking-wider border-b-2 transition-colors',
              mode === m
                ? 'border-gold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'lifetime' ? '📊 Lifetime Export (Excel)' : '📋 Weekly Summary (Text)'}
          </button>
        ))}
      </div>

      {/* ── LIFETIME EXPORT ───────────────────────────────────────── */}
      {mode === 'lifetime' && (
        <div className="space-y-6">
          <Card className="border-2 border-gold/20 shadow-sm">
            <CardHeader className="bg-gold/5 border-b border-gold/10 py-4">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Table2 className="w-4 h-4 text-gold" /> Excel Export Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {/* Date range */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <CalendarRange className="w-3 h-3" /> Date Range
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">From (optional)</Label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      max={upToDate}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Leave blank for all time"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to export all data</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Up To (inclusive)</Label>
                    <input
                      type="date"
                      value={upToDate}
                      onChange={e => setUpToDate(e.target.value)}
                      max={today}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Client filter */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Client
                </p>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-10 font-bold bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-bold">All Clients</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* What's included */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sheets Included</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    ['📋 Client Weekly Data', 'All 55 metrics per client per week'],
                    ['❤️ Health Scores', 'Score history + deltas'],
                    ['👤 TJ Brand', 'IG, YT, Podcast, Video (all clients)'],
                    ['🏢 MM Content', 'LinkedIn, IG, Web, Quora, Reddit'],
                    ['💼 Sales & Outreach', 'Pipeline + meeting tracker'],
                    ['🎯 Targets', 'All weekly + monthly targets set'],
                    ['🏆 High Scores', 'Lifetime records per client'],
                    ['📄 Summary', 'Row counts + export metadata'],
                  ].map(([label, desc]) => (
                    <div key={label} className="flex gap-2 items-start py-1">
                      <span className="text-xs font-bold text-foreground whitespace-nowrap">{label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
                    </div>
                  ))}
                </div>
                {clientFilter !== 'all' && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    ⚠️ TJ Brand, MM Content, and Sales sheets are excluded when filtering by client.
                  </p>
                )}
              </div>

              <Button
                onClick={handleLifetimeExport}
                disabled={loadingExport}
                className="w-full bg-gold text-black hover:bg-gold/90 font-black h-12 text-base"
              >
                {loadingExport
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Building export…</>
                  : <><Download className="w-4 h-4 mr-2" /> Download Excel (.xlsx)</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── WEEKLY TEXT SUMMARY ────────────────────────────────────── */}
      {mode === 'weekly' && (
        <div className="space-y-6">
          <Card className="border-2 border-gold/20 shadow-sm">
            <CardHeader className="bg-gold/5 border-b border-gold/10 py-4">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold" /> Weekly Text Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Week</Label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="h-10 font-bold bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map(w => (
                      <SelectItem key={w.weekStart} value={w.weekStart}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateText}
                disabled={loadingText}
                className="w-full bg-gold text-black hover:bg-gold/90 font-black h-12 text-base"
              >
                {loadingText
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating…</>
                  : 'Generate Summary →'}
              </Button>
            </CardContent>
          </Card>

          {summaryText && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden border-2">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b py-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Preview</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="font-bold h-8 text-xs">
                    <Copy className="w-3 h-3 mr-1.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold h-8 text-xs">
                    <Download className="w-3 h-3 mr-1.5" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-8 text-xs font-mono whitespace-pre-wrap leading-relaxed bg-white">
                  {summaryText}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
