import { ArrowLeft, HeartHandshake, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoginExperience from '../../components/auth/LoginExperience'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function FinderLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const formData = new FormData(formElement)
    const organizationName = String(formData.get('organizationName') ?? '').trim()
    const organizationType = String(formData.get('organizationType') ?? '')
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const nextErrors: Record<string, string> = {}

    if (!organizationName) nextErrors.organizationName = 'Organization name is required.'
    if (!organizationType) nextErrors.organizationType = 'Organization type is required.'
    if (!email) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(email)) nextErrors.email = 'Please enter a valid email address.'
    if (!password) nextErrors.password = 'Password is required.'

    setErrors(nextErrors)
    setNotice('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await login(email, password, 'finder', {
        name: organizationName,
        type: organizationType,
      })
      formElement.reset()
      navigate('/finder', { replace: true })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginExperience
      portal="finder"
      reassurance="Authorized organizations working together for faster reunification."
    >
      <section
        className="login-panel"
        aria-labelledby="finder-login-heading"
        style={{ maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', overscrollBehavior: 'contain' }}
      >
        <Link className="back-portal-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Portal Selection
        </Link>
        <Link aria-label="Sahayaa home" className="login-brand" to="/">
          <span className="entry-brand-mark" aria-hidden="true"><HeartHandshake size={22} /></span>
          <span>SAHAYAA</span>
        </Link>
        <p className="login-eyebrow">Finder Portal · Organization access</p>
        <h1 id="finder-login-heading">Welcome to the Sahayaa Network</h1>
        <p className="login-subheading">Together, we can help reconnect families.</p>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor="finder-organization-name">Organization Name</label>
          <input
            aria-describedby={errors.organizationName ? 'finder-organization-name-error' : undefined}
            aria-invalid={Boolean(errors.organizationName)}
            autoComplete="organization"
            id="finder-organization-name"
            name="organizationName"
            placeholder="Enter your organization name"
            required
            type="text"
          />
          {errors.organizationName && (
            <span className="field-error" id="finder-organization-name-error" role="alert">
              {errors.organizationName}
            </span>
          )}
          <label htmlFor="finder-organization-type">Organization Type</label>
          <select
            aria-describedby={errors.organizationType ? 'finder-organization-type-error' : undefined}
            aria-invalid={Boolean(errors.organizationType)}
            defaultValue=""
            id="finder-organization-type"
            name="organizationType"
            required
          >
            <option disabled value="">Select organization type</option>
            <option value="HOSPITAL">Hospital</option>
            <option value="SHELTER">Shelter</option>
            <option value="RESCUE_CENTER">Rescue Center</option>
            <option value="RELIEF_CAMP">Relief Camp</option>
            <option value="NGO">NGO</option>
            <option value="EMERGENCY_RESPONSE">Emergency Response</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.organizationType && (
            <span className="field-error" id="finder-organization-type-error" role="alert">
              {errors.organizationType}
            </span>
          )}
          <label htmlFor="finder-email">Work email</label>
          <input
            autoComplete="username"
            aria-describedby={errors.email ? 'finder-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            id="finder-email"
            name="email"
            placeholder="name@organization.org"
            required
            type="email"
          />
          {errors.email && <span className="field-error" id="finder-email-error" role="alert">{errors.email}</span>}
          {errors.identity && <span className="field-error" id="finder-identity-error" role="alert">{errors.identity}</span>}
          <label htmlFor="finder-password">Password</label>
          <input
            autoComplete="current-password"
            aria-describedby={errors.password ? 'finder-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            id="finder-password"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
          {errors.password && <span className="field-error" id="finder-password-error" role="alert">{errors.password}</span>}
          <button className="button button-primary login-submit" disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Secure Login'}
          </button>
        </form>

        <p className="authorized-notice">
          <LockKeyhole size={15} aria-hidden="true" />
          Authorized organizations only
        </p>
        <p className="login-demo-note">
          Your organization name and type are checked against its registered profile. Authentication still requires the registered email and password.
        </p>
        <div className="login-secondary-actions">
          <Link to="/finder/register-organization">Register an organization</Link>
        </div>
        {notice && <p className="login-notice" role="alert">{notice}</p>}
        <p className="login-demo-note">Sign in uses your local Sahayaa account. Your password is stored as a secure one-way hash.</p>
      </section>
    </LoginExperience>
  )
}
