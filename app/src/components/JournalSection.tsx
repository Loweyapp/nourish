import { useState, useRef } from 'react'
import type { DayEntry, JournalNote } from '../types'
import { Section } from './shared'

type SR = { start(): void; stop(): void; lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: SpeechRecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null }
type SRConstructor = new () => SR
declare const webkitSpeechRecognition: SRConstructor | undefined

interface JournalSectionProps {
  entry: DayEntry
  currentDay: string
  onUpdate: (d: Partial<DayEntry>) => void
}

function formatNoteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function JournalSection({ entry, currentDay, onUpdate }: JournalSectionProps) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const recognitionRef = useRef<SR | null>(null)
  const notes = entry.notes ?? []

  const save = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const note: JournalNote = {
      text: trimmed,
      timestamp: new Date().toISOString().replace('Z', '').slice(0, 19) + '',
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
    const updated = notes.map((n, i) => i === idx ? { ...n, text: trimmed } : n)
    onUpdate({ notes: updated })
    setEditIdx(null)
  }

  const startDictation = () => {
    const SRClass: SRConstructor | undefined = typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : undefined
    if (!SRClass) { alert('Speech recognition is not supported in this browser. Try Chrome on Android or desktop.'); return }
    const r = new SRClass()
    r.lang = 'en-GB'
    r.continuous = true
    r.interimResults = false
    r.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(res => res[0]?.transcript ?? '').join(' ')
      setText(prev => (prev ? prev + ' ' : '') + transcript)
    }
    r.onerror = () => { setRecording(false) }
    r.onend = () => { setRecording(false) }
    r.start()
    recognitionRef.current = r
    setRecording(true)
  }

  const stopDictation = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  // Determine if currentDay is today (for timestamping)
  const isToday = currentDay === new Date().toISOString().split('T')[0]

  return (
    <Section title="JOURNAL" accent="#5a9ea0">
      <div style={{ fontSize: 12, color: '#767676', marginBottom: 12, lineHeight: 1.6 }}>
        How are you feeling? Note symptoms, energy, sleep quality, anything that might be relevant.
      </div>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {notes.map((note, i) => (
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
                  <div style={{ fontSize: 11, color: '#aaaaaa', marginBottom: 4, fontWeight: 500 }}>
                    {formatNoteTime(note.timestamp)}
                  </div>
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
          ))}
        </div>
      )}

      {/* New note input */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={notes.length === 0
          ? 'e.g. Woke up feeling tired. Slight headache since lunchtime…'
          : 'Add another note…'}
        style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={save} disabled={!text.trim()}
          style={{ padding: '9px 20px', background: text.trim() ? '#5a9ea0' : '#e0e0e0', color: text.trim() ? '#fff' : '#aaaaaa', border: 'none', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
          {isToday ? 'Add note' : 'Add note (past day)'}
        </button>
        <button
          onMouseDown={startDictation}
          onMouseUp={stopDictation}
          onTouchStart={startDictation}
          onTouchEnd={stopDictation}
          style={{ padding: '9px 16px', background: recording ? '#e8457a' : '#f5f5f5', color: recording ? '#fff' : '#767676', border: '1.5px solid #efefef', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600, userSelect: 'none' }}>
          {recording ? '● Recording…' : '🎤 Hold to dictate'}
        </button>
      </div>
      {recording && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#e8457a' }}>Listening — speak now. Release to stop.</div>
      )}
    </Section>
  )
}
