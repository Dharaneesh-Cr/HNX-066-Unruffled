import { CloudOff } from 'lucide-react'
import PagePlaceholder from '../components/common/PagePlaceholder'

export default function Offline() {
  return (
    <PagePlaceholder
      title="Offline support"
      description="Sahayaa is designed with connectivity challenges in mind. Offline workflows are planned for a future release."
      actionLabel="Back to home"
      actionTo="/"
    >
      <p className="offline-indicator"><CloudOff size={17} aria-hidden="true" /> Offline tools are not enabled in this preview.</p>
    </PagePlaceholder>
  )
}
