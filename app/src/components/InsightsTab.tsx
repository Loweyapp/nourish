import type { DayEntry } from '../types'

interface InsightsTabProps {
  entries: Record<string, DayEntry>
}

// Implemented in chunk 10
export default function InsightsTab(_: InsightsTabProps) {
  return <div style={{ padding: 24, color: '#767676', textAlign: 'center' }}>Insights tab — migration in progress</div>
}
