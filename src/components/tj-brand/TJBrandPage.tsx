import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  History, 
  Check, 
  Save, 
  Loader2,
  Instagram,
  Youtube,
  Mic,
  Video
} from "lucide-react"
import { 
  TJ_INSTAGRAM_METRICS, 
  TJ_YOUTUBE_METRICS, 
  TJ_PODCAST_METRICS, 
  TJ_VIDEO_METRICS,
  CompanyMetric
} from "@/data/company_metrics"
import { BackButton } from "@/components/ui/BackButton"
import { getCurrentWeekStart, getWeekOptions } from "@/utils/weekUtils"
import { useAutoSave } from "@/hooks/useAutoSave"
import { SaveIndicator } from "@/components/ui/SaveIndicator"

export function TJPersonalBrandPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('instagram')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const weekOptions = useMemo(() => getWeekOptions(12), [])
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart())
  const { triggerSave, saveStatus, lastSaved } = useAutoSave({
    table: 'tj_weekly_data',
    matchColumns: { week_start: selectedWeek },
    debounceMs: 1500
  })

  const [formData, setFormData] = useState<any>({
    instagram: {},
    youtube: {},
    newsletter_podcast: {},
    video_pipeline: {}
  })
  
  const [channelOwners, setChannelOwners] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchAssignments = async () => {
      // Fetch channel assignments (just the IDs)
      const { data: assignments } = await supabase
        .from('tj_channel_assignments')
        .select('channel, owner_id')

      // Fetch all profiles for lookup
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')

      // Build map: channel -> owner_name
      const ownerMap: Record<string, string> = {}
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

      assignments?.forEach(a => {
        const ownerName = a.owner_id ? profileMap.get(a.owner_id) : null
        ownerMap[a.channel] = ownerName ?? 'Unassigned'
      })
      setChannelOwners(ownerMap)
    }
    fetchAssignments()
  }, [])

  useEffect(() => {
    fetchWeeklyData()
  }, [selectedWeek])

  const fetchWeeklyData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tj_weekly_data')
        .select('*')
        .eq('week_start', selectedWeek)
        .maybeSingle()
      
      if (data) {
        const row = data as any
        setFormData({
          instagram: row.instagram || {},
          youtube: row.youtube || {},
          newsletter_podcast: { ...(row.linkedin_newsletter || {}), ...(row.email_newsletter || {}), ...(row.podcast || {}) },
          video_pipeline: row.video_pipeline || {}
        })
      } else {
        setFormData({
          instagram: {},
          youtube: {},
          newsletter_podcast: {},
          video_pipeline: {}
        })
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateMetric = (section: string, id: string, field: 'value' | 'target', value: any) => {
    if (!selectedWeek) {
      toast.error('Please select a week first.')
      return
    }
    setFormData((prev: any) => {
      const updatedSection = {
        ...prev[section],
        [id]: { ...(prev[section][id] || {}), [field]: value }
      }
      const updated = { ...prev, [section]: updatedSection }

      const weekInfo = weekOptions.find(w => w.weekStart === selectedWeek)

      triggerSave({
        week_end: weekInfo?.weekEnd || '',
        week_label: weekInfo?.label || '',
        instagram: updated.instagram,
        youtube: updated.youtube,
        linkedin_newsletter: { TJP01: updated.newsletter_podcast?.TJP01 },
        email_newsletter: { TJP02: updated.newsletter_podcast?.TJP02 },
        podcast: { TJP03: updated.newsletter_podcast?.TJP03, TJP04: updated.newsletter_podcast?.TJP04 },
        video_pipeline: updated.video_pipeline,
        submitted_by: user?.id
      })

      return updated
    })
  }

  const renderMetricCard = (section: string, metric: CompanyMetric) => {
    const data = formData[section][metric.id] || { value: '', target: '' }
    
    // Auto-calc for Total Posts
    if (metric.id === 'TJI04' && section === 'instagram') {
        const total = (parseFloat(formData.instagram.TJI01?.value) || 0) + 
                      (parseFloat(formData.instagram.TJI02?.value) || 0) + 
                      (parseFloat(formData.instagram.TJI03?.value) || 0)
        return (
            <Card key={metric.id} className="border-2 border-gold/20 bg-gold-soft/5">
                <CardContent className="p-4 space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">{metric.name}</Label>
                    <div className="text-3xl font-black text-gold">{total}</div>
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <Label className="text-[9px] uppercase font-bold opacity-50">Target</Label>
                            <Input 
                                type="number" 
                                value={data.target} 
                                onChange={e => updateMetric(section, metric.id, 'target', e.target.value)}
                                className="h-8 text-xs font-bold"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
      <Card key={metric.id} className="border-2 border-border/50">
        <CardContent className="p-4 space-y-3">
          <Label className="text-[10px] font-black uppercase text-muted-foreground">{metric.name}</Label>
          <div className="relative">
            <Input 
              type="number" 
              value={data.value} 
              onChange={e => updateMetric(section, metric.id, 'value', e.target.value)}
              className="h-12 text-2xl font-black pr-8"
            />
            {metric.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{metric.unit}</span>}
          </div>
          {metric.hasTarget && (
            <div className="flex gap-2 pt-2 border-t border-border/30">
              <div className="flex-1 space-y-1">
                <Label className="text-[9px] uppercase font-bold opacity-50">Target</Label>
                <Input 
                  type="number" 
                  value={data.target} 
                  onChange={e => updateMetric(section, metric.id, 'target', e.target.value)}
                  className="h-8 text-xs font-bold"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/dashboard" label="Back to Dashboard" />
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
            <Instagram className="w-3 h-3 text-gold" />
            <span>TJ Personal Brand</span>
            <span className="text-foreground ml-2">Tejas Jhaveri</span>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight">TJ PERSONAL BRAND</h1>
          <p className="text-muted-foreground font-medium">Tracking growth and content performance.</p>
        </div>
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
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="instagram" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Instagram className="w-4 h-4" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="youtube" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Youtube className="w-4 h-4" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="podcast" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Mic className="w-4 h-4" /> Newsletter & Pod
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Video className="w-4 h-4" /> Video Pipeline
          </TabsTrigger>
        </TabsList>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          padding: '8px 12px',
          background: '#F9F9F9',
          borderRadius: '6px',
          fontSize: '13px'
        }}>
          <span style={{ color: '#999' }}>Managed by:</span>
          <span style={{
            fontWeight: '600',
            color: '#000',
            background: '#FFC947',
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '12px'
          }}>
            {channelOwners[activeTab === 'pipeline' ? 'video_pipeline' : activeTab === 'podcast' ? 'linkedin_newsletter' : activeTab] ?? 'Unassigned'}
          </span>
          {user && (
            <a
              href="/settings"
              style={{ fontSize: '11px', color: '#999', marginLeft: 'auto', textDecoration: 'underline' }}
            >
              Change in Settings
            </a>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-gold" />
            <p className="text-muted-foreground font-medium">Fetching brand records...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <TabsContent value="instagram" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {TJ_INSTAGRAM_METRICS.map(m => renderMetricCard('instagram', m))}
                </div>
            </TabsContent>
            <TabsContent value="youtube" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {TJ_YOUTUBE_METRICS.map(m => renderMetricCard('youtube', m))}
                </div>
            </TabsContent>
            <TabsContent value="podcast" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {TJ_PODCAST_METRICS.map(m => renderMetricCard('newsletter_podcast', m))}
                </div>
            </TabsContent>
            <TabsContent value="pipeline" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {TJ_VIDEO_METRICS.map(m => renderMetricCard('video_pipeline', m))}
                </div>
            </TabsContent>

            <div className="flex justify-end gap-3 py-6 border-t">
              <div className="flex items-center">
                <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
              </div>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  )
}
