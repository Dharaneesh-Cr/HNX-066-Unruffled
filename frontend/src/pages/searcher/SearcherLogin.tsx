import { ArrowLeft, HeartHandshake } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoginExperience from '../../components/auth/LoginExperience'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SearcherLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [notice, setNotice] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const nextErrors: Record<string, string> = {}

    if (!email) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(email)) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!password) nextErrors.password = 'Password is required.'

    setErrors(nextErrors)
    setNotice('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      login({
        isAuthenticated: true,
        portal: 'searcher',
        user: { name: 'Demo Searcher', email, role: 'FAMILY_MEMBER' },
      })
      navigate('/searcher', { replace: true })
    } catch (cause) {
      console.error('Unable to save the Searcher demo session.', cause)
      setNotice('Unable to save the demo session. Check browser storage settings and try again.')
    }
  }

  return (
    <LoginExperience
      portal="searcher"
      reassurance="Your search starts here. We're with you every step of the way."
    >
      <section className="login-panel" aria-labelledby="searcher-login-heading">
        <Link className="back-portal-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Portal Selection
        </Link>
        <Link aria-label="Sahayaa home" className="login-brand" to="/">
          <span className="entry-brand-mark" aria-hidden="true"><HeartHandshake size={22} /></span>
          <span>SAHAYAA</span>
        </Link>
        <p className="login-eyebrow">Searcher Portal</p>
        <h1 id="searcher-login-heading">Welcome back to Sahayaa</h1>
        <p className="login-subheading">Let's help bring your loved one home.</p>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor="searcher-identity">Email</label>
          <input
            autoComplete="username"
            id="searcher-identity"
            aria-describedby={errors.email ? 'searcher-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            name="email"
            placeholder="you@example.com"
            type="email"
          />
          {errors.email && <span className="field-error" id="searcher-email-error" role="alert">{errors.email}</span>}
          <label htmlFor="searcher-password">Password</label>
          <input
            autoComplete="current-password"
            id="searcher-password"
            aria-describedby={errors.password ? 'searcher-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            name="password"
            placeholder="Enter your password"
            type="password"
          />
          {errors.password && <span className="field-error" id="searcher-password-error" role="alert">{errors.password}</span>}
          <button className="button button-primary login-submit" type="submit">Log In</button>
        </form>

        <div className="login-secondary-actions">
          <button onClick={() => setNotice('Family account creation is not enabled in this frontend demo.')} type="button">
            Create Family Account
          </button>
          <button onClick={() => setNotice('Password recovery is not enabled in this frontend demo.')} type="button">
            Forgot Password?
          </button>
        </div>
        {notice && <p className="login-notice" role="alert">{notice}</p>}
        <p className="login-demo-note">Frontend demo only · No credentials are saved or verified.</p>
      </section>
    </LoginExperience>
  )
}
