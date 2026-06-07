import { useState, useEffect } from 'react'
import {
  getApiKey, getFitbitToken,
  today, formatDate,
} from './lib'
import { Icon } from './components/shared'
import ApiKeyScreen from './components/ApiKeyScreen'
import SettingsScreen from './components/SettingsScreen'
import StatsBar from './components/StatsBar'
import WarningBar from './components/WarningBar'
import LogTab from './components/LogTab'
import HistoryTab from './components/HistoryTab'
import InsightsTab from './components/InsightsTab'
import JournalTab from './components/JournalTab'
import { useEntries } from './hooks/useEntries'

type Tab = 'log' | 'history' | 'insights' | 'journal'

export default function App() {
  const [hasKey, setHasKey] = useState(!!getApiKey())
  const [tab, setTab] = useState<Tab>('log')
  const [currentDay, setCurrentDay] = useState(today())
  const [showSettings, setShowSettings] = useState(false)
  const { entries, updateEntry, handleOAuthCallback, autoBackup, autoSyncFitbit } = useEntries()
  const fitbitConnected = !!getFitbitToken()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleOAuthCallback() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { autoBackup() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { autoSyncFitbit(fitbitConnected) }, [])

  useEffect(() => {
    if (!fitbitConnected) return
    const interval = setInterval(() => autoSyncFitbit(fitbitConnected), 60 * 60 * 1000)
    const onVisible = () => { if (document.visibilityState === 'visible') autoSyncFitbit(fitbitConnected) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitbitConnected])

  if (!hasKey) return <ApiKeyScreen onSave={() => setHasKey(true)} />
  if (showSettings) return <SettingsScreen onClose={() => setShowSettings(false)} />

  const isToday = currentDay === today()

  const selectDay = (d: string) => { setCurrentDay(d); setTab('log') }

  const navItems: Array<[Tab, string, 'log' | 'history' | 'insights' | 'journal']> = [
    ['log', 'Log', 'log'],
    ['journal', 'Journal', 'journal'],
    ['history', 'History', 'history'],
    ['insights', 'Insights', 'insights'],
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <WarningBar entries={entries} />
        <div style={{ background: '#ffffff', padding: '14px 16px 0', borderBottom: '1px solid #efefef' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111111', letterSpacing: -0.3 }}>
                ✦ Nourish
                <span style={{ fontSize: 11, fontWeight: 400, color: '#aaaaaa', marginLeft: 7, fontFamily: 'monospace', letterSpacing: 0 }}>{__APP_VERSION__}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {fitbitConnected && (
                <span style={{ fontSize: 12, color: '#767676', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="watch" size={14} color="#4a86d8" /> Fitbit
                </span>
              )}
              <button onClick={() => setShowSettings(true)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5f5f5', border: '1px solid #efefef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="settings" size={20} color="#767676" />
              </button>
            </div>
          </div>
          {/* Date navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button onClick={() => { const d = new Date(currentDay + 'T12:00:00'); d.setDate(d.getDate() - 1); setCurrentDay(d.toISOString().split('T')[0] as string); setTab('log') }}
              style={{ width: 30, height: 30, borderRadius: '50%', background: '#f5f5f5', border: '1px solid #efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="9,2 4,7 9,12" stroke="#767676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <input type="date" value={currentDay} max={today()} onChange={e => { if (e.target.value) { setCurrentDay(e.target.value); setTab('log') } }}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111111', lineHeight: 1 }}>
                {isToday ? 'Today' : formatDate(currentDay)}
              </div>
              <div style={{ fontSize: 11, color: '#aaaaaa', marginTop: 2 }}>tap to change date</div>
            </div>
            <button
              onClick={() => { const d = new Date(currentDay + 'T12:00:00'); d.setDate(d.getDate() + 1); const next = d.toISOString().split('T')[0] as string; if (next <= today()) { setCurrentDay(next); setTab('log') } }}
              disabled={isToday}
              style={{ width: 30, height: 30, borderRadius: '50%', background: isToday ? '#fafafa' : '#f5f5f5', border: '1px solid #efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isToday ? 'default' : 'pointer', flexShrink: 0, opacity: isToday ? 0.3 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="5,2 10,7 5,12" stroke="#767676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {!isToday && <button onClick={() => { setCurrentDay(today()); setTab('log') }}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#9ebd6e', color: '#fff', border: 'none', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>↩ today</button>}
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {navItems.map(([t, label, icon]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '8px 0 0', paddingBottom: 8, background: 'transparent', color: tab === t ? '#111111' : '#aaaaaa', border: 'none', borderBottom: tab === t ? '2.5px solid #9ebd6e' : '2.5px solid transparent', fontFamily: 'inherit', fontSize: 12, fontWeight: tab === t ? 700 : 500, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Icon name={icon} size={20} color={tab === t ? '#111111' : '#bbbbbb'} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <StatsBar entries={entries} />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 14px 80px' }}>
        {tab === 'log' && <LogTab entry={entries[currentDay] ?? {}} allEntries={entries} currentDay={currentDay} onChange={data => updateEntry(currentDay, data)} fitbitConnected={fitbitConnected} />}
        {tab === 'journal' && <JournalTab entry={entries[currentDay] ?? {}} allEntries={entries} currentDay={currentDay} onChange={data => updateEntry(currentDay, data)} />}
        {tab === 'history' && <HistoryTab entries={entries} onSelectDay={selectDay} />}
        {tab === 'insights' && <InsightsTab entries={entries} />}
      </div>
    </div>
  )
}
