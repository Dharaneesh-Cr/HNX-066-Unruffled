export type Portal = 'searcher' | 'finder'

export interface DemoSession {
  isAuthenticated: true
  portal: Portal
  user: {
    name: string
    email: string
    role: string
  }
}

export interface AuthContextValue {
  session: DemoSession | null
  login: (session: DemoSession) => void
  logout: () => void
}
