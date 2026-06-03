import { useState } from 'react'
import type { DayEntry } from '../types'
import {
  askClaude, bpCategory, formatDate, fmtMins,
  INSIGHTS_LAYOUT_KEY,
} from '../lib'
import { Section, Spinner, AIBubble, ChatWidget, ScrollRight } from './shared'
import DraggableLayout from './DraggableLayout'

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

type WD = { d: string; w: number }
type BD = { d: string; sys: number; dia: number; pulse?: number | null }

interface WeightTrendSectionProps {
  weightData: WD[]
  minW: number
  maxW: number
  allEntries: Record<string, DayEntry>
}

function WeightTrendSection({ weightData, minW, maxW }: WeightTrendSectionProps) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysed, setAnalysed] = useState(false)
  const [error, setError] = useState('')

  const analyse = async () => {
    setLoading(true); setError('')
    const history = weightData.map(d => `${d.d}: ${d.w}kg`).join(', ')
    try {
      const resp = await askClaude(
        [{ role: 'user', content: `Weight history: ${history}` }],
        `You are a health coach analysing a weight trend over recent days. Give 3-4 sentences: identify the trend direction, note any fluctuations, and give practical, non-judgmental advice. Use kg. British English.`
      )
      setInsight(resp); setAnalysed(true)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  const W = Math.max(weightData.length * 52, 300)
  const H = 130, padT = 14, chartH = 80
  const yFor = (w: number) => maxW === minW ? padT + chartH / 2 : padT + chartH - ((w - minW) / (maxW - minW)) * chartH
  const pts = weightData.map((d, i) => `${i * 52 + 26},${yFor(d.w)}`).join(' ')
  const areaBottom = `${(weightData.length - 1) * 52 + 26},${padT + chartH} 26,${padT + chartH}`
  const trend = weightData.length >= 2 ? (weightData[weightData.length - 1]!.w - weightData[0]!.w).toFixed(1) : null
  const trendColor = trend === null ? '#767676' : Number(trend) < -0.3 ? '#6a9e6a' : Number(trend) > 0.3 ? '#e8457a' : '#767676'

  return (
    <Section title="WEIGHT TREND" accent="#a89aaa">
      {trend !== null && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#111111' }}>{Number(trend) > 0 ? '+' : ''}{trend} kg</span>
          <span style={{ fontSize: 12, color: '#767676' }}>over this period</span>
        </div>
      )}
      <ScrollRight>
        <svg width={W} height={H}>
          <defs>
            <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {([minW, (minW + maxW) / 2, maxW] as number[]).map((v, i) => {
            const y = yFor(v)
            return <g key={i}><line x1={0} x2={W} y1={y} y2={y} stroke="#f5f5f5" /><text x={2} y={y - 2} fontSize={12} fill="#767676">{v.toFixed(1)}</text></g>
          })}
          <polygon points={pts + ' ' + areaBottom} fill="url(#wtGrad)" />
          <polyline points={pts} fill="none" stroke={trendColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {weightData.map((d, i) => (
            <g key={i}>
              <circle cx={i * 52 + 26} cy={yFor(d.w)} r={4} fill={trendColor} />
              <text x={i * 52 + 26} y={yFor(d.w) - 8} textAnchor="middle" fontSize={12} fontWeight="600" fill={trendColor}>{d.w}</text>
              <text x={i * 52 + 26} y={H - 4} textAnchor="middle" fontSize={12} fill="#767676">{d.d.slice(0, 3)}</text>
            </g>
          ))}
        </svg>
      </ScrollRight>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => void analyse()} disabled={loading}
          style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#7aA050,#5a8030)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
          {loading ? 'Analysing…' : '✦ Analyse weight trend'}
        </button>
        {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}
        {error && <div style={{ fontSize: 12, color: '#111111', marginTop: 6 }}>{error}</div>}
        {insight && <AIBubble text={insight} />}
        {analysed && <ChatWidget systemPrompt="You are a supportive health coach discussing a user's weight trend. Answer follow-up questions, give practical advice. Non-judgmental. British English." contextSummary={`Weight trend analysis: ${insight}`} placeholder="e.g. What might be causing the fluctuations?" />}
      </div>
    </Section>
  )
}

interface BPTrendSectionProps {
  bpData: BD[]
  minBP: number
  maxBP: number
  allEntries: Record<string, DayEntry>
}

function BPTrendSection({ bpData, minBP, maxBP, allEntries }: BPTrendSectionProps) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysed, setAnalysed] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const analyse = async () => {
    setLoading(true); setError('')
    const history = bpData.map(d => d.d + ': ' + d.sys + '/' + d.dia + ' mmHg' + (d.pulse ? ' pulse ' + d.pulse + 'bpm' : '')).join('; ')
    const lifestyle = Object.entries(allEntries).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([d, e]) => {
      const units = (e.alcohol ?? []).reduce((s, a) => s + (a.units || 0), 0)
      return `${formatDate(d)}: sleep ${e.fitbit?.sleepMins ? fmtMins(e.fitbit.sleepMins) : 'unknown'}, steps ${e.fitbit?.steps ?? 'unknown'}, alcohol ${units > 0 ? units + 'u' : 'none'}, exercise ${e.exercise ?? 'none'}`
    }).join('; ')
    try {
      const resp = await askClaude(
        [{ role: 'user', content: `BP readings: ${history}\n\nLifestyle context: ${lifestyle}` }],
        `You are a health coach analysing blood pressure trends. Using the NHS categories (Normal <120/80, Elevated 120-129/<80, Stage 1 130-139/80-89, Stage 2 ≥140/≥90):
1. Summarise the overall trend and typical category
2. Identify any correlations with sleep, alcohol, exercise or other factors
3. Give 2-3 specific, practical lifestyle suggestions based on the data
Be direct and specific. British English. 4-5 sentences total.`
      )
      setInsight(resp); setAnalysed(true)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  const copyForGP = () => {
    const lines = ['Blood Pressure Log — Nourish App', '']
    bpData.forEach(d => {
      const pulseStr = d.pulse ? '  Pulse: ' + d.pulse + ' bpm' : ''
      const catShort = bpCategory(d.sys, d.dia)?.short ?? ''
      lines.push(`${d.d}: ${d.sys}/${d.dia} mmHg${pulseStr}  [${catShort}]`)
    })
    lines.push('')
    const avgSys = Math.round(bpData.reduce((s, d) => s + d.sys, 0) / bpData.length)
    const avgDia = Math.round(bpData.reduce((s, d) => s + d.dia, 0) / bpData.length)
    lines.push(`Average: ${avgSys}/${avgDia} mmHg over ${bpData.length} readings`)
    navigator.clipboard.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => {})
  }

  const W = Math.max(bpData.length * 60, 300)
  const H = 130, pad = 10, chartH = 90
  const bpRange = maxBP - minBP || 40
  const yFor = (v: number) => pad + chartH - ((v - minBP) / bpRange) * chartH
  const gridLines = [80, 90, 120, 140].filter(v => v >= minBP && v <= maxBP)

  return (
    <Section title="BLOOD PRESSURE" accent="#e8457a">
      <ScrollRight>
        <svg width={W} height={H}>
          {gridLines.map(v => { const y = yFor(v); const isT = v === 140 || v === 90; return <g key={v}><line x1={0} x2={W} y1={y} y2={y} stroke={isT ? 'rgba(200,122,106,0.5)' : '#f5f5f5'} strokeDasharray={isT ? '4 2' : ''} /><text x={2} y={y - 2} fontSize={12} fill={isT ? '#e8457a' : '#767676'}>{v}</text></g> })}
          <polyline points={bpData.map((d, i) => `${i * 60 + 30},${yFor(d.sys)}`).join(' ')} fill="none" stroke="#e8457a" strokeLinejoin="round" />
          <polyline points={bpData.map((d, i) => `${i * 60 + 30},${yFor(d.dia)}`).join(' ')} fill="none" stroke="#5a8ad0" strokeLinejoin="round" strokeDasharray="4 2" />
          {bpData.map((d, i) => {
            const cat = bpCategory(d.sys, d.dia)
            return (<g key={i}>
              <circle cx={i * 60 + 30} cy={yFor(d.sys)} r={5} fill={cat?.dot ?? '#e8457a'} />
              <circle cx={i * 60 + 30} cy={yFor(d.dia)} r={4} fill="#5a8ad0" />
              <text x={i * 60 + 30} y={yFor(d.sys) - 7} textAnchor="middle" fontSize={12} fill="#e8457a">{d.sys}</text>
              <text x={i * 60 + 30} y={yFor(d.dia) + 14} textAnchor="middle" fontSize={12} fill="#5a8ad0">{d.dia}</text>
              {d.pulse && <text x={i * 60 + 30} y={yFor(d.dia) + 24} textAnchor="middle" fontSize={12} fill="#767676">♥{d.pulse}</text>}
              <text x={i * 60 + 30} y={H - 4} textAnchor="middle" fontSize={12} fill="#767676">{d.d.slice(0, 3)}</text>
            </g>)
          })}
        </svg>
      </ScrollRight>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, flexWrap: 'wrap' }}>
        <span style={{ color: '#111111', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 2, background: '#e8457a', borderRadius: 2, display: 'inline-block' }} />Systolic</span>
        <span style={{ color: '#555555', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 2, background: '#26b5a8', borderRadius: 2, display: 'inline-block', opacity: 0.7 }} />Diastolic</span>
        <span style={{ color: '#767676' }}>♥ Pulse</span>
        <span style={{ color: '#111111', fontSize: 12, opacity: 0.6 }}>· 140/90 threshold</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={() => void analyse()} disabled={loading}
          style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#e8457a,#b03060)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
          {loading ? 'Analysing…' : '✦ Analyse BP trend'}
        </button>
        <button onClick={copyForGP}
          style={{ padding: '8px 18px', background: 'none', border: '1.5px solid #e8457a', color: '#111111', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
          {copied ? 'Copied ✓' : 'Copy readings'}
        </button>
      </div>
      {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}
      {error && <div style={{ fontSize: 12, color: '#111111', marginTop: 6 }}>{error}</div>}
      {insight && <AIBubble text={insight} />}
      {analysed && <ChatWidget systemPrompt="You are a health coach discussing blood pressure trends and lifestyle factors. Give practical, specific advice. British English." contextSummary={`BP trend analysis: ${insight}`} placeholder="e.g. Which days look worst? What should I change first?" />}
    </Section>
  )
}

interface InsightsTabProps {
  entries: Record<string, DayEntry>
}

export default function InsightsTab({ entries }: InsightsTabProps) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysed, setAnalysed] = useState(false)
  const [error, setError] = useState('')
  const [editLayout, setEditLayout] = useState(false)

  const days = Object.entries(entries).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
  const moodData = [...days].reverse().map(([d, e]) => ({ d: formatDate(d), mood: e.mood ?? 0, energy: e.energy ?? 0 }))
  const calData = [...days].reverse().map(([d, e]) => ({ d: formatDate(d), cals: (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0) }))
  const weightData: WD[] = [...days].filter(([, e]) => e.weight).reverse().map(([d, e]) => ({ d: formatDate(d), w: parseFloat(e.weight!) }))
  const stepsData = [...days].filter(([, e]) => e.fitbit?.steps).reverse().map(([d, e]) => ({ d: formatDate(d), s: e.fitbit!.steps }))
  const alcData = [...days].reverse().map(([d, e]) => ({ d: formatDate(d), u: parseFloat(((e.alcohol ?? []).reduce((s, a) => s + (a.units || 0), 0)).toFixed(1)) }))
  const bpData: BD[] = [...days].filter(([, e]) => e.bpSystolic && e.bpDiastolic).reverse().map(([d, e]) => ({ d: formatDate(d), sys: e.bpSystolic!, dia: e.bpDiastolic!, pulse: e.bpPulse ?? null }))

  const maxCals = Math.max(...calData.map(d => d.cals), 1)
  const maxSteps = Math.max(...stepsData.map(d => d.s), 1)
  const maxAlc = Math.max(...alcData.map(d => d.u), 1)
  const minW = Math.min(...weightData.map(d => d.w))
  const maxW = Math.max(...weightData.map(d => d.w))
  const minBP = Math.min(...bpData.map(d => d.dia), 60)
  const maxBP = Math.max(...bpData.map(d => d.sys), 160)

  const getInsights = async () => {
    setLoading(true); setError('')
    const summary = days.map(([d, e]) => ({
      date: d,
      calories: (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0),
      meals: (e.food ?? []).map(f => f.text).join('; '),
      mood: MOODS.find(m => m.value === e.mood)?.label,
      energy: ENERGY.find(m => m.value === e.energy)?.label,
      moodNote: e.moodNote, exercise: e.exercise, weight: e.weight,
      bp: e.bpSystolic && e.bpDiastolic ? `${e.bpSystolic}/${e.bpDiastolic} mmHg` : null, bpPulse: e.bpPulse,
      alcoholUnits: e.alcohol?.reduce((s, a) => s + (a.units || 0), 0).toFixed(1) ?? null,
      steps: e.fitbit?.steps, sleepMins: e.fitbit?.sleepMins,
      deepMins: e.fitbit?.deepMins, remMins: e.fitbit?.remMins,
      restingHR: e.fitbit?.restingHR, activeMin: e.fitbit?.activeMin,
      calsMayBeIncomplete: (() => {
        const logged = (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0)
        const burned = e.fitbit?.calsBurned ?? 0
        const slots = (e.food ?? []).map(f => f.meal)
        return (burned > 0 && (burned - logged) > 1200) || !slots.includes('Lunch') || !slots.includes('Dinner')
      })(),
    }))
    try {
      const resp = await askClaude(
        [{ role: 'user', content: JSON.stringify(summary) }],
        `You are a health coach analysing a user's food diary, mood, energy, exercise, weight, and Fitbit data (steps, sleep stages, heart rate).
Look for genuine correlations: e.g. poor sleep vs low energy/mood the next day, high step days vs mood, calorie intake vs weight trend, deep sleep vs energy levels, blood pressure trends and how they relate to exercise, sleep, or stress.
Write 4-6 specific, evidence-based bullet points from the actual data. Warm but honest. Use • for bullets. British English.`
      )
      setInsight(resp); setAnalysed(true)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  if (days.length < 2) return <div style={{ textAlign: 'center', padding: 40, color: '#767676', fontSize: 15 }}>Log at least 2 days to unlock insights</div>

  const INSIGHTS_DEFAULT = ['mood_energy', 'calories', 'steps', 'weight', 'alcohol', 'bp', 'ai']

  const renderSection = (id: string) => {
    switch (id) {
      case 'mood_energy': return (
        <Section title="MOOD & ENERGY" accent="#805d93">
          {(() => {
            const W = Math.max(moodData.length * 52, 300)
            const H = 130, padT = 10, chartH = 90
            const yFor = (v: number) => padT + chartH - ((v - 1) / 4) * chartH
            const moodPts = moodData.map((d, i) => `${i * 52 + 26},${yFor(d.mood || 1)}`).join(' ')
            const engPts = moodData.map((d, i) => `${i * 52 + 26},${yFor(d.energy || 1)}`).join(' ')
            const moodArea = moodPts + ` ${(moodData.length - 1) * 52 + 26},${H} 26,${H}`
            const engArea = engPts + ` ${(moodData.length - 1) * 52 + 26},${H} 26,${H}`
            return (
              <ScrollRight>
                <svg width={W} height={H + 14}>
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#805d93" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#805d93" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#26b5a8" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#26b5a8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[1, 2, 3, 4, 5].map(v => <line key={v} x1={0} x2={W} y1={yFor(v)} y2={yFor(v)} stroke="#f5f5f5" />)}
                  <polygon points={moodArea} fill="url(#moodGrad)" />
                  <polygon points={engArea} fill="url(#engGrad)" />
                  <polyline points={moodPts} fill="none" stroke="#805d93" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={engPts} fill="none" stroke="#26b5a8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />
                  {moodData.map((d, i) => (
                    <g key={i}>
                      <circle cx={i * 52 + 26} cy={yFor(d.mood || 1)} r={4} fill="#805d93" />
                      <circle cx={i * 52 + 26} cy={yFor(d.energy || 1)} r={3} fill="#26b5a8" />
                      <text x={i * 52 + 26} y={H + 12} textAnchor="middle" fontSize={12} fill="#767676">{d.d.slice(0, 3)}</text>
                    </g>
                  ))}
                </svg>
              </ScrollRight>
            )
          })()}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
            <span style={{ color: '#555555', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 2, background: '#805d93', borderRadius: 2, display: 'inline-block' }} />Mood</span>
            <span style={{ color: '#555555', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 2, background: '#26b5a8', borderRadius: 2, display: 'inline-block' }} />Energy</span>
          </div>
        </Section>
      )
      case 'calories': return calData.some(d => d.cals > 0) ? (() => {
        const avgCals = Math.round(calData.filter(d => d.cals > 0).reduce((s, d) => s + d.cals, 0) / calData.filter(d => d.cals > 0).length)
        return (
          <Section title="DAILY CALORIES" accent="#9ebd6e">
            {(() => {
              const W = Math.max(calData.length * 52, 300)
              const pad = 22, barH = 80
              const aY = pad + barH - (avgCals / maxCals) * barH
              return (
                <ScrollRight>
                  <svg width={W} height={140}>
                    <line x1={0} x2={W} y1={aY} y2={aY} stroke="#9ebd6e44" strokeDasharray="4 3" />
                    <text x={4} y={aY - 3} fontSize={12} fill="#767676">avg {avgCals}</text>
                    {calData.map((d, i) => {
                      const h = (d.cals / maxCals) * barH
                      const over = d.cals > 2500
                      const barTop = pad + barH - h
                      return (
                        <g key={i}>
                          <rect x={i * 52 + 13} y={barTop} width={26} height={h || 2} rx={5} fill={over ? '#e8457a' : '#9ebd6e'} opacity={d.cals ? 1 : 0.2} />
                          {d.cals > 0 && <text x={i * 52 + 26} y={Math.max(barTop - 5, 13)} textAnchor="middle" fontSize={12} fontWeight="600" fill="#555555">{d.cals}</text>}
                          <text x={i * 52 + 26} y={pad + barH + 18} textAnchor="middle" fontSize={12} fill="#767676">{d.d.slice(0, 3)}</text>
                        </g>
                      )
                    })}
                  </svg>
                </ScrollRight>
              )
            })()}
            <div style={{ fontSize: 12, color: '#767676', marginTop: 4 }}>Red = over 2,500 kcal · Dashed = your average ({avgCals} kcal)</div>
          </Section>
        )
      })() : null
      case 'steps': return stepsData.length >= 2 ? (
        <Section title="DAILY STEPS" accent="#4a86d8">
          {(() => {
            const W = Math.max(stepsData.length * 52, 300)
            const pad = 22, barH = 80
            const gY = pad + barH - (10000 / maxSteps) * barH
            return (
              <ScrollRight>
                <svg width={W} height={140}>
                  <line x1={0} x2={W} y1={gY} y2={gY} stroke="#4a86d844" strokeDasharray="4 3" />
                  <text x={4} y={gY - 3} fontSize={12} fill="#767676">10k goal</text>
                  {stepsData.map((d, i) => {
                    const h = (d.s / maxSteps) * barH
                    const met = d.s >= 10000
                    const label = d.s >= 1000 ? Math.round(d.s / 100) / 10 + 'k' : String(d.s)
                    const barTop = pad + barH - h
                    return (
                      <g key={i}>
                        <rect x={i * 52 + 13} y={barTop} width={26} height={h || 2} rx={5} fill={met ? '#9ebd6e' : '#4a86d8'} />
                        <text x={i * 52 + 26} y={Math.max(barTop - 5, 13)} textAnchor="middle" fontSize={12} fontWeight="600" fill="#555555">{label}</text>
                        <text x={i * 52 + 26} y={pad + barH + 18} textAnchor="middle" fontSize={12} fill="#767676">{d.d.slice(0, 3)}</text>
                      </g>
                    )
                  })}
                </svg>
              </ScrollRight>
            )
          })()}
          <div style={{ fontSize: 12, color: '#767676', marginTop: 4 }}>Green = 10k goal reached</div>
        </Section>
      ) : null
      case 'weight': return weightData.length >= 2 ? (
        <WeightTrendSection weightData={weightData} minW={minW} maxW={maxW} allEntries={entries} />
      ) : null
      case 'alcohol': return alcData.some(d => d.u > 0) ? (
        <Section title="ALCOHOL (UNITS)" accent="#f59c38">
          {(() => {
            const W = Math.max(alcData.length * 52, 300)
            const totalUnits = alcData.reduce((s, d) => s + d.u, 0).toFixed(1)
            const pad = 22, barH = 80
            const gY = pad + barH - (2 / maxAlc) * barH
            return (
              <>
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#111111' }}>{totalUnits}</span>
                  <span style={{ fontSize: 12, color: '#767676' }}>units this period</span>
                </div>
                <ScrollRight>
                  <svg width={W} height={140}>
                    <line x1={0} x2={W} y1={gY} y2={gY} stroke="#f59c3844" strokeDasharray="4 3" />
                    <text x={4} y={gY - 3} fontSize={12} fill="#767676">2u/day</text>
                    {alcData.map((d, i) => {
                      const h = (d.u / maxAlc) * barH
                      const col = d.u > 6 ? '#e8457a' : d.u > 2 ? '#f59c38' : '#6a9e6a'
                      const barTop = pad + barH - (h || 0)
                      return (
                        <g key={i}>
                          <rect x={i * 52 + 13} y={barTop} width={26} height={h || 2} rx={5} fill={col} opacity={d.u > 0 ? 1 : 0.15} />
                          {d.u > 0 && <text x={i * 52 + 26} y={Math.max(barTop - 5, 13)} textAnchor="middle" fontSize={12} fontWeight="600" fill="#555555">{d.u}</text>}
                          <text x={i * 52 + 26} y={pad + barH + 18} textAnchor="middle" fontSize={12} fill="#767676">{d.d.slice(0, 3)}</text>
                        </g>
                      )
                    })}
                  </svg>
                </ScrollRight>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: '#111111', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#6a9e6a', display: 'inline-block' }} />≤2u</span>
                  <span style={{ color: '#111111', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59c38', display: 'inline-block' }} />2–6u</span>
                  <span style={{ color: '#111111', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#e8457a', display: 'inline-block' }} />6u+</span>
                </div>
              </>
            )
          })()}
        </Section>
      ) : null
      case 'bp': return bpData.length >= 2 ? (
        <BPTrendSection bpData={bpData} minBP={minBP} maxBP={maxBP} allEntries={entries} />
      ) : null
      case 'ai': return (
        <Section title="AI PATTERN ANALYSIS" accent="#555555">
          <button onClick={() => void getInsights()} disabled={loading}
            style={{ padding: '10px 22px', background: '#9ebd6e', color: '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 700 }}>
            {loading ? 'Analysing…' : 'Analyse my patterns'}
          </button>
          {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}
          {error && <div style={{ fontSize: 12, color: '#111111', marginTop: 6 }}>{error}</div>}
          {insight && <AIBubble text={insight} />}
          {analysed && <ChatWidget systemPrompt="You are a health coach who has analysed multi-day food, mood, energy, exercise, weight, and Fitbit data. Answer follow-up questions and give actionable advice. British English." contextSummary={`Pattern analysis: ${insight}`} placeholder="e.g. What should I focus on first? Why does my energy dip mid-week?" />}
        </Section>
      )
      default: return null
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: editLayout ? 12 : 0 }}>
        <button onClick={() => setEditLayout(v => !v)}
          style={{ background: editLayout ? '#6a9e6a' : 'none', border: editLayout ? 'none' : '1.5px solid #efefef', color: editLayout ? '#fff' : '#767676', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontFamily: 'inherit', fontWeight: 600, marginBottom: editLayout ? 0 : 12 }}>
          {editLayout ? '✓ Done' : '✎ Edit layout'}
        </button>
      </div>
      {editLayout && (
        <div style={{ fontSize: 12, color: '#767676', marginBottom: 12, textAlign: 'center' }}>
          Use the ↑↓ buttons to reorder sections
        </div>
      )}
      <DraggableLayout storageKey={INSIGHTS_LAYOUT_KEY} defaultOrder={INSIGHTS_DEFAULT} editMode={editLayout} renderSection={renderSection} />
    </div>
  )
}
