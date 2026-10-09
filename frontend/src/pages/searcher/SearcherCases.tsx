import { ArrowRight, CalendarDays, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState'
import StatusBadge from '../../components/common/StatusBadge'
import PageContainer from '../../components/layout/PageContainer'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import LoadingState from '../../components/common/LoadingState'
import { listMyMissingCases } from '../../services/api'
import { formatDate, formatDateTime } from '../../utils/formatters'
import type { MissingPersonCase } from '../../types'
import './SearcherCases.css'

function getLatestUpdate(caseRecord: MissingPersonCase) {
  return caseRecord.updates.reduce<MissingPersonCase['updates'][number] | undefined>((latest, update) => (
    !latest || new Date(update.timestamp).getTime() > new Date(latest.timestamp).getTime() ? update : latest
  ), undefined)
}

export default function SearcherCases() {
  const { session } = useAuth()
  const [cases, setCases] = useState<MissingPersonCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!session) {
      return
    }
    void listMyMissingCases(session.accessToken)
      .then((records) => {
        if (!cancelled) setCases(records)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load cases.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  return (
    <PageContainer role="searcher">
      <section className="portal-dashboard searcher-cases-page" aria-labelledby="searcher-cases-title">
        <p className="portal-dashboard-eyebrow"><UsersRound size={16} /> Searcher Portal · Private to your family</p>
        <h1 id="searcher-cases-title">My Missing Person Cases</h1>
        <p className="portal-dashboard-intro">
          Track your submitted reports, candidate matches and reunification progress.
        </p>

        {loading ? (
          <LoadingState label="Loading your saved cases" />
        ) : error ? (
          <p className="person-form-error" role="alert">{error}</p>
        ) : cases.length === 0 ? (
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
