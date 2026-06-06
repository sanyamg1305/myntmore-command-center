import React, { useState, useEffect } from 'react'
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
import { toast } from "sonner"
import { UserPlus, Copy, Check, RefreshCw, Ban, Shield, Trash2 } from "lucide-react"

export function TeamSettingsPage() {
  const { user: currentUser } = useAuth()
  const [team, setTeam] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [inviteeName, setInviteeName] = useState('')
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editingName, setEditingName] = useState('')

  // Form State
  const [form, setForm] = useState({
    fullName: '',
    email: ''
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        { data: profilesData },
        { data: rolesData },
        { data: assignmentsData },
        { data: invitesData }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('client_assignments').select('user_id'),
        supabase.from('invites').select('*').order('created_at', { ascending: false })
      ])

      const enrichedTeam = (profilesData || []).map(p => {
        const role = rolesData?.find(r => r.user_id === p.id) as any
        const assignmentsCount = assignmentsData?.filter(a => a.user_id === p.id).length || 0
        return {
          ...p,
          role: role?.role || 'member',
          roleDisabled: role?.disabled || false,
          assignmentsCount
        }
      })

      setTeam(enrichedTeam)
      setInvites(invitesData || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInvite = async () => {
    if (!form.fullName || !form.email) {
      toast.error("Name and Email are required")
      return
    }

    try {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('invites').insert({
        email: form.email,
        full_name: form.fullName,
        department: 'both',
        role: 'member',
        status: 'pending',
        token,
        invited_by: currentUser?.id
      })

      if (error) throw error

      const link = `${window.location.origin}/accept-invite?token=${token}`
      setGeneratedLink(link)
      setInviteeName(form.fullName)
      setIsInviteModalOpen(false)
      setIsLinkModalOpen(true)
      fetchData()
      setForm({ fullName: '', email: '' })
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    toast.success("Link copied to clipboard")
  }

  const handleMakeAdmin = (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Make ${userName} an admin? They will have full access to all data, settings, and team management.`
    )
    if (!confirmed) return
    promoteToAdmin(userId)
  }

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId)

    if (error) {
      toast.error('Failed to promote user: ' + error.message)
      return
    }

    await fetchData()
    toast.success('User promoted to admin successfully.')
  }

  const handleRevokeAdmin = (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Revoke admin access for ${userName}? They will become a regular member and lose access to Settings.`
    )
    if (!confirmed) return
    revokeAdmin(userId)
  }

  const revokeAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: 'member' })
      .eq('user_id', userId)

    if (error) {
      toast.error('Failed to revoke admin: ' + error.message)
      return
    }

    await fetchData()
    toast.success('Admin access revoked.')
  }

  const handleToggleDisable = async (userId: string, currentDisabled: boolean) => {
    try {
      // Update both profiles and user_roles for redundancy
      await Promise.all([
        supabase.from('profiles').update({ disabled: !currentDisabled }).eq('id', userId),
        supabase.from('user_roles').update({ disabled: !currentDisabled } as any).eq('user_id', userId)
      ])
      
      toast.success(currentDisabled ? "Account enabled" : "Account disabled")
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this invitation?")) return
    try {
      const { error } = await supabase.from('invites').delete().eq('id', inviteId)
      if (error) throw error
      toast.success("Invite revoked")
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openEditModal = (user: any) => {
    setEditingUser(user)
    setEditingName(user.full_name || '')
    setIsEditModalOpen(true)
  }

  const handleSaveEditName = async () => {
    if (!editingName.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    if (!editingUser) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editingName.trim() })
        .eq('id', editingUser.id)

      if (error) throw error

      toast.success("Name updated successfully")
      setIsEditModalOpen(false)
      setEditingUser(null)
      setEditingName('')
      fetchData()
    } catch (error: any) {
      toast.error('Failed to update name: ' + error.message)
    }
  }

  const getStatusBadge = (user: any) => {
    if (user.disabled) return <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200">Disabled</Badge>
    return <Badge variant="default" className="bg-status-on">Active</Badge>
  }

  const getDeptBadge = (dept: string, role: string) => {
    if (role === 'admin') return <Badge variant="outline" className="border-gold text-gold font-bold">Admin</Badge>
    return <Badge variant="outline" className="capitalize">{dept || 'Member'}</Badge>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Team Members</h2>
          <p className="text-sm text-muted-foreground font-medium">Manage access and roles for your team.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} className="bg-gold text-black hover:bg-gold/90 font-bold">
          <UserPlus className="w-4 h-4 mr-2" /> Invite Member
        </Button>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Clients Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <span style={{
                          background: '#FFC947',
                          color: '#000',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          Admin
                        </span>
                      ) : (
                        <span style={{
                          background: '#E5E5E5',
                          color: '#666',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          Member
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{u.assignmentsCount} clients</TableCell>
                    <TableCell>{getStatusBadge(u)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {u.role === 'admin' ? (
                        <div className="inline-flex items-center">
                          <span style={{
                            background: '#FFC947',
                            color: '#000',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}>
                            Admin
                          </span>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleRevokeAdmin(u.id, u.full_name)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#EF4444',
                                fontSize: '12px',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                marginLeft: '8px'
                              }}
                            >
                              Revoke Admin
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMakeAdmin(u.id, u.full_name)}
                          style={{
                            background: 'white',
                            border: '1px solid #E5E5E5',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            color: '#000'
                          }}
                        >
                          Make Admin
                        </button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => openEditModal(u)}
                      >
                        ✏️ Edit
                      </Button>
                      <Button variant="ghost" size="icon" title={u.disabled ? "Enable" : "Disable"} onClick={() => handleToggleDisable(u.id, !!u.disabled)}>
                        {u.disabled ? <Check className="w-4 h-4 text-status-on" /> : <Ban className="w-4 h-4 text-destructive" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {invites.some(i => i.status === 'pending') && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pending Invites</h3>
          <div className="rounded-lg border bg-muted/20">
            <Table>
              <TableBody>
                {invites.filter(i => i.status === 'pending').map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-bold">{i.full_name}</TableCell>
                    <TableCell>{i.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground italic">Sent: {new Date(i.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" className="text-gold font-bold" onClick={() => {
                        setGeneratedLink(`${window.location.origin}/accept-invite?token=${i.token}`)
                        setIsLinkModalOpen(true)
                      }}>Copy Link</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRevokeInvite(i.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name*</Label>
              <Input placeholder="e.g. Mithil Kothari" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Email*</Label>
              <Input type="email" placeholder="email@myntmore.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleInvite} className="bg-gold text-black font-bold w-full h-12">
              Send Invite →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 font-bold text-status-on"><Check className="w-5 h-5" /> Invite Created</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Share this link with <b>{inviteeName}</b>. They'll set their password when they open it.</p>
            <div className="p-3 bg-muted rounded-lg border flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-mono truncate flex-1">{generatedLink}</span>
                <Button size="icon" variant="ghost" onClick={handleCopyLink} className="shrink-0"><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsLinkModalOpen(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Edit Team Member Name</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Enter full name"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEditName()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEditModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveEditName} className="bg-gold text-black font-bold">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
