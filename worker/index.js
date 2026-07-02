/**
 * Nourish Fitbit Worker
 *
 * Extends the original CORS proxy with:
 *  - KV-backed token storage
 *  - Hourly cron that fetches Fitbit data without the app being open
 *  - /fitbit/register  — app pushes refresh token here after OAuth / token refresh
 *  - /fitbit/cached    — app reads background-synced data from here on startup
 *
 * Cloudflare setup required (see README below):
 *  1. Create a KV namespace called STORE
 *  2. Bind it to this Worker as "STORE"
 *  3. Add cron trigger: 0 * * * *  (every hour)
 */

const FITBIT_CLIENT_ID = '23TXZL'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Nourish-Secret',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function text(body, status = 200) {
  return new Response(body, { status, headers: CORS })
}

async function refreshToken(env, currentRefreshToken) {
  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FITBIT_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: currentRefreshToken,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.access_token) return null
  // Save new refresh token back to KV so next cron works
  await env.STORE.put('fitbit_refresh_token', data.refresh_token)
  return data.access_token
}

async function fetchAndCache(env) {
  const storedRefreshToken = await env.STORE.get('fitbit_refresh_token')
  if (!storedRefreshToken) return

  const accessToken = await refreshToken(env, storedRefreshToken)
  if (!accessToken) {
    // Refresh token is invalid — clear it so the user knows to reconnect
    await env.STORE.delete('fitbit_refresh_token')
    return
  }

  // Use UTC date — close enough for UK (at most 1 hour off in BST)
  const today = new Date().toISOString().split('T')[0]

  const authHeader = { Authorization: 'Bearer ' + accessToken }
  const [actRes, sleepRes, hrRes] = await Promise.all([
    fetch(`https://api.fitbit.com/1/user/-/activities/date/${today}.json`, { headers: authHeader }),
    fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`, { headers: authHeader }),
    fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`, { headers: authHeader }),
  ])

  if (!actRes.ok || !sleepRes.ok || !hrRes.ok) return

  const act = await actRes.json()
  const slp = await sleepRes.json()
  const hr = await hrRes.json()

  const mainSleep = slp.sleep?.find(s => s.isMainSleep) ?? slp.sleep?.[0]

  const data = {
    date: today,
    steps: act.summary?.steps ?? 0,
    activeMin: (act.summary?.fairlyActiveMinutes ?? 0) + (act.summary?.veryActiveMinutes ?? 0),
    calsBurned: act.summary?.caloriesOut ?? 0,
    restingHR: hr['activities-heart']?.[0]?.value?.restingHeartRate ?? null,
    sleepMins: mainSleep?.minutesAsleep ?? 0,
    deepMins: mainSleep?.levels?.summary?.deep?.minutes ?? 0,
    remMins: mainSleep?.levels?.summary?.rem?.minutes ?? 0,
    lightMins: mainSleep?.levels?.summary?.light?.minutes ?? 0,
    awakeMins: mainSleep?.levels?.summary?.wake?.minutes ?? 0,
    sleepStart: mainSleep?.startTime ?? null,
    sleepEnd: mainSleep?.endTime ?? null,
    fetchedAt: Date.now(),
  }

  await env.STORE.put('fitbit_cached_data', JSON.stringify(data))
}

export default {
  // ── Cron handler — runs every hour ──────────────────────────────────────────
  async scheduled(_event, env, _ctx) {
    await fetchAndCache(env)
  },

  // ── HTTP handler ─────────────────────────────────────────────────────────────
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    // ── POST /fitbit/register — app stores its refresh token here ──────────────
    // Called after OAuth and after every background token refresh in the app
    if (url.pathname === '/fitbit/register' && request.method === 'POST') {
      let body
      try { body = await request.json() } catch { return text('Bad JSON', 400) }
      if (!body.refresh_token) return text('Missing refresh_token', 400)
      await env.STORE.put('fitbit_refresh_token', body.refresh_token)
      if (body.secret) await env.STORE.put('fitbit_secret', body.secret)
      // Trigger an immediate sync so cached data is fresh
      fetchAndCache(env).catch(() => {})
      return text('OK')
    }

    // ── DELETE /fitbit/register — app disconnects Fitbit ──────────────────────
    if (url.pathname === '/fitbit/register' && request.method === 'DELETE') {
      await Promise.all([
        env.STORE.delete('fitbit_refresh_token'),
        env.STORE.delete('fitbit_cached_data'),
        env.STORE.delete('fitbit_secret'),
      ])
      return text('OK')
    }

    // ── GET /fitbit/cached — app reads background-synced data ─────────────────
    if (url.pathname === '/fitbit/cached') {
      const storedSecret = await env.STORE.get('fitbit_secret')
      if (storedSecret) {
        const requestSecret = request.headers.get('X-Nourish-Secret') ?? url.searchParams.get('secret') ?? ''
        if (requestSecret !== storedSecret) return text('Unauthorized', 401)
      }
      const cached = await env.STORE.get('fitbit_cached_data')
      return json(cached ? JSON.parse(cached) : null)
    }

    // ── Existing proxy: /fitbit/<fitbit-api-path> ─────────────────────────────
    if (url.pathname.startsWith('/fitbit/')) {
      const auth = request.headers.get('Authorization')
      if (!auth) return text('No Authorization header', 401)
      const fitbitPath = url.pathname.slice('/fitbit'.length)
      const fitbitUrl = 'https://api.fitbit.com' + fitbitPath + url.search
      const res = await fetch(fitbitUrl, { headers: { Authorization: auth } })
      const body = await res.text()
      return new Response(body, {
        status: res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return text('Not found', 404)
  },
}
