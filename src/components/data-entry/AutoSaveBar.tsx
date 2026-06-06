import React from 'react'

interface AutoSaveBarProps {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  lastSavedAt: Date | null
}

export function AutoSaveBar({ status, lastSavedAt }: AutoSaveBarProps) {
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 20px',
      background: status === 'error' ? '#FEF2F2' : '#F9F9F9',
      borderBottom: '1px solid #F0F0F0',
      fontSize: '12px',
      fontWeight: '500',
    }}>

      {status === 'idle' && lastSavedAt && (
        <>
          <span style={{ color: '#22C55E', fontSize: '14px' }}>✓</span>
          <span style={{ color: '#666' }}>
            Auto saved at {formatTime(lastSavedAt)}
          </span>
        </>
      )}

      {status === 'pending' && (
        <>
          <span style={{ color: '#999', fontSize: '12px' }}>●</span>
          <span style={{ color: '#999' }}>Unsaved changes</span>
        </>
      )}

      {status === 'saving' && (
        <>
          {/* Spinner */}
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid #E5E5E5',
            borderTop: '2px solid #FFC947',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: '#666' }}>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <span style={{ color: '#22C55E', fontSize: '14px' }}>✓</span>
          <span style={{ color: '#22C55E', fontWeight: '600' }}>Auto saved</span>
          {lastSavedAt && (
            <span style={{ color: '#999', marginLeft: '4px' }}>
              at {formatTime(lastSavedAt)}
            </span>
          )}
        </>
      )}

      {status === 'error' && (
        <>
          <span style={{ color: '#EF4444', fontSize: '14px' }}>⚠</span>
          <span style={{ color: '#EF4444', fontWeight: '600' }}>Save failed</span>
          <span style={{ color: '#999', marginLeft: '4px' }}>— check your connection</span>
        </>
      )}

      {/* Add spin keyframe once in a global style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
