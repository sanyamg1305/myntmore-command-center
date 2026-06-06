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
  Linkedin,
  Instagram,
  Globe,
  PlusCircle
} from "lucide-react"
import { 
  MM_LINKEDIN_METRICS, 
  MM_INSTAGRAM_METRICS, 
  MM_WEBSITE_METRICS, 
  MM_OTHER_METRICS,
  CompanyMetric
} from "@/data/company_metrics"
import { BackButton } from "@/components/ui/BackButton"
import { getCurrentWeekStart, getWeekOptions } from "@/utils/weekUtils"
import { useAutoSave } from "@/hooks/useAutoSave"
import { SaveIndicator } from "@/components/ui/SaveIndicator"

export function MMContentPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('linkedin')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const weekOptions = useMemo(() => getWeekOptions(12), [])
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart())
  const { triggerSave, saveStatus, lastSaved } = useAutoSave({
    table: 'mm_weekly_data',
    matchColumns: { week_start: selectedWeek },
    debounceMs: 1500
  })

  const [formData, setFormData] = useState<any>({
    linkedin: {},
    instagram: {},
    website: {},
    quora: {},
    reddit: {}
  })

  useEffect(() => {
    fetchWeeklyData()
  }, [selectedWeek])

  const fetchWeeklyData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('mm_weekly_data')
        .select('*')
        .eq('week_start', selectedWeek)
        .maybeSingle()
      
      if (data) {
        setFormData({
          linkedin: data.linkedin || {},
          instagram: data.instagram || {},
          website: data.website || {},
          quora: data.quora || {},
          reddit: data.reddit || {}
        })
      } else {
        setFormData({
          linkedin: {},
          instagram: {},
          website: {},
          quora: {},
          reddit: {}
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
        linkedin: updated.linkedin,
        instagram: updated.instagram,
        website: updated.website,
        quora: updated.quora,
        reddit: updated.reddit,
        submitted_by: user?.id
      })

      return updated
    })
  }

  const renderMetricCard = (section: string, metric: CompanyMetric) => {
    const data = formData[section][metric.id] || { value: '', target: '' }
    
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
            <Globe className="w-3 h-3 text-gold" />
            <span>MM Company Content</span>
            <span className="text-foreground ml-2">Brand & Digital Presence</span>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight">MM COMPANY CONTENT</h1>
          <p className="text-muted-foreground font-medium">Tracking Myntmore's brand growth and traffic.</p>
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
          <TabsTrigger value="linkedin" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Linkedin className="w-4 h-4" /> LinkedIn
          </TabsTrigger>
          <TabsTrigger value="instagram" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Instagram className="w-4 h-4" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="website" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <Globe className="w-4 h-4" /> Website
          </TabsTrigger>
          <TabsTrigger value="other" className="py-2.5 font-bold data-[state=active]:bg-gold data-[state=active]:text-black gap-2">
            <PlusCircle className="w-4 h-4" /> Other Channels
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-gold" />
            <p className="text-muted-foreground font-medium">Fetching company records...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <TabsContent value="linkedin" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MM_LINKEDIN_METRICS.map(m => renderMetricCard('linkedin', m))}
                </div>
            </TabsContent>
            <TabsContent value="instagram" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MM_INSTAGRAM_METRICS.map(m => renderMetricCard('instagram', m))}
                </div>
            </TabsContent>
            <TabsContent value="website" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MM_WEBSITE_METRICS.map(m => renderMetricCard('website', m))}
                </div>
            </TabsContent>
            <TabsContent value="other" className="mt-0 space-y-6">
                <div>
                    <h3 className="text-sm font-black uppercase text-muted-foreground mb-4">Quora</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {MM_OTHER_METRICS.slice(0, 4).map(m => renderMetricCard('quora', m))}
                    </div>
                </div>
                <div className="pt-4">
                    <h3 className="text-sm font-black uppercase text-muted-foreground mb-4">Reddit</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {MM_OTHER_METRICS.slice(4).map(m => renderMetricCard('reddit', m))}
                    </div>
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
