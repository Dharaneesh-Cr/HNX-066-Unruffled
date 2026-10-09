import { useEffect, useState } from 'react'
import { Activity, Bell, Clock3, UserRoundCheck } from 'lucide-react'
import PageContainer from '../../components/layout/PageContainer'
import CaseTimeline from '../../components/cases/CaseTimeline'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import { useAuth } from '../../hooks/useAuth'
import { listMissingCasesForFinder } from '../../services/api'
import type { CaseUpdate } from '../../types'

export default function FinderCaseUpdates() {
  const { session } = useAuth()
  const [updates, setUpdates] = useState<CaseUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!session) return
    void listMissingCasesForFinder(session.accessToken)
      .then((cases) => {
        if (!cancelled) {
          setUpdates(
            cases.flatMap((record) => record.updates.map((update) => ({
              ...update,
              title: `${record.profile.fullName ?? 'Missing-person case'}: ${update.title}`,
            }))).sort((first, second) => first.timestamp.localeCompare(second.timestamp)),
          )
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load persisted case updates.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-updates-title">
        <p className="portal-dashboard-eyebrow"><Activity size={16} /> Finder Portal · Activity log</p>
        <h1 id="finder-updates-title">Case Updates</h1>
        <p className="portal-dashboard-intro">
          Persisted case status and human-review updates shared with the response network.
        </p>
        <div className="updates-key">
          <span><Clock3 size={15} /> Most recent activity appears last</span>
          <span><UserRoundCheck size={15} /> Human decisions are clearly attributed</span>
          <span><Bell size={15} /> Family notifications are initiated only after review</span>
        </div>
        {loading ? (
          <LoadingState label="Loading saved case updates" />
        ) : error ? (
          <p className="person-form-error" role="alert">{error}</p>
        ) : updates.length ? (
          <div className="updates-timeline"><CaseTimeline updates={updates} /></div>
        ) : (
          <EmptyState title="No case updates yet" description="Human-review decisions and case status updates will appear here after they are saved." />
        )}
      </section>
    </PageContainer>
  )
}
