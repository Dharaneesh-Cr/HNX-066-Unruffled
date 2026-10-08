import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  detail?: string
}

export default function StatCard({ label, value, icon, detail }: StatCardProps) {
  return (
    <article className="stat-card">
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {detail && <p className="stat-detail">{detail}</p>}
    </article>
  )
}
