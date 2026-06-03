import { useState } from 'react'
import type { FitbitData } from '../types'
import {
  fetchFitbitDay, pkce, fitbitAuthUrl,
  ls, FB_FETCH_KEY, FB_VERIFIER_KEY,
  today, fmtMins,
} from '../lib'
import { Section, Icon, Spinner } from './shared'

interface FitbitSectionProps {
  fitbitData?: FitbitData | undefined
  onUpdate: (data: FitbitData) => void
  connected: boolean
}

interface ArcProps {
  value: number
  max: number
  color: string
  size?: number
  label: string
  sublabel: string
}

function Arc({ value, max, color, size = 90, label, sublabel }: ArcProps) {
  const pct = Math.min(1, value / max)
  const r = (size - 14) / 2
  const cx = size / 2, cy = size / 2
  const startAngle = -210, totalAngle = 240
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcPath = (angle: number) => {
    const a = toRad(startAngle + angle)
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }
  const trackD = `M ${arcPath(0)} A ${r} ${r} 0 ${totalAngle > 180 ? 1 : 0} 1 ${arcPath(totalAngle)}`
  const fillAngle = pct * totalAngle
  const fillD = `M ${arcPath(0)} A ${r} ${r} 0 ${fillAngle > 180 ? 1 : 0} 1 ${arcPath(fillAngle)}`
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size}>
        <path d={trackD} fill="none" stroke="#efefef" strokeWidth="8" strokeLinecap="round" />
        <path d={fillD} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#111111" fontSize={size > 80 ? 15 : 12} fontWeight="700">{label}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#767676" fontSize={12}>{sublabel}</text>
      </svg>
    </div>
  )
}

export default function FitbitSection({ fitbitData, onUpdate, connected }: FitbitSectionProps) {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  const sync = async () => {
    setSyncing(true); setError('')
    try {
      const data = await fetchFitbitDay()
      onUpdate(data)
      ls.setStr(FB_FETCH_KEY, today())
    } catch (e) { setError((e as Error).message) }
    setSyncing(false)
  }

  const startAuth = async () => {
    const { verifier, challenge } = await pkce()
    ls.setStr(FB_VERIFIER_KEY, verifier)
    window.location.href = fitbitAuthUrl(challenge)
  }

  if (!connected) {
    return (
      <Section title="FITBIT" accent="#4a86d8">
        <div style={{ fontSize: 13.5, color: '#767676', marginBottom: 12, lineHeight: 1.6 }}>
          Connect Fitbit to automatically pull your steps, sleep, and heart rate each day.
        </div>
        <button onClick={() => void startAuth()} style={{ padding: '10px 24px', background: '#4a86d8', color: '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
          Connect Fitbit
        </button>
      </Section>
    )
  }

  const f = fitbitData
  const fetchTime = f?.fetchedAt ? new Date(f.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <Section title="FITBIT" accent="#4a86d8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#767676' }}>{fetchTime ? `Synced ${fetchTime}` : 'Not synced today'}</div>
        <button onClick={() => void sync()} disabled={syncing}
          style={{ padding: '6px 14px', background: '#eef4fc', color: '#333333', border: '1px solid #a0b8e8', borderRadius: 20, fontSize: 12, fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="refresh" size={13} color="#5a8ad0" />{syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#111111', marginBottom: 8 }}>{error}</div>}
      {syncing && <div style={{ marginBottom: 10 }}><Spinner label="Syncing Fitbit data…" /></div>}
      {f && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
            <Arc value={f.steps || 0} max={10000} color="#4a86d8" size={88}
              label={(f.steps || 0) >= 1000 ? Math.round((f.steps || 0) / 100) / 10 + 'k' : String(f.steps || 0)}
              sublabel="STEPS" />
            {(f.sleepMins ?? 0) > 0 && <Arc value={f.sleepMins ?? 0} max={480} color="#6a96d8" size={88}
              label={fmtMins(f.sleepMins ?? 0)} sublabel="SLEEP" />}
            {f.restingHR && <Arc value={f.restingHR} max={100} color="#e8457a" size={88}
              label={String(f.restingHR)} sublabel="HR BPM" />}
            {(f.calsBurned ?? 0) > 0 && <Arc value={f.calsBurned ?? 0} max={2500} color="#9ebd6e" size={88}
              label={(f.calsBurned ?? 0) >= 1000 ? Math.round((f.calsBurned ?? 0) / 100) / 10 + 'k' : String(f.calsBurned ?? 0)}
              sublabel="BURNED" />}
          </div>
          {(f.sleepMins ?? 0) > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {([['Deep', f.deepMins, '#26b5a8'], ['REM', f.remMins, '#4a86d8'], ['Light', f.lightMins, '#78bfea']] as [string, number | undefined, string][]).map(([label, val, color]) => (
                <div key={label} style={{ flex: 1, padding: '8px 6px', background: '#f5f5f5', borderRadius: 10, textAlign: 'center', border: '1px solid #efefef' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmtMins(val ?? 0)}</div>
                  <div style={{ fontSize: 12, color: '#767676', marginTop: 2, letterSpacing: 0.8 }}>{label.toUpperCase()}</div>
                </div>
              ))}
              {(f.activeMin ?? 0) > 0 && (
                <div style={{ flex: 1, padding: '8px 6px', background: '#f5f5f5', borderRadius: 10, textAlign: 'center', border: '1px solid #efefef' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>{f.activeMin}m</div>
                  <div style={{ fontSize: 12, color: '#767676', marginTop: 2, letterSpacing: 0.8 }}>ACTIVE</div>
                </div>
              )}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#767676' }}>Daily step goal</span>
              <span style={{ fontSize: 12, color: '#111111', fontWeight: 600 }}>{(((f.steps || 0) / 10000) * 100).toFixed(0)}%</span>
            </div>
            <div style={{ background: '#efefef', borderRadius: 6, height: 6 }}>
              <div style={{ width: Math.min(100, (f.steps || 0) / 10000 * 100) + '%', height: '100%', background: '#4a86d8', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      )}
      {!f && !syncing && (
        <div style={{ fontSize: 13, color: '#767676' }}>Tap Sync to pull today's data from Fitbit.</div>
      )}
    </Section>
  )
}
