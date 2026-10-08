import {
  Bell,
  Building2,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  UsersRound,
  UserPlus,
  BadgeCheck,
  House,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { PortalRole } from './PageContainer'
import LogoutButton from './LogoutButton'

const legacyItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/searcher', label: 'Searcher', icon: UsersRound },
  { to: '/finder', label: 'Finder', icon: Building2 },
  { to: '/command', label: 'Command', icon: LayoutDashboard },
]

const searcherItems = [
  { to: '/searcher', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/family/report', label: 'Report', icon: FilePlus2 },
  { to: '/searcher/cases', label: 'My Cases', icon: ClipboardList, end: true },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/privacy', label: 'Privacy', icon: ShieldCheck },
]

const finderItems = [
  { to: '/finder', label: 'Home', icon: House, end: true },
  { to: '/finder/register', label: 'Register', icon: UserPlus },
  { to: '/finder/records', label: 'Records', icon: ClipboardList },
  { to: '/finder/matches', label: 'Matches', icon: UsersRound },
  { to: '/finder/verification', label: 'Verify', icon: BadgeCheck },
  { to: '/finder/updates', label: 'Updates', icon: Radio },
  { to: '/finder/profile', label: 'Organization', icon: Building2 },
  { to: '/finder/notifications', label: 'Alerts', icon: Bell },
]

export default function MobileNav({ role }: { role?: PortalRole }) {
  const { session } = useAuth()
  const activeRole = session?.portal ?? role
  const items = activeRole === 'searcher'
    ? searcherItems
    : activeRole === 'finder'
      ? finderItems
      : legacyItems

  return (
    <nav
      aria-label="Mobile navigation"
      className={`mobile-nav${activeRole ? ` mobile-nav-${activeRole}` : ''}`}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          aria-label={label}
          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
          end={end}
          key={label}
          to={to}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
      {activeRole && <LogoutButton className="mobile-logout" />}
    </nav>
  )
}
