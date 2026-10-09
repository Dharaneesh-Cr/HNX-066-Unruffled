import { ArrowLeft, HeartHandshake } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import LoginExperience from '../../components/auth/LoginExperience'
import { registerFinderOrganization } from '../../services/api'

const organizationTypes = [
  ['HOSPITAL', 'Hospital'],
  ['SHELTER', 'Shelter'],
  ['RESCUE_CENTER', 'Rescue center'],
  ['RELIEF_CAMP', 'Relief camp'],
  ['NGO', 'NGO'],
  ['EMERGENCY_RESPONSE', 'Emergency response'],
  ['OTHER', 'Other'],
] as const

export default function FinderOrganizationRegister() {
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
      const result = await registerFinderOrganization({
        organizationName: String(form.get('organizationName') ?? '').trim(),
        organizationType: String(form.get('organizationType') ?? ''),
        contactPersonName: String(form.get('contactPersonName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        location: String(form.get('location') ?? '').trim(),
        password,
        confirmPassword,
      })
      const confirmation = result.emailConfirmationRequired
        ? ' Confirm your email before signing in.'
        : ''
      const approval = result.approvalStatus
        ? ` Organization status: ${result.approvalStatus.toLowerCase()}.`
        : ''
      setSuccess(`${result.message}${approval}${confirmation}`)
      formElement.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit organization registration.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginExperience portal="finder" reassurance="Organization access is reviewed before sensitive records are available.">
      <section className="login-panel" aria-labelledby="finder-register-heading">
        <Link className="back-portal-link" to="/finder/login">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Finder Login
        </Link>
        <Link aria-label="Sahayaa home" className="login-brand" to="/">
          <span className="entry-brand-mark" aria-hidden="true"><HeartHandshake size={22} /></span>
          <span>SAHAYAA</span>
        </Link>
        <p className="login-eyebrow">Finder Portal · Organization application</p>
        <h1 id="finder-register-heading">Register your organization</h1>
        <p className="login-subheading">
          New organizations are pending review and cannot access sensitive records before approval.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="org-name">Organization name</label>
          <input autoComplete="organization" id="org-name" maxLength={200} name="organizationName" required />
          <label htmlFor="org-type">Organization type</label>
          <select defaultValue="" id="org-type" name="organizationType" required>
            <option disabled value="">Select organization type</option>
            {organizationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label htmlFor="org-contact-name">Contact person's name</label>
          <input autoComplete="name" id="org-contact-name" maxLength={200} name="contactPersonName" required />
          <label htmlFor="org-email">Work email</label>
          <input autoComplete="email" id="org-email" maxLength={320} name="email" required type="email" />
          <label htmlFor="org-phone">Phone</label>
          <input autoComplete="tel" id="org-phone" maxLength={40} name="phone" required type="tel" />
          <label htmlFor="org-location">Location</label>
          <input autoComplete="street-address" id="org-location" maxLength={500} name="location" required />
          <label htmlFor="org-password">Password</label>
          <input autoComplete="new-password" id="org-password" minLength={8} name="password" required type="password" />
          <label htmlFor="org-confirm-password">Confirm password</label>
          <input autoComplete="new-password" id="org-confirm-password" minLength={8} name="confirmPassword" required type="password" />
          <button className="button button-primary login-submit" disabled={submitting} type="submit">
            {submitting ? 'Submitting application…' : 'Register organization'}
          </button>
        </form>

        {error && <p className="login-notice" role="alert">{error}</p>}
        {success && <p className="login-notice" role="status">{success}</p>}
        <p className="login-demo-note">
          New organizations are pending until a local administrator approves them. Passwords are stored as one-way hashes, not plaintext.
        </p>
      </section>
    </LoginExperience>
  )
}
