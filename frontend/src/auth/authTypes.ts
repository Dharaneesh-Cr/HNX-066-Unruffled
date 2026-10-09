import type { ApiUser } from '../services/api'

export type Portal = 'searcher' | 'finder' | 'command_center'

export interface AuthSession {
  accessToken: string
  expiresAt: number | null
  portal: Portal
  user: ApiUser
}

export interface AuthContextValue {
  session: AuthSession | null
  isLoading: boolean
  login: (
    email: string,
    password: string,
    portal: Portal,
    organization?: { name: string; type: string },
  ) => Promise<void>
  logout: () => void
}
