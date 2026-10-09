import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CaseTimeline from '../../components/cases/CaseTimeline'
import CaseStatus from '../../components/cases/CaseStatus'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import PageContainer from '../../components/layout/PageContainer'
import { useAuth } from '../../hooks/useAuth'
import { getMissingCase } from '../../services/api'
import type { MissingPersonCase } from '../../types'

export default function CaseTimelinePage() {
  const { caseId } = useParams()
  const { session } = useAuth()
  const [caseRecord, setCaseRecord] = useState<MissingPersonCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!session || !caseId) return
    void getMissingCase(session.accessToken, caseId)
      .then((record) => {
        if (!cancelled) setCaseRecord(record)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load this case.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [caseId, session])

  return (
    <PageContainer role="searcher">
      <section className="portal-dashboard" aria-labelledby="case-timeline-title">
        <p className="portal-dashboard-eyebrow">Searcher Portal · Case timeline</p>
        {loading ? (
          <LoadingState label="Loading saved case updates" />
        ) : error ? (
          <p className="person-form-error" role="alert">{error}</p>
        ) : !caseRecord ? (
          <EmptyState title="Case not available" description="This case is not associated with your account." />
        ) : (
          <>
            <div className="case-detail-heading">
              <div>
                <span className="eyebrow">{caseRecord.id}</span>
                <h1 id="case-timeline-title">{caseRecord.profile.fullName ?? caseRecord.profile.alias ?? 'Missing-person case'}</h1>
              </div>
              <CaseStatus status={caseRecord.status} />
            </div>
            <CaseTimeline updates={caseRecord.updates} />
          </>
        )}
      </section>
    </PageContainer>
  )
}
