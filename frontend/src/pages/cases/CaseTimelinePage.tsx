import { demoCase } from '../../data/demoData'
import CaseStatus from '../../components/cases/CaseStatus'
import CaseTimeline from '../../components/cases/CaseTimeline'
import PagePlaceholder from '../../components/common/PagePlaceholder'
import { useParams } from 'react-router-dom'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { demoMissingCases } from '../../data/demoRecords'
import { MISSING_CASES_KEY } from '../../data/storageKeys'
import { useAuth } from '../../hooks/useAuth'
import EmptyState from '../../components/common/EmptyState'
import PageContainer from '../../components/layout/PageContainer'

export default function CaseTimelinePage() {
  const { caseId } = useParams()
  const { session } = useAuth()
  const [cases] = useLocalStorage(MISSING_CASES_KEY, demoMissingCases)
  const caseRecord = cases.find((record) =>
    record.id === caseId &&
    record.reporterEmail.toLocaleLowerCase() === session?.user.email.toLocaleLowerCase(),
  )
  if (!caseRecord) {
    return (
      <PageContainer role="searcher">
        <EmptyState title="Case not available" description="This case is not associated with your family account." />
      </PageContainer>
    )
  }
  const caseTitle = caseRecord?.profile.fullName ?? demoCase.missingPerson.fullName
  const status = caseRecord?.status ?? demoCase.status
  const updates = caseRecord?.updates ?? demoCase.updates

  return (
    <PagePlaceholder
      title="Case timeline"
      description="A chronological view of updates shared with the response network."
      actionLabel="Back to family space"
      actionTo="/family"
    >
      <div className="embedded-demo">
        <div className="case-detail-heading">
          <div><span className="eyebrow">{caseId ?? demoCase.id}</span><h2>{caseTitle}</h2></div>
          <CaseStatus status={status} />
        </div>
        <CaseTimeline updates={updates} />
      </div>
    </PagePlaceholder>
  )
}
