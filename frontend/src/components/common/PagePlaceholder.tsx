import type { ReactNode } from 'react'
import { ArrowRight, HeartHandshake, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../layout/PageContainer'
import Button from './Button'

interface PagePlaceholderProps {
  title: string
  description: string
  children?: ReactNode
  actionLabel?: string
  actionTo?: string
}

export default function PagePlaceholder({
  title,
  description,
  children,
  actionLabel,
  actionTo,
}: PagePlaceholderProps) {
  return (
    <PageContainer>
      <section className="placeholder-card" aria-labelledby="page-title">
        <div className="placeholder-mark" aria-hidden="true">
          <HeartHandshake size={25} strokeWidth={1.8} />
        </div>
        <p className="eyebrow">Sahayaa · Together, we find a way</p>
        <h1 id="page-title">{title}</h1>
        <p className="placeholder-description">{description}</p>
        {children}
        <div className="placeholder-actions">
          {actionLabel && actionTo ? (
            <Button to={actionTo}>
              {actionLabel}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : (
            <Button to="/" variant="secondary">
              <Home size={16} aria-hidden="true" />
              Back to home
            </Button>
          )}
          <Link className="text-link" to="/">
            Sahayaa home
          </Link>
        </div>
        <p className="placeholder-note">
          This is an early frontend preview. Detailed tools are coming soon.
        </p>
      </section>
    </PageContainer>
  )
}
