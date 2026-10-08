import { Building2, ShieldCheck } from 'lucide-react'
import PageContainer from '../../components/layout/PageContainer'

export default function FinderProfile() {
  return (
    <PageContainer role="finder">
      <section className="portal-dashboard" aria-labelledby="finder-profile-title">
        <p className="portal-dashboard-eyebrow"><Building2 size={16} /> Finder Portal</p>
        <h1 id="finder-profile-title">Organization Profile</h1>
        <p className="portal-dashboard-intro">
          Organization details associated with this frontend demo session.
        </p>
        <article className="organization-summary finder-profile-card">
          <span className="organization-icon" aria-hidden="true"><Building2 size={22} /></span>
          <div className="organization-info">
            <p className="eyebrow">Organization</p>
            <h2>Government Hospital - Zone A</h2>
            <div className="organization-meta">
              <span><strong>Organization Type</strong>Hospital</span>
              <span><strong>Role</strong>Medical Responder</span>
              <span><strong>Status</strong>Online</span>
            </div>
          </div>
        </article>
        <p className="finder-safety-note">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>This profile uses fictional demo information and is not connected to an organization directory.</span>
        </p>
      </section>
    </PageContainer>
  )
}
