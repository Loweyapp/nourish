interface ProgressBarProps {
  value: number
  max: number
  color?: string
}

export default function ProgressBar({ value, max, color = '#9ebd6e' }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ background: '#eeeeee', borderRadius: 6, height: 6, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.4s' }} />
    </div>
  )
}
