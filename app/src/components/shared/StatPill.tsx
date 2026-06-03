interface StatPillProps {
  label: string
  value?: string | number | null
  unit?: string
  color: string
}

export default function StatPill({ label, value, unit, color }: StatPillProps) {
  return (
    <div style={{ flex: '1 1 90px', textAlign: 'center', padding: '10px 6px', background: '#f8f8f8', borderRadius: 12, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: '#767676', letterSpacing: 0.3, marginTop: 2 }}>{unit} {label}</div>
    </div>
  )
}
