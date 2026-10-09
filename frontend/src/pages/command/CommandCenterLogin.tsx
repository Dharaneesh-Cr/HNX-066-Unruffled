import { ArrowLeft, HeartHandshake } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoginExperience from '../../components/auth/LoginExperience'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CommandCenterLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const email = String(values.get('email') ?? '').trim()
    const password = String(values.get('password') ?? '')
    if (!emailPattern.test(email) || !password) {
      setNotice('Enter a valid email address and password.')
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      await login(email, password, 'command_center')
      navigate('/command', { replace: true })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginExperience
      portal="finder"
      reassurance="Authorized coordinators review candidate matches and support reunification."
    >
      <section className="login-panel" aria-labelledby="command-login-heading">
        <Link className="back-portal-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Portal Selection
        </Link>
        <Link aria-label="Sahayaa home" className="login-brand" to="/">
          <span className="entry-brand-mark" aria-hidden="true"><HeartHandshake size={22} /></span>
          <span>SAHAYAA</span>
        </Link>
        <p className="login-eyebrow">Command Center</p>
        <h1 id="command-login-heading">Coordinator sign in</h1>
        <p className="login-subheading">Use the account provisioned by the local administrator.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="command-email">Email</label>
          <input autoComplete="username" id="command-email" name="email" type="email" required />
          <label htmlFor="command-password">Password</label>
          <input autoComplete="current-password" id="command-password" name="password" type="password" required />
          <button className="button button-primary login-submit" disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Secure Login'}
          </button>
        </form>
        {notice && <p className="login-notice" role="alert">{notice}</p>}
      </section>
    </LoginExperience>
  )
}
