import { useState } from 'react'
import type { Favourite } from '../types'
import {
  getApiKey, saveApiKey,
  getCoachingStyle, saveCoachingStyle,
  getFavourites, addFavourite, removeFavourite,
  clearFitbitToken, getFitbitToken,
  clearGDriveToken, isGDriveConnected, getLastBackup,
  loadEntries, backupToDrive,
  clearDummyData,
  getLifetimeUsage,
  ls, USAGE_KEY,
} from '../lib'
import { sessionUsage, calcCost, estimateCost, askClaude, extractJSON } from '../lib'
import { startGDriveAuth } from '../lib'

interface SettingsScreenProps {
  onClose: () => void
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontWeight: 700, fontSize: 15, color: '#111111', marginBottom: 10 }}>{children}</div>
)

const SectionDivider = () => <div style={{ borderTop: '1px solid #efefef', margin: '20px 0' }} />

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const [key, setKey] = useState(getApiKey())
  const [keySaved, setKeySaved] = useState(false)
  const [coaching, setCoaching] = useState(getCoachingStyle())
  const [coachingSaved, setCoachingSaved] = useState(false)
  const [backing, setBacking] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupErr, setBackupErr] = useState('')
  const [favs, setFavs] = useState<Favourite[]>(() => getFavourites())
  const [newFavText, setNewFavText] = useState('')
  const [newFavCals, setNewFavCals] = useState('')
  const connected = !!getFitbitToken()
  const driveConnected = isGDriveConnected()
  const lastBackup = getLastBackup()
  const disconnectFitbit = () => { clearFitbitToken(); window.location.reload() }
  const manualBackup = async () => {
    setBacking(true); setBackupMsg(''); setBackupErr('')
    try {
      const entries = loadEntries()
      const filename = await backupToDrive(entries)
      setBackupMsg('✓ Backed up as ' + filename)
    } catch (e) { setBackupErr((e as Error).message) }
    setBacking(false)
  }
  const [favEstimating, setFavEstimating] = useState(false)
  const addFav = async () => {
    if (!newFavText.trim()) return
    let cals = newFavCals ? parseInt(newFavCals) : null
    if (!cals) {
      setFavEstimating(true)
      try {
        const resp = await askClaude(
          [{ role: 'user', content: `Estimate calories for: "${newFavText.trim()}"` }],
          'You are a nutrition expert. Return ONLY a JSON object with a single field: {"calories": <integer>}. Use a typical UK serving size. No markdown, no explanation.'
        )
        const parsed = JSON.parse(extractJSON(resp)) as { calories?: number }
        cals = parsed.calories || 0
      } catch { cals = 0 }
      setFavEstimating(false)
    }
    addFavourite({ text: newFavText.trim(), calories: cals ?? 0, protein_g: 0, carbs_g: 0, fat_g: 0, units: 0 })
    setFavs(getFavourites())
    setNewFavText(''); setNewFavCals('')
  }
  const removeFav = (text: string) => {
    removeFavourite(text)
    setFavs(getFavourites())
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f5f5f5', zIndex: 100, padding: 24, overflowY: 'auto' }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#767676', fontSize: 16, fontFamily: 'inherit', marginBottom: 20 }}>← Back</button>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Settings</div>

      {/* API Key */}
      <div>
        <Label>Anthropic API Key</Label>
        <input type="password" value={key} onChange={e => setKey(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${key.trim() && !key.trim().startsWith('sk-ant-') ? '#e8457a' : '#efefef'}`, background: '#fff', fontFamily: 'monospace', fontSize: 14, color: '#111111', outline: 'none', marginBottom: 10 }} />
        {key.trim() && !key.trim().startsWith('sk-ant-') && (
          <div style={{ fontSize: 12, color: '#e8457a', marginBottom: 8 }}>Key should start with <span style={{ fontFamily: 'monospace' }}>sk-ant-</span></div>
        )}
        <button
          onClick={() => {
            const trimmed = key.trim()
            if (!trimmed.startsWith('sk-ant-')) return
            saveApiKey(trimmed); setKeySaved(true); setTimeout(() => setKeySaved(false), 2000)
          }}
          disabled={!key.trim().startsWith('sk-ant-')}
          style={{ padding: '10px 20px', background: key.trim().startsWith('sk-ant-') ? '#9ebd6e' : '#e0e0e0', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
          {keySaved ? 'Saved ✓' : 'Save key'}
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: '#767676', lineHeight: 1.7 }}>
          Stored only in this browser.<br />
          {key ? <span style={{ fontFamily: 'monospace', color: '#111111' }}>{key.slice(0, 10)}…{key.slice(-4)} ({key.length} chars)</span> : 'No key stored.'}
        </div>
      </div>

      <SectionDivider />

      {/* Usage */}
      <div>
        <Label>API Usage</Label>
        {(() => {
          const lifetime = getLifetimeUsage()
          const lifetimeCost = calcCost(lifetime.input, lifetime.output)
          const sessionCost = estimateCost()
          const lifetimeInputK  = (lifetime.input  / 1000).toFixed(1)
          const lifetimeOutputK = (lifetime.output / 1000).toFixed(1)
          const sessionInputK   = (sessionUsage.input  / 1000).toFixed(1)
          const sessionOutputK  = (sessionUsage.output / 1000).toFixed(1)
          return (
            <div>
              <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#767676', marginBottom: 4 }}>Total spend (all time)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111111', lineHeight: 1 }}>{lifetimeCost}</div>
                <div style={{ fontSize: 12, color: '#767676', marginTop: 4 }}>{lifetimeInputK}k input · {lifetimeOutputK}k output tokens</div>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#767676' }}>This session</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>{sessionCost}</div>
                </div>
                <div style={{ fontSize: 12, color: '#767676' }}>{sessionInputK}k input · {sessionOutputK}k output</div>
                <div style={{ fontSize: 12, color: '#767676', marginTop: 8, borderTop: '1px solid #efefef', paddingTop: 8 }}>
                  Pricing: ~£2.37/M input · ~£11.85/M output (Claude Sonnet 4)<br />
                  <a href="https://console.anthropic.com/usage" target="_blank" rel="noopener"
                    style={{ color: '#111111', textDecoration: 'none', fontWeight: 600 }}>View full account usage →</a>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { ls.set(USAGE_KEY, { input: 0, output: 0 }); window.location.reload() }}
                  style={{ fontSize: 12, color: '#767676', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
                  Reset lifetime total
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      <SectionDivider />

      {/* Coaching style */}
      <div>
        <Label>Coaching Style</Label>
        <div style={{ fontSize: 12, color: '#767676', marginBottom: 8, lineHeight: 1.6 }}>
          Tell the AI how you want it to respond. This is added to every prompt across the whole app.
        </div>
        <textarea value={coaching} onChange={e => setCoaching(e.target.value)}
          placeholder={'e.g. Be encouraging about my weight loss journey. Berate me if I haven\'t exercised in a few days. Don\'t be preachy about alcohol — I know. Celebrate small wins enthusiastically.'}
          style={{ width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', resize: 'vertical', outline: 'none', marginBottom: 10 }} />
        <button onClick={() => { saveCoachingStyle(coaching); setCoachingSaved(true); setTimeout(() => setCoachingSaved(false), 2000) }}
          style={{ padding: '10px 20px', background: '#9ebd6e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
          {coachingSaved ? 'Saved ✓' : 'Save style'}
        </button>
        {coaching && <div style={{ marginTop: 8, fontSize: 12, color: '#111111' }}>✓ Custom style active</div>}
      </div>

      <SectionDivider />

      {/* Fitbit */}
      <div>
        <Label>Fitbit</Label>
        {connected ? (
          <div>
            <div style={{ fontSize: 13, color: '#111111', marginBottom: 10 }}>✓ Connected</div>
            <button onClick={disconnectFitbit}
              style={{ padding: '10px 20px', background: '#e8457a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
              Disconnect Fitbit
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#767676' }}>Not connected. Use the Fitbit section on the Log tab to connect.</div>
        )}
      </div>

      <SectionDivider />

      {/* Google Drive Backup */}
      <div>
        <Label>Google Drive Backup</Label>
        {driveConnected ? (
          <div>
            <div style={{ fontSize: 13, color: '#111111', marginBottom: 6 }}>✓ Connected</div>
            {lastBackup && <div style={{ fontSize: 12, color: '#767676', marginBottom: 10 }}>Last backup: {new Date(lastBackup).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { void manualBackup() }} disabled={backing}
                style={{ padding: '10px 20px', background: backing ? '#e0e0e0' : '#4a86d8', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
                {backing ? 'Backing up…' : '↑ Back up now'}
              </button>
              <button onClick={() => { clearGDriveToken(); window.location.reload() }}
                style={{ padding: '10px 20px', background: '#e8457a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
                Disconnect
              </button>
            </div>
            {backupMsg && <div style={{ marginTop: 8, fontSize: 12, color: '#111111' }}>{backupMsg}</div>}
            {backupErr && <div style={{ marginTop: 8, fontSize: 12, color: '#111111' }}>{backupErr}</div>}
            <div style={{ marginTop: 10, fontSize: 12, color: '#767676', lineHeight: 1.6 }}>
              Saves to a "Nourish Backups" folder in your Google Drive weekly. Backups are JSON files you can restore from if needed.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: '#767676', marginBottom: 10, lineHeight: 1.6 }}>
              Connect Google Drive to automatically back up your data weekly.
            </div>
            <button onClick={startGDriveAuth}
              style={{ padding: '10px 20px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 700 }}>
              Connect Google Drive
            </button>
          </div>
        )}
      </div>

      <SectionDivider />

      {/* Favourites */}
      <div>
        <Label>Favourites</Label>
        <div style={{ fontSize: 12, color: '#767676', marginBottom: 12, lineHeight: 1.6 }}>
          Saved items appear as a dropdown when you tap the food entry box. You can also save items directly from the log using the ⭐ Save button after analysing.
        </div>
        {favs.length > 0 ? (
          <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {favs.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#f9f9f9', borderRadius: 10, border: '1.5px solid #efefef' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#111111' }}>{f.name || f.text}</div>
                  {f.name && f.text !== f.name && <div style={{ fontSize: 11, color: '#aaaaaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.text}</div>}
                  <div style={{ fontSize: 12, color: '#767676', marginTop: 2 }}>{f.calories ? f.calories + ' kcal' : '— kcal not set'}</div>
                </div>
                <button onClick={() => removeFav(f.name || f.text)}
                  style={{ background: 'none', border: 'none', color: '#aaaaaa', fontSize: 18, padding: '4px 8px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#767676', marginBottom: 12 }}>No favourites saved yet.</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 160px' }}>
            <div style={{ fontSize: 12, color: '#767676', marginBottom: 4 }}>Name</div>
            <input value={newFavText} onChange={e => setNewFavText(e.target.value)}
              placeholder="e.g. Cup of tea with milk"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 13, color: '#111111', outline: 'none' }} />
          </div>
          <div style={{ flex: '1 1 70px' }}>
            <div style={{ fontSize: 12, color: '#767676', marginBottom: 4 }}>Kcal (optional)</div>
            <input type="number" value={newFavCals} onChange={e => setNewFavCals(e.target.value)}
              placeholder="AI estimate"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 13, color: '#111111', outline: 'none' }} />
          </div>
          <button onClick={() => { void addFav() }} disabled={!newFavText.trim() || favEstimating}
            style={{ padding: '9px 16px', background: (!newFavText.trim() || favEstimating) ? '#e0e0e0' : '#9ebd6e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>
            {favEstimating ? 'Estimating…' : '+ Add'}
          </button>
        </div>
      </div>

      <SectionDivider />

      {/* Demo data */}
      <div>
        <Label>Demo Data</Label>
        <div style={{ fontSize: 12, color: '#767676', marginBottom: 10, lineHeight: 1.6 }}>
          7 days of sample data was added so you can preview the graphs. Remove it when you're ready to use the app for real.
        </div>
        <button onClick={() => { clearDummyData(); window.location.reload() }}
          style={{ padding: '10px 20px', background: '#e8457a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
          Clear demo data
        </button>
      </div>
    </div>
  )
}
