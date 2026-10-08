import { LockKeyhole } from 'lucide-react'
import PagePlaceholder from '../components/common/PagePlaceholder'

export default function Privacy() {
  return (
    <PagePlaceholder
      title="Privacy & trust"
      description="Personal information deserves care. This frontend preview uses fictional demo data only and is not connected to a backend."
      actionLabel="Back to home"
      actionTo="/"
    >
      <p className="offline-indicator"><LockKeyhole size={17} aria-hidden="true" /> No real reports or personal data are collected here.</p>
    </PagePlaceholder>
  )
}
