import { ArrowLeft, HeartHandshake, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoginExperience from '../../components/auth/LoginExperience'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const organizationTypes = [
  'Hospital',
  'Shelter',
  'Rescue Center',
  'Relief Camp',
  'NGO',
  'Emergency Response',
]

export default function FinderLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const organizationType = String(formData.get('organizationType') ?? '')
    const organization = String(formData.get('organization') ?? '').trim()
    const identity = String(formData.get('identity') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const nextErrors: Record<string, string> = {}

    if (!organizationType) nextErrors.organizationType = 'Organization Type is required.'
    if (!organization) nextErrors.organization = 'Organization is required.'
    if (!identity) nextErrors.identity = 'Email or Employee ID is required.'
    else if (identity.includes('@') && !emailPattern.test(identity)) {
      nextErrors.identity = 'Please enter a valid email address or employee ID.'
    }
    if (!password) nextErrors.password = 'Password is required.'

    setErrors(nextErrors)
    setNotice('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      login({
        isAuthenticated: true,
        portal: 'finder',
        user: { name: 'Demo Finder', email: identity, role: 'RELIEF_WORKER' },
      })
      navigate('/finder', { replace: true })
    } catch (cause) {
      console.error('Unable to save the Finder demo session.', cause)
      setNotice('Unable to save the demo session. Check browser storage settings and try again.')
    }
  }

  return (
    <LoginExperience
      portal="finder"
      reassurance="Authorized organizations working together for faster reunification."
    >
      <section className="login-panel" aria-labelledby="finder-login-heading">
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
          <label htmlFor="finder-org-type">Organization Type</label>
          <select
            aria-describedby={errors.organizationType ? 'finder-type-error' : undefined}
            aria-invalid={Boolean(errors.organizationType)}
            defaultValue=""
            id="finder-org-type"
            name="organizationType"
          >
            <option disabled value="">Select organization type</option>
            {organizationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {errors.organizationType && <span className="field-error" id="finder-type-error" role="alert">{errors.organizationType}</span>}
          <label htmlFor="finder-organization">Organization</label>
          <input
            autoComplete="organization"
            aria-describedby={errors.organization ? 'finder-organization-error' : undefined}
            aria-invalid={Boolean(errors.organization)}
            id="finder-organization"
            name="organization"
            placeholder="Organization name"
          />
          {errors.organization && <span className="field-error" id="finder-organization-error" role="alert">{errors.organization}</span>}
          <label htmlFor="finder-identity">Email / Employee ID</label>
          <input
            autoComplete="username"
            aria-describedby={`finder-identity-help${errors.identity ? ' finder-identity-error' : ''}`}
            aria-invalid={Boolean(errors.identity)}
            id="finder-identity"
            name="identity"
            placeholder="Work email or employee ID"
            type="text"
          />
          <span className="field-hint" id="finder-identity-help">Enter a valid email address or your employee ID.</span>
          {errors.identity && <span className="field-error" id="finder-identity-error" role="alert">{errors.identity}</span>}
          <label htmlFor="finder-password">Password</label>
          <input
            autoComplete="current-password"
            aria-describedby={errors.password ? 'finder-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            id="finder-password"
            name="password"
            placeholder="Enter your password"
            type="password"
          />
          {errors.password && <span className="field-error" id="finder-password-error" role="alert">{errors.password}</span>}
          <button className="button button-primary login-submit" type="submit">Secure Login</button>
        </form>

        <p className="authorized-notice">
          <LockKeyhole size={15} aria-hidden="true" />
          Authorized organizations only
        </p>
        {notice && <p className="login-notice" role="alert">{notice}</p>}
        <p className="login-demo-note">Frontend demo only · No credentials are saved or verified.</p>
      </section>
    </LoginExperience>
  )
}
