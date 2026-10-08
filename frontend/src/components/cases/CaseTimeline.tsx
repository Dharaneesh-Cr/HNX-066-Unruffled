import { CheckCircle2, Circle } from 'lucide-react'
import type { CaseUpdate } from '../../types'
import { formatDateTime } from '../../utils/formatters'

export default function CaseTimeline({ updates }: { updates: CaseUpdate[] }) {
  return (
    <ol className="timeline">
      {updates.map((update, index) => (
        <li className="timeline-item" key={update.id}>
          <span aria-hidden="true" className="timeline-marker">
            {index === 0 ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </span>
          <div>
            <p className="timeline-title">{update.title}</p>
            <p className="timeline-description">{update.description}</p>
            <p className="timeline-meta">
              {update.actor} · <time dateTime={update.timestamp}>{formatDateTime(update.timestamp)}</time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
