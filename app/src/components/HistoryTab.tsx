import type { DayEntry } from '../types'
import { formatDate, fmtMins } from '../lib'

const MOODS = [
  { emoji: '😴', label: 'Exhausted', value: 1 },
  { emoji: '😔', label: 'Low', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '⚡', label: 'Energised', value: 5 },
]
const ENERGY = [
  { emoji: '🪫', label: 'Drained', value: 1 },
  { emoji: '😮‍💨', label: 'Tired', value: 2 },
  { emoji: '😌', label: 'Steady', value: 3 },
  { emoji: '💪', label: 'Strong', value: 4 },
  { emoji: '🔥', label: 'Peak', value: 5 },
]

interface HistoryTabProps {
  entries: Record<string, DayEntry>
  onSelectDay: (d: string) => void
}

export default function HistoryTab({ entries, onSelectDay }: HistoryTabProps) {
  const days = Object.entries(entries).sort((a, b) => b[0].localeCompare(a[0]))
  if (!days.length) return <div style={{ textAlign: 'center', padding: 40, color: '#767676' }}>No entries yet. Start logging today!</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {days.map(([d, e]) => {
        const cals = (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0) + (e.alcohol ?? []).reduce((s, a) => s + (a.calories || 0), 0)
        const moodObj = MOODS.find(m => m.value === e.mood)
        const energyObj = ENERGY.find(m => m.value === e.energy)
        return (
          <button key={d} onClick={() => onSelectDay(d)}
            style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', background: '#fff', fontFamily: 'inherit', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#111111', fontSize: 15 }}>{formatDate(d)}</div>
                <div style={{ fontSize: 12, color: '#767676', marginTop: 3 }}>
                  {(e.food ?? []).length} meals{cals ? ` · ${cals} kcal` : ''}
                  {e.fitbit?.steps ? ` · ${e.fitbit.steps.toLocaleString()} steps` : ''}
                  {e.fitbit?.sleepMins ? ` · ${fmtMins(e.fitbit.sleepMins)} sleep` : ''}
                  {e.exercise ? ' · active' : ''}
                  {e.weight ? ` · ${e.weight}kg` : ''}{e.bpSystolic && e.bpDiastolic ? ` · ${e.bpSystolic}/${e.bpDiastolic} mmHg` : ''}{e.alcohol?.length ? ` · ${e.alcohol.reduce((s, a) => s + (a.units || 0), 0).toFixed(1)}u alc` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 22 }}>
                {moodObj && <span>{moodObj.emoji}</span>}
                {energyObj && <span>{energyObj.emoji}</span>}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
