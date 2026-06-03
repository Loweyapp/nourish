import { useState, useRef, useEffect } from 'react'
import { askClaude } from '../../lib'
import Spinner from './Spinner'

interface ChatWidgetProps {
  systemPrompt: string
  contextSummary?: string
  placeholder?: string
}

export default function ChatWidget({ systemPrompt, contextSummary, placeholder = 'Ask a follow-up…' }: ChatWidgetProps) {
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history, loading])
  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setInput(''); setLoading(true); setError('')
    const msgs = contextSummary
      ? [{ role: 'user', content: 'Please acknowledge the context.' }, { role: 'assistant', content: contextSummary }, ...history, userMsg]
      : [...history, userMsg]
    try {
      const reply = await askClaude(msgs as Parameters<typeof askClaude>[0], systemPrompt)
      setHistory(p => [...p, userMsg, { role: 'assistant', content: reply }])
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #efefef', paddingTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#767676', letterSpacing: 1, marginBottom: 8 }}>💬 ASK A FOLLOW-UP</div>
      {history.length > 0 && (
        <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? '#9ebd6e' : '#f0f0f0', color: m.role === 'user' ? '#fff' : '#333333', fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          ))}
          {loading && <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: '#f0f0f0', borderRadius: '14px 14px 14px 4px' }}><Spinner small /></div>}
          <div ref={bottomRef} />
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: '#111111', marginBottom: 6 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} placeholder={placeholder}
          style={{ flex: 1, padding: '10px 13px', borderRadius: 10, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', outline: 'none' }} />
        <button onClick={() => void send()} disabled={!input.trim() || loading}
          style={{ padding: '10px 16px', background: '#9ebd6e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 18, fontFamily: 'inherit', fontWeight: 700 }}>↑</button>
      </div>
    </div>
  )
}
