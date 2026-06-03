import type { ReactNode } from 'react'

interface AnalyseBtnProps {
  onClick?: () => void
  disabled?: boolean
  color?: string
  children: ReactNode
}

export default function AnalyseBtn({ onClick, disabled, color = '#9ebd6e', children }: AnalyseBtnProps) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '10px 22px', background: disabled ? '#e0e0e0' : color, color: disabled ? '#aaaaaa' : '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, marginTop: 6, letterSpacing: 0.2 }}>
      {children}
    </button>
  )
}
