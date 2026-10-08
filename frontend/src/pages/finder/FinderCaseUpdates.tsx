import { Activity, Bell, Clock3, UserRoundCheck } from 'lucide-react'
import PageContainer from '../../components/layout/PageContainer'
import CaseTimeline from '../../components/cases/CaseTimeline'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { AFFECTED_RECORDS_KEY, MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { createDemoCandidateMatches } from '../../services/matchingService'
import type { AffectedPersonRecord, CandidateMatch, CaseUpdate, MissingPersonCase } from '../../types'

export default function FinderCaseUpdates() {
  const [missingCases] = useLocalStorage<MissingPersonCase[]>(MISSING_CASES_KEY, demoMissingCases)
  const [affectedRecords] = useLocalStorage<AffectedPersonRecord[]>(AFFECTED_RECORDS_KEY, demoAffectedRecords)
  const [matches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )
  const updates: CaseUpdate[] = [
    ...missingCases.flatMap((record) => record.updates),
    ...affectedRecords.map((record): CaseUpdate => ({
      id: `registered-${record.id}`,
      title: 'Affected person registered',
      description: `${record.id} was registered by ${record.organizationName}.`,
      timestamp: record.registeredAt,
      actor: record.organizationName,
    })),
    ...matches.map((match): CaseUpdate => ({
      id: `candidate-${match.id}`,
      title: 'AI candidate generated for human verification',
      description: `A ${match.similarityPercent}% candidate similarity was prepared for human review. This is not identity confirmation.`,
      timestamp: match.createdAt ?? match.lastUpdatedAt,
      actor: 'Sahayaa demo matching service',
    })),
  ].sort((first, second) => first.timestamp.localeCompare(second.timestamp))

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-updates-title">
        <p className="portal-dashboard-eyebrow"><Activity size={16} /> Finder Portal · Activity log</p>
        <h1 id="finder-updates-title">Case Updates</h1>
        <p className="portal-dashboard-intro">
          Timeline of fictional registration and candidate review activity across the authorized Finder workspace.
        </p>
        <div className="updates-key">
          <span><Clock3 size={15} /> Most recent activity appears last</span>
          <span><UserRoundCheck size={15} /> Human decisions are clearly attributed</span>
          <span><Bell size={15} /> Family notifications are initiated only after review</span>
        </div>
        <div className="updates-timeline">
          <CaseTimeline updates={updates} />
        </div>
      </section>
    </PageContainer>
  )
}
