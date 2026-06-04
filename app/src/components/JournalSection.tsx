import { useState, useRef } from 'react'
import type { DayEntry, JournalNote } from '../types'
import { Section } from './shared'

type SR = { start(): void; stop(): void; lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: SpeechRecognitionEvent) => void) | null; onerror: ((e: Event) => void) | null; onend: (() => void) | null }
type SRConstructor = new () => SR
declare const webkitSpeechRecognition: SRConstructor | undefined

function formatNoteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface JournalSectionProps {
  entry: DayEntry
  currentDay: string
  onUpdate: (d: Partial<DayEntry>) => void
}

export default function JournalSection({ entry, currentDay, onUpdate }: JournalSectionProps) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const recognitionRef = useRef<SR | null>(null)
  const shouldRestartRef = useRef(false)
  const notes = entry.notes ?? []

  const isToday = currentDay === new Date().toISOString().split('T')[0]

  const save = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const note: JournalNote = {
      text: trimmed,
      timestamp: new Date().toISOString().slice(0, 19),
    }
    onUpdate({ notes: [...notes, note] })
    setText('')
  }

  const deleteNote = (idx: number) => {
    onUpdate({ notes: notes.filter((_, i) => i !== idx) })
  }

  const saveEdit = (idx: number) => {
    const trimmed = editText.trim()
    if (!trimmed) return
    onUpdate({ notes: notes.map((n, i) => i === idx ? { ...n, text: trimmed } : n) })
    setEditIdx(null)
  }

  const getSRClass = (): SRConstructor | null => {
    if (typeof webkitSpeechRecognition !== 'undefined') return webkitSpeechRecognition
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window) return (window as unknown as { SpeechRecognition: SRConstructor }).SpeechRecognition
    return null
  }

  const startRecognition = (SRClass: SRConstructor) => {
    const r = new SRClass()
    r.lang = 'en-GB'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(res => res[0]?.transcript ?? '').join(' ')
      if (transcript.trim()) setText(prev => (prev.trim() ? prev.trim() + ' ' : '') + transcript.trim())
    }
    r.onerror = () => { /* ignore — onend will handle restart */ }
    r.onend = () => {
      // Auto-restart if user hasn't tapped stop
      if (shouldRestartRef.current) {
        try { r.start() } catch { /* already stopped */ }
      } else {
        setRecording(false)
      }
    }
    r.start()
    recognitionRef.current = r
  }

  const toggleDictation = () => {
    if (recording) {
      shouldRestartRef.current = false
      recognitionRef.current?.stop()
      setRecording(false)
    } else {
      const SRClass = getSRClass()
      if (!SRClass) {
        alert('Speech recognition is not supported in this browser. Try Chrome on Android or desktop.')
        return
      }
      shouldRestartRef.current = true
      setRecording(true)
      startRecognition(SRClass)
    }
  }

  return (
    <Section title="JOURNAL" accent="#5a9ea0">
      <div style={{ fontSize: 12, color: '#767676', marginBottom: 12, lineHeight: 1.6 }}>
        How are you feeling? Note symptoms, energy, sleep quality, anything that might be relevant.
      </div>

      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {[...notes].reverse().map((note, _ri) => {
            const i = notes.length - 1 - _ri
            return (
            <div key={i} style={{ background: '#f9f9f9', borderRadius: 12, border: '1.5px solid #efefef', padding: '10px 12px' }}>
              {editIdx === i ? (
                <div>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)}
                    style={{ width: '100%', minHeight: 70, padding: '8px 10px', borderRadius: 10, border: '1.5px solid #5a9ea0', background: '#fff', fontFamily: 'inherit', fontSize: 13, color: '#111111', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={() => saveEdit(i)}
                      style={{ padding: '6px 14px', background: '#5a9ea0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>Save</button>
                    <button onClick={() => setEditIdx(null)}
                      style={{ padding: '6px 14px', background: 'none', border: '1.5px solid #efefef', color: '#767676', borderRadius: 8, fontSize: 12, fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: '#aaaaaa', marginBottom: 4, fontWeight: 500 }}>{formatNoteTime(note.timestamp)}</div>
                  <div style={{ fontSize: 13, color: '#111111', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.text}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={() => { setEditIdx(i); setEditText(note.text) }}
                      style={{ background: 'none', border: 'none', color: '#aaaaaa', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>Edit</button>
                    <button onClick={() => deleteNote(i)}
                      style={{ background: 'none', border: 'none', color: '#e8457a', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={notes.length === 0 ? 'e.g. Woke up feeling tired. Slight headache since lunchtime…' : 'Add another note…'}
        style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
      />

      {recording && (
        <div style={{ margin: '6px 0', fontSize: 12, color: '#e8457a', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8457a', display: 'inline-block', animation: 'pulse 1s infinite' }} />
          Listening — speak now. Tap Stop when done.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={!text.trim()}
          style={{ padding: '9px 20px', background: text.trim() ? '#5a9ea0' : '#e0e0e0', color: text.trim() ? '#fff' : '#aaaaaa', border: 'none', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
          {isToday ? 'Add note' : 'Add note (past day)'}
        </button>
        <button onClick={toggleDictation}
          style={{ padding: '9px 16px', background: recording ? '#e8457a' : '#f5f5f5', color: recording ? '#fff' : '#767676', border: '1.5px solid #efefef', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
          {recording ? '■ Stop' : '🎤 Dictate'}
        </button>
      </div>
    </Section>
  )
}
