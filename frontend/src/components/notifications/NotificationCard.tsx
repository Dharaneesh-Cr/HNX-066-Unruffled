import { Bell, CheckCheck, HeartHandshake, Sparkles } from 'lucide-react'
import type { Notification } from '../../types'
import { formatDateTime } from '../../utils/formatters'

const icons = {
  CASE_UPDATE: HeartHandshake,
  MATCH: Sparkles,
  SYSTEM: Bell,
}

export default function NotificationCard({
  notification,
}: {
  notification: Notification
}) {
  const Icon = icons[notification.category]
  return (
    <article className={`notification-card${notification.read ? '' : ' unread'}`}>
      <span aria-hidden="true" className="notification-icon"><Icon size={18} /></span>
      <div className="notification-copy">
        <div className="notification-title-row">
          <h2>{notification.title}</h2>
          {notification.read && <CheckCheck size={15} aria-label="Read" />}
        </div>
        <p>{notification.message}</p>
        <time dateTime={notification.createdAt}>{formatDateTime(notification.createdAt)}</time>
      </div>
      {!notification.read && <span aria-label="Unread" className="unread-dot" />}
    </article>
  )
}
