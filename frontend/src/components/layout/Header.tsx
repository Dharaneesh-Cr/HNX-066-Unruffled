import { Bell, HeartHandshake } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { PortalRole } from './PageContainer'
import LogoutButton from './LogoutButton'

export default function Header({ role }: { role?: PortalRole }) {
  const { session } = useAuth()
  const activeRole = session?.portal ?? role
  const homePath = activeRole === 'command_center'
    ? '/command'
    : activeRole
      ? `/${activeRole}`
      : '/'

  return (
    <header className={`app-header${session ? ' app-header-authenticated' : ''}`}>
      <Link
        aria-label={activeRole ? `Sahayaa ${activeRole} portal home` : 'Sahayaa home'}
        className="brand"
        to={homePath}
      >
        <span aria-hidden="true" className="brand-mark"><HeartHandshake size={20} /></span>
        <span>Sahayaa</span>
      </Link>
      <div className="header-right">
        <span className="header-context">
          {activeRole
            ? activeRole === 'command_center'
              ? 'Command Center'
              : `${activeRole === 'searcher' ? 'Searcher' : 'Finder'} Portal`
            : 'Community response network'}
        </span>
        {session && (
          <span className="header-user">
            <strong>{session.user.name}</strong>
            <span>{session.user.email}</span>
          </span>
        )}
        <Link aria-label="View notifications" className="icon-link" to="/notifications">
          <Bell size={19} aria-hidden="true" />
        </Link>
        {session && <LogoutButton className="header-logout" />}
      </div>
    </header>
  )
}
