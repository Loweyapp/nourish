import type { DayEntry } from '../types'

interface LogTabProps {
  entry: DayEntry
  allEntries: Record<string, DayEntry>
  currentDay: string
  onChange: (data: DayEntry) => void
  fitbitConnected: boolean
}

// Implemented in chunk 7
export default function LogTab(_: LogTabProps) {
  return <div style={{ padding: 24, color: '#767676', textAlign: 'center' }}>Log tab — migration in progress</div>
}
