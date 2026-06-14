// Utility functions — verbatim port from index.html

function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return localDateString(new Date())
}

export function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localDateString(d)
}

export function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function shortDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function fmtMins(m: number): string {
  if (!m) return '0h 0m'
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// Round to 1 decimal place. Matches the live app's r1() helper.
export function r1(v: number | null | undefined): number {
  return Math.round((v || 0) * 10) / 10
}

// Shared redirect URI for both Fitbit and Google Drive OAuth
export const REDIRECT_URI = 'https://loweyapp.github.io/nourish'
