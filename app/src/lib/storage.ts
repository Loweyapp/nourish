import type {
  DayEntry,
  Favourite,
  FitbitToken,
  GDriveToken,
  UsageTotals,
} from '../types'

// ── localStorage key constants — verbatim from index.html ─────────────────────
export const STORAGE_KEY         = 'nourish-entries-v1'
export const API_KEY_STORAGE     = 'nourish-api-key'
export const FB_TOKEN_KEY        = 'nourish-fitbit-token'
export const FB_VERIFIER_KEY     = 'nourish-fitbit-verifier'
export const FB_FETCH_KEY        = 'nourish-fitbit-fetched'
export const COACHING_KEY        = 'nourish-coaching-style'
export const GDRIVE_TOKEN_KEY    = 'nourish-gdrive-token'
export const GDRIVE_LAST_BACKUP  = 'nourish-last-backup'
export const DUMMY_SEEDED_KEY    = 'nourish-dummy-seeded'
export const FAVOURITES_KEY      = 'nourish-favourites'
export const LOG_LAYOUT_KEY      = 'nourish-log-layout'
export const INSIGHTS_LAYOUT_KEY = 'nourish-insights-layout'
export const USAGE_KEY           = 'nourish-usage-total'
export const SYNC_SECRET_KEY     = 'nourish-sync-secret'

// ── ls helper — verbatim from index.html ──────────────────────────────────────
// The cast in ls.get is intentional: we trust that what was stored is of type T.
export const ls = {
  get: <T>(k: string, fallback: T): T => {
    try {
      const v = localStorage.getItem(k)
       
      return v ? (JSON.parse(v) as T) : fallback
    } catch {
      return fallback
    }
  },
  set: (k: string, v: unknown): void => {
    try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore quota errors */ }
  },
  del: (k: string): void => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  },
  str: (k: string): string => localStorage.getItem(k) ?? '',
  setStr: (k: string, v: string): void => localStorage.setItem(k, v),
}

// ── Typed accessors — verbatim logic from index.html ──────────────────────────
export function loadEntries(): Record<string, DayEntry> {
  return ls.get(STORAGE_KEY, {})
}

export function saveEntries(e: Record<string, DayEntry>): void {
  ls.set(STORAGE_KEY, e)
}

export function getApiKey(): string {
  return (ls.str(API_KEY_STORAGE) || '').trim()
}

export function saveApiKey(k: string): void {
  ls.setStr(API_KEY_STORAGE, k)
}

export function getFitbitToken(): FitbitToken | null {
  return ls.get<FitbitToken | null>(FB_TOKEN_KEY, null)
}

export function saveFitbitToken(t: FitbitToken): void {
  ls.set(FB_TOKEN_KEY, t)
}

export function clearFitbitToken(): void {
  ls.del(FB_TOKEN_KEY)
  ls.del(FB_FETCH_KEY)
}

export function getCoachingStyle(): string {
  return ls.str(COACHING_KEY) || ''
}

export function saveCoachingStyle(s: string): void {
  ls.setStr(COACHING_KEY, s)
}

export function getFavourites(): Favourite[] {
  return ls.get<Favourite[]>(FAVOURITES_KEY, [])
}

export function saveFavourites(f: Favourite[]): void {
  ls.set(FAVOURITES_KEY, f)
}

export function getGDriveToken(): GDriveToken | null {
  return ls.get<GDriveToken | null>(GDRIVE_TOKEN_KEY, null)
}

export function saveGDriveToken(t: GDriveToken): void {
  ls.set(GDRIVE_TOKEN_KEY, t)
}

export function clearGDriveToken(): void {
  ls.del(GDRIVE_TOKEN_KEY)
}

export function getLastBackup(): string {
  return ls.str(GDRIVE_LAST_BACKUP)
}

export function getLifetimeUsage(): UsageTotals {
  return ls.get<UsageTotals>(USAGE_KEY, { input: 0, output: 0 })
}

// ── Favourites helpers — verbatim from index.html ────────────────────────────
export function addFavourite(fav: Omit<Favourite, 'useCount'> & { useCount?: number }): void {
  const favs = getFavourites()
  const newName = (fav.name || fav.text).toLowerCase()
  // If an entry exists with the same underlying text, update it rather than skipping
  const existingIdx = favs.findIndex((f) => f.text.toLowerCase() === fav.text.toLowerCase())
  if (existingIdx >= 0) {
    const updated = [...favs]
    updated[existingIdx] = { ...updated[existingIdx], ...fav } as Favourite
    saveFavourites(updated)
    return
  }
  // Also prevent duplicate names
  if (favs.find((f) => (f.name || f.text).toLowerCase() === newName)) return
  saveFavourites([...favs, { ...fav, useCount: 0 }])
}

export function incrementFavUseCount(texts: string[]): void {
  const favs = getFavourites().map((f) =>
    texts.includes(f.name || f.text) ? { ...f, useCount: (f.useCount || 0) + 1 } : f,
  )
  favs.sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
  saveFavourites(favs)
}

export function removeFavourite(nameOrText: string): void {
  saveFavourites(getFavourites().filter((f) => (f.name || f.text) !== nameOrText))
}

export function getSyncSecret(): string {
  let secret = ls.str(SYNC_SECRET_KEY)
  if (!secret) {
    secret = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    ls.setStr(SYNC_SECRET_KEY, secret)
  }
  return secret
}

export function isGDriveConnected(): boolean {
  const t = getGDriveToken()
  if (!t) return false
  if (t.expires_at && Date.now() > t.expires_at - 60000) { clearGDriveToken(); return false }
  return true
}
