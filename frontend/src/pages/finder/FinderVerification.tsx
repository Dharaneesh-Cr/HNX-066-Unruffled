import { useEffect, useState } from 'react'
import { BadgeCheck, Check, MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../../components/layout/PageContainer'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import MatchScore from '../../components/matching/MatchScore'
import MatchEvidence from '../../components/matching/MatchEvidence'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { listCandidateMatches, reviewCandidateMatch } from '../../services/api'
import { demoMatchingDisclaimer } from '../../services/matchingService'
import type { CandidateMatch, AffectedPersonRecord, MissingPersonCase } from '../../types'

interface MatchItem {
  match: CandidateMatch
  missingCase: MissingPersonCase
  affectedPerson: AffectedPersonRecord
}

export default function FinderVerification() {
  const { session } = useAuth()
  const [items, setItems] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function refresh(token: string) {
    const matches = await listCandidateMatches(token)
    setItems(matches)
  }

  useEffect(() => {
    let cancelled = false
    if (!session) return
    void listCandidateMatches(session.accessToken)
      .then((matches) => {
        if (!cancelled) setItems(matches)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load the verification queue.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  async function updateCandidate(match: CandidateMatch, decision: 'VERIFIED' | 'REJECTED') {
    if (!session) return
    setSubmittingId(match.id)
    setError('')
    setNotice('')
    try {
      await reviewCandidateMatch(session.accessToken, match.id, decision)
      await refresh(session.accessToken)
      setNotice(decision === 'VERIFIED'
        ? 'Verification decision saved. Candidate similarity is not identity confirmation.'
        : 'Candidate rejection saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the human review decision.')
    } finally {
      setSubmittingId('')
    }
  }

  const pendingMatches = items.filter(({ match }) =>
    match.verificationStatus === 'PENDING' || match.verificationStatus === 'IN_PROGRESS',
  )

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-verification-title">
        <p className="portal-dashboard-eyebrow"><BadgeCheck size={16} /> Finder Portal · Human decision</p>
        <h1 id="finder-verification-title">Verification Queue</h1>
        <p className="portal-dashboard-intro">
          Candidate similarity supports review only. A human decision is required; a match score never confirms identity.
        </p>
        {notice && <p className="verification-action-notice" role="status">{notice}</p>}
        {error && <p className="person-form-error" role="alert">{error}</p>}
        {loading ? (
          <LoadingState label="Loading verification queue" />
        ) : pendingMatches.length ? (
          <div className="verification-list">
            {pendingMatches.map(({ match, missingCase, affectedPerson }) => (
              <article className="verification-card" key={match.id}>
                <div className="verification-card-heading">
                  <div>
                    <span className="case-id">{match.caseId} · {affectedPerson.id}</span>
                    <h2>Candidate for human review</h2>
                  </div>
                  <MatchScore score={match.similarityPercent} />
                </div>
                <div className="verification-people">
                  <PersonSummary
                    title="Missing person"
                    name={missingCase.profile.fullName ?? missingCase.profile.alias ?? 'Name not provided'}
                    age={missingCase.profile.age}
                    gender={missingCase.profile.gender}
                    location={missingCase.profile.lastSeenLocation ?? 'Last seen location not provided'}
                  />
                  <PersonSummary
                    title="Affected person"
                    name={affectedPerson.profile.fullName ?? affectedPerson.profile.alias ?? 'Name not known'}
                    age={affectedPerson.profile.age}
                    gender={affectedPerson.profile.gender}
                    location={affectedPerson.currentLocation}
                  />
                </div>
                <div className="verification-current-status">
                  <StatusBadge status={missingCase.status} />
                  <span>Organization: {affectedPerson.organizationName}</span>
                </div>
                <h3 className="verification-evidence-title">Evidence / reasons for review</h3>
                <MatchEvidence evidence={match.evidence} />
                <p className="match-disclaimer">{demoMatchingDisclaimer} A human reviewer must make any decision.</p>
                <div className="verification-actions" aria-label="Human verification actions">
                  <button
                    className="button button-primary"
                    disabled={Boolean(submittingId)}
                    onClick={() => void updateCandidate(match, 'VERIFIED')}
                    type="button"
                  >
                    <Check size={16} aria-hidden="true" /> {submittingId === match.id ? 'Saving…' : 'Verify Match'}
                  </button>
                  <button
                    className="button button-secondary reject-candidate-button"
                    disabled={Boolean(submittingId)}
                    onClick={() => void updateCandidate(match, 'REJECTED')}
                    type="button"
                  >
                    <X size={16} aria-hidden="true" /> Reject Candidate
                  </button>
                  <Link className="button button-secondary" to="/finder/updates">View Case</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Verification queue is clear" description="New candidates created from saved reports and affected-person records will appear here." />
        )}
      </section>
    </PageContainer>
  )
}

function PersonSummary({
  title,
  name,
  age,
  gender,
  location,
}: {
  title: string
  name: string
  age?: number
  gender?: string
  location: string
}) {
  return (
    <section className="verification-person" aria-label={title}>
      <span className="verification-photo-placeholder"><BadgeCheck size={20} aria-hidden="true" /></span>
      <div>
        <p className="eyebrow">{title}</p>
        <h3>{name}</h3>
        <p className="verification-person-meta">Approx. {age ?? 'unknown'} · {gender ?? 'Gender not recorded'}</p>
        <p className="verification-person-meta"><MapPin size={13} /> {location}</p>
      </div>
    </section>
  )
}
