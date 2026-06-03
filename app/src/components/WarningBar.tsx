import type { DayEntry } from '../types'
import { today, getMealWarnings } from '../lib'

export default function WarningBar({ entries }: { entries: Record<string, DayEntry> }) {
  const entry = entries[today()] ?? {}
  const warnings = getMealWarnings(entry)
  if (!warnings.length) return null
  return (
    <div style={{ background: '#f0c040', padding: '0 16px' }}>
      {warnings.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < warnings.length - 1 ? '1px solid #c8a000' : 'none', fontSize: 12, color: '#3d2800', fontWeight: 500 }}>
          <span style={{ flexShrink: 0, background: '#000', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#111111', lineHeight: 1 }}>!</span>
          <span>{w.msg}</span>
        </div>
      ))}
    </div>
  )
}
