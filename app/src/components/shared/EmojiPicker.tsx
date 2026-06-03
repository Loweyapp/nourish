interface EmojiOption {
  value: number
  label: string
  emoji: string
}

interface EmojiPickerProps {
  options: EmojiOption[]
  value?: number
  onChange: (v: number) => void
}

export default function EmojiPicker({ options, value, onChange }: EmojiPickerProps) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} title={o.label}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px 8px', borderRadius: 12, border: value === o.value ? '2px solid #9ebd6e' : '1.5px solid #efefef', background: value === o.value ? '#f5f5f5' : '#f9f9f9', transition: 'all 0.15s', fontFamily: 'inherit', cursor: 'pointer' }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{o.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: value === o.value ? 700 : 500, color: value === o.value ? '#333333' : '#767676', letterSpacing: 0.3 }}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
