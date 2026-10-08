import type { CaseStatus } from '../../types'
import { getCaseStatusLabel, getCaseStatusTone } from '../../utils/statusHelpers'

export default function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`status-badge tone-${getCaseStatusTone(status)}`}>
      <span aria-hidden="true" className="status-dot" />
      {getCaseStatusLabel(status)}
    </span>
  )
}
