export type UserRole =
  | 'SEARCHER'
  | 'FINDER'
  | 'FAMILY'
  | 'RELIEF_WORKER'
  | 'COORDINATOR'
  | 'ADMIN'

export type CaseStatus =
  | 'NEW'
  | 'SEARCHING'
  | 'POTENTIAL_MATCH'
  | 'UNDER_VERIFICATION'
  | 'VERIFIED'
  | 'CONTACT_INITIATED'
  | 'REUNITED'
  | 'REJECTED'
  | 'NO_CURRENT_MATCH'

export interface Location {
  city: string
  region: string
  country: string
  latitude?: number
  longitude?: number
}

export interface MissingPerson {
  id: string
  fullName: string
  age: number
  lastSeenAt: string
  lastSeenLocation: Location
  description: string
  reportedBy: string
}

export interface PersonProfile {
  id: string
  fullName?: string
  alias?: string
  age?: number
  gender?: string
  photo?: string
  distinguishingMarks?: string
  clothingDescription?: string
  additionalDescription?: string
  lastSeenDate?: string
  lastSeenTime?: string
  lastSeenLocation?: string
  foundDate?: string
  foundTime?: string
  foundLocation?: string
}

export interface MissingPersonCase {
  id: string
  profile: PersonProfile
  reporterName: string
  relationship: string
  reporterEmail: string
  reporterPhone: string
  alternatePhone?: string
  preferredContactMethod: string
  consented: boolean
  status: CaseStatus
  createdAt: string
  updates: CaseUpdate[]
}

export interface AffectedPersonRecord {
  id: string
  profile: PersonProfile
  organizationId: string
  organizationName: string
  organizationType: Organization['type']
  shelterOrFacility?: string
  currentLocation: string
  conditionStatus: string
  foundBy: string
  medicalConditionSummary?: string
  medicationInformation?: string
  immediateCareRequired?: string
  accessibilityNeeds?: string
  candidateStatus: 'SEARCHING' | 'POTENTIAL_MATCH' | 'UNDER_VERIFICATION' | 'VERIFIED' | 'REJECTED'
  registeredAt: string
}

export interface AffectedPerson {
  id: string
  fullName: string
  age?: number
  currentLocation: Location
  registeredAt: string
  organizationId?: string
}

export interface VerificationRecord {
  id: string
  label: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE'
  updatedAt: string
}

export interface CaseUpdate {
  id: string
  title: string
  description: string
  timestamp: string
  actor: string
}

export interface Case {
  id: string
  status: CaseStatus
  missingPerson: MissingPerson
  createdAt: string
  assignedTo?: string
  updates: CaseUpdate[]
  verificationRecords: VerificationRecord[]
}

export interface CandidateMatch {
  id: string
  caseId: string
  missingPersonId?: string
  affectedPersonId?: string
  missingPersonName?: string
  candidateName: string
  similarityPercent: number
  location: Location
  createdAt?: string
  lastUpdatedAt: string
  evidence: string[]
  verificationStatus: VerificationRecord['status']
  caseStatus?: CaseStatus
}

export interface Notification {
  id: string
  title: string
  message: string
  createdAt: string
  read: boolean
  caseId?: string
  category: 'CASE_UPDATE' | 'MATCH' | 'SYSTEM'
}

export interface Organization {
  id: string
  name: string
  type:
    | 'HOSPITAL'
    | 'SHELTER'
    | 'RESCUE_CENTER'
    | 'RELIEF_CAMP'
    | 'NGO'
    | 'EMERGENCY_RESPONSE'
  location: Location
}
