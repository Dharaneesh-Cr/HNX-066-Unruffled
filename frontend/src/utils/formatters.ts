export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    ...options,
  }).format(new Date(value))
}

export function formatDateTime(value: string) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatLocation(city: string, region: string) {
  return `${city}, ${region}`
}
