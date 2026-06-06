import React, { useState, useEffect } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, Edit2, Archive, RotateCcw, User, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { CONTENT_METRICS, LEADGEN_METRICS } from "@/data/metrics"
import { cn } from "@/lib/utils"

const SEED_CLIENTS = [
  { name: 'Divya Muraleedhar', company: 'SKC World' },
  { name: 'Aditya Gupta', company: 'KyoAir' },
  { name: 'Nilesh', company: 'Vedastram' },
  { name: 'Vinu Nair', company: 'Antal International' },
  { name: 'Nizar Lallani', company: 'Antal International' },
  { name: 'Sitanshu', company: 'Mango Stationery' },
  { name: 'Tejas Jhaveri', company: 'TJ Personal LinkedIn' },
  { name: 'Punam Kucheria', company: 'ClearMind PMS' },
]

export function ClientsPage() {
  const { isAdmin } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [profiles, setProfiles] = useState<any[]>([])
  
  // Modal Form State
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [contentManagerId, setContentManagerId] = useState<string | null>(null)
  const [leadGenManagerId, setLeadGenManagerId] = useState<string | null>(null)
  const [status, setStatus] = useState('active')
  const [birthday, setBirthday] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [startingFollowers, setStartingFollowers] = useState<number>(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          content_manager:profiles!clients_content_manager_id_fkey(full_name),
          leadgen_manager:profiles!clients_leadgen_manager_id_fkey(full_name)
        `)
      
      if (clientsError) throw clientsError

      if (clientsData?.length === 0) {
        // Seed clients if empty
        const { error: seedError } = await supabase
          .from('clients')
          .insert(SEED_CLIENTS.map(c => ({ ...c, status: 'active' })))
        
        if (seedError) throw seedError
        fetchData()
        return
      }

      setClients(clientsData || [])

      // Fetch health scores (latest for each client)
      const { data: healthData } = await supabase
        .from('client_health_scores')
        .select('*')
        .order('week_start', { ascending: false })

      const latestHealth: Record<string, any> = {}
      healthData?.forEach(h => {
        if (h.client_id && !latestHealth[h.client_id]) {
          latestHealth[h.client_id] = h
        }
      })

      const enrichedClients = (clientsData || []).map(c => ({
        ...c,
        health: latestHealth[c.id] || null
      }))

      setClients(enrichedClients)

      // Fetch profiles for managers
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
      
      setProfiles(profilesData || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenModal = (client: any = null) => {
    if (client) {
      setEditingClient(client)
      setName(client.name)
      setCompany(client.company || '')
      setContentManagerId(client.content_manager_id)
      setLeadGenManagerId(client.leadgen_manager_id)
      setStatus(client.status || 'active')
      setBirthday(client.birthday || null)
      setStartDate(client.myntmore_start_date || null)
      setStartingFollowers(client.starting_linkedin_followers || 0)
    } else {
      setEditingClient(null)
      setName('')
      setCompany('')
      setContentManagerId(null)
      setLeadGenManagerId(null)
      setStatus('active')
      setBirthday(null)
      setStartDate(null)
      setStartingFollowers(0)
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!name) {
      toast.error("Client Name is required")
      return
    }

    try {
      const clientPayload = {
        name,
        company,
        content_manager_id: contentManagerId,
        leadgen_manager_id: leadGenManagerId,
        status,
        birthday,
        myntmore_start_date: startDate,
        starting_linkedin_followers: startingFollowers
      }

      let clientId = editingClient?.id

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', editingClient.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert(clientPayload)
          .select()
          .single()
        if (error) throw error
        clientId = data.id

        // Initialize default settings for new client
        await supabase.from('client_settings').insert({
          client_id: clientId,
          active_content_metrics: CONTENT_METRICS.map(m => m.id),
          active_leadgen_metrics: LEADGEN_METRICS.map(m => m.id)
        })
      }

      // Update assignments
      await supabase.from('client_assignments').delete().eq('client_id', clientId)
      
      const assignments = []
      if (contentManagerId) {
        assignments.push({ client_id: clientId, user_id: contentManagerId, role: 'contentManager' })
      }
      if (leadGenManagerId) {
        assignments.push({ client_id: clientId, user_id: leadGenManagerId, role: 'leadGenManager' })
      }

      if (assignments.length > 0) {
        await supabase.from('client_assignments').insert(assignments)
      }

      toast.success(editingClient ? "Client updated" : "Client created")
      setIsModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleArchive = async (client: any) => {
    const newStatus = client.status === 'archived' ? 'active' : 'archived'
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', client.id)
      if (error) throw error
      toast.success(newStatus === 'archived' ? "Client archived" : "Client restored")
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredClients = clients.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const counts = {
    all: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    archived: clients.filter(c => c.status === 'archived').length
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client portfolio and assignments.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenModal()} className="bg-gold text-black hover:bg-gold/90 font-bold">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="gap-2">
              All <Badge variant="secondary" className="text-[10px] px-1 h-4">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              Active <Badge variant="secondary" className="text-[10px] px-1 h-4">{counts.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              Archived <Badge variant="secondary" className="text-[10px] px-1 h-4">{counts.archived}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClients.map(client => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">{client.company || 'No Company'}</p>
                </div>
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className={client.status === 'active' ? 'bg-status-on' : ''}>
                  {client.status}
                </Badge>
              </div>

              <div className="py-3 border-t space-y-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Health Score</span>
                    <span className={cn(
                        "text-sm font-black",
                        (client.health?.health_score || 0) >= 75 ? "text-status-on" : (client.health?.health_score || 0) >= 50 ? "text-status-risk" : "text-status-off"
                    )}>
                        {client.health?.health_score ?? '-'}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                        className={cn(
                            "h-full transition-all duration-500",
                            (client.health?.health_score || 0) >= 75 ? "bg-status-on" : (client.health?.health_score || 0) >= 50 ? "bg-status-risk" : "bg-status-off"
                        )}
                        style={{ width: `${client.health?.health_score || 0}%` }}
                    />
                </div>
                {client.health?.previous_score !== undefined && (
                    <div className={cn(
                        "text-[10px] font-bold flex items-center gap-1",
                        (client.health.health_score - client.health.previous_score) > 0 ? "text-status-on" : (client.health.health_score - client.health.previous_score) < 0 ? "text-status-off" : "text-muted-foreground"
                    )}>
                        {(client.health.health_score - client.health.previous_score) > 0 ? '↑' : (client.health.health_score - client.health.previous_score) < 0 ? '↓' : '→'}
                        {Math.abs(client.health.health_score - client.health.previous_score)} from last week
                    </div>
                )}
              </div>

              <div className="pt-2 border-t flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-8 text-xs font-bold"
                  onClick={() => window.location.href = `/clients/${client.id}`}
                >
                  View Details
                </Button>
                {isAdmin && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleOpenModal(client)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleArchive(client)}
                    >
                      {client.status === 'archived' ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Client Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Client Name*</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company Name</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Content Manager*</Label>
              <Select value={contentManagerId || "none"} onValueChange={(v) => setContentManagerId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Lead Gen Manager*</Label>
              <Select value={leadGenManagerId || "none"} onValueChange={(v) => setLeadGenManagerId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input id="birthday" type="date" value={birthday || ''} onChange={(e) => setBirthday(e.target.value || null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value || null)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="followers">Starting Followers</Label>
              <Input id="followers" type="number" value={startingFollowers} onChange={(e) => setStartingFollowers(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="status">Active Status</Label>
              <Switch 
                id="status" 
                checked={status === 'active'} 
                onCheckedChange={(checked) => setStatus(checked ? 'active' : 'archived')} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-gold text-black hover:bg-gold/90 font-bold w-full">
              {editingClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
