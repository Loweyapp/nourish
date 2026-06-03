interface HourSelectProps {
  value?: string
  onChange: (v: string) => void
}

export default function HourSelect({ value, onChange }: HourSelectProps) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ fontSize: 12, color: '#767676', background: 'none', border: 'none', borderBottom: '1px dashed #e0e0e0', padding: '2px 4px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
      {Array.from({ length: 19 }, (_, i) => i + 6).map(h => {
        const val = `${String(h).padStart(2, '0')}:00`
        const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
        return <option key={h} value={val}>{label}</option>
      })}
    </select>
  )
}
