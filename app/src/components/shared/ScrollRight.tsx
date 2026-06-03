import { useRef, useEffect } from 'react'
import type { ReactNode, CSSProperties } from 'react'

interface ScrollRightProps {
  children: ReactNode
  style?: CSSProperties
}

export default function ScrollRight({ children, style }: ScrollRightProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [])
  return <div ref={ref} style={{ overflowX: 'auto', ...style }}>{children}</div>
}
