import type { FitbitToken, FitbitData } from '../types'
import {
  FB_TOKEN_KEY,
  FB_VERIFIER_KEY,
  ls,
  getFitbitToken,
  saveFitbitToken,
  clearFitbitToken,
} from './storage'
import { today, REDIRECT_URI } from './utils'

export { REDIRECT_URI }
export const FITBIT_CLIENT_ID = '23TXZL'
export const FITBIT_SCOPES    = 'activity sleep heartrate'
export const FITBIT_PROXY     = 'https://rapid-star-52f2.alexlowe1.workers.dev/fitbit'

// ── PKCE helpers — verbatim from index.html ───────────────────────────────────
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier  = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = b64url(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
  )
  return { verifier, challenge }
}

export function fitbitAuthUrl(challenge: string): string {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: FITBIT_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: FITBIT_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    expires_in: '604800',
  })
  return 'https://www.fitbit.com/oauth2/authorize?' + p
}

type FitbitTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  errors?: Array<{ message?: string }>
}

export async function exchangeCode(code: string, verifier: string): Promise<FitbitTokenResponse> {
  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FITBIT_CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  })
  const data = await res.json() as FitbitTokenResponse
  if (!res.ok) throw new Error(data.errors?.[0]?.message ?? 'Token exchange failed')
  return data
}

export async function refreshFitbitToken(): Promise<string | null> {
  const stored = getFitbitToken()
  if (!stored?.refresh_token) return null
  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FITBIT_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: stored.refresh_token,
    }),
  })
  const data = await res.json() as FitbitToken
  if (!res.ok) { clearFitbitToken(); return null }
  const token: FitbitToken = { ...data, expires_at: Date.now() + data.expires_in * 1000 }
  saveFitbitToken(token)
  return token.access_token
}

export async function getFitbitAccessToken(): Promise<string | null> {
  const stored = getFitbitToken()
  if (!stored) return null
  if (stored.expires_at && Date.now() < stored.expires_at - 60000) return stored.access_token
  return refreshFitbitToken()
}

// ── Fitbit API proxy fetch — verbatim from index.html ─────────────────────────
type FitbitApiResponse = Record<string, unknown>

export async function fitbitGet(path: string): Promise<FitbitApiResponse> {
  const token = await getFitbitAccessToken()
  if (!token) throw new Error('No Fitbit token — please reconnect')
  let res: Response
  try {
    res = await fetch(FITBIT_PROXY + path, { headers: { Authorization: 'Bearer ' + token } })
  } catch (netErr: unknown) {
    throw new Error('Network error: ' + (netErr instanceof Error ? netErr.message : String(netErr)))
  }
  if (res.status === 401) { clearFitbitToken(); throw new Error('Fitbit token expired — please reconnect') }
  let data: FitbitApiResponse
  try { data = await res.json() as FitbitApiResponse }
  catch { throw new Error('Bad response from proxy (HTTP ' + res.status + ')') }
  if (!res.ok) {
    const errors = data['errors'] as Array<{ message?: string }> | undefined
    throw new Error(errors?.[0]?.message ?? 'Fitbit error ' + res.status)
  }
  return data
}

// ── fetchFitbitDay — verbatim from index.html ─────────────────────────────────
export async function fetchFitbitDay(): Promise<FitbitData> {
  const actSum    = await fitbitGet('/1/user/-/activities/date/' + today() + '.json')
  const sleepData = await fitbitGet('/1.2/user/-/sleep/date/' + today() + '.json')
  const hrData    = await fitbitGet('/1/user/-/activities/heart/date/' + today() + '/1d.json')

  type ActSummary = { summary?: { steps?: number; fairlyActiveMinutes?: number; veryActiveMinutes?: number; caloriesOut?: number } }
  type SleepResp  = { sleep?: Array<{ isMainSleep?: boolean; minutesAsleep?: number; startTime?: string; endTime?: string; levels?: { summary?: { deep?: { minutes?: number }; rem?: { minutes?: number }; light?: { minutes?: number }; wake?: { minutes?: number } } } }> }
  type HRResp     = { 'activities-heart'?: Array<{ value?: { restingHeartRate?: number } }> }

  const act  = actSum    as ActSummary
  const slp  = sleepData as SleepResp
  const hr   = hrData    as HRResp

  const steps      = act.summary?.steps ?? 0
  const activeMin  = (act.summary?.fairlyActiveMinutes ?? 0) + (act.summary?.veryActiveMinutes ?? 0)
  const calsBurned = act.summary?.caloriesOut ?? 0
  const restingHR  = hr['activities-heart']?.[0]?.value?.restingHeartRate ?? null

  const mainSleep  = slp.sleep?.find((s) => s.isMainSleep) ?? slp.sleep?.[0]
  const sleepMins  = mainSleep?.minutesAsleep ?? 0
  const deepMins   = mainSleep?.levels?.summary?.deep?.minutes ?? 0
  const remMins    = mainSleep?.levels?.summary?.rem?.minutes ?? 0
  const lightMins  = mainSleep?.levels?.summary?.light?.minutes ?? 0
  const awakeMins  = mainSleep?.levels?.summary?.wake?.minutes ?? 0
  const sleepStart = mainSleep?.startTime ?? null
  const sleepEnd   = mainSleep?.endTime   ?? null

  return {
    steps, activeMin, calsBurned, restingHR,
    sleepMins, deepMins, remMins, lightMins, awakeMins,
    sleepStart, sleepEnd,
    fetchedAt: Date.now(),
  }
}

// ── Re-export for OAuth callback handling in App ──────────────────────────────
export { FB_VERIFIER_KEY, FB_TOKEN_KEY, ls }
