import { SaveStatus } from '../../hooks/useAutoSave'

interface SaveIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
}

export function SaveIndicator({ status, lastSaved }: SaveIndicatorProps) {
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: status === 'error' ? '#EF4444' : '#999'
    }}>
      {status === 'saving' && (
        <>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#FFC947',
            animation: 'pulse 1s infinite'
          }} />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && lastSaved && (
        <>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#22C55E'
          }} />
          <span>Saved at {formatTime(lastSaved)}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#EF4444'
          }} />
          <span>Save failed — retrying...</span>
        </>
      )}
      {status === 'idle' && (
        <span style={{ color: '#ccc' }}>Auto-save on</span>
      )}
    </div>
  )
}
