import type { CaseStatus as CaseStatusType } from '../../types'
import StatusBadge from '../common/StatusBadge'

export default function CaseStatus({ status }: { status: CaseStatusType }) {
  return (
    <div className="case-status" aria-label={`Case status: ${status.toLowerCase().replaceAll('_', ' ')}`}>
      <span className="case-status-label">Current status</span>
      <StatusBadge status={status} />
    </div>
  )
}
