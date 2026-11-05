export const BUSINESS_TIME_ZONE = 'Asia/Kolkata'

export function parseDateOnly(value?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}

export function parseBusinessDateTime(value?: string): Date | null {
  if (!value) return null

  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? value
    : `${value}+05:30`
  const date = new Date(timestamp)

  return Number.isNaN(date.getTime()) ? null : date
}

export function getBusinessDateInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))

  return `${values.year}-${values.month}-${values.day}`
}
