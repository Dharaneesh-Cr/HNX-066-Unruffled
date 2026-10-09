import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { AuthContext } from './context'
import type { AuthSession, Portal } from './authTypes'
import {
  ApiError,
  AUTH_SESSION_EXPIRED_EVENT,
  getCurrentUser,
  loginWithPassword,
} from '../services/api'

const SESSION_STORAGE_KEY = 'sahayaa_access_session'

function isPortal(value: unknown): value is Portal {
  return value === 'searcher' || value === 'finder' || value === 'command_center'
}

function isStoredSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<AuthSession>
  return (
    typeof candidate.accessToken === 'string' &&
    isPortal(candidate.portal) &&
    typeof candidate.user === 'object' &&
    candidate.user !== null &&
    typeof candidate.user.email === 'string'
  )
}

function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

function readStoredSession(): AuthSession | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored === null) return null
    const parsed: unknown = JSON.parse(stored)
    return isStoredSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!session) {
      clearStoredSession()
      void Promise.resolve().then(() => {
        if (!cancelled) setIsLoading(false)
      })
    } else {
      void getCurrentUser(session.accessToken)
        .then((user) => {
          const portalRole = {
            searcher: 'SEARCHER',
            finder: 'FINDER',
            command_center: 'COMMAND_CENTER',
          }[session.portal]
          if (user.role !== portalRole) {
            window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
            return
          }
          if (
            session.user.id !== user.userId ||
            session.user.name !== user.name ||
            session.user.email !== user.email ||
            session.user.organizationId !== user.organizationId ||
            session.user.approvalStatus !== user.approvalStatus ||
            session.user.organizationName !== user.organizationName ||
            session.user.organizationType !== user.organizationType
          ) {
            setSession({
              ...session,
              user: {
                ...session.user,
                id: user.userId,
                name: user.name,
                email: user.email,
                organizationId: user.organizationId,
                approvalStatus: user.approvalStatus,
                organizationName: user.organizationName,
                organizationType: user.organizationType,
              },
            })
          }
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    function expireSession() {
      clearStoredSession()
      setSession(null)
    }
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession)
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession)
  }, [])

  const login = useCallback(async (
    email: string,
    password: string,
    portal: Portal,
    organization?: { name: string; type: string },
  ) => {
    const result = await loginWithPassword(email, password, portal, organization)
    const nextSession: AuthSession = {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
      portal,
      user: result.user,
    }
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [])

  const logout = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
