import { ArrowRight, CalendarDays, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState'
import StatusBadge from '../../components/common/StatusBadge'
import PageContainer from '../../components/layout/PageContainer'
import { useAuth } from '../../hooks/useAuth'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { createDemoCandidateMatches } from '../../services/matchingService'
import { formatDate, formatDateTime } from '../../utils/formatters'
import type { CandidateMatch, MissingPersonCase } from '../../types'
import './SearcherCases.css'

function getLatestUpdate(caseRecord: MissingPersonCase) {
  return caseRecord.updates.reduce<MissingPersonCase['updates'][number] | undefined>((latest, update) => (
    !latest || new Date(update.timestamp).getTime() > new Date(latest.timestamp).getTime() ? update : latest
  ), undefined)
}

export default function SearcherCases() {
  const { session } = useAuth()
  const [allCases] = useLocalStorage<MissingPersonCase[]>(MISSING_CASES_KEY, demoMissingCases)
  const [matches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )
  const cases = allCases.filter((caseRecord) =>
    caseRecord.reporterEmail.toLocaleLowerCase() === session?.user.email.toLocaleLowerCase(),
  )

  return (
    <PageContainer role="searcher">
      <section className="portal-dashboard searcher-cases-page" aria-labelledby="searcher-cases-title">
        <p className="portal-dashboard-eyebrow"><UsersRound size={16} /> Searcher Portal · Private to your family</p>
        <h1 id="searcher-cases-title">My Missing Person Cases</h1>
        <p className="portal-dashboard-intro">
          Track your submitted reports, candidate matches and reunification progress.
        </p>

        {cases.length === 0 ? (
          <div className="searcher-cases-empty">
            <EmptyState
              description="Your submitted reports and updates will appear here."
              title="No missing-person reports have been submitted from this account."
            />
            <Link className="button button-primary" to="/family/report">
              Report Missing Person <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="searcher-case-list">
            {cases.map((caseRecord) => {
              const latestUpdate = getLatestUpdate(caseRecord)
              const candidateSimilarity = matches
                .filter((match) => match.caseId === caseRecord.id)
                .reduce<number | undefined>((highest, match) =>
                  highest === undefined || match.similarityPercent > highest
                    ? match.similarityPercent
                    : highest, undefined)

              return (
                <article className="searcher-case-card" key={caseRecord.id}>
                  {caseRecord.profile.photo ? (
                    <img
                      alt={`Photo of ${caseRecord.profile.fullName ?? 'missing person'}`}
                      className="searcher-case-photo"
                      src={caseRecord.profile.photo}
                    />
                  ) : (
                    <span className="searcher-case-photo-placeholder" aria-hidden="true">
                      <UsersRound size={22} />
                    </span>
                  )}
                  <div className="searcher-case-content">
                    <div className="searcher-case-heading">
                      <div>
                        <span className="case-id">{caseRecord.id}</span>
                        <h2>{caseRecord.profile.fullName ?? caseRecord.profile.alias ?? 'Name not provided'}</h2>
                      </div>
                      <StatusBadge status={caseRecord.status} />
                    </div>

                    <div className="searcher-case-details">
                      <span>Age: {caseRecord.profile.age ?? 'Not provided'}</span>
                      <span><MapPin size={14} aria-hidden="true" /> {caseRecord.profile.lastSeenLocation ?? 'Location not provided'}</span>
                      <span><CalendarDays size={14} aria-hidden="true" /> Last seen {caseRecord.profile.lastSeenDate ? formatDate(caseRecord.profile.lastSeenDate) : 'date not provided'}</span>
                    </div>

                    <div className="searcher-case-updates">
                      {candidateSimilarity !== undefined && (
                        <p className="searcher-case-similarity">
                          <strong>{candidateSimilarity}%</strong> Candidate Similarity
                        </p>
                      )}
                      <p>
                        <strong>Last update:</strong>{' '}
                        {latestUpdate
                          ? `${latestUpdate.title} · ${formatDateTime(latestUpdate.timestamp)}`
                          : `Report submitted · ${formatDateTime(caseRecord.createdAt)}`}
                      </p>
                    </div>
                    <Link className="button button-secondary searcher-case-view" to={`/timeline/${caseRecord.id}`}>
                      View Case <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <p className="searcher-cases-privacy-note">
          Only reports associated with your signed-in account are shown.
        </p>
      </section>
    </PageContainer>
  )
}
