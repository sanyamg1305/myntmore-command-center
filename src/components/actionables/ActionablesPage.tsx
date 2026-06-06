import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { LayoutGrid, List, Plus, Search, Edit2, Trash2, Calendar, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/ui/BackButton"
import { getCurrentWeekStart } from "@/utils/weekUtils"
import type { Actionable, Client, Profile } from '@/types'

type ActionableRow = Actionable & {
  is_carried_forward: boolean
  clients?: { name: string; company: string | null } | null
  assignee?: { full_name: string | null } | null
}
type ClientSummary = Pick<Client, 'id' | 'name'>
type ProfileSummary = Pick<Profile, 'id' | 'full_name'>


// Note: @dnd-kit/core is required for the Kanban functionality as per the prompt.
// If it's not installed, you can install it using: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLUMNS = [
  { id: 'open', title: 'Open', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-gold' },
  { id: 'done', title: 'Done', color: 'bg-status-on' },
  { id: 'carried_forward', title: 'Carried Forward', color: 'bg-orange-500' }
]

function SortableActionableCard({ actionable, onEdit, onDelete }: { actionable: ActionableRow, onEdit: (a: ActionableRow) => void, onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: actionable.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(
        "group relative hover:shadow-md transition-all cursor-grab active:cursor-grabbing",
        actionable.is_carried_forward && "border-l-4 border-l-orange-500"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-bold text-sm leading-tight">{actionable.title}</h4>
          <Badge variant="outline" className="text-[9px] uppercase font-bold px-1 h-4 shrink-0">
            {actionable.clients?.name || 'Internal'}
          </Badge>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <User className="w-3 h-3" />
            <span>{actionable.assignee?.full_name || 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <Calendar className="w-3 h-3" />
            <span>Due: {actionable.due_date || 'No date'}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/30">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
             <Clock className="w-3 h-3" />
             <span>{actionable.week_start}</span>
          </div>
          {actionable.is_carried_forward && (
            <Badge className="bg-orange-500 text-[9px] h-4 font-black">CARRY FORWARD</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ActionablesPage() {
  const { user, isAdmin } = useAuth()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [actionables, setActionables] = useState<ActionableRow[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingActionable, setEditingActionable] = useState<ActionableRow | null>(null)
  const [form, setForm] = useState({
    title: '',
    client_id: '',
    assignee_id: '',
    due_date: '',
    description: '',
    status: 'open'
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const currentWeekStart = useMemo(() => getCurrentWeekStart(), [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        { data: actionsData },
        { data: clientsData },
        { data: profilesData }
      ] = await Promise.all([
        supabase.from('actionables').select(`
          *,
          clients(name, company),
          assignee:profiles!assignee_id(full_name),
          assigner:profiles!assigner_id(full_name)
        `),
        supabase.from('clients').select('id, name').eq('status', 'active'),
        supabase.from('profiles').select('id, full_name')
      ])

      const processed = (actionsData || []).map(a => ({
        ...a,
        is_carried_forward: a.status === 'open' && !!a.week_start && a.week_start < currentWeekStart
      }))

      setActionables(processed)
      setClients(clientsData || [])
      setProfiles(profilesData || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentWeekStart])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // If over a column or an item in a column
    let newStatus = overId
    if (!COLUMNS.some(c => c.id === overId)) {
        const overItem = actionables.find(a => a.id === overId)
        if (overItem) newStatus = overItem.status ?? 'open'
    }

    const activeItem = actionables.find(a => a.id === activeId)
    if (activeItem && activeItem.status !== newStatus) {
      try {
        const { error } = await supabase.from('actionables').update({ status: newStatus }).eq('id', activeId)
        if (error) throw error
        
        setActionables(prev => prev.map(a => a.id === activeId ? { ...a, status: newStatus } : a))
        toast.success(`Moved to ${newStatus}`)
      } catch (error: any) {
        toast.error(error.message)
      }
    }
  }

  const handleSave = async () => {
    if (!form.title || !form.assignee_id) {
      toast.error("Title and Assignee are required")
      return
    }

    try {
      const payload = {
        ...form,
        assigner_id: editingActionable ? editingActionable.assigner_id : user?.id,
        week_start: editingActionable ? editingActionable.week_start : currentWeekStart
      }

      if (editingActionable) {
        const { error } = await supabase.from('actionables').update(payload).eq('id', editingActionable.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('actionables').insert(payload)
        if (error) throw error
      }

      toast.success(editingActionable ? "Actionable updated" : "Actionable created")
      setIsModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    try {
      const { error } = await supabase.from('actionables').delete().eq('id', id)
      if (error) throw error
      setActionables(prev => prev.filter(a => a.id !== id))
      toast.success("Actionable deleted")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredActionables = actionables.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                          (a.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchesClient = filterClient === 'all' || a.client_id === filterClient
    const matchesAssignee = filterAssignee === 'all' || a.assignee_id === filterAssignee
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus
    return matchesSearch && matchesClient && matchesAssignee && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <div className="flex justify-between items-end">

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actionables</h1>
          <p className="text-muted-foreground">Track tasks and strategic initiatives across clients.</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-muted p-1 rounded-lg flex">
                <Button 
                    variant={view === 'board' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-8"
                    onClick={() => setView('board')}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> Board
                </Button>
                <Button 
                    variant={view === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-8"
                    onClick={() => setView('list')}
                >
                    <List className="w-4 h-4 mr-2" /> List
                </Button>
            </div>
            <Button onClick={() => { setEditingActionable(null); setForm({title:'', client_id:'', assignee_id:'', due_date:'', description:'', status:'open'}); setIsModalOpen(true); }} className="bg-gold text-black hover:bg-gold/90 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Add Actionable
            </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Assignees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {view === 'list' && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {view === 'board' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-320px)] min-h-[500px]">
            {COLUMNS.map(column => (
              <div key={column.id} className="flex flex-col bg-muted/30 rounded-xl border border-dashed border-border/60">
                <div className="p-4 flex items-center justify-between border-b bg-background/50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", column.color)} />
                    <h3 className="font-black text-sm uppercase tracking-widest">{column.title}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{filteredActionables.filter(a => a.status === column.id || (column.id === 'carried_forward' && a.is_carried_forward)).length}</Badge>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <SortableContext items={filteredActionables.filter(a => a.status === column.id || (column.id === 'carried_forward' && a.is_carried_forward)).map(a => a.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {filteredActionables.filter(a => a.status === column.id || (column.id === 'carried_forward' && a.is_carried_forward)).map(a => (
                        <SortableActionableCard key={a.id} actionable={a} onEdit={(a) => { setEditingActionable(a); setForm({ title: a.title, client_id: a.client_id ?? '', assignee_id: a.assignee_id ?? '', due_date: a.due_date ?? '', description: a.description ?? '', status: a.status ?? 'open' }); setIsModalOpen(true); }} onDelete={handleDelete} />
                      ))}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </div>
            ))}
          </div>
        </DndContext>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActionables.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-bold">{a.title}</TableCell>
                    <TableCell>{a.clients?.name || 'Internal'}</TableCell>
                    <TableCell>{a.assignee?.full_name}</TableCell>
                    <TableCell className="text-[11px] font-mono">{a.week_start}</TableCell>
                    <TableCell>{a.due_date}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'done' ? 'default' : 'secondary'} className={cn(
                        a.status === 'done' ? "bg-status-on" : "",
                        a.is_carried_forward && "border-orange-500 text-orange-600"
                      )}>
                        {(a.status ?? 'open').replace('_', ' ')}
                        {a.is_carried_forward && " (Carried Forward)"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingActionable(a); setForm({ title: a.title, client_id: a.client_id ?? '', assignee_id: a.assignee_id ?? '', due_date: a.due_date ?? '', description: a.description ?? '', status: a.status ?? 'open' }); setIsModalOpen(true); }}><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingActionable ? 'Edit Actionable' : 'Add Actionable'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title*</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Client</Label>
                    <Select value={form.client_id || "none"} onValueChange={v => setForm({...form, client_id: v === "none" ? "" : v})}>
                        <SelectTrigger><SelectValue placeholder="Internal" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Internal</SelectItem>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Assignee*</Label>
                    <Select value={form.assignee_id} onValueChange={v => setForm({...form, assignee_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                        <SelectContent>
                            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-gold text-black font-bold w-full">Save Actionable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
