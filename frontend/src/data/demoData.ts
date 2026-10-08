import type {
  AffectedPerson,
  CandidateMatch,
  Case,
  Notification,
  Organization,
} from '../types'

export const demoCase: Case = {
  id: 'SH-2026-00124',
  status: 'POTENTIAL_MATCH',
  missingPerson: {
    id: 'MP-124',
    fullName: 'Arun Kumar',
    age: 34,
    lastSeenAt: '2026-09-14T08:30:00.000Z',
    lastSeenLocation: {
      city: 'Nashik',
      region: 'Maharashtra',
      country: 'India',
    },
    description: 'Last seen wearing a blue checked shirt and dark trousers.',
    reportedBy: 'Meera Kumar',
  },
  createdAt: '2026-09-14T11:15:00.000Z',
  assignedTo: 'Sahayaa Community Desk',
  updates: [
    {
      id: 'UP-1',
      title: 'Missing person report received',
      description: 'A family report was added to the Sahayaa demo registry.',
      timestamp: '2026-09-14T11:15:00.000Z',
      actor: 'Family',
    },
    {
      id: 'UP-2',
      title: 'Candidate submitted for review',
      description: 'A possible candidate was added for human-led verification.',
      timestamp: '2026-09-15T09:00:00.000Z',
      actor: 'Sahayaa Community Desk',
    },
  ],
  verificationRecords: [
    {
      id: 'VR-1',
      label: 'Family confirmation',
      status: 'PENDING',
      updatedAt: '2026-09-15T09:00:00.000Z',
    },
    {
      id: 'VR-2',
      label: 'Local coordinator review',
      status: 'IN_PROGRESS',
      updatedAt: '2026-09-15T09:20:00.000Z',
    },
  ],
}

export const demoCandidate: CandidateMatch = {
  id: 'CAND-124-A',
  caseId: 'SH-2026-00124',
  candidateName: 'A. Kumar',
  similarityPercent: 82,
  location: {
    city: 'Pune',
    region: 'Maharashtra',
    country: 'India',
  },
  lastUpdatedAt: '2026-09-15T09:20:00.000Z',
  evidence: [
    'Name entry has a similar spelling',
    'Candidate record is from the same region',
    'Needs confirmation from family and local coordinators',
  ],
  verificationStatus: 'IN_PROGRESS',
}

export const demoAffectedPeople: AffectedPerson[] = [
  {
    id: 'AP-01',
    fullName: 'A. Kumar',
    age: 36,
    currentLocation: demoCandidate.location,
    registeredAt: '2026-09-15T08:40:00.000Z',
    organizationId: 'ORG-01',
  },
]

export const demoOrganizations: Organization[] = [
  {
    id: 'ORG-01',
    name: 'Sahayaa Pune Community Desk',
    type: 'NGO',
    location: demoCandidate.location,
  },
]

export const demoNotifications: Notification[] = [
  {
    id: 'NT-01',
    title: 'A candidate is ready for review',
    message: 'Case SH-2026-00124 has a candidate awaiting human verification.',
    createdAt: '2026-09-15T09:20:00.000Z',
    read: false,
    caseId: 'SH-2026-00124',
    category: 'MATCH',
  },
  {
    id: 'NT-02',
    title: 'Case update added',
    message: 'A new update was added to the Arun Kumar case timeline.',
    createdAt: '2026-09-14T11:15:00.000Z',
    read: true,
    caseId: 'SH-2026-00124',
    category: 'CASE_UPDATE',
  },
]
