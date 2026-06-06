import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const CHANNELS = [
  { key: 'instagram',           label: 'Instagram',            icon: '📱' },
  { key: 'youtube',             label: 'YouTube',              icon: '▶️' },
  { key: 'linkedin_newsletter', label: 'LinkedIn Newsletter',  icon: '📧' },
  { key: 'email_newsletter',    label: 'Email Newsletter',     icon: '✉️' },
  { key: 'podcast',             label: 'Podcast',              icon: '🎙️' },
  { key: 'video_pipeline',      label: 'Video Pipeline',       icon: '🎬' },
]

export function TJChannelAssignmentsTab() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [team, setTeam] = useState<{ id: string; full_name: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [savingChannel, setSavingChannel] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      
      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('tj_channel_assignments')
        .select('channel, owner_id')
      
      const assignmentMap: Record<string, string> = {}
      assignmentsData?.forEach(a => {
        assignmentMap[a.channel] = a.owner_id ?? ''
      })
      setAssignments(assignmentMap)

      // Fetch team members
      const { data: teamData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')
      
      if (teamData) {
        setTeam(teamData)
      }
      
      setLoading(false)
    }

    loadData()
  }, [])

  const handleOwnerChange = (channelKey: string, ownerId: string) => {
    setAssignments(prev => ({ ...prev, [channelKey]: ownerId === 'unassigned' ? '' : ownerId }))
  }

  const saveAssignment = async (channel: string) => {
    if (!user) return
    setSavingChannel(channel)
    
    const ownerId = assignments[channel]
    
    const { error } = await supabase
      .from('tj_channel_assignments')
      .upsert({
        channel,
        owner_id: ownerId || null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'channel' })

    if (error) {
      toast.error('Failed to save assignment.')
      console.error(error)
    } else {
      toast.success('Assignment saved.')
    }
    
    setSavingChannel(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-black tracking-widest uppercase">TJ Personal Brand — Channel Assignments</h3>
        <p className="text-sm text-muted-foreground">
          Assign a team member responsible for each channel. They will be shown as the owner in Monday Mode and the TJ Personal Brand page.
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-bold">Channel</TableHead>
              <TableHead className="font-bold w-[300px]">Assigned To</TableHead>
              <TableHead className="font-bold text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CHANNELS.map(ch => (
              <TableRow key={ch.key}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <span>{ch.icon}</span>
                    <span>{ch.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={assignments[ch.key] || 'unassigned'}
                    onValueChange={(val) => handleOwnerChange(ch.key, val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground italic">Unassigned</span>
                      </SelectItem>
                      {team.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || 'Unnamed team member'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => saveAssignment(ch.key)}
                    disabled={savingChannel === ch.key}
                  >
                    {savingChannel === ch.key ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
