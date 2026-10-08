import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import PageContainer from '../../components/layout/PageContainer'
import EmptyState from '../../components/common/EmptyState'
import MatchScore from '../../components/matching/MatchScore'
import MatchEvidence from '../../components/matching/MatchEvidence'
import StatusBadge from '../../components/common/StatusBadge'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { AFFECTED_RECORDS_KEY, MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { createDemoCandidateMatches, demoMatchingDisclaimer } from '../../services/matchingService'
import type { AffectedPersonRecord, CandidateMatch, MissingPersonCase } from '../../types'

export default function FinderMatches() {
  const [missingCases] = useLocalStorage<MissingPersonCase[]>(MISSING_CASES_KEY, demoMissingCases)
  const [affectedRecords] = useLocalStorage<AffectedPersonRecord[]>(AFFECTED_RECORDS_KEY, demoAffectedRecords)
  const [storedMatches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )
  const matches = storedMatches.length
    ? storedMatches
    : createDemoCandidateMatches(missingCases, affectedRecords)

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-matches-title">
        <p className="portal-dashboard-eyebrow"><ShieldCheck size={16} /> Finder Portal · Human review</p>
        <h1 id="finder-matches-title">Candidate Matches</h1>
        <p className="portal-dashboard-intro">
          Demo Candidate Similarity is a deterministic comparison of available profile fields. Photos are available for human review only.
        </p>
        <p className="matching-pipeline-note">Searcher report → Finder record → Candidate Similarity → Human verification</p>
        {matches.length ? (
          <div className="candidate-list">
            {matches.map((match) => {
              const missingCase = missingCases.find((item) => item.id === match.caseId)
              const affected = affectedRecords.find((item) => item.id === match.affectedPersonId)
              return (
                <article className="candidate-review-card" key={match.id}>
                  <div className="candidate-review-top">
                    <div><p className="eyebrow">Missing person</p><h2>{missingCase?.profile.fullName ?? match.missingPersonName}</h2></div>
                    <MatchScore score={match.similarityPercent} />
                  </div>
                  <div className="candidate-review-person">
                    <p><strong>Affected person:</strong> {affected?.profile.fullName ?? match.candidateName}</p>
                    <p><strong>Location found:</strong> {affected?.profile.foundLocation ?? match.location.city}</p>
                    <StatusBadge status={match.caseStatus ?? 'UNDER_VERIFICATION'} />
                  </div>
                  <MatchEvidence evidence={match.evidence} />
                  <p className="match-disclaimer">{demoMatchingDisclaimer}</p>
                  <Link className="text-link candidate-action-link" to="/finder/verification">
                    Open human verification queue <ArrowRight size={15} />
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No candidate matches yet" description="New candidate comparisons are created when Searcher and Finder records are submitted." />
        )}
      </section>
    </PageContainer>
  )
}
