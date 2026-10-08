import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Case } from '../../types'
import { formatDate } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'

export default function CaseCard({ caseData }: { caseData: Case }) {
  return (
    <article className="case-card">
      <div className="case-card-top">
        <span className="case-id">{caseData.id}</span>
        <StatusBadge status={caseData.status} />
      </div>
      <h2>{caseData.missingPerson.fullName}</h2>
      <p className="case-card-location">
        <MapPin size={15} aria-hidden="true" />
        {caseData.missingPerson.lastSeenLocation.city},{' '}
        {caseData.missingPerson.lastSeenLocation.region}
      </p>
      <div className="case-card-bottom">
        <span>Reported {formatDate(caseData.createdAt)}</span>
        <Link to={`/timeline/${caseData.id}`}>
          View case <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
