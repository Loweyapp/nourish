import Spinner from './Spinner'

interface AIBubbleProps {
  text?: string
  loading?: boolean
}

export default function AIBubble({ text, loading }: AIBubbleProps) {
  if (loading) return <div style={{ marginTop: 10 }}><Spinner /></div>
  if (!text) return null
  return (
    <div style={{ marginTop: 10, padding: '14px 16px', background: '#f8f8f8', borderLeft: '3px solid #9ebd6e', borderRadius: '0 12px 12px 0', fontSize: 14, lineHeight: 1.7, color: '#333333', whiteSpace: 'pre-wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#767676', display: 'block', marginBottom: 4 }}>✦ AI INSIGHT</span>
      {text}
    </div>
  )
}
