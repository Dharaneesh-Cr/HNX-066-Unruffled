import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { AuthContext } from './context'
import type { DemoSession } from './authTypes'

const SESSION_STORAGE_KEY = 'sahayaa_session'

function isDemoSession(value: unknown): value is DemoSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<DemoSession>
  return (
    candidate.isAuthenticated === true &&
    (candidate.portal === 'searcher' || candidate.portal === 'finder') &&
    typeof candidate.user === 'object' &&
    candidate.user !== null &&
    typeof candidate.user.name === 'string' &&
    typeof candidate.user.email === 'string' &&
    typeof candidate.user.role === 'string'
  )
}

function readStoredSession(): DemoSession | null {
  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (rawSession === null) return null
    const parsedSession: unknown = JSON.parse(rawSession)
    if (isDemoSession(parsedSession)) return parsedSession

    console.warn('Stored Sahayaa session was invalid and has been cleared.')
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  } catch (error) {
    console.error('Unable to restore the Sahayaa demo session.', error)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(readStoredSession)

  const login = useCallback((nextSession: DemoSession) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
  }, [])

  useEffect(() => {
    function synchronizeSession(event: StorageEvent) {
      if (event.key === SESSION_STORAGE_KEY || event.key === null) {
        setSession(readStoredSession())
      }
    }
    window.addEventListener('storage', synchronizeSession)
    return () => window.removeEventListener('storage', synchronizeSession)
  }, [])

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
