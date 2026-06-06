import React, { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CONTENT_METRICS, LEADGEN_METRICS } from "@/data/metrics"
import { toast } from "sonner"
import { Trophy, History, LayoutDashboard, Settings as SettingsIcon, MessageSquare, AlertCircle, Pin, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatMetricDisplay } from "@/utils/metricCalculations"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/BackButton"
import { formatWeekDate } from '@/utils/dateUtils'


export function ClientDetailPage() {
  const { id } = useParams({ from: '/clients/$id' })
  const { isAdmin } = useAuth()
  const [client, setClient] = useState<any>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [highScores, setHighScores] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [isNotePinned, setIsNotePinned] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        { data: clientData },
        { data: weeklyRows },
        { data: highScoresData },
        { data: settingsData },
        { data: notesData },
        { data: alertsData }
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('weekly_data').select('*').eq('client_id', id).order('week_start', { ascending: false }),
        supabase.from('high_scores').select('*').eq('client_id', id).order('lifetime_high', { ascending: false }),
        supabase.from('client_settings').select('*').eq('client_id', id).single(),
        supabase.from('client_context_notes').select(`*, author:profiles!created_by(full_name)`).eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('client_alerts').select(`*, resolver:profiles!resolved_by(full_name)`).eq('client_id', id).order('created_at', { ascending: false })
      ])

      setClient(clientData)
      setWeeklyData(weeklyRows || [])
      setHighScores(highScoresData || [])
      setSettings(settingsData)
      setNotes(notesData || [])
      setAlerts(alertsData || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const { data, error } = await supabase
        .from('client_context_notes')
        .insert({
          client_id: id,
          content: newNote,
          is_pinned: isNotePinned,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select(`*, author:profiles!created_by(full_name)`)
        .single()
      
      if (error) throw error
      setNotes([data, ...notes])
      setNewNote('')
      setIsNotePinned(false)
      toast.success("Note added")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingNote(false)
    }
  }

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('client_context_notes')
        .update({ is_pinned: !currentPinned })
        .eq('id', noteId)
      if (error) throw error
      setNotes(notes.map(n => n.id === noteId ? { ...n, is_pinned: !currentPinned } : n))
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return
    try {
      const { error } = await supabase.from('client_context_notes').delete().eq('id', noteId)
      if (error) throw error
      setNotes(notes.filter(n => n.id !== noteId))
      toast.success("Note deleted")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleToggleMetric = async (metricId: string, category: 'content' | 'leadgen') => {
    if (!isAdmin) return

    const field = category === 'content' ? 'active_content_metrics' : 'active_leadgen_metrics'
    const current = settings[field] || []
    const updated = current.includes(metricId)
      ? current.filter((m: string) => m !== metricId)
      : [...current, metricId]

    try {
      const { error } = await supabase
        .from('client_settings')
        .update({ [field]: updated } as any)
        .eq('id', settings.id)
      
      if (error) throw error
      setSettings({ ...settings, [field]: updated })
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-64 w-full" /></div>
  if (!client) return <div className="p-8">Client not found</div>

  const latestWeek = weeklyData[0] || {}

  return (
    <div className="p-6 space-y-6">
      <BackButton to="/clients" label="Back to Clients" />
      <div className="flex justify-between items-start">

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">{client.company}</p>
        </div>
        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>{client.status}</Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 w-full justify-start p-1 h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2 py-2"><LayoutDashboard className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="context" className="gap-2 py-2"><MessageSquare className="w-4 h-4" /> Context</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2 py-2"><AlertCircle className="w-4 h-4" /> Alerts History</TabsTrigger>
          <TabsTrigger value="history" className="gap-2 py-2"><History className="w-4 h-4" /> History</TabsTrigger>
          <TabsTrigger value="records" className="gap-2 py-2"><Trophy className="w-4 h-4" /> Records</TabsTrigger>
          {isAdmin && <TabsTrigger value="settings" className="gap-2 py-2"><SettingsIcon className="w-4 h-4" /> Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Latest Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latestWeek.week_label || 'No data yet'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted: {latestWeek.content_submitted_at ? '✓' : '✗'} Content · {latestWeek.leadgen_submitted_at ? '✓' : '✗'} Lead Gen
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   <p className="text-muted-foreground text-sm italic">Weekly snapshot showing trends...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="context" className="mt-6 space-y-6">
          <Card className="border-2 border-gold/20 bg-gold-soft/10">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-gold" /> Add Client Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea 
                    placeholder="E.g. Client requested to skip posting this Thursday..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] bg-background"
                />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Switch id="pin-note" checked={isNotePinned} onCheckedChange={setIsNotePinned} />
                        <Label htmlFor="pin-note" className="text-sm font-bold flex items-center gap-1.5">
                            <Pin className={cn("w-3.5 h-3.5", isNotePinned ? "text-gold fill-gold" : "text-muted-foreground")} />
                            Pin to top
                        </Label>
                    </div>
                    <Button onClick={handleAddNote} disabled={savingNote || !newNote.trim()} className="bg-gold text-black font-black">
                        Add Note →
                    </Button>
                </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {notes.filter(n => n.is_pinned).map(note => (
                <Card key={note.id} className="border-gold shadow-sm bg-gold/5 relative overflow-hidden">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gold hover:text-gold" onClick={() => handleTogglePin(note.id, true)}>
                            <Pin className="w-4 h-4 fill-gold" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <Pin className="w-5 h-5 text-gold mt-1 shrink-0" />
                            <div className="space-y-3">
                                <p className="text-lg font-medium leading-relaxed">{note.content}</p>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                                    {note.author?.full_name} · {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="grid grid-cols-1 gap-4">
                {notes.filter(n => !n.is_pinned).map(note => (
                    <Card key={note.id} className="shadow-none border bg-card hover:bg-muted/10 transition-colors relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => handleTogglePin(note.id, false)}>
                                <Pin className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNote(note.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <CardContent className="p-4 space-y-3">
                            <p className="text-sm font-medium leading-relaxed">{note.content}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                {note.author?.full_name} · {new Date(note.created_at).toLocaleDateString()}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
            <Card className="border-none shadow-none bg-transparent">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {alerts.map(alert => (
                            <TableRow key={alert.id}>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">{alert.alert_type.replace(/_/g, ' ')}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{alert.alert_message}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    {alert.is_resolved ? (
                                        <div className="flex flex-col">
                                            <Badge variant="default" className="bg-status-on">Resolved</Badge>
                                            <span className="text-[9px] text-muted-foreground mt-1">by {alert.resolver?.full_name}</span>
                                        </div>
                                    ) : (
                                        <Badge variant="secondary" className={cn(alert.severity === 'high' ? "bg-status-off" : "bg-status-risk")}>Active</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {alerts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No alert history found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Content Status</TableHead>
                      <TableHead>Lead Gen Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyData.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.week_label}</TableCell>
                        <TableCell>
                          <Badge variant={row.content_submitted_at ? "default" : "secondary"}>
                            {row.content_submitted_at ? "Submitted" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.leadgen_submitted_at ? "default" : "secondary"}>
                            {row.leadgen_submitted_at ? "Submitted" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {weeklyData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                          No history found for this client.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Lifetime High</TableHead>
                    <TableHead>Achieved Week</TableHead>
                    <TableHead>Previous Best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highScores.map(score => (
                    <TableRow key={score.id}>
                      <TableCell className="font-bold">{score.metric_name}</TableCell>
                      <TableCell className="text-gold font-black">{formatMetricDisplay(score.lifetime_high, score.metric_id)}</TableCell>
                      <TableCell>{score.achieved_week}</TableCell>
                      <TableCell className="text-muted-foreground">{formatMetricDisplay(score.previous_high, score.metric_id)}</TableCell>
                    </TableRow>
                  ))}
                  {highScores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                        No records set yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline">Content</Badge> Metric Toggles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {CONTENT_METRICS.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">{m.name}</Label>
                      <p className="text-[10px] text-muted-foreground font-mono">{m.id} · {m.group}</p>
                    </div>
                    <Switch 
                      checked={settings?.active_content_metrics?.includes(m.id)} 
                      onCheckedChange={() => handleToggleMetric(m.id, 'content')}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline">Lead Gen</Badge> Metric Toggles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {LEADGEN_METRICS.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">{m.name}</Label>
                      <p className="text-[10px] text-muted-foreground font-mono">{m.id} · {m.group}</p>
                    </div>
                    <Switch 
                      checked={settings?.active_leadgen_metrics?.includes(m.id)} 
                      onCheckedChange={() => handleToggleMetric(m.id, 'leadgen')}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
