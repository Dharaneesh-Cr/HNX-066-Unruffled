import { useMemo, useState } from 'react'
import { MapPin, Search, SlidersHorizontal } from 'lucide-react'
import PageContainer from '../../components/layout/PageContainer'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { AFFECTED_RECORDS_KEY } from '../../data/storageKeys'
import { demoAffectedRecords } from '../../data/demoRecords'
import type { AffectedPersonRecord, CaseStatus } from '../../types'
import { formatDateTime } from '../../utils/formatters'
import './FinderData.css'

export default function FinderRecords() {
  const [records] = useLocalStorage<AffectedPersonRecord[]>(
    AFFECTED_RECORDS_KEY,
    demoAffectedRecords,
  )
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')

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
          Fictional demo records registered by authorized response organizations. Sensitive medical fields are not shown in this list.
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

        {visibleRecords.length ? (
          <div className="registered-person-list">
            {visibleRecords.map((record) => (
              <AffectedRecordCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState title="No records found" description="Try changing your search or filters." />
        )}
      </section>
    </PageContainer>
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
