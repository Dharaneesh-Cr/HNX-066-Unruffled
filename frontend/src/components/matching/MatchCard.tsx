import { MapPin } from 'lucide-react'
import type { CandidateMatch } from '../../types'
import { formatLocation } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'
import MatchEvidence from './MatchEvidence'
import MatchScore from './MatchScore'

export default function MatchCard({ candidate }: { candidate: CandidateMatch }) {
  return (
    <article className="match-card">
      <div className="match-card-heading">
        <div>
          <span className="case-id">Candidate record</span>
          <h2>{candidate.candidateName}</h2>
          <p className="case-card-location">
            <MapPin size={15} aria-hidden="true" />
            {formatLocation(candidate.location.city, candidate.location.region)}
          </p>
        </div>
        <MatchScore score={candidate.similarityPercent} />
      </div>
      <div className="match-divider" />
      <div className="match-review-heading">
        <h3>Review details</h3>
        <StatusBadge status="UNDER_VERIFICATION" />
      </div>
      <MatchEvidence evidence={candidate.evidence} />
      <p className="match-disclaimer">
        Similarity is a review aid only and does not confirm identity. Human verification is required.
      </p>
    </article>
  )
}
