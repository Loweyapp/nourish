import { useState } from 'react'
import type { DayEntry, FoodItem, DrinkItem, FitbitData } from '../types'
import { buildDayContext, LOG_LAYOUT_KEY } from '../lib'
import DraggableLayout from './DraggableLayout'
import FoodSection from './FoodSection'
import FitbitSection from './FitbitSection'
import MoodSection from './MoodSection'
import ExerciseSection from './ExerciseSection'
import WeightSection from './WeightSection'
import BPSection from './BPSection'

interface LogTabProps {
  entry: DayEntry
  allEntries: Record<string, DayEntry>
  currentDay: string
  onChange: (data: DayEntry) => void
  fitbitConnected: boolean
}

const LOG_DEFAULT = ['food', 'fitbit', 'mood', 'exercise', 'weight', 'bp']

export default function LogTab({ entry, allEntries, currentDay, onChange, fitbitConnected }: LogTabProps) {
  const [editLayout, setEditLayout] = useState(false)
  const dayContext = buildDayContext(entry)
  const updateFitbit = (fitbit: FitbitData) => onChange({ ...entry, fitbit })

  const renderSection = (id: string) => {
    switch (id) {
      case 'food': return <FoodSection foodItems={(entry.food ?? []) as FoodItem[]} onUpdate={(food) => onChange({ ...entry, food })} alcoholItems={(entry.alcohol ?? []) as DrinkItem[]} onAlcoholUpdate={(alcohol) => onChange({ ...entry, alcohol })} dayContext={dayContext} fitbitData={entry.fitbit} />
      case 'fitbit': return <FitbitSection fitbitData={entry.fitbit} onUpdate={updateFitbit} connected={fitbitConnected} />
      case 'mood': return <MoodSection entry={entry as Parameters<typeof MoodSection>[0]['entry']} onUpdate={(d) => onChange({ ...entry, ...d } as DayEntry)} dayContext={dayContext} />
      case 'exercise': return <ExerciseSection entry={entry as Parameters<typeof ExerciseSection>[0]['entry']} onUpdate={(d) => onChange({ ...entry, ...d } as DayEntry)} dayContext={dayContext} />
      case 'weight': return <WeightSection entry={entry as Parameters<typeof WeightSection>[0]['entry']} allEntries={allEntries} currentDay={currentDay} onUpdate={(d) => onChange({ ...entry, ...d } as DayEntry)} dayContext={dayContext} />
      case 'bp': return <BPSection entry={entry} onUpdate={(d) => onChange({ ...entry, ...d })} />
      default: return null
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: editLayout ? 12 : 0 }}>
        <button onClick={() => setEditLayout(v => !v)}
          style={{ background: editLayout ? '#6a9e6a' : 'none', border: editLayout ? 'none' : '1.5px solid #efefef', color: editLayout ? '#fff' : '#767676', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontFamily: 'inherit', fontWeight: 600, marginBottom: editLayout ? 0 : 12 }}>
          {editLayout ? '✓ Done' : '✎ Edit layout'}
        </button>
      </div>
      {editLayout && (
        <div style={{ fontSize: 12, color: '#767676', marginBottom: 12, textAlign: 'center' }}>
          Use the ↑↓ buttons to reorder sections
        </div>
      )}
      <DraggableLayout storageKey={LOG_LAYOUT_KEY} defaultOrder={LOG_DEFAULT} editMode={editLayout} renderSection={renderSection} />
    </div>
  )
}
