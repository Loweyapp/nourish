import { useState } from 'react'
import type { DayEntry } from '../types'
import { bpCategory } from '../lib'
import { Section } from './shared'

interface BPSectionProps {
  entry: DayEntry
  onUpdate: (d: Partial<DayEntry>) => void
}

export default function BPSection({ entry, onUpdate }: BPSectionProps) {
  const [systolic, setSystolic] = useState(entry.bpSystolic != null ? String(entry.bpSystolic) : '')
  const [diastolic, setDiastolic] = useState(entry.bpDiastolic != null ? String(entry.bpDiastolic) : '')
  const [pulse, setPulse] = useState(entry.bpPulse != null ? String(entry.bpPulse) : '')
  const [note, setNote] = useState(entry.bpNote ?? '')
  const [banner, setBanner] = useState<{ bg: string; border: string; text: string; dot: string; msg: string } | null>(null)

  const save = () => {
    if (!systolic || !diastolic) return
    const patch: Partial<DayEntry> = { bpSystolic: Number(systolic), bpDiastolic: Number(diastolic), bpNote: note }
    if (pulse) patch.bpPulse = Number(pulse)
    onUpdate(patch)
    const cat = bpCategory(Number(systolic), Number(diastolic))
    const p = pulse ? ` · Pulse ${pulse} bpm` : ''
    const msgs: Record<string, string> = {
      'Normal': `All good — ${systolic}/${diastolic} mmHg is in the normal range.${p}`,
      'Elevated': `${systolic}/${diastolic} mmHg is slightly elevated — worth keeping an eye on.${p}`,
      'Stage 1': `${systolic}/${diastolic} mmHg is Stage 1 high. Try to reduce stress and salt today.${p}`,
      'Stage 2': `${systolic}/${diastolic} mmHg is Stage 2 high. Consider speaking with your GP if this persists.${p}`,
      'Crisis': `${systolic}/${diastolic} mmHg is very high. Please seek medical advice today.${p}`,
    }
    if (cat) setBanner({ ...cat, msg: msgs[cat.short] ?? '' })
  }

  const livecat = systolic && diastolic ? bpCategory(Number(systolic), Number(diastolic)) : null

  const fields: Array<[string, string, string, (v: string) => void]> = [
    ['Systolic', '120', systolic, setSystolic],
    ['Diastolic', '80', diastolic, setDiastolic],
    ['Pulse', '72', pulse, setPulse],
  ]

  return (
    <Section title="BLOOD PRESSURE" accent="#e8457a">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {fields.map(([label, ph, val, set]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <input type="number" placeholder={ph} value={val} onChange={e => set(e.target.value)}
              style={{ width: 72, padding: '10px 8px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, color: '#111111', outline: 'none', textAlign: 'center' }} />
            <span style={{ fontSize: 12, color: '#767676', marginTop: 4, fontWeight: 500, letterSpacing: 0.5 }}>{label}{label === 'Pulse' ? ' (opt.)' : ''}</span>
          </div>
        ))}
        <span style={{ fontSize: 12, color: '#767676', alignSelf: 'flex-end', marginBottom: 18 }}>mmHg</span>
      </div>
      {livecat && !banner && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: livecat.bg, border: `1.5px solid ${livecat.border}`, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: livecat.dot }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: livecat.text }}>{livecat.label}</span>
        </div>
      )}
      <textarea placeholder="Any notes? Time of day, how you were feeling, medication taken…" value={note}
        onChange={e => setNote(e.target.value)}
        style={{ width: '100%', minHeight: 46, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
      <div style={{ marginTop: 10 }}>
        <button onClick={save} disabled={!systolic || !diastolic}
          style={{ padding: '10px 24px', background: (!systolic || !diastolic) ? '#e0e0e0' : '#e8457a', color: (!systolic || !diastolic) ? '#aaaaaa' : '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          Save
        </button>
      </div>
      {banner && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: banner.bg, border: `1.5px solid ${banner.border}`, borderRadius: 10, fontSize: 13, color: banner.text, lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: banner.dot, flexShrink: 0, marginTop: 3 }} />
          <span>{banner.msg}</span>
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, color: '#767676' }}>Detailed trend analysis in Insights → Blood Pressure</div>
    </Section>
  )
}
