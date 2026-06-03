import { useState } from 'react'
import type { DayEntry } from '../types'
import { askClaude } from '../lib'
import { Section, Icon, Spinner, AIBubble, ChatWidget } from './shared'

interface ExerciseSectionProps {
  entry: Pick<DayEntry, 'exercise' | 'exerciseFeedback'>
  onUpdate: (d: Partial<DayEntry>) => void
  dayContext: string
}

export default function ExerciseSection({ entry, onUpdate, dayContext }: ExerciseSectionProps) {
  const [exercise, setExercise] = useState(entry.exercise ?? '')
  const [feedback, setFeedback] = useState(entry.exerciseFeedback ?? '')
  const [loading, setLoading] = useState(false)
  const [analysed, setAnalysed] = useState(!!entry.exerciseFeedback)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const save = (patch: Partial<DayEntry>) => {
    onUpdate({ exercise, exerciseFeedback: feedback, ...patch })
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500)
  }
  const analyse = async () => {
    if (!exercise.trim()) return
    setLoading(true); setError('')
    try {
      const resp = await askClaude(
        [{ role: 'user', content: `Exercise: "${exercise}"` }],
        `You are a fitness coach with full awareness of the user's day. Today: ${dayContext}
Give 3-4 sentences: acknowledge what they did, estimate calories burned, and comment on how it fits with their food intake, Fitbit steps/activity, energy level, or sleep. Offer one practical tip. British English. Encouraging.`
      )
      setFeedback(resp); setAnalysed(true); onUpdate({ exercise, exerciseFeedback: resp })
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }
  const chatCtx = analysed ? `Exercise: "${exercise}". Feedback: ${feedback}` : null
  return (
    <Section title="EXERCISE" accent="#f59c38">
      <textarea placeholder="e.g. 30 min run, 20 min yoga, 45 min weights…" value={exercise}
        onChange={e => setExercise(e.target.value)} onBlur={() => save({ exercise })}
        style={{ width: '100%', minHeight: 56, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#333333', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={() => save({ exercise })} disabled={!exercise.trim()}
          style={{ padding: '10px 24px', background: !exercise.trim() ? '#e0e0e0' : '#f59c38', color: !exercise.trim() ? '#aaaaaa' : '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          Save
        </button>
        {savedFlash && <span style={{ fontSize: 12, color: '#111111', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={15} color="#6a9e6a" />Saved</span>}
        <button onClick={() => void analyse()} disabled={!exercise.trim() || loading}
          style={{ width: '100%', padding: '12px', background: 'none', border: '1.5px solid #efefef', color: !exercise.trim() || loading ? '#aaaaaa' : '#ffffff', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', opacity: !exercise.trim() || loading ? 0.5 : 1, marginTop: 4 }}>
          {loading ? 'Thinking…' : '✦ Get AI feedback'}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#111111', marginTop: 6 }}>{error}</div>}
      {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}
      {feedback && <AIBubble text={feedback} />}
      {analysed && <ChatWidget systemPrompt={`You are a friendly fitness coach. Today: ${dayContext}. Answer questions about the workout, recovery, or how exercise relates to food/mood/energy/Fitbit data. British English.`} contextSummary={chatCtx ?? undefined} placeholder="e.g. Was that enough? Should I rest tomorrow?" />}
    </Section>
  )
}
