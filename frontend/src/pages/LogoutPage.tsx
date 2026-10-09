import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LogoutPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        logout()
      } catch (cause) {
        console.error('Unable to clear the Sahayaa session.', cause)
        setError('Logout could not clear this browser session. Please try again.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [attempt, logout, navigate, session])

  return (
    <main className="logout-page" aria-live="polite">
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <button
            onClick={() => {
              setError('')
              setAttempt((current) => current + 1)
            }}
            type="button"
          >
            Try logout again
          </button>
        </div>
      ) : (
        <p>Signing out…</p>
      )}
    </main>
  )
}
