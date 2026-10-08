import { useState } from 'react'
import { BadgeCheck, Check, MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../../components/layout/PageContainer'
import EmptyState from '../../components/common/EmptyState'
import MatchScore from '../../components/matching/MatchScore'
import MatchEvidence from '../../components/matching/MatchEvidence'
import StatusBadge from '../../components/common/StatusBadge'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { AFFECTED_RECORDS_KEY, MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { createDemoCandidateMatches, demoMatchingDisclaimer } from '../../services/matchingService'
import type { AffectedPersonRecord, CandidateMatch, CaseUpdate, MissingPersonCase } from '../../types'

function createReviewUpdate(decision: 'VERIFIED' | 'REJECTED'): CaseUpdate {
  const timestamp = new Date().toISOString()
  return {
    id: `UPDATE-${Date.now()}`,
    title: decision === 'VERIFIED' ? 'Candidate verified by human reviewer' : 'Candidate rejected by human reviewer',
    description: decision === 'VERIFIED'
      ? 'An authorized coordinator completed the human verification step.'
      : 'An authorized coordinator rejected this candidate after review.',
    timestamp,
    actor: 'Finder coordinator',
  }
}

export default function FinderVerification() {
  const [missingCases, setMissingCases] = useLocalStorage<MissingPersonCase[]>(MISSING_CASES_KEY, demoMissingCases)
  const [affectedRecords, setAffectedRecords] = useLocalStorage<AffectedPersonRecord[]>(AFFECTED_RECORDS_KEY, demoAffectedRecords)
  const [matches, setMatches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )
  const [notice, setNotice] = useState('')

  function updateCandidate(match: CandidateMatch, decision: 'VERIFIED' | 'REJECTED') {
    const caseUpdate = createReviewUpdate(decision)
    setMatches(matches.map((item) => item.id === match.id
      ? { ...item, caseStatus: decision, verificationStatus: 'COMPLETE', lastUpdatedAt: caseUpdate.timestamp }
      : item))
    setMissingCases(missingCases.map((item) => item.id === match.caseId
      ? { ...item, status: decision, updates: [...item.updates, caseUpdate] }
      : item))
    setAffectedRecords(affectedRecords.map((item) => item.id === match.affectedPersonId
      ? { ...item, candidateStatus: decision }
      : item))
    setNotice(decision === 'VERIFIED'
      ? 'The case status was updated by this human review action.'
      : 'The candidate was rejected by this human review action.')
  }

  const pendingMatches = matches.filter((match) =>
    !match.caseStatus || match.caseStatus === 'UNDER_VERIFICATION' || match.caseStatus === 'POTENTIAL_MATCH',
  )

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-verification-title">
        <p className="portal-dashboard-eyebrow"><BadgeCheck size={16} /> Finder Portal · Human decision</p>
        <h1 id="finder-verification-title">Verification Queue</h1>
        <p className="portal-dashboard-intro">
          AI-generated candidate. Human verification required. The demo comparison does not confirm identity.
        </p>
        {notice && <p className="verification-action-notice" role="status">{notice}</p>}
        {pendingMatches.length ? (
          <div className="verification-list">
            {pendingMatches.map((match) => {
              const missingCase = missingCases.find((item) => item.id === match.caseId)
              const affected = affectedRecords.find((item) => item.id === match.affectedPersonId)
              if (!missingCase || !affected) return null
              return (
                <article className="verification-card" key={match.id}>
                  <div className="verification-card-heading">
                    <div>
                      <span className="case-id">{match.caseId} · {affected.id}</span>
                      <h2>Candidate for human review</h2>
                    </div>
                    <MatchScore score={match.similarityPercent} />
                  </div>
                  <div className="verification-people">
                    <PersonSummary title="Missing person" name={missingCase.profile.fullName ?? 'Name not provided'} age={missingCase.profile.age} gender={missingCase.profile.gender} location={missingCase.profile.lastSeenLocation ?? 'Last seen location not provided'} photo={missingCase.profile.photo} />
                    <PersonSummary title="Affected person" name={affected.profile.fullName ?? affected.profile.alias ?? 'Name not known'} age={affected.profile.age} gender={affected.profile.gender} location={affected.currentLocation} photo={affected.profile.photo} />
                  </div>
                  <div className="verification-current-status">
                    <StatusBadge status={match.caseStatus ?? 'UNDER_VERIFICATION'} />
                    <span>Organization: {affected.organizationName}</span>
                  </div>
                  <h3 className="verification-evidence-title">Evidence / reasons for review</h3>
                  <MatchEvidence evidence={match.evidence} />
                  <p className="match-disclaimer">{demoMatchingDisclaimer} A human reviewer must make any decision.</p>
                  <div className="verification-actions" aria-label="Human verification actions">
                    <button className="button button-primary" onClick={() => updateCandidate(match, 'VERIFIED')} type="button">
                      <Check size={16} aria-hidden="true" /> Verify Match
                    </button>
                    <button className="button button-secondary reject-candidate-button" onClick={() => updateCandidate(match, 'REJECTED')} type="button">
                      <X size={16} aria-hidden="true" /> Reject Candidate
                    </button>
                    <Link className="button button-secondary" to="/finder/updates">View Case</Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Verification queue is clear" description="New demo candidates will appear here for human review." />
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
  photo,
}: {
  title: string
  name: string
  age?: number
  gender?: string
  location: string
  photo?: string
}) {
  return (
    <section className="verification-person" aria-label={title}>
      {photo
        ? <img alt={`Photo available for ${name} human review`} className="verification-photo" src={photo} />
        : <span className="verification-photo-placeholder"><BadgeCheck size={20} aria-hidden="true" /></span>}
      <div>
        <p className="eyebrow">{title}</p>
        <h3>{name}</h3>
        <p className="verification-person-meta">Approx. {age ?? 'unknown'} · {gender ?? 'Gender not recorded'}</p>
        <p className="verification-person-meta"><MapPin size={13} /> {location}</p>
        {photo && <span className="record-photo-note">Photo available for human review</span>}
      </div>
    </section>
  )
}
