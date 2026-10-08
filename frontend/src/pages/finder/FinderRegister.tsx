import { useNavigate } from 'react-router-dom'
import PageContainer from '../../components/layout/PageContainer'
import PersonRegistrationForm from '../../components/person/PersonRegistrationForm'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { AFFECTED_RECORDS_KEY, MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { createDemoCandidateMatches } from '../../services/matchingService'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import type { AffectedPersonRecord, CandidateMatch, MissingPersonCase } from '../../types'

export default function FinderRegister() {
  const navigate = useNavigate()
  const [affectedRecords, setAffectedRecords] = useLocalStorage<AffectedPersonRecord[]>(
    AFFECTED_RECORDS_KEY,
    demoAffectedRecords,
  )
  const [missingCases] = useLocalStorage<MissingPersonCase[]>(
    MISSING_CASES_KEY,
    demoMissingCases,
  )
  const [, setMatches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )

  function saveAffectedPerson(record: MissingPersonCase | AffectedPersonRecord) {
    if (!('organizationId' in record)) return
    const recordsWithNew = [...affectedRecords, record]
    const computedMatches = createDemoCandidateMatches(missingCases, recordsWithNew)
    const matchedCases = new Set(computedMatches.map((match) => match.caseId))
    const candidateRecordIds = new Set(computedMatches.map((match) => match.affectedPersonId))
    const nextRecords = recordsWithNew.map((item) => (
      candidateRecordIds.has(item.id) && item.candidateStatus === 'SEARCHING'
        ? { ...item, candidateStatus: 'POTENTIAL_MATCH' as const }
        : item
    ))
    const nextCases = missingCases.map((item) => (
      matchedCases.has(item.id) && ['NEW', 'SEARCHING', 'NO_CURRENT_MATCH'].includes(item.status)
        ? { ...item, status: 'POTENTIAL_MATCH' as const }
        : item
    ))
    const nextMatches = createDemoCandidateMatches(nextCases, nextRecords)
    window.localStorage.setItem(AFFECTED_RECORDS_KEY, JSON.stringify(nextRecords))
    window.localStorage.setItem(MISSING_CASES_KEY, JSON.stringify(nextCases))
    window.localStorage.setItem(MATCHES_KEY, JSON.stringify(nextMatches))
    setAffectedRecords(nextRecords)
    setMatches(nextMatches)
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
