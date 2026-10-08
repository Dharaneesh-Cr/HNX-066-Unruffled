import { useEffect, useState } from 'react'
import MatchCard from '../../components/matching/MatchCard'
import LoadingState from '../../components/common/LoadingState'
import PagePlaceholder from '../../components/common/PagePlaceholder'
import type { CandidateMatch } from '../../types'
import { getDemoCandidateMatches } from '../../services/matchingService'

export default function AIMatch() {
  const [candidates, setCandidates] = useState<CandidateMatch[] | null>(null)

  useEffect(() => {
    let active = true
    getDemoCandidateMatches('SH-2026-00124')
      .then((results) => {
        if (active) setCandidates(results)
      })
      .catch((error: unknown) => {
        console.error('Unable to load demo candidate data.', error)
        if (active) setCandidates([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <PagePlaceholder
      title="Candidate review"
      description="A possible candidate has been added to the fictional demo case. Similarity is a review aid and never confirms identity."
      actionLabel="Back to Finder home"
      actionTo="/finder"
    >
      <div className="embedded-demo">
        <span className="eyebrow">Case SH-2026-00124 · Arun Kumar</span>
        {candidates === null ? (
          <LoadingState label="Loading demo candidate" />
        ) : candidates.length > 0 ? (
          candidates.map((candidate) => <MatchCard candidate={candidate} key={candidate.id} />)
        ) : (
          <p className="inline-notice">No demo candidate is available for this case.</p>
        )}
      </div>
    </PagePlaceholder>
  )
}
