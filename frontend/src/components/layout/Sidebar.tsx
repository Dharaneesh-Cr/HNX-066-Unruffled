import {
  Activity,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  FilePlus2,
  Building2,
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

const legacyLinks = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/searcher', label: 'Searcher portal', icon: UsersRound },
  { to: '/finder', label: 'Finder portal', icon: Building2 },
  { to: '/family/report', label: 'Report a person', icon: FilePlus2 },
  { to: '/relief', label: 'Relief network', icon: BriefcaseBusiness },
  { to: '/match/SH-2026-00124', label: 'Candidate review', icon: Activity },
  { to: '/command', label: 'Command center', icon: LayoutDashboard },
  { to: '/timeline/SH-2026-00124', label: 'Case timeline', icon: Radio },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/offline', label: 'Offline support', icon: ShieldCheck },
]

const searcherLinks = [
  { to: '/searcher', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/family/report', label: 'Report Missing Person', icon: FilePlus2 },
  { to: '/searcher/cases', label: 'My Cases', icon: ClipboardList, end: true },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/privacy', label: 'Privacy / Support', icon: ShieldCheck },
]

const finderLinks = [
  { to: '/finder', label: 'Home', icon: House, end: true },
  { to: '/finder/register', label: 'Register Affected Person', icon: UserPlus },
  { to: '/finder/records', label: 'Records', icon: ClipboardList },
  { to: '/finder/matches', label: 'Candidate Matches', icon: UsersRound },
  { to: '/finder/verification', label: 'Verification Queue', icon: BadgeCheck },
  { to: '/finder/updates', label: 'Case Updates', icon: Radio },
  { to: '/finder/notifications', label: 'Notifications', icon: Bell },
  { to: '/finder/profile', label: 'Organization Profile', icon: Building2 },
]

export default function Sidebar({ role }: { role?: PortalRole }) {
  const { session } = useAuth()
  const activeRole = session?.portal ?? role
  const links = activeRole === 'searcher'
    ? searcherLinks
    : activeRole === 'finder'
      ? finderLinks
      : legacyLinks

  return (
    <aside className="sidebar">
      <p className="nav-heading">Workspace</p>
      <nav aria-label="Main navigation" className="sidebar-links">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            end={end}
            key={label}
            to={to}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {activeRole && <LogoutButton className="sidebar-logout" />}
      <div className="sidebar-footer">
        <span className="online-dot" aria-hidden="true" />
        Demo environment
      </div>
    </aside>
  )
}
