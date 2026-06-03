import type { ReactNode } from 'react'

interface PillProps {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  color?: string
}

export default function Pill({ selected, onClick, children, color = '#9ebd6e' }: PillProps) {
  return (
    <button onClick={onClick} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${selected ? color : '#efefef'}`, background: selected ? color : 'transparent', color: selected ? '#fff' : '#767676', fontSize: 14, fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}
