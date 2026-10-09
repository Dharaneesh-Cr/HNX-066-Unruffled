import { ArrowLeft, HeartHandshake } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import LoginExperience from '../../components/auth/LoginExperience'
import { registerSearcher } from '../../services/api'

export default function SearcherRegister() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      setSuccess('')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const result = await registerSearcher({
        fullName: String(form.get('fullName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password,
        confirmPassword,
      })
      setSuccess(result.message)
      formElement.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginExperience portal="searcher" reassurance="A Sahayaa account keeps your family's reports private.">
      <section className="login-panel" aria-labelledby="searcher-register-heading">
        <Link className="back-portal-link" to="/searcher/login">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Searcher Login
        </Link>
        <Link aria-label="Sahayaa home" className="login-brand" to="/">
          <span className="entry-brand-mark" aria-hidden="true"><HeartHandshake size={22} /></span>
          <span>SAHAYAA</span>
        </Link>
        <p className="login-eyebrow">Searcher Portal</p>
        <h1 id="searcher-register-heading">Create a Searcher account</h1>
        <p className="login-subheading">Register with your own email to report and track cases.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="searcher-register-name">Your name</label>
          <input autoComplete="name" id="searcher-register-name" maxLength={200} name="fullName" required />
          <label htmlFor="searcher-register-email">Email</label>
          <input autoComplete="email" id="searcher-register-email" maxLength={320} name="email" required type="email" />
          <label htmlFor="searcher-register-password">Password</label>
          <input autoComplete="new-password" id="searcher-register-password" minLength={8} name="password" required type="password" />
          <label htmlFor="searcher-register-confirm">Confirm password</label>
          <input autoComplete="new-password" id="searcher-register-confirm" minLength={8} name="confirmPassword" required type="password" />
          <button className="button button-primary login-submit" disabled={submitting} type="submit">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {error && <p className="login-notice" role="alert">{error}</p>}
        {success && <p className="login-notice" role="status">{success}</p>}
        <p className="login-demo-note">
          Local accounts are available immediately after registration. Passwords are stored as one-way hashes, not plaintext.
        </p>
      </section>
    </LoginExperience>
  )
}
