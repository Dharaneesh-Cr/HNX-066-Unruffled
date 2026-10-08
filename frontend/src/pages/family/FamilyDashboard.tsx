import { demoCase } from '../../data/demoData'
import CaseCard from '../../components/cases/CaseCard'
import PagePlaceholder from '../../components/common/PagePlaceholder'

export default function FamilyDashboard() {
  return (
    <PagePlaceholder
      title="Family space"
      description="A calm place for families to share a report and follow updates from their community response team."
      actionLabel="Report a missing person"
      actionTo="/family/report"
    >
      <div className="embedded-demo">
        <span className="eyebrow">Fictional demo case</span>
        <CaseCard caseData={demoCase} />
      </div>
    </PagePlaceholder>
  )
}
