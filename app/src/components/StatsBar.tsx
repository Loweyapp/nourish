import { useState } from 'react'
import type { ReactNode } from 'react'
import type { DayEntry } from '../types'
import { today } from '../lib'
import { Icon } from './shared'

const Divider = () => <div style={{ width: 1, background: '#e8e8e8', margin: '4px 0' }} />

interface StatProps {
  label: string
  value: string | number
  unit?: string | undefined
  warn?: boolean | undefined
  onClick?: (() => void) | undefined
  clickable?: boolean | undefined
  icon?: ReactNode | undefined
}

const Stat = ({ label, value, unit, warn, onClick, clickable, icon }: StatProps) => (
  <div onClick={onClick} style={{ flex: '1 1 0', textAlign: 'center', minWidth: 0, padding: '10px 2px', cursor: clickable ? 'pointer' : 'default', borderRadius: clickable ? 8 : 0 }}>
    {icon && <div style={{ lineHeight: 1, marginBottom: 4, display: 'flex', justifyContent: 'center', opacity: 0.7 }}>{icon}</div>}
    <div style={{ fontSize: 18, fontWeight: 800, color: warn ? '#e8457a' : '#111111', lineHeight: 1.1 }}>
      {value}
      {unit && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 1, opacity: 0.7 }}>{unit}</span>}
    </div>
    <div style={{ fontSize: 12, color: '#444444', marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>
      {label}{clickable ? ' ⇄' : ''}
    </div>
  </div>
)

export default function StatsBar({ entries }: { entries: Record<string, DayEntry> }) {
  const [period, setPeriod] = useState('day')
  const [stepsMode, setStepsMode] = useState('steps')
  const [unitsMode, setUnitsMode] = useState('units')
  const [calsMode, setCalsMode] = useState('split')

  const getRange = (): string[] => {
    const td = today()
    if (period === 'day') return [td]
    const days: string[] = []
    const n = period === 'week' ? 7 : 30
    for (let i = 0; i < n; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days.push(d.toISOString().split('T')[0] as string)
    }
    return days
  }

  const range = getRange()
  const rangeEntries = range.map(d => entries[d]).filter((e): e is DayEntry => !!e)

  const calsIn  = rangeEntries.reduce((s, e) =>
    (e.food ?? []).reduce((a, f) => a + (f.calories || 0), s) +
    (e.alcohol ?? []).reduce((a, a2) => a + (a2.calories || 0), 0)
  , 0)
  const calsOut = rangeEntries.reduce((s, e) => s + (e.fitbit?.calsBurned || 0), 0)
  const netCals = calsIn - calsOut
  const steps   = rangeEntries.reduce((s, e) => s + (e.fitbit?.steps || 0), 0)
  const units   = rangeEntries.reduce((s, e) => (e.alcohol ?? []).reduce((a, a2) => a + (a2.units || 0), s), 0)

  const miles = steps ? (steps / 2000).toFixed(1) : null
  const pints = units ? (units / 2.3).toFixed(1) : null

  const warnUnits = units > (14 / 7) * (period === 'day' ? 1 : period === 'week' ? 7 : 30)

  return (
    <div style={{ background: '#ffffff', borderTop: '1px solid #efefef', padding: '8px 16px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 6 }}>
        {([['day', 'Day'], ['week', 'Week'], ['month', 'Month']] as [string, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)}
            style={{ padding: '3px 12px', background: period === k ? '#9ebd6e' : 'transparent', color: period === k ? '#fff' : '#767676', border: 'none', borderRadius: 20, fontSize: 12, fontFamily: 'inherit', fontWeight: period === k ? 700 : 400, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #efefef', paddingTop: 6 }}>
        <Stat label="NET CALS"
          value={calsIn || calsOut ? (netCals > 0 ? '+' : '') + netCals : '—'}
          unit={calsIn || calsOut ? 'kcal' : ''}
          warn={netCals > 500}
          icon={<Icon name="scale" size={22} color="#767676" />} />
        <Divider />
        <Stat
          label={calsMode === 'split' ? 'CALS IN' : 'CALS OUT'}
          value={calsMode === 'split' ? (calsIn || '—') : (calsOut || '—')}
          unit={(calsMode === 'split' ? calsIn : calsOut) ? 'kcal' : ''}
          icon={<Icon name={calsMode === 'split' ? 'weight' : 'flame'} size={22} color="#767676" />}
          clickable onClick={() => setCalsMode(m => m === 'split' ? 'net' : 'split')} />
        <Divider />
        <Stat
          label={stepsMode === 'steps' ? 'STEPS' : 'MILES'}
          value={stepsMode === 'steps'
            ? (steps ? (steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps) : '—')
            : (miles ?? '—')}
          icon={<Icon name="shoe" size={22} color="#767676" />}
          clickable onClick={() => setStepsMode(s => s === 'steps' ? 'miles' : 'steps')} />
        <Divider />
        <Stat
          label={unitsMode === 'units' ? 'UNITS' : 'PINTS'}
          value={unitsMode === 'units' ? (units ? units.toFixed(1) : '—') : (pints ?? '—')}
          warn={warnUnits}
          icon={<Icon name="beer" size={22} color="#767676" />}
          clickable onClick={() => setUnitsMode(u => u === 'units' ? 'pints' : 'units')} />
      </div>
    </div>
  )
}
