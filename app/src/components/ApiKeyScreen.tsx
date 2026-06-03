import { useState } from 'react'
import { saveApiKey } from '../lib'

interface ApiKeyScreenProps {
  onSave: () => void
}

export default function ApiKeyScreen({ onSave }: ApiKeyScreenProps) {
  const [key, setKey] = useState('')
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#111111', marginBottom: 8 }}>✦ Nourish</div>
        <div style={{ fontSize: 14, color: '#767676', marginBottom: 24, lineHeight: 1.6 }}>
          Enter your Anthropic API key to get started. Stored only on this device.
        </div>
        <div style={{ fontSize: 13, color: '#767676', marginBottom: 8 }}>Get a key at <b>console.anthropic.com</b></div>
        <input type="password" placeholder="sk-ant-..." value={key} onChange={e => setKey(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'monospace', fontSize: 14, color: '#111111', outline: 'none', marginBottom: 12 }} />
        <button onClick={() => { if (key.trim()) { saveApiKey(key.trim()); onSave() } }}
          style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#9ebd6e,#7aA050)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', fontWeight: 700 }}>
          Get started
        </button>
      </div>
    </div>
  )
}
