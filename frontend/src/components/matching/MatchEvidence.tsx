import { Check, CircleHelp } from 'lucide-react'

export default function MatchEvidence({ evidence }: { evidence: string[] }) {
  return (
    <ul className="evidence-list" aria-label="Candidate review details">
      {evidence.map((item, index) => (
        <li key={item}>
          {index < 2 ? (
            <Check className="evidence-icon evidence-positive" size={16} aria-hidden="true" />
          ) : (
            <CircleHelp className="evidence-icon evidence-review" size={16} aria-hidden="true" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
