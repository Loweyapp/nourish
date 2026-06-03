import { useState } from 'react'
import type { ReactNode } from 'react'
import { ls } from '../lib'

interface DraggableLayoutProps {
  storageKey: string
  defaultOrder: string[]
  editMode: boolean
  renderSection: (id: string) => ReactNode
}

export default function DraggableLayout({ storageKey, defaultOrder, editMode, renderSection }: DraggableLayoutProps) {
  const [order, setOrder] = useState<string[]>(() => {
    const saved = ls.get<string[] | null>(storageKey, null)
    if (saved && Array.isArray(saved) && saved.length === defaultOrder.length &&
      defaultOrder.every(id => saved.includes(id))) return saved
    return defaultOrder
  })

  const move = (idx: number, dir: number) => {
    const newOrder = [...order]
    const target = idx + dir
    if (target < 0 || target >= newOrder.length) return
    const a = newOrder[idx]!
    const b = newOrder[target]!
    newOrder[idx] = b
    newOrder[target] = a
    setOrder(newOrder)
    ls.set(storageKey, newOrder)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {order.map((id, idx) => {
        const content = renderSection(id)
        if (!content) return null
        return (
          <div key={id} style={{ position: 'relative' }}>
            {editMode && (
              <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, display: 'flex', flexDirection: 'row', gap: 6 }}>
                {(([[-1, false], [1, true]] as [number, boolean][]).map(([dir, flip]) => {
                  const disabled = dir === -1 ? idx === 0 : idx === order.length - 1
                  const col = disabled ? '#dddddd' : '#3a76d8'
                  return (
                    <button key={dir} onClick={() => move(idx, dir)} disabled={disabled}
                      style={{ width: 34, height: 34, borderRadius: '50%', background: disabled ? '#f5f5f5' : '#fff', border: `2.5px solid ${col}`, cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: disabled ? 'none' : '0 2px 8px #3a76d833', transition: 'all 0.15s', padding: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: flip ? 'rotate(180deg)' : 'none' }}>
                        <polyline points="2,10 7,4 12,10" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )
                }))}
              </div>
            )}
            {content}
          </div>
        )
      })}
    </div>
  )
}
