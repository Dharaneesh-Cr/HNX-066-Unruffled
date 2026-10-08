import { useNavigate } from 'react-router-dom'
import PersonRegistrationForm from '../../components/person/PersonRegistrationForm'
import PageContainer from '../../components/layout/PageContainer'
import { useAuth } from '../../hooks/useAuth'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { demoAffectedRecords, demoMissingCases } from '../../data/demoRecords'
import { AFFECTED_RECORDS_KEY, MATCHES_KEY, MISSING_CASES_KEY } from '../../data/storageKeys'
import { createDemoCandidateMatches } from '../../services/matchingService'
import type { AffectedPersonRecord, CandidateMatch, MissingPersonCase } from '../../types'

export default function ReportMissing() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [missingCases, setMissingCases] = useLocalStorage<MissingPersonCase[]>(
    MISSING_CASES_KEY,
    demoMissingCases,
  )
  const [affectedRecords] = useLocalStorage<AffectedPersonRecord[]>(
    AFFECTED_RECORDS_KEY,
    demoAffectedRecords,
  )
  const [, setMatches] = useLocalStorage<CandidateMatch[]>(
    MATCHES_KEY,
    createDemoCandidateMatches(demoMissingCases, demoAffectedRecords),
  )

  function saveMissingCase(record: MissingPersonCase | AffectedPersonRecord) {
    if (!('reporterEmail' in record)) return
    const ownedRecord = { ...record, reporterEmail: session?.user.email ?? record.reporterEmail }
    const casesWithNew = [...missingCases, ownedRecord]
    const computedMatches = createDemoCandidateMatches(casesWithNew, affectedRecords)
    const matchedCases = new Set(computedMatches.map((match) => match.caseId))
    const nextCases = casesWithNew.map((item) => (
      matchedCases.has(item.id) && ['NEW', 'SEARCHING', 'NO_CURRENT_MATCH'].includes(item.status)
        ? { ...item, status: 'POTENTIAL_MATCH' as const }
        : item
    ))
    const candidateRecordIds = new Set(computedMatches.map((match) => match.affectedPersonId))
    const nextAffected = affectedRecords.map((item) => (
      candidateRecordIds.has(item.id) && item.candidateStatus === 'SEARCHING'
        ? { ...item, candidateStatus: 'POTENTIAL_MATCH' as const }
        : item
    ))
    const nextMatches = createDemoCandidateMatches(nextCases, nextAffected)
    window.localStorage.setItem(MISSING_CASES_KEY, JSON.stringify(nextCases))
    window.localStorage.setItem(AFFECTED_RECORDS_KEY, JSON.stringify(nextAffected))
    window.localStorage.setItem(MATCHES_KEY, JSON.stringify(nextMatches))
    setMissingCases(nextCases)
    setMatches(nextMatches)
    navigate('/searcher')
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
