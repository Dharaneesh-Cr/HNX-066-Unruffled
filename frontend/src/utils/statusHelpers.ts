import type { CaseStatus } from '../types'

export function getCaseStatusLabel(status: CaseStatus) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getCaseStatusTone(status: CaseStatus) {
  switch (status) {
    case 'POTENTIAL_MATCH':
      return 'amber'
    case 'UNDER_VERIFICATION':
      return 'purple'
    case 'VERIFIED':
    case 'REUNITED':
      return 'green'
    case 'REJECTED':
      return 'red'
    case 'NO_CURRENT_MATCH':
      return 'gray'
    case 'NEW':
    case 'SEARCHING':
    case 'CONTACT_INITIATED':
      return 'navy'
  }
}
