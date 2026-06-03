import { useState } from 'react'
import type { DayEntry, MoodValue, EnergyValue } from '../types'
import { askClaude } from '../lib'
import { Section, Icon, EmojiPicker, Spinner, AIBubble, ChatWidget } from './shared'

const MOODS = [
  { emoji: '😴', label: 'Exhausted', value: 1 },
  { emoji: '😔', label: 'Low', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '⚡', label: 'Energised', value: 5 },
]
const ENERGY = [
  { emoji: '🪫', label: 'Drained', value: 1 },
  { emoji: '😮‍💨', label: 'Tired', value: 2 },
  { emoji: '😌', label: 'Steady', value: 3 },
  { emoji: '💪', label: 'Strong', value: 4 },
  { emoji: '🔥', label: 'Peak', value: 5 },
]

interface MoodSectionProps {
  entry: Pick<DayEntry, 'mood' | 'energy' | 'moodNote' | 'moodFeedback'>
  onUpdate: (d: Partial<DayEntry>) => void
  dayContext: string
}

export default function MoodSection({ entry, onUpdate, dayContext }: MoodSectionProps) {
  const [mood, setMood] = useState<MoodValue | undefined>(entry.mood)
  const [energy, setEnergy] = useState<EnergyValue | undefined>(entry.energy)
  const [note, setNote] = useState(entry.moodNote ?? '')
  const [feedback, setFeedback] = useState(entry.moodFeedback ?? '')
  const [loading, setLoading] = useState(false)
  const [analysed, setAnalysed] = useState(!!entry.moodFeedback)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const save = (patch: Partial<DayEntry>) => {
    // mood/energy may be undefined until user selects — cast needed for exactOptionalPropertyTypes
    onUpdate({ mood, energy, moodNote: note, moodFeedback: feedback, ...patch } as Partial<DayEntry>)
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500)
  }
  const analyse = async () => {
    if (!mood && !energy) return
    setLoading(true); setError('')
    const ml = MOODS.find(m => m.value === mood)?.label ?? 'not set'
    const el = ENERGY.find(e => e.value === energy)?.label ?? 'not set'
    try {
      const resp = await askClaude(
        [{ role: 'user', content: `Mood: ${ml}. Energy: ${el}. Notes: "${note || 'none'}"` }],
        `You are a wellness coach with full awareness of the user's day. Today: ${dayContext}
Give 2-3 sentences: acknowledge how they're feeling and — where relevant — connect it to what they've eaten, their Fitbit sleep/steps data, or their exercise. Offer a practical observation. British English. Warm tone.`
      )
      setFeedback(resp); setAnalysed(true); onUpdate({ mood, energy, moodNote: note, moodFeedback: resp } as Partial<DayEntry>)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }
  const chatCtx = analysed ? `Mood: ${MOODS.find(m => m.value === mood)?.label}, Energy: ${ENERGY.find(e => e.value === energy)?.label}. Notes: "${note}". Feedback: ${feedback}` : null
  return (
    <Section title="MOOD & ENERGY" accent="#805d93">
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111111', marginBottom: 14 }}>How are you feeling?</div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#767676', textTransform: 'uppercase', marginBottom: 8 }}>Mood</div>
      <EmojiPicker options={MOODS} value={mood} onChange={v => { setMood(v as MoodValue); onUpdate({ mood: v as MoodValue, energy, moodNote: note, moodFeedback: feedback } as Partial<DayEntry>); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }} />
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#767676', textTransform: 'uppercase', marginBottom: 8 }}>Energy</div>
        <EmojiPicker options={ENERGY} value={energy} onChange={v => { setEnergy(v as EnergyValue); onUpdate({ mood, energy: v as EnergyValue, moodNote: note, moodFeedback: feedback } as Partial<DayEntry>); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }} />
      </div>
      <textarea placeholder="Any notes? Headache, brain fog, stressed, anxious, feeling great…" value={note}
        onChange={e => setNote(e.target.value)} onBlur={() => save({ moodNote: note })}
        style={{ marginTop: 12, width: '100%', minHeight: 52, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#333333', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={() => save({ moodNote: note })} disabled={!mood && !energy}
          style={{ padding: '10px 24px', background: (!mood && !energy) ? '#e0e0e0' : '#805d93', color: (!mood && !energy) ? '#aaaaaa' : '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          Save
        </button>
        {savedFlash && <span style={{ fontSize: 12, color: '#111111', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={15} color="#6a9e6a" />Saved</span>}
        <button onClick={() => void analyse()} disabled={(!mood && !energy) || loading}
          style={{ width: '100%', padding: '12px', background: 'none', border: '1.5px solid #efefef', color: (!mood && !energy) || loading ? '#aaaaaa' : '#ffffff', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', opacity: (!mood && !energy) || loading ? 0.5 : 1, marginTop: 4 }}>
          {loading ? 'Thinking…' : '✦ Get AI feedback'}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#111111', marginTop: 6 }}>{error}</div>}
      {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}
      {feedback && <AIBubble text={feedback} />}
      {analysed && <ChatWidget systemPrompt={`You are a supportive wellness coach. Today: ${dayContext}. Answer questions about wellbeing, connecting to food, sleep, steps, or exercise data where relevant. Warm, practical, concise. British English.`} contextSummary={chatCtx ?? undefined} placeholder="e.g. Why might I feel this way? Could it be my sleep?" />}
    </Section>
  )
}
