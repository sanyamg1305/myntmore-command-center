import React, { useState } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

export function EditCampaignModal({ campaign, onSave, onClose }: {
  campaign: any,
  onSave: () => void,
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: campaign.name ?? '',
    started_date: campaign.started_date ?? '',
    icp_description: campaign.icp_description ?? '',
    message_narrative: campaign.message_narrative ?? '',
    status: campaign.status ?? 'active',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('campaigns')
      .update({
        name: form.name,
        started_date: form.started_date || null,
        icp_description: form.icp_description,
        message_narrative: form.message_narrative,
        status: form.status as any,
      })
      .eq('id', campaign.id)

    setSaving(false)
    if (error) { toast.error('Save failed: ' + error.message); return }
    toast.success('Campaign updated.')
    onSave()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '28px',
        width: '480px', maxWidth: '90vw',
      }}>
        <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '20px' }}>
          Edit Campaign
        </div>

        {[
          { label: 'Campaign Name', key: 'name', type: 'text' },
          { label: 'ICP Description', key: 'icp_description', type: 'textarea' },
          { label: 'Message Narrative', key: 'message_narrative', type: 'textarea' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                rows={3}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #E5E5E5',
                  borderRadius: '8px', fontSize: '14px', resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <input
                type="text"
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #E5E5E5',
                  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>
            Launch Date
          </label>
          <input
            type="date"
            value={form.started_date}
            onChange={e => setForm(f => ({ ...f, started_date: e.target.value }))}
            style={{
              width: '100%', padding: '8px 12px', border: '1px solid #E5E5E5',
              borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>
            Status
          </label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            style={{
              padding: '8px 12px', border: '1px solid #E5E5E5',
              borderRadius: '8px', fontSize: '14px', width: '100%',
            }}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', border: '1px solid #E5E5E5', borderRadius: '8px',
              background: 'white', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', background: saving ? '#E5E5E5' : '#FFC947',
              border: 'none', borderRadius: '8px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
