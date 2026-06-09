import { useState, useRef } from 'react'
import type { DayEntry, BPSession, BPSessionLabel, BPReading } from '../types'
import { bpCategory } from '../lib'
import { Section } from './shared'

interface BPSectionProps {
  entry: DayEntry
  onUpdate: (d: Partial<DayEntry>) => void
}

const LABELS: BPSessionLabel[] = ['Morning', 'Afternoon', 'Evening', 'Other']

function defaultLabel(): BPSessionLabel {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  if (h < 21) return 'Evening'
  return 'Other'
}

function avg(readings: BPReading[]): BPReading {
  const filled = readings.filter(r => r.sys > 0 && r.dia > 0)
  if (!filled.length) return { sys: 0, dia: 0 }
  const sys = Math.round(filled.reduce((s, r) => s + r.sys, 0) / filled.length)
  const dia = Math.round(filled.reduce((s, r) => s + r.dia, 0) / filled.length)
  const pulses = filled.filter(r => r.pulse).map(r => r.pulse!)
  const pulse = pulses.length ? Math.round(pulses.reduce((s, p) => s + p, 0) / pulses.length) : undefined
  return { sys, dia, ...(pulse ? { pulse } : {}) }
}

function formatSessionTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const emptyReading = (): BPReading => ({ sys: 0, dia: 0 })

interface ReadingRowProps {
  reading: BPReading
  index: number
  onChange: (r: BPReading) => void
  sysRef: React.RefObject<HTMLInputElement | null>
  nextSysRef?: React.RefObject<HTMLInputElement | null> | undefined
}

function ReadingRow({ reading, index, onChange, sysRef, nextSysRef }: ReadingRowProps) {
  const diaRef = useRef<HTMLInputElement>(null)
  const pulseRef = useRef<HTMLInputElement>(null)

  const fieldRefs: Record<keyof BPReading, React.RefObject<HTMLInputElement | null>> = {
    sys: sysRef, dia: diaRef, pulse: pulseRef,
  }

  const fields: Array<[keyof BPReading, string, string]> = [
    ['sys', 'Sys', '120'],
    ['dia', 'Dia', '80'],
    ['pulse', 'Pulse', '72'],
  ]

  const handleChange = (key: keyof BPReading, raw: string) => {
    onChange({ ...reading, [key]: raw ? Number(raw) : 0 })
    if (raw.length >= 3) {
      if (key === 'sys') diaRef.current?.focus()
      else if (key === 'dia') pulseRef.current?.focus()
      else if (key === 'pulse') nextSysRef?.current?.focus()
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: '#aaaaaa', width: 20, textAlign: 'right', flexShrink: 0 }}>#{index + 1}</span>
      {fields.map(([key, label, ph]) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            ref={fieldRefs[key] as React.RefObject<HTMLInputElement>}
            type="number"
            inputMode="numeric"
            placeholder={ph}
            value={(reading[key] ?? 0) || ''}
            onChange={e => handleChange(key, e.target.value)}
            style={{ width: 60, padding: '8px 4px', borderRadius: 10, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: '#111111', outline: 'none', textAlign: 'center' }}
          />
          <span style={{ fontSize: 10, color: '#aaaaaa', marginTop: 2 }}>{label}{key === 'pulse' ? ' opt.' : ''}</span>
        </div>
      ))}
    </div>
  )
}

export default function BPSection({ entry, onUpdate }: BPSectionProps) {
  const rowSysRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const [addingSession, setAddingSession] = useState(false)
  const [label, setLabel] = useState<BPSessionLabel>(defaultLabel)
  const [readings, setReadings] = useState<BPReading[]>([emptyReading()])
  const [note, setNote] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sessions = entry.bpSessions ?? []
  const liveAvg = avg(readings)
  const liveValid = liveAvg.sys > 0 && liveAvg.dia > 0

  const saveSession = () => {
    if (!liveValid) return
    const id = new Date().toISOString().slice(0, 19)
    const session: BPSession = {
      id,
      label,
      timestamp: id,
      readings: readings.filter(r => r.sys > 0 && r.dia > 0),
      avg: liveAvg,
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    onUpdate({ bpSessions: [...sessions, session] })
    setReadings([emptyReading()])
    setNote('')
    setLabel(defaultLabel())
    setAddingSession(false)
  }

  const deleteSession = (id: string) => {
    onUpdate({ bpSessions: sessions.filter(s => s.id !== id) })
  }

  const sorted = [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  // Legacy single reading still in localStorage
  const hasLegacy = !sessions.length && entry.bpSystolic && entry.bpDiastolic
  const legacyCat = hasLegacy ? bpCategory(entry.bpSystolic!, entry.bpDiastolic!) : null

  return (
    <Section title="BLOOD PRESSURE" accent="#e8457a">

      {/* Legacy reading notice */}
      {hasLegacy && (
        <div style={{ background: '#fef6f8', border: '1.5px solid #f0c0c8', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#7a3040' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Old-format reading on file</div>
          <div>{entry.bpSystolic}/{entry.bpDiastolic} mmHg{entry.bpPulse ? ` · pulse ${entry.bpPulse} bpm` : ''}{legacyCat ? ` · ${legacyCat.label}` : ''}</div>
          <div style={{ fontSize: 11, color: '#aaaaaa', marginTop: 4 }}>New readings will use the improved format above.</div>
        </div>
      )}

      {/* Existing sessions */}
      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {sorted.map(s => {
            const cat = bpCategory(s.avg.sys, s.avg.dia)
            const expanded = expandedId === s.id
            return (
              <div key={s.id} style={{ background: '#f9f9f9', borderRadius: 12, border: '1.5px solid #efefef', overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => setExpandedId(expanded ? null : s.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#111111' }}>{s.label}</span>
                      <span style={{ fontSize: 11, color: '#aaaaaa' }}>{formatSessionTime(s.timestamp)}</span>
                      {cat && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: cat.text, background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 20, padding: '1px 8px' }}>{cat.short}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#e8457a', marginTop: 2 }}>
                      {s.avg.sys}/{s.avg.dia}
                      <span style={{ fontSize: 12, fontWeight: 400, color: '#767676', marginLeft: 6 }}>mmHg avg</span>
                      {s.avg.pulse && <span style={{ fontSize: 13, fontWeight: 400, color: '#767676', marginLeft: 10 }}>♥ {s.avg.pulse}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#aaaaaa', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid #efefef', padding: '10px 12px', background: '#fff' }}>
                    {s.readings.length > 1 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#aaaaaa', marginBottom: 4 }}>Individual readings</div>
                        {s.readings.map((r, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#555555', marginBottom: 2 }}>
                            #{i + 1}: {r.sys}/{r.dia} mmHg{r.pulse ? ` · ♥ ${r.pulse}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                    {s.note && <div style={{ fontSize: 12, color: '#555555', marginBottom: 8, lineHeight: 1.5 }}>{s.note}</div>}
                    <button onClick={() => deleteSession(s.id)}
                      style={{ background: 'none', border: 'none', color: '#e8457a', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
                      Delete session
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add session form */}
      {addingSession ? (
        <div style={{ background: '#fafafa', borderRadius: 12, border: '1.5px solid #e8457a33', padding: '12px 14px' }}>
          {/* Label picker */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {LABELS.map(l => (
              <button key={l} onClick={() => setLabel(l)}
                style={{ padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${label === l ? '#e8457a' : '#efefef'}`, background: label === l ? '#e8457a' : '#fff', color: label === l ? '#fff' : '#767676', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                {l}
              </button>
            ))}
          </div>

          {/* Readings */}
          <div style={{ marginBottom: 8 }}>
            {readings.map((r, i) => (
              <ReadingRow key={i} reading={r} index={i}
                sysRef={rowSysRefs[i]!}
                nextSysRef={rowSysRefs[i + 1]}
                onChange={updated => setReadings(readings.map((x, j) => j === i ? updated : x))} />
            ))}
            {readings.length < 3 && (
              <button onClick={() => setReadings([...readings, emptyReading()])}
                style={{ fontSize: 12, color: '#767676', background: 'none', border: '1.5px dashed #ddd', borderRadius: 8, padding: '4px 12px', fontFamily: 'inherit', cursor: 'pointer', marginTop: 2 }}>
                + Add reading
              </button>
            )}
          </div>

          {/* Live average */}
          {liveValid && (
            <div style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', marginBottom: 10, border: '1.5px solid #efefef' }}>
              <div style={{ fontSize: 11, color: '#aaaaaa', marginBottom: 2 }}>
                Average of {readings.filter(r => r.sys > 0).length} reading{readings.filter(r => r.sys > 0).length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#e8457a' }}>
                {liveAvg.sys}/{liveAvg.dia}
                <span style={{ fontSize: 12, fontWeight: 400, color: '#767676', marginLeft: 6 }}>mmHg</span>
                {liveAvg.pulse && <span style={{ fontSize: 14, fontWeight: 400, color: '#767676', marginLeft: 10 }}>♥ {liveAvg.pulse}</span>}
              </div>
              {(() => {
                const cat = bpCategory(liveAvg.sys, liveAvg.dia)
                return cat ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: cat.bg, border: `1.5px solid ${cat.border}`, marginTop: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.dot }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cat.text }}>{cat.label}</span>
                  </div>
                ) : null
              })()}
            </div>
          )}

          {/* Note */}
          <textarea placeholder="Any notes? Feeling stressed, just exercised, medication taken…" value={note}
            onChange={e => setNote(e.target.value)}
            style={{ width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 13, color: '#111111', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10 }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveSession} disabled={!liveValid}
              style={{ padding: '10px 24px', background: liveValid ? '#e8457a' : '#e0e0e0', color: liveValid ? '#fff' : '#aaaaaa', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
              Save session
            </button>
            <button onClick={() => setAddingSession(false)}
              style={{ padding: '10px 16px', background: 'none', border: '1.5px solid #efefef', color: '#767676', borderRadius: 24, fontSize: 13, fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingSession(true)}
          style={{ padding: '10px 24px', background: '#e8457a', color: '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
          + Add reading session
        </button>
      )}

      <div style={{ marginTop: 10, fontSize: 12, color: '#767676' }}>
        Enter up to 3 readings — the average is saved. Trend analysis in Insights → Blood Pressure.
      </div>
    </Section>
  )
}
