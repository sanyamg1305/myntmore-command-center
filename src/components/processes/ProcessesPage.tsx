import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getCurrentWeekStart, getWeekOptions } from "@/utils/weekUtils";

type Process = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  owner_id: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
  completed_at?: string | null;
  owner?: { full_name: string } | null;
};

type ProcessUpdate = {
  id: string;
  process_id: string | null;
  week_start: string;
  update_text: string;
};

export function ProcessesPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [updates, setUpdates] = useState<ProcessUpdate[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProcess, setNewProcess] = useState({ title: '', description: '', category: '', owner_id: '', priority: 'medium' });
  const [updateText, setUpdateText] = useState<Record<string, string>>({});
  
  const currentWeek = getCurrentWeekStart();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from('myntmore_processes')
        .select('*, owner:profiles!owner_id(full_name)')
        .order('created_at', { ascending: false });
        
      const { data: uData } = await supabase
        .from('process_weekly_updates')
        .select('*');
        
      const { data: profData } = await supabase.from('profiles').select('*');

      setProcesses((pData || []) as any);
      setUpdates((uData || []) as any);
      setProfiles(profData || []);
      
      const currentUpdates: Record<string, string> = {};
      (uData || []).forEach((u: any) => {
        if (u.week_start === currentWeek && u.process_id) {
          currentUpdates[u.process_id] = u.update_text;
        }
      });
      setUpdateText(currentUpdates);

    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProcess = async () => {
    if (!newProcess.title || !newProcess.owner_id) {
      toast.error("Title and Owner are required.");
      return;
    }
    const { error } = await supabase.from('myntmore_processes').insert({
      title: newProcess.title,
      description: newProcess.description,
      category: newProcess.category,
      owner_id: newProcess.owner_id,
      priority: newProcess.priority,
      created_by: user?.id
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Process created");
      setShowNewModal(false);
      setNewProcess({ title: '', description: '', category: '', owner_id: '', priority: 'medium' });
      fetchData();
    }
  };

  const handleSaveUpdate = async (processId: string) => {
    const text = updateText[processId] || '';
    if (!text.trim()) {
        toast.error("Update text cannot be empty");
        return;
    }

    const existing = updates.find(u => u.process_id === processId && u.week_start === currentWeek);
    if (existing) {
        const { error } = await supabase.from('process_weekly_updates').update({ update_text: text }).eq('id', existing.id);
        if (error) toast.error(error.message);
        else toast.success("Update saved");
    } else {
        const { error } = await supabase.from('process_weekly_updates').insert({
            process_id: processId,
            week_start: currentWeek,
            update_text: text,
            submitted_by: user?.id
        });
        if (error) toast.error(error.message);
        else toast.success("Update saved");
    }
    fetchData();
  };

  const handleMarkComplete = async (processId: string, title: string) => {
    const confirmed = window.confirm(`Mark "${title}" as complete? It will be hidden from Monday Mode but remain accessible in the Completed tab.`);
    if (!confirmed) return;

    await supabase.from('myntmore_processes').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user?.id
    }).eq('id', processId);
    
    toast.success("Process marked complete");
    fetchData();
  };

  const handleReopen = async (processId: string, title: string) => {
    await supabase.from('myntmore_processes').update({
      status: 'active',
      completed_at: null,
      completed_by: null
    }).eq('id', processId);
    
    toast.success("Process reopened");
    fetchData();
  };

  const handleDelete = async (processId: string, title: string) => {
    if (!window.confirm(`Delete process "${title}"?`)) return;
    await supabase.from('myntmore_processes').delete().eq('id', processId);
    fetchData();
  };

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-red-500';
    if (p === 'medium') return 'text-yellow-500';
    return 'text-green-500';
  };
  const getPriorityIcon = (p: string) => {
    if (p === 'high') return '🔴 HIGH';
    if (p === 'medium') return '🟡 MED';
    return '🟢 LOW';
  };

  const filtered = processes.filter(p => p.status === activeTab);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase tracking-tight">MYNTMORE PROCESSES</h1>
        {isAdmin && (
          <Button onClick={() => setShowNewModal(true)} className="bg-gold text-black hover:bg-gold/90 font-bold">
            + New Process
          </Button>
        )}
      </div>

      <div className="flex gap-4 border-b">
        <button 
          className={`pb-2 px-1 font-bold ${activeTab === 'active' ? 'border-b-2 border-gold text-gold' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={`pb-2 px-1 font-bold ${activeTab === 'completed' ? 'border-b-2 border-gold text-gold' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading processes...</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => (
            <div key={p.id} className="border p-4 rounded-xl bg-card shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs ${getPriorityColor(p.priority || '')}`}>{getPriorityIcon(p.priority || '')}</span>
                    <h3 className="text-lg font-bold">{p.title}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-x-3">
                    <span>Owner: <strong>{p.owner?.full_name || 'Unknown'}</strong></span>
                    <span>Category: <strong>{p.category}</strong></span>
                  </div>
                  {p.description && <p className="text-sm mt-2">{p.description}</p>}
                </div>
              </div>

              {activeTab === 'active' && (
                <div className="bg-muted/30 p-3 rounded-lg border">
                  <div className="text-xs font-bold mb-2">This week's update (Week of {new Date(currentWeek).toLocaleDateString()}):</div>
                  <Textarea 
                    value={updateText[p.id] || ''}
                    onChange={(e) => setUpdateText({...updateText, [p.id]: e.target.value})}
                    placeholder="Enter this week's progress..."
                    className="h-20 text-sm mb-2"
                  />
                  <div className="flex justify-between items-center">
                    <Button onClick={() => handleSaveUpdate(p.id)} size="sm" className="bg-gold text-black font-bold h-8">Save Update</Button>
                    <div className="flex gap-2">
                      <Button onClick={() => handleMarkComplete(p.id, p.title)} size="sm" variant="outline" className="h-8 text-green-600 border-green-200 bg-green-50">Mark Complete</Button>
                      {isAdmin && (
                          <Button onClick={() => handleDelete(p.id, p.title)} size="sm" variant="ghost" className="h-8 text-red-500">Delete</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'completed' && (
                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
                  <div className="text-xs text-muted-foreground">
                    Completed on {p.completed_at ? new Date(p.completed_at).toLocaleDateString() : 'Unknown'}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleReopen(p.id, p.title)} size="sm" variant="outline" className="h-8">Reopen</Button>
                    {isAdmin && (
                        <Button onClick={() => handleDelete(p.id, p.title)} size="sm" variant="ghost" className="h-8 text-red-500">Delete</Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">No {activeTab} processes.</div>
          )}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-xl w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold uppercase">New Process</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title*</Label>
                <Input value={newProcess.title} onChange={e => setNewProcess({...newProcess, title: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={newProcess.description} onChange={e => setNewProcess({...newProcess, description: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={newProcess.category} onChange={e => setNewProcess({...newProcess, category: e.target.value})} placeholder="e.g. Tech, Operations" />
              </div>
              <div className="space-y-1">
                <Label>Owner*</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={newProcess.owner_id} 
                  onChange={e => setNewProcess({...newProcess, owner_id: e.target.value})}
                >
                  <option value="">Select owner...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={newProcess.priority} 
                  onChange={e => setNewProcess({...newProcess, priority: e.target.value})}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setShowNewModal(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleCreateProcess} className="bg-gold text-black font-bold">Create Process</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
