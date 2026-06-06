import React, { useState } from 'react'
import { calcRateCapped, fmtRate, fmt } from '../../utils/readMetric'

export function CampaignMonthTable({ campaign, monthWeeks, onEdit }: {
  campaign: any,
  monthWeeks: any[],
  onEdit: (c: any) => void
}) {
  const [open, setOpen] = useState(true)

  const ROWS = [
    { label: 'Conn Req Sent',   key: 'conn_requests_sent' },
    { label: 'Accepted',        key: 'accepted' },
    { label: 'Acceptance Rate', key: '_acc',  calc: true },
    { label: 'Responded',       key: 'answered' },
    { label: 'Response Rate',   key: '_resp', calc: true },
    { label: 'Positive',        key: 'positive_replies' },
    { label: 'Negative',        key: 'negative_replies' },
    { label: 'Meetings Booked', key: 'meetings_booked' },
  ]

  const getVal = (weekData: any, key: string): string => {
    if (!weekData) return '—'
    if (key === '_acc') {
      const s = weekData.conn_requests_sent, a = weekData.accepted
      return fmtRate(calcRateCapped(a, s))
    }
    if (key === '_resp') {
      const a = weekData.accepted, r = weekData.answered
      return fmtRate(calcRateCapped(r, a))
    }
    const v = weekData[key]
    return fmt(v)
  }

  return (
    <div style={{ border: '1px solid #E5E5E5', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#F9F9F9', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: '700', fontSize: '13px' }}>{campaign.name}</span>
          {campaign.started_date && (
            <span style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>
              🚀 {new Date(campaign.started_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {campaign.icp_description && (
            <span style={{ fontSize: '11px', color: '#999' }}>
              {campaign.icp_description.slice(0, 50)}{campaign.icp_description.length > 50 ? '...' : ''}
            </span>
          )}
          <span style={{
            background: campaign.status === 'active' ? '#DCFCE7' : '#F3F4F6',
            color: campaign.status === 'active' ? '#16A34A' : '#6B7280',
            fontSize: '10px', fontWeight: '700', padding: '2px 6px',
            borderRadius: '10px', textTransform: 'uppercase',
          }}>
            {campaign.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Edit button */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(campaign) }}
            style={{
              background: 'white', border: '1px solid #E5E5E5', borderRadius: '6px',
              padding: '3px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            ✏️ Edit
          </button>
          <span style={{ color: '#999', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#999', fontWeight: '700', width: '150px' }}>
                  METRIC
                </th>
                {monthWeeks.map(w => (
                  <th key={w.weekStart} style={{
                    padding: '8px', textAlign: 'center',
                    fontSize: '11px', fontWeight: w.isSelected ? '800' : '600',
                    color: w.isSelected ? '#000' : '#999',
                    background: w.isSelected ? '#FFFBF0' : 'transparent',
                    borderBottom: w.isSelected ? '2px solid #FFC947' : '1px solid #F0F0F0',
                    whiteSpace: 'nowrap',
                  }}>
                    {w.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.key} style={{ borderTop: '1px solid #F5F5F5', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '8px 12px', fontSize: '12px', color: row.calc ? '#999' : '#333', fontStyle: row.calc ? 'italic' : 'normal' }}>
                    {row.label}
                  </td>
                  {monthWeeks.map(w => {
                    const val = getVal(campaign.byWeek[w.weekStart], row.key)
                    return (
                      <td key={w.weekStart} style={{
                        padding: '8px', textAlign: 'center', fontSize: '13px',
                        fontWeight: w.isSelected ? '700' : '400',
                        color: val === '—' ? '#DDD' : row.calc ? '#666' : '#000',
                        background: w.isSelected ? '#FFFBF0' : 'transparent',
                      }}>
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
