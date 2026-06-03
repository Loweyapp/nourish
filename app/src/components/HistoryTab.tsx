import type { DayEntry } from '../types'

interface HistoryTabProps {
  entries: Record<string, DayEntry>
  onSelectDay: (d: string) => void
}

// Implemented in chunk 9
export default function HistoryTab(_: HistoryTabProps) {
  return <div style={{ padding: 24, color: '#767676', textAlign: 'center' }}>History tab — migration in progress</div>
}
