import type { ReactNode } from 'react'
import Header from './Header'
import MobileNav from './MobileNav'
import Sidebar from './Sidebar'
import { useAuth } from '../../hooks/useAuth'

export type PortalRole = 'searcher' | 'finder' | 'command_center'

export default function PageContainer({
  children,
  role,
}: {
  children: ReactNode
  role?: PortalRole
}) {
  const { session } = useAuth()
  const activeRole = session?.portal ?? role

  return (
    <div className="app-shell">
      <Header role={activeRole} />
      <div className="app-body">
        <Sidebar role={activeRole} />
        <main className="main-content">{children}</main>
      </div>
      <MobileNav role={activeRole} />
    </div>
  )
}
