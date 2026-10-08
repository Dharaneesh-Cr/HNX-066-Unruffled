import { demoCase, demoNotifications } from '../../data/demoData'
import StatCard from '../../components/common/StatCard'
import PagePlaceholder from '../../components/common/PagePlaceholder'
import { Bell, ClipboardList, UsersRound } from 'lucide-react'

export default function CommandCenter() {
  return (
    <PagePlaceholder
      title="Command center"
      description="A coordinated overview for local response teams. The full operational dashboard is not part of this preview."
      actionLabel="Review demo case"
      actionTo={`/timeline/${demoCase.id}`}
    >
      <div className="stat-grid embedded-demo">
        <StatCard label="Demo case" value="01" icon={<ClipboardList size={18} />} detail="Fictional records only" />
        <StatCard label="Community roles" value="03" icon={<UsersRound size={18} />} detail="Family, relief, coordinator" />
        <StatCard label="Notifications" value={demoNotifications.length} icon={<Bell size={18} />} detail="Demo activity" />
      </div>
    </PagePlaceholder>
  )
}
