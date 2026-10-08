import { Bell, ClipboardList, FilePlus2, HeartHandshake, ShieldCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import MissingCaseCard from '../../components/person/MissingCaseCard'
import StatCard from '../../components/common/StatCard'
import PageContainer from '../../components/layout/PageContainer'
import { useAuth } from '../../hooks/useAuth'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { createDemoCandidateMatches } from '../../services/matchingService'
import type { CandidateMatch, MissingPersonCase } from '../../types'

const actions = [
  { to: '/family/report', label: 'Report Missing Person', icon: FilePlus2, id: 'report-person' },
  { to: '/notifications', label: 'Notifications', icon: Bell, id: 'family-notifications' },
]

export default function SearcherDashboard() {
  const { session } = useAuth()
  const [allCases] = useLocalStorage<MissingPersonCase[]>(MISSING_CASES_KEY, demoMissingCases)
  const [matches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )
  const cases = allCases.filter((record) =>
    record.reporterEmail.toLocaleLowerCase() === session?.user.email.toLocaleLowerCase(),
  )
  const caseIds = new Set(cases.map((record) => record.id))
  const ownMatches = matches.filter((match) => caseIds.has(match.caseId))
  const counts = {
    active: cases.filter((record) => !['REUNITED', 'REJECTED'].includes(record.status)).length,
    potential: ownMatches.filter((match) => !['REJECTED', 'VERIFIED'].includes(match.caseStatus ?? '')).length,
    verification: ownMatches.filter((match) => match.caseStatus === 'UNDER_VERIFICATION' || match.caseStatus === 'POTENTIAL_MATCH').length,
    reunited: cases.filter((record) => record.status === 'REUNITED').length,
  }

  return (
    <PageContainer role="searcher">
      <section className="portal-dashboard" aria-labelledby="searcher-dashboard-title">
        <p className="portal-dashboard-eyebrow"><HeartHandshake size={16} /> Searcher Portal</p>
        <h1 id="searcher-dashboard-title">Welcome back</h1>
        <p className="portal-dashboard-intro">
          Follow updates and stay connected with your support network.
        </p>

        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">Your family space</p>
            <h2>My Missing Person Cases</h2>
          </div>
          <span className="private-data-label"><ShieldCheck size={14} /> Private to your family</span>
        </div>

        <div className="stat-grid dashboard-stats">
          <StatCard label="Active Cases" value={counts.active} icon={<ClipboardList size={18} />} />
          <StatCard label="Potential Matches" value={counts.potential} icon={<HeartHandshake size={18} />} />
          <StatCard label="Under Verification" value={counts.verification} icon={<ShieldCheck size={18} />} />
          <StatCard label="Reunited" value={counts.reunited} icon={<UsersRound size={18} />} />
        </div>

        <div className="dashboard-section-heading case-list-heading" id="my-cases">
          <h2>My cases</h2>
        </div>
        <div className="family-cases">
          {cases.length ? cases.map((caseRecord) => (
            <MissingCaseCard caseRecord={caseRecord} key={caseRecord.id} />
          )) : (
            <div className="family-empty-state">
              <p>No missing-person reports have been submitted from this account.</p>
              <Link className="text-link" to="/family/report">Create your first report</Link>
            </div>
          )}
        </div>

        <div className="dashboard-actions" aria-label="Family portal actions">
          {actions.map(({ to, label, icon: Icon, id }) => (
            <Link className="dashboard-action" id={id} key={label} to={to}>
              <span><Icon size={18} aria-hidden="true" /></span>
              <strong>{label}</strong>
            </Link>
          ))}
        </div>
        <p className="dashboard-privacy-note">
          Only cases associated with this family demo account are shown. This demo contains fictional data.
        </p>
      </section>
    </PageContainer>
  )
}
