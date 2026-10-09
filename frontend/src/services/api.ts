import type {
  AffectedPersonRecord,
  CandidateMatch,
  CaseStatus,
  MissingPersonCase,
  PersonProfile,
} from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api')
  .replace(/\/+$/, '')
export const AUTH_SESSION_EXPIRED_EVENT = 'sahayaa:auth-session-expired'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  token?: string
  method?: string
  body?: BodyInit | object
}

export interface ApiUser {
  id: string
  name: string
  email: string
  role: 'SEARCHER' | 'FINDER' | 'COMMAND_CENTER'
  organizationId?: string | null
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  organizationName?: string | null
  organizationType?: string | null
}

export interface LoginResponse {
  accessToken: string
  expiresAt: number | null
  user: ApiUser
}

export interface RegistrationResponse {
  userId: string
  message: string
  emailConfirmationRequired: boolean
  organizationId?: string | null
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface ApiProfile {
  id?: string | null
  fullName?: string | null
  alias?: string | null
  age?: number | null
  gender?: string | null
  photoPath?: string | null
  distinguishingMarks?: string | null
  clothingDescription?: string | null
  additionalDescription?: string | null
}

interface ApiMissingCase {
  id: string
  personId?: string | null
  profile?: ApiProfile | null
  relationship?: string | null
  reporterName?: string | null
  reporterEmail?: string | null
  reporterPhone?: string | null
  preferredContactMethod?: string | null
  consented?: boolean
  lastSeenDate?: string | null
  lastSeenTime?: string | null
  lastSeenLocation?: string | null
  status?: string | null
  createdAt?: string | null
}

interface ApiAffectedPerson {
  id: string
  personId?: string | null
  profile?: ApiProfile | null
  organizationId?: string | null
  foundBy?: string | null
  shelterOrFacility?: string | null
  foundDate?: string | null
  foundTime?: string | null
  foundLocation?: string | null
  currentLocation?: string | null
  conditionStatus?: string | null
  registeredAt?: string | null
  candidateStatus?: string | null
}

interface ApiCaseUpdate {
  id: string
  title: string
  description: string
  timestamp?: string | null
  actor?: string | null
}

interface ApiCandidateMatch {
  id: string
  caseId: string
  affectedPersonId: string
  similarityPercent: number
  evidence: string[]
  verificationStatus: string
  createdAt?: string | null
  lastUpdatedAt?: string | null
  missingCase: ApiMissingCase
  affectedPerson: ApiAffectedPerson
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers()
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
    })
  } catch {
    throw new ApiError('The Sahayaa API could not be reached. Check that the backend is running.', 0)
  }

  const responseBody: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && options.token) {
      window.sessionStorage.removeItem('sahayaa_access_session')
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
    }
    let detail = `The Sahayaa API returned HTTP ${response.status}.`
    if (typeof responseBody === 'object' && responseBody !== null && 'detail' in responseBody) {
      const responseDetail: unknown = responseBody.detail
      if (typeof responseDetail === 'string') {
        detail = responseDetail
      } else if (Array.isArray(responseDetail)) {
        const messages = responseDetail.flatMap((item: unknown) => {
          if (typeof item !== 'object' || item === null || !('msg' in item) || typeof item.msg !== 'string') {
            return []
          }
          const location = 'loc' in item && Array.isArray(item.loc)
            ? item.loc.filter((part: unknown) => part !== 'body').join('.')
            : ''
          return [location ? `${location}: ${item.msg}` : item.msg]
        })
        if (messages.length > 0) detail = messages.join(' ')
      }
    }
    throw new ApiError(detail, response.status)
  }
  return responseBody as T
}

export function loginWithPassword(
  email: string,
  password: string,
  portal: 'searcher' | 'finder' | 'command_center',
  organization?: { name: string; type: string },
) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
      portal,
      ...(organization
        ? { organizationName: organization.name, organizationType: organization.type }
        : {}),
    },
  })
}

export function registerSearcher(body: {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}) {
  return request<RegistrationResponse>('/auth/register/searcher', {
    method: 'POST',
    body,
  })
}

export function registerFinderOrganization(body: {
  organizationName: string
  organizationType: string
  contactPersonName: string
  email: string
  phone: string
  location: string
  password: string
  confirmPassword: string
}) {
  return request<RegistrationResponse>('/auth/register/organization', {
    method: 'POST',
    body,
  })
}

export function getCurrentUser(token: string) {
  return request<{
    userId: string
    email: string
    name: string
    role: ApiUser['role']
    organizationId?: string
    approvalStatus?: ApiUser['approvalStatus']
    organizationName?: string | null
    organizationType?: string | null
  }>('/auth/me', { token })
}

export function uploadPhoto(file: File, token: string) {
  const body = new FormData()
  body.append('file', file)
  return request<{ photoPath: string }>('/photos', { method: 'POST', token, body })
}

async function signedPhotoUrl(path: string | null | undefined, token: string) {
  if (!path) return undefined
  const result = await request<{ url: string }>(
    `/photos/signed-url?path=${encodeURIComponent(path)}`,
    { token },
  )
  return result.url
}

function statusValue(value: string | null | undefined): CaseStatus {
  const statuses: CaseStatus[] = [
    'NEW', 'SEARCHING', 'POTENTIAL_MATCH', 'UNDER_VERIFICATION', 'VERIFIED',
    'CONTACT_INITIATED', 'REUNITED', 'REJECTED', 'NO_CURRENT_MATCH',
  ]
  return statuses.includes(value as CaseStatus) ? value as CaseStatus : 'SEARCHING'
}

async function profileValue(
  profile: ApiProfile | null | undefined,
  personId: string | null | undefined,
  token: string,
  lastSeen?: Pick<PersonProfile, 'lastSeenDate' | 'lastSeenTime' | 'lastSeenLocation'>,
  found?: Pick<PersonProfile, 'foundDate' | 'foundTime' | 'foundLocation'>,
  includePhoto = true,
): Promise<PersonProfile> {
  return {
    id: profile?.id ?? personId ?? '',
    fullName: profile?.fullName ?? undefined,
    alias: profile?.alias ?? undefined,
    age: profile?.age ?? undefined,
    gender: profile?.gender ?? undefined,
    photoPath: profile?.photoPath ?? undefined,
    photo: includePhoto ? await signedPhotoUrl(profile?.photoPath, token) : undefined,
    distinguishingMarks: profile?.distinguishingMarks ?? undefined,
    clothingDescription: profile?.clothingDescription ?? undefined,
    additionalDescription: profile?.additionalDescription ?? undefined,
    ...lastSeen,
    ...found,
  }
}

export async function listMyMissingCases(token: string): Promise<MissingPersonCase[]> {
  const cases = await request<ApiMissingCase[]>('/missing-cases', { token })
  return Promise.all(cases.map((item) => mapMissingCase(item, token)))
}

export async function listMissingCasesForFinder(token: string): Promise<MissingPersonCase[]> {
  const cases = await request<ApiMissingCase[]>('/missing-cases', { token })
  return Promise.all(cases.map((item) => mapMissingCase(item, token, false)))
}

export async function getMissingCase(token: string, caseId: string): Promise<MissingPersonCase> {
  const item = await request<ApiMissingCase>(`/missing-cases/${encodeURIComponent(caseId)}`, { token })
  return mapMissingCase(item, token)
}

export async function listCaseUpdates(caseId: string, token: string) {
  const updates = await request<ApiCaseUpdate[]>(`/case-updates/${encodeURIComponent(caseId)}`, { token })
  return updates.map((update) => ({
    id: update.id,
    title: update.title,
    description: update.description,
    timestamp: update.timestamp ?? '',
    actor: update.actor ?? 'Sahayaa',
  }))
}

export async function listOrganizationAffectedPeople(token: string): Promise<AffectedPersonRecord[]> {
  const records = await request<ApiAffectedPerson[]>('/affected-persons', { token })
  return Promise.all(records.map(async (item) => ({
    id: item.id,
    profile: await profileValue(item.profile, item.personId, token, undefined, {
      foundDate: item.foundDate ?? undefined,
      foundTime: item.foundTime ?? undefined,
      foundLocation: item.foundLocation ?? undefined,
    }),
    organizationId: item.organizationId ?? '',
    organizationName: 'Authorized organization',
    shelterOrFacility: item.shelterOrFacility ?? undefined,
    currentLocation: item.currentLocation ?? item.foundLocation ?? '',
    conditionStatus: item.conditionStatus ?? 'Not specified',
    foundBy: item.foundBy ?? '',
    candidateStatus: statusValue(item.candidateStatus) as AffectedPersonRecord['candidateStatus'],
    registeredAt: item.registeredAt ?? '',
  })))
}

export async function listCandidateMatches(token: string): Promise<{
  match: CandidateMatch
  missingCase: MissingPersonCase
  affectedPerson: AffectedPersonRecord
}[]> {
  const matches = await request<ApiCandidateMatch[]>('/matches', { token })
  return Promise.all(matches.map(async (item) => {
    const [missingCase, affectedPerson] = await Promise.all([
      mapMissingCase(item.missingCase, token, false),
      mapAffectedPerson(item.affectedPerson, token),
    ])
    return {
      match: {
        id: item.id,
        caseId: item.caseId,
        affectedPersonId: item.affectedPersonId,
        missingPersonName: missingCase.profile.fullName ?? missingCase.profile.alias,
        candidateName: affectedPerson.profile.fullName ?? affectedPerson.profile.alias ?? 'Name not known',
        similarityPercent: item.similarityPercent,
        location: {
          city: affectedPerson.currentLocation,
          region: '',
          country: '',
        },
        createdAt: item.createdAt ?? undefined,
        lastUpdatedAt: item.lastUpdatedAt ?? item.createdAt ?? '',
        evidence: item.evidence,
        verificationStatus: (item.verificationStatus === 'IN_PROGRESS'
          || item.verificationStatus === 'COMPLETE'
          || item.verificationStatus === 'REJECTED'
          ? item.verificationStatus
          : 'PENDING'),
        caseStatus: statusValue(item.missingCase.status),
      },
      missingCase,
      affectedPerson,
    }
  }))
}

async function mapMissingCase(item: ApiMissingCase, token: string, includePhoto = true): Promise<MissingPersonCase> {
  return {
    id: item.id,
    profile: await profileValue(item.profile, item.personId, token, {
      lastSeenDate: item.lastSeenDate ?? undefined,
      lastSeenTime: item.lastSeenTime ?? undefined,
      lastSeenLocation: item.lastSeenLocation ?? undefined,
    }, undefined, includePhoto),
    reporterName: item.reporterName ?? '',
    relationship: item.relationship ?? '',
    reporterEmail: item.reporterEmail ?? '',
    reporterPhone: item.reporterPhone ?? '',
    preferredContactMethod: item.preferredContactMethod ?? 'Phone',
    consented: item.consented ?? false,
    status: statusValue(item.status),
    createdAt: item.createdAt ?? '',
    updates: await listCaseUpdates(item.id, token),
  }
}

async function mapAffectedPerson(item: ApiAffectedPerson, token: string): Promise<AffectedPersonRecord> {
  return {
    id: item.id,
    profile: await profileValue(item.profile, item.personId, token, undefined, {
      foundDate: item.foundDate ?? undefined,
      foundTime: item.foundTime ?? undefined,
      foundLocation: item.foundLocation ?? undefined,
    }, false),
    organizationId: item.organizationId ?? '',
    organizationName: 'Authorized organization',
    shelterOrFacility: item.shelterOrFacility ?? undefined,
    currentLocation: item.currentLocation ?? item.foundLocation ?? '',
    conditionStatus: item.conditionStatus ?? 'Not specified',
    foundBy: item.foundBy ?? '',
    candidateStatus: statusValue(item.candidateStatus) as AffectedPersonRecord['candidateStatus'],
    registeredAt: item.registeredAt ?? '',
  }
}

export function reviewCandidateMatch(token: string, matchId: string, decision: 'VERIFIED' | 'REJECTED') {
  const action = decision === 'VERIFIED' ? 'verify' : 'reject'
  return request(`/matches/${encodeURIComponent(matchId)}/${action}`, {
    method: 'POST',
    token,
    body: {},
  })
}

export async function createMissingCase(body: object, token: string) {
  return request<ApiMissingCase>('/missing-cases', { method: 'POST', token, body })
}

export async function createAffectedPerson(body: object, token: string) {
  return request<ApiAffectedPerson>('/affected-persons', { method: 'POST', token, body })
}
