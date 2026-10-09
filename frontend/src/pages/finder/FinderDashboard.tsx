import { useEffect, useState } from 'react'
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
import { useAuth } from '../../hooks/useAuth'
import { listCandidateMatches, listMissingCasesForFinder, listOrganizationAffectedPeople } from '../../services/api'

interface FinderStats {
  affected: number
  matches: number
  review: number
  updatesToday: number
}

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
  const { session } = useAuth()
  const approvalStatus = session?.user.approvalStatus
  const [stats, setStats] = useState<FinderStats>({ affected: 0, matches: 0, review: 0, updatesToday: 0 })
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!session || approvalStatus !== 'APPROVED') return
    void Promise.all([
      listOrganizationAffectedPeople(session.accessToken),
      listMissingCasesForFinder(session.accessToken),
      listCandidateMatches(session.accessToken),
    ])
      .then(([affected, cases, matches]) => {
        if (cancelled) return
        const today = new Date().toISOString().slice(0, 10)
        const updates = cases.flatMap((caseRecord) => caseRecord.updates)
        setStats({
          affected: affected.length,
          matches: matches.length,
          review: matches.filter(({ match }) => match.verificationStatus === 'PENDING' || match.verificationStatus === 'IN_PROGRESS').length,
          updatesToday: updates.filter((update) => update.timestamp.startsWith(today)).length,
        })
      })
      .catch((cause: unknown) => {
        if (!cancelled) setStatsError(cause instanceof Error ? cause.message : 'Unable to load organization activity.')
      })
    return () => {
      cancelled = true
    }
  }, [approvalStatus, session])

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard" aria-labelledby="finder-dashboard-title">
        <p className="portal-dashboard-eyebrow"><ShieldCheck size={16} /> Finder Portal</p>
        <h1 id="finder-dashboard-title">Organization workspace</h1>
        <p className="portal-dashboard-intro">
          Coordinate authorized records and case verification for your organization.
        </p>

        {approvalStatus === 'PENDING' && (
          <div className="finder-safety-note" role="status">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>Your account is registered and you are signed in. Organization approval is pending; Finder records and protected operations will be available after approval.</p>
          </div>
        )}
        {approvalStatus === 'REJECTED' && (
          <div className="finder-safety-note" role="alert">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>Your organization application was not approved. Protected Finder records and operations remain unavailable.</p>
          </div>
        )}
        {approvalStatus === 'APPROVED' && (
          <div className="finder-safety-note" role="status">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>Organization approval: Approved. Authorized Finder operations are enabled.</p>
          </div>
        )}

        {approvalStatus !== 'PENDING' && approvalStatus !== 'REJECTED' && (
          <>
        <section className="organization-summary" id="organization-profile" aria-label="Organization profile">
          <span className="organization-icon" aria-hidden="true"><Building2 size={22} /></span>
          <div className="organization-info">
            <p className="eyebrow">Organization</p>
            <h2>{session?.user.organizationName ?? 'Organization profile'}</h2>
            <div className="organization-meta">
              <span><strong>Organization Type</strong>{session?.user.organizationType ?? 'Not available'}</span>
              <span><strong>Approval</strong>{approvalStatus ?? 'Not available'}</span>
              <span><strong>Account</strong>{session?.user.name}</span>
            </div>
          </div>
          <span className="online-status"><i aria-hidden="true" /> Connected</span>
        </section>

        {statsError && <p className="person-form-error" role="alert">{statsError}</p>}
        <div className="stat-grid dashboard-stats finder-stats">
          <StatCard label="Affected People Registered" value={String(stats.affected)} icon={<UsersRound size={18} />} />
          <StatCard label="Potential Matches" value={String(stats.matches)} icon={<Activity size={18} />} />
          <StatCard label="Awaiting Verification" value={String(stats.review)} icon={<ShieldCheck size={18} />} />
          <StatCard label="Case Updates Today" value={String(stats.updatesToday)} icon={<Bell size={18} />} />
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
          </>
        )}
      </section>
    </PageContainer>
  )
}
