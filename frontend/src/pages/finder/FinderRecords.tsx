import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, SlidersHorizontal } from 'lucide-react'
import PageContainer from '../../components/layout/PageContainer'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import { useAuth } from '../../hooks/useAuth'
import { listMissingCasesForFinder, listOrganizationAffectedPeople } from '../../services/api'
import type { AffectedPersonRecord, CaseStatus, MissingPersonCase } from '../../types'
import { formatDateTime } from '../../utils/formatters'
import './FinderData.css'

export default function FinderRecords() {
  const { session } = useAuth()
  const [records, setRecords] = useState<AffectedPersonRecord[]>([])
  const [missingCases, setMissingCases] = useState<MissingPersonCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!session) {
      return
    }
    void Promise.all([
      listOrganizationAffectedPeople(session.accessToken),
      listMissingCasesForFinder(session.accessToken),
    ])
      .then(([affected, cases]) => {
        if (!cancelled) {
          setRecords(affected)
          setMissingCases(cases)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load records.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const visibleRecords = useMemo(() => records.filter((record) => {
    const search = query.trim().toLocaleLowerCase()
    const matchesSearch = !search ||
      record.id.toLocaleLowerCase().includes(search) ||
      record.profile.fullName?.toLocaleLowerCase().includes(search) ||
      record.profile.alias?.toLocaleLowerCase().includes(search)
    const matchesStatus = status === 'ALL' || record.candidateStatus === status
    const matchesLocation = !location ||
      record.currentLocation.toLocaleLowerCase().includes(location.toLocaleLowerCase())
    const matchesDate = !date || record.registeredAt.slice(0, 10) === date
    return matchesSearch && matchesStatus && matchesLocation && matchesDate
  }), [date, location, query, records, status])

  return (
    <PageContainer role="finder">
      <section className="portal-dashboard finder-data-page" aria-labelledby="finder-records-title">
        <p className="portal-dashboard-eyebrow"><SlidersHorizontal size={16} /> Finder Portal · Organization records</p>
        <h1 id="finder-records-title">Affected People Records</h1>
        <p className="portal-dashboard-intro">
          Shared missing-person reports and your organization’s affected-person records. Sensitive medical fields are not shown in these lists.
        </p>

        <div className="record-filters" aria-label="Filter affected person records">
          <label className="record-search">
            <span>Search by name or ID</span>
            <span className="record-search-input"><Search size={16} aria-hidden="true" /><input onChange={(event) => setQuery(event.target.value)} placeholder="Name or person ID" value={query} /></span>
          </label>
          <label className="person-field">
            <span>Status</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="ALL">All statuses</option>
              <option value="SEARCHING">Searching</option>
              <option value="POTENTIAL_MATCH">Potential Match</option>
              <option value="UNDER_VERIFICATION">Under Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <label className="person-field">
            <span>Location</span>
            <input onChange={(event) => setLocation(event.target.value)} placeholder="City or region" value={location} />
          </label>
          <label className="person-field">
            <span>Registration date</span>
            <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          </label>
        </div>

        {loading ? (
          <LoadingState label="Loading reports and organization records" />
        ) : error ? (
          <p className="person-form-error" role="alert">{error}</p>
        ) : (
          <>
            <section aria-labelledby="shared-missing-cases-title">
              <h2 id="shared-missing-cases-title">Searcher Missing-Person Reports</h2>
              {missingCases.length ? (
                <div className="registered-person-list">
                  {missingCases.map((record) => <MissingCaseCard key={record.id} record={record} />)}
                </div>
              ) : (
                <EmptyState title="No missing-person reports yet" description="Reports submitted by Searchers will appear here." />
              )}
            </section>
            <section aria-labelledby="finder-affected-records-title">
              <h2 id="finder-affected-records-title">Your Organization’s Affected-Person Records</h2>
              {visibleRecords.length ? (
                <div className="registered-person-list">
                  {visibleRecords.map((record) => <AffectedRecordCard key={record.id} record={record} />)}
                </div>
              ) : (
                <EmptyState title="No affected-person records found" description="Try changing your filters or register an affected person." />
              )}
            </section>
          </>
        )}
      </section>
    </PageContainer>
  )
}

function MissingCaseCard({ record }: { record: MissingPersonCase }) {
  return (
    <article className="registered-person-card">
      <div className="registered-person-body">
        <div className="record-card-heading">
          <span className="case-id">{record.id}</span>
          <StatusBadge status={record.status} />
        </div>
        <h2>{record.profile.fullName ?? record.profile.alias ?? 'Name not known'}</h2>
        <p className="record-meta">
          Approx. {record.profile.age ?? 'unknown'} · {record.profile.gender ?? 'Gender not recorded'}
        </p>
        <p className="record-meta"><MapPin size={14} /> {record.profile.lastSeenLocation ?? 'Location not provided'}</p>
        <div className="record-details-grid">
          <span><strong>Last seen</strong>{record.profile.lastSeenDate ?? 'Date not provided'}</span>
          <span><strong>Reported by</strong>{record.reporterName}</span>
          <span><strong>Relationship</strong>{record.relationship}</span>
        </div>
      </div>
    </article>
  )
}

function AffectedRecordCard({ record }: { record: AffectedPersonRecord }) {
  const candidateStatus: CaseStatus = record.candidateStatus
  return (
    <article className="registered-person-card">
      {record.profile.photo && (
        <img
          alt={`Photo available for ${record.profile.fullName ?? 'affected person'} human review`}
          className="record-photo"
          src={record.profile.photo}
        />
      )}
      <div className="registered-person-body">
        <div className="record-card-heading">
          <span className="case-id">{record.id}</span>
          <StatusBadge status={candidateStatus} />
        </div>
        <h2>{record.profile.fullName ?? record.profile.alias ?? 'Name not known'}</h2>
        <p className="record-meta">
          Approx. {record.profile.age ?? 'unknown'} · {record.profile.gender ?? 'Gender not recorded'}
        </p>
        <p className="record-meta"><MapPin size={14} /> {record.currentLocation}</p>
        <div className="record-details-grid">
          <span><strong>Registered</strong>{formatDateTime(record.registeredAt)}</span>
          <span><strong>Organization</strong>{record.shelterOrFacility ?? record.organizationName}</span>
          <span><strong>Current status</strong>{record.conditionStatus}</span>
          <span><strong>Candidate match</strong>{record.candidateStatus === 'POTENTIAL_MATCH' ? 'Candidate for review' : 'No current candidate'}</span>
        </div>
        {record.profile.photo && <p className="record-photo-note">Photo available for human review</p>}
      </div>
    </article>
  )
}
