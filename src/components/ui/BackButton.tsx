import { useNavigate, useRouter } from '@tanstack/react-router'

interface BackButtonProps {
  to?: string        // optional explicit route to go back to
  label?: string     // optional custom label
}

export function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate()
  const router = useRouter()

  const handleBack = () => {
    if (to) {
      navigate({ to })
    } else {
      router.history.back()
    }
  }

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#666',
        fontSize: '14px',
        padding: '4px 0',
        marginBottom: '16px',
      }}
    >
      ← {label ?? 'Back'}
    </button>
  )
}
