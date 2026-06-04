import type { DayEntry } from '../types'
import JournalSection from './JournalSection'
import GPReportModal from './GPReportModal'
import { useState } from 'react'

interface JournalTabProps {
  entry: DayEntry
  allEntries: Record<string, DayEntry>
  currentDay: string
  onChange: (data: DayEntry) => void
}

export default function JournalTab({ entry, allEntries, currentDay, onChange }: JournalTabProps) {
  const [showGPReport, setShowGPReport] = useState(false)
  return (
    <div>
      {showGPReport && <GPReportModal entries={allEntries} onClose={() => setShowGPReport(false)} />}
      <JournalSection entry={entry} currentDay={currentDay} onUpdate={d => onChange({ ...entry, ...d })} />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => setShowGPReport(true)}
          style={{ width: '100%', padding: '12px', background: '#fff', border: '1.5px solid #5a9ea0', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, color: '#5a9ea0', cursor: 'pointer' }}>
          📋 Generate GP report
        </button>
      </div>
    </div>
  )
}
