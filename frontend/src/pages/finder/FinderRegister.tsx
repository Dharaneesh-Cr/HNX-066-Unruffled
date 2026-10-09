import { useNavigate } from 'react-router-dom'
import PageContainer from '../../components/layout/PageContainer'
import PersonRegistrationForm from '../../components/person/PersonRegistrationForm'
import { useAuth } from '../../hooks/useAuth'
import { createAffectedPerson, uploadPhoto } from '../../services/api'
import type { AffectedPersonCreateInput, RegistrationInput } from '../../types'

export default function FinderRegister() {
  const navigate = useNavigate()
  const { session } = useAuth()

  async function saveAffectedPerson(input: RegistrationInput) {
    if (!session) throw new Error('Your session has expired. Please sign in again.')
    if (!('foundDate' in input)) throw new Error('Invalid affected-person registration.')
    const affectedPerson: AffectedPersonCreateInput = input
    const { photoFile, ...payload } = affectedPerson
    if (photoFile) {
      const photo = await uploadPhoto(photoFile, session.accessToken)
      payload.profile = { ...payload.profile, photoPath: photo.photoPath }
    }
    await createAffectedPerson(payload, session.accessToken)
    navigate('/finder/records')
  }

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard form-page" aria-labelledby="register-person-title">
        <p className="portal-dashboard-eyebrow">Finder Portal · Authorized organization entry</p>
        <h1 id="register-person-title">Register Affected Person</h1>
        <p className="portal-dashboard-intro">
          Record comparable profile details to support safe reunification and human-led review.
        </p>
        <PersonRegistrationForm kind="affected" onSubmit={saveAffectedPerson} />
      </section>
    </PageContainer>
  )
}
