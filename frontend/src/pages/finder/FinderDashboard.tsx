import {
  Activity,
  Bell,
  Building2,
  ClipboardList,
  Radio,
  ShieldCheck,
  UsersRound,
  UserPlus,
  Users,
  BadgeCheck,
  House,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../../components/layout/PageContainer'
import StatCard from '../../components/common/StatCard'

const actions = [
  { to: '/finder/register', label: 'Register Affected Person', icon: UserPlus, id: 'register-person' },
  { to: '/finder/records', label: 'View Records', icon: ClipboardList, id: 'affected-people' },
  { to: '/finder/matches', label: 'Candidate Matches', icon: Users, id: 'candidate-matches' },
  { to: '/finder/verification', label: 'Verification Queue', icon: BadgeCheck, id: 'verification-queue' },
  { to: '/finder/updates', label: 'Case Updates', icon: Radio, id: 'case-updates' },
  { to: '/finder/notifications', label: 'Notifications', icon: Bell, id: 'finder-notifications' },
  { to: '/finder/profile', label: 'Organization Profile', icon: Building2, id: 'finder-profile' },
]

export default function FinderDashboard() {
  return (
    <PageContainer role="finder">
      <section className="portal-dashboard" aria-labelledby="finder-dashboard-title">
        <p className="portal-dashboard-eyebrow"><ShieldCheck size={16} /> Finder Portal</p>
        <h1 id="finder-dashboard-title">Organization workspace</h1>
        <p className="portal-dashboard-intro">
          Coordinate authorized records and case verification for your organization.
        </p>

        <section className="organization-summary" id="organization-profile" aria-label="Organization profile">
          <span className="organization-icon" aria-hidden="true"><Building2 size={22} /></span>
          <div className="organization-info">
            <p className="eyebrow">Organization</p>
            <h2>Government Hospital - Zone A</h2>
            <div className="organization-meta">
              <span><strong>Organization Type</strong>Hospital</span>
              <span><strong>Role</strong>Medical Responder</span>
              <span><strong>Last synchronization</strong>2 minutes ago</span>
            </div>
          </div>
          <span className="online-status"><i aria-hidden="true" /> Online</span>
        </section>

        <div className="stat-grid dashboard-stats finder-stats">
          <StatCard label="Affected People Registered" value="24" icon={<UsersRound size={18} />} />
          <StatCard label="Potential Matches" value="3" icon={<Activity size={18} />} />
          <StatCard label="Awaiting Verification" value="2" icon={<ShieldCheck size={18} />} />
          <StatCard label="Cases Updated Today" value="7" icon={<Bell size={18} />} />
        </div>

        <div className="dashboard-section-heading finder-action-heading">
          <div>
            <p className="eyebrow">Organization tools</p>
            <h2>What would you like to do?</h2>
          </div>
          <span className="authorized-label"><ShieldCheck size={14} /> Authorized organization access</span>
        </div>

        <nav className="dashboard-actions finder-actions" aria-label="Finder portal actions">
          <Link className="dashboard-action" id="finder-home-action" to="/finder">
            <span><House size={18} aria-hidden="true" /></span>
            <strong>Home</strong>
          </Link>
          {actions.map(({ to, label, icon: Icon, id }) => (
            <Link className="dashboard-action" id={id} key={label} to={to}>
              <span><Icon size={18} aria-hidden="true" /></span>
              <strong>{label}</strong>
            </Link>
          ))}
        </nav>

        <div className="finder-safety-note">
          <ShieldCheck size={17} aria-hidden="true" />
          <p>
            Only information necessary for authorized case verification should be shared. Candidate similarity
            supports review; it does not confirm identity. Human verification is required.
          </p>
        </div>
      </section>
    </PageContainer>
  )
}
