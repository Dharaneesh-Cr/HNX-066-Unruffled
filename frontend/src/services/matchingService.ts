import { demoCandidate } from '../data/demoData'
import { demoAffectedRecords, demoMissingCases } from '../data/demoRecords'
import type { AffectedPersonRecord, CandidateMatch, MissingPersonCase, PersonProfile } from '../types'

/**
 * Demo-only implementation. Replace this module with an API adapter when a
 * separately hosted matching service is available.
 */
export async function getDemoCandidateMatches(
  caseId: string,
): Promise<CandidateMatch[]> {
  if (caseId !== demoCandidate.caseId) {
    return []
  }

  return [demoCandidate]
}

const weights = {
  name: 20,
  age: 15,
  gender: 10,
  location: 15,
  alias: 10,
  distinguishingMarks: 10,
  clothingDescription: 10,
  additionalDescription: 10,
} as const

function normalize(value?: string) {
  return value?.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ') ?? ''
}

function compareText(left?: string, right?: string) {
  const first = normalize(left)
  const second = normalize(right)
  if (!first || !second) return null
  if (first === second || first.includes(second) || second.includes(first)) return 1
  const firstWords = new Set(first.split(' '))
  const secondWords = new Set(second.split(' '))
  const common = [...firstWords].filter((word) => secondWords.has(word)).length
  return common / Math.max(firstWords.size, secondWords.size)
}

function compareAge(left?: number, right?: number) {
  if (left === undefined || right === undefined) return null
  return Math.max(0, 1 - Math.abs(left - right) / 20)
}

function compareRegion(left?: string, right?: string) {
  const comparison = compareText(left, right)
  return comparison === null ? null : comparison
}

function evidenceFor(missing: PersonProfile, affected: PersonProfile) {
  const evidence: string[] = []
  const nameScore = compareText(missing.fullName, affected.fullName) ?? compareText(missing.fullName, affected.alias)
  if (nameScore !== null && nameScore >= 0.35) evidence.push('Similar name')
  const ageScore = compareAge(missing.age, affected.age)
  if (ageScore !== null && ageScore >= 0.65) evidence.push('Similar age range')
  const genderScore = compareText(missing.gender, affected.gender)
  if (genderScore !== null && genderScore === 1) evidence.push('Gender information is consistent')
  const missingRegion = missing.lastSeenLocation?.split(',').slice(-1)[0]
  const affectedRegion = affected.foundLocation?.split(',').slice(-1)[0]
  const regionScore = compareRegion(missingRegion, affectedRegion)
  if (regionScore !== null && regionScore > 0) evidence.push('Same or nearby region')
  const distinguishingScore = compareText(missing.distinguishingMarks, affected.distinguishingMarks)
  if (distinguishingScore !== null && distinguishingScore >= 0.3) evidence.push('Distinguishing marks are similar')
  const clothingScore = compareText(missing.clothingDescription, affected.clothingDescription)
  if (clothingScore !== null && clothingScore >= 0.3) evidence.push('Clothing description is similar')
  const descriptionScore = compareText(missing.additionalDescription, affected.additionalDescription)
  if (descriptionScore !== null && descriptionScore >= 0.3) evidence.push('Additional descriptions are similar')
  return evidence.length ? evidence : ['Review available profile details with a human coordinator']
}

function scoreProfiles(missing: PersonProfile, affected: PersonProfile) {
  const values: [number, number | null][] = [
    [weights.name, compareText(missing.fullName, affected.fullName) ?? compareText(missing.fullName, affected.alias)],
    [weights.age, compareAge(missing.age, affected.age)],
    [weights.gender, compareText(missing.gender, affected.gender)],
    [
      weights.location,
      compareRegion(
        missing.lastSeenLocation?.split(',').slice(-1)[0],
        affected.foundLocation?.split(',').slice(-1)[0],
      ),
    ],
    [weights.alias, compareText(missing.alias, affected.alias)],
    [weights.distinguishingMarks, compareText(missing.distinguishingMarks, affected.distinguishingMarks)],
    [weights.clothingDescription, compareText(missing.clothingDescription, affected.clothingDescription)],
    [weights.additionalDescription, compareText(missing.additionalDescription, affected.additionalDescription)],
  ]
  const available = values.filter((entry): entry is [number, number] => entry[1] !== null)
  const totalWeight = available.reduce((sum, [weight]) => sum + weight, 0)
  if (totalWeight === 0) return 0
  return Math.round(available.reduce((sum, [weight, score]) => sum + weight * score, 0) / totalWeight * 100)
}

export function createDemoCandidateMatches(
  missingCases: MissingPersonCase[],
  affectedRecords: AffectedPersonRecord[],
): CandidateMatch[] {
  return missingCases.flatMap((missingCase) =>
    affectedRecords
      .map((affected) => ({
        missingCase,
        affected,
        score: scoreProfiles(missingCase.profile, affected.profile),
      }))
      .filter(({ score }) => score >= 25)
      .map(({ missingCase, affected, score }) => ({
        id: `MATCH-${missingCase.id}-${affected.id}`,
        caseId: missingCase.id,
        missingPersonId: missingCase.profile.id,
        affectedPersonId: affected.id,
        missingPersonName: missingCase.profile.fullName ?? 'Unknown',
        candidateName: affected.profile.fullName ?? affected.profile.alias ?? 'Unknown',
        similarityPercent: score,
        location: {
          city: affected.currentLocation.split(',')[0]?.trim() ?? '',
          region: affected.currentLocation.split(',')[1]?.trim() ?? '',
          country: 'India',
        },
        createdAt: affected.registeredAt,
        lastUpdatedAt: affected.registeredAt,
        evidence: evidenceFor(missingCase.profile, affected.profile),
        verificationStatus: 'IN_PROGRESS',
        caseStatus: missingCase.status === 'VERIFIED' || missingCase.status === 'REJECTED'
          ? missingCase.status
          : 'UNDER_VERIFICATION',
      })),
  )
}

export const demoMatchingDisclaimer =
  'Demo Candidate Similarity only. This deterministic comparison is not AI or biometric identification. Photos are available for human review only.'

export { demoMissingCases, demoAffectedRecords }
