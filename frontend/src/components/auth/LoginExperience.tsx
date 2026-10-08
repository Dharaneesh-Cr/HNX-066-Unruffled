import {
  Building2,
  Heart,
  HeartHandshake,
  Network,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './LoginExperience.css'

export type LoginPortal = 'searcher' | 'finder'

interface LoginExperienceProps {
  portal: LoginPortal
  reassurance: string
  children: ReactNode
}

export default function LoginExperience({
  portal,
  reassurance,
  children,
}: LoginExperienceProps) {
  const isSearcher = portal === 'searcher'

  return (
    <main className={`login-experience login-experience-${portal}`}>
      <aside className="login-story" aria-label={`${portal} portal welcome`}>
        <Link className="login-story-brand" to="/" aria-label="Sahayaa">
          <span><HeartHandshake size={21} aria-hidden="true" /></span>
          SAHAYAA
        </Link>
        <div className="login-story-content">
          <p className="login-story-kicker">
            {isSearcher ? 'A community beside you' : 'One trusted response network'}
          </p>
          <h2>
            {isSearcher
              ? 'Every search is a step toward reunion.'
              : 'Together, we can help reconnect families.'}
          </h2>
          <p className="login-story-copy">{reassurance}</p>

          <div
            aria-label={isSearcher ? 'Family, care, and connection' : 'Connected response organizations'}
            className={`connection-illustration connection-illustration-${portal}`}
            role="img"
          >
            <span className="illustration-orb illustration-orb-one" />
            <span className="illustration-orb illustration-orb-two" />
            <span className="connection-line connection-line-one" />
            <span className="connection-line connection-line-two" />
            <span className="connection-line connection-line-three" />
            <span className="connection-node connection-node-left">
              {isSearcher ? <UsersRound size={24} /> : <Building2 size={23} />}
            </span>
            <span className="connection-node connection-node-center">
              {isSearcher ? <Heart size={26} /> : <Network size={25} />}
            </span>
            <span className="connection-node connection-node-right">
              {isSearcher ? <HeartHandshake size={24} /> : <ShieldCheck size={23} />}
            </span>
            <span className="connection-caption">
              {isSearcher ? 'Care · Community · Connection' : 'Organizations · Coordination · Care'}
            </span>
          </div>
        </div>
        <p className="login-story-footnote">
          <ShieldCheck size={15} aria-hidden="true" />
          A calm, privacy-minded demo experience
        </p>
      </aside>
      <section className="login-form-area" aria-labelledby={`${portal}-login-heading`}>
        {children}
      </section>
    </main>
  )
}
