import { Building2, Heart, HeartHandshake, Hospital, Search, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import HandshakeAnimation from '../components/common/HandshakeAnimation'
import './Landing.css'

export default function Landing() {
  return (
    <main className="portal-entry">
      <header className="entry-header">
        <Link aria-label="Sahayaa home" className="entry-brand" to="/">
          <span className="entry-brand-mark" aria-hidden="true">
            <HeartHandshake size={22} />
          </span>
          <span>SAHAYAA</span>
        </Link>
        <span className="entry-secure"><ShieldCheck size={15} aria-hidden="true" /> Human-centered response</span>
      </header>

      <section className="entry-content" aria-labelledby="portal-heading">
        <div className="entry-intro">
          <p className="entry-tagline">Helping families find their loved ones.</p>
          <h1 id="portal-heading">Find. Connect. Reunite.</h1>
          <p className="entry-description">
            Sahayaa brings families and authorized responders together to help reunite people after disasters.
          </p>
        </div>

        <div className="entry-handshake">
          <HandshakeAnimation />
        </div>

        <div className="portal-options">
          <article className="portal-option searcher-option">
            <div className="portal-icon-group" aria-hidden="true">
              <span className="portal-icon-primary"><Search size={25} /></span>
              <span><Users size={18} /></span>
              <span><Heart size={17} /></span>
            </div>
            <p className="portal-audience">Family / Relative</p>
            <h2>SEARCHER</h2>
            <p className="portal-subtitle">I’m looking for someone missing</p>
            <p className="portal-description">
              For family members and relatives searching for a missing loved one.
            </p>
            <Link className="button button-primary portal-button" to="/searcher/login">
              Continue as Searcher <Search size={17} aria-hidden="true" />
            </Link>
          </article>

          <article className="portal-option finder-option">
            <div className="portal-icon-group" aria-hidden="true">
              <span className="portal-icon-primary"><ShieldCheck size={25} /></span>
              <span><Building2 size={18} /></span>
              <span><Hospital size={17} /></span>
            </div>
            <p className="portal-audience">Shelter / Hospital / Rescue / NGO</p>
            <h2>FINDER</h2>
            <p className="portal-subtitle">I’m helping find and reunite people</p>
            <p className="portal-description">
              For authorized shelters, hospitals, rescue centers, NGOs and emergency response teams.
            </p>
            <Link className="button button-primary portal-button" to="/finder/login">
              Continue as Finder <ShieldCheck size={17} aria-hidden="true" />
            </Link>
          </article>
        </div>

        <p className="entry-footnote">
          <ShieldCheck size={14} aria-hidden="true" />
          AI assists with candidate discovery. Human verification is always required.
        </p>
      </section>
    </main>
  )
}
