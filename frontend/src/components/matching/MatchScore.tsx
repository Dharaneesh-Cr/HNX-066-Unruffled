export default function MatchScore({ score }: { score: number }) {
  return (
    <div className="match-score" aria-label={`${score}% Candidate Similarity`}>
      <span className="match-score-value">{score}%</span>
      <span className="match-score-label">Candidate Similarity</span>
    </div>
  )
}
