import { demoNotifications } from '../../data/demoData'
import NotificationCard from '../../components/notifications/NotificationCard'
import PagePlaceholder from '../../components/common/PagePlaceholder'
import { useAuth } from '../../hooks/useAuth'
import EmptyState from '../../components/common/EmptyState'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { demoMissingCases } from '../../data/demoRecords'
import { MISSING_CASES_KEY } from '../../data/storageKeys'

export default function Notifications() {
  const { session } = useAuth()
  const isFinder = session?.portal === 'finder'
  const [allCases] = useLocalStorage(MISSING_CASES_KEY, demoMissingCases)
  const ownCaseIds = new Set(allCases
    .filter((record) => record.reporterEmail.toLocaleLowerCase() === session?.user.email.toLocaleLowerCase())
    .map((record) => record.id))
  const notifications = isFinder
    ? demoNotifications
    : demoNotifications.filter((notification) =>
      !notification.caseId || ownCaseIds.has(notification.caseId),
    )
  return (
    <PagePlaceholder
      title="Notifications"
      description="Updates from the Sahayaa demo workspace, collected in one place."
      actionLabel={isFinder ? 'Back to Finder home' : 'Back to Searcher home'}
      actionTo={isFinder ? '/finder' : '/searcher'}
    >
      {notifications.length ? (
        <div className="embedded-demo notification-list">
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <div className="embedded-demo">
          <EmptyState title="No notifications yet" description="Updates related to your family cases will appear here." />
        </div>
      )}
    </PagePlaceholder>
  )
}
