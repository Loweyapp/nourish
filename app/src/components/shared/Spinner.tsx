interface SpinnerProps {
  small?: boolean
  label?: string
}

export default function Spinner({ small, label }: SpinnerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#767676', fontSize: small ? 12 : 13 }}>
      <div style={{ width: small ? 12 : 16, height: small ? 12 : 16, border: '2px solid #efefef', borderTopColor: '#767676', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
      {label || (!small && 'Claude is thinking…')}
    </div>
  )
}
