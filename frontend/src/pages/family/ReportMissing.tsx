import { useNavigate } from 'react-router-dom'
import PersonRegistrationForm from '../../components/person/PersonRegistrationForm'
import PageContainer from '../../components/layout/PageContainer'
import { useAuth } from '../../hooks/useAuth'
import { createMissingCase, uploadPhoto } from '../../services/api'
import type { MissingCaseCreateInput, RegistrationInput } from '../../types'

export default function ReportMissing() {
  const navigate = useNavigate()
  const { session } = useAuth()

  async function saveMissingCase(input: RegistrationInput) {
    if (!session) throw new Error('Your session has expired. Please sign in again.')
    if (!('relationship' in input)) throw new Error('Invalid missing-person report.')
    const missingCase: MissingCaseCreateInput = input
    const { photoFile, ...payload } = missingCase
    if (photoFile) {
      const photo = await uploadPhoto(photoFile, session.accessToken)
      payload.profile = { ...payload.profile, photoPath: photo.photoPath }
    }
    payload.reporterEmail = session.user.email
    await createMissingCase(payload, session.accessToken)
    navigate('/searcher/cases')
  }

  return (
    <PageContainer role="searcher">
      <section className="portal-dashboard form-page" aria-labelledby="report-missing-title">
        <p className="portal-dashboard-eyebrow">Searcher Portal · Private family report</p>
        <h1 id="report-missing-title">Report a Missing Person</h1>
        <p className="portal-dashboard-intro">
          Share structured details so authorized response teams can review possible candidate matches.
        </p>
        <PersonRegistrationForm kind="missing" onSubmit={saveMissingCase} />
      </section>
    </PageContainer>
  )
}
