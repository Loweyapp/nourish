import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  accent?: string
  children: ReactNode
}

export default function Section({ title, accent = '#9ebd6e', children }: SectionProps) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid #efefef' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#555555', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}
