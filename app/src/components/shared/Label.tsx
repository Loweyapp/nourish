import type { ReactNode } from 'react'

export default function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#767676', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{children}</div>
}
