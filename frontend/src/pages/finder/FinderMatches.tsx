import { useEffect, useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../../components/layout/PageContainer'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import MatchScore from '../../components/matching/MatchScore'
import MatchEvidence from '../../components/matching/MatchEvidence'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { listCandidateMatches } from '../../services/api'
import { demoMatchingDisclaimer } from '../../services/matchingService'
import type { CandidateMatch, AffectedPersonRecord, MissingPersonCase } from '../../types'

interface MatchItem {
  match: CandidateMatch
  missingCase: MissingPersonCase
  affectedPerson: AffectedPersonRecord
}

export default function FinderMatches() {
  const { session } = useAuth()
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!session) return
    void listCandidateMatches(session.accessToken)
      .then((result) => {
        if (!cancelled) setMatches(result)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load candidate matches.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-matches-title">
        <p className="portal-dashboard-eyebrow"><ShieldCheck size={16} /> Finder Portal · Human review</p>
        <h1 id="finder-matches-title">Candidate Matches</h1>
        <p className="portal-dashboard-intro">
          Candidate similarity is based on available profile fields. It is not identity confirmation; every candidate requires human review.
        </p>
        <p className="matching-pipeline-note">Searcher report → Finder record → Candidate Similarity → Human verification</p>
        {loading ? (
          <LoadingState label="Loading candidate matches" />
        ) : error ? (
          <p className="person-form-error" role="alert">{error}</p>
        ) : matches.length ? (
          <div className="candidate-list">
            {matches.map(({ match, missingCase, affectedPerson }) => (
              <article className="candidate-review-card" key={match.id}>
                <div className="candidate-review-top">
                  <div><p className="eyebrow">Missing person</p><h2>{missingCase.profile.fullName ?? missingCase.profile.alias}</h2></div>
                  <MatchScore score={match.similarityPercent} />
                </div>
                <div className="candidate-review-person">
                  <p><strong>Affected person:</strong> {affectedPerson.profile.fullName ?? affectedPerson.profile.alias}</p>
                  <p><strong>Location found:</strong> {affectedPerson.currentLocation}</p>
                  <StatusBadge status={missingCase.status} />
                </div>
                <MatchEvidence evidence={match.evidence} />
                <p className="match-disclaimer">{demoMatchingDisclaimer}</p>
                <Link className="text-link candidate-action-link" to="/finder/verification">
                  Open human verification queue <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No candidate matches yet" description="A candidate appears after relevant Searcher and Finder records are submitted." />
        )}
      </section>
    </PageContainer>
  )
}
