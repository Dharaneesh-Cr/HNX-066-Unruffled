import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../../utils/formatters'
import type { MissingPersonCase } from '../../types'
import StatusBadge from '../common/StatusBadge'

export default function MissingCaseCard({ caseRecord }: { caseRecord: MissingPersonCase }) {
  return (
    <article className="registered-person-card">
      {caseRecord.profile.photo && (
        <img
          alt={`Photo of ${caseRecord.profile.fullName ?? 'missing person'}`}
          className="record-photo"
          src={caseRecord.profile.photo}
        />
      )}
      <Link className="registered-person-body registered-person-link" to={`/timeline/${caseRecord.id}`}>
        <div className="record-card-heading">
          <span className="case-id">{caseRecord.id}</span>
          <StatusBadge status={caseRecord.status} />
        </div>
        <h3>{caseRecord.profile.fullName ?? caseRecord.profile.alias ?? 'Name not provided'}</h3>
        <p className="record-meta">
          Approx. age {caseRecord.profile.age ?? 'Unknown'} · {caseRecord.profile.gender ?? 'Gender not recorded'}
        </p>
        <p className="record-meta"><MapPin size={14} /> {caseRecord.profile.lastSeenLocation ?? 'Location not provided'}</p>
        <p className="record-meta">Reported {formatDate(caseRecord.createdAt)}</p>
      </Link>
    </article>
  )
}
