import { useState } from 'react'
import type { DayEntry } from '../types'
import {
  askClaude, bpCategory, formatDate, shortDate, fmtMins,
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

type Period = '7d' | '30d' | '90d' | '365d' | 'all'
type WD = { d: string; date: string; w: number }
type BD = { d: string; date: string; sys: number; dia: number; pulse?: number | null; label?: string }
type XScale = { xFor: (date: string) => number; width: number; gridDates: Array<{ x: number; label: string }> }

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildXScale(period: Period, allEntries: Record<string, DayEntry>): XScale {
  const now = new Date(); now.setHours(23, 59, 59, 999)
  const endMs = now.getTime()
  let startMs: number
  if (period === 'all') {
    const oldest = Object.keys(allEntries).sort()[0]
    startMs = oldest ? new Date(oldest + 'T00:00:00').getTime() : endMs - 30 * 86400000
  } else {
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period]
    startMs = endMs - days * 86400000
  }
  const spanMs = Math.max(endMs - startMs, 86400000)
  const totalDays = spanMs / 86400000
  const pxPerDay = period === '7d' ? 46 : period === '30d' ? 22 : period === '90d' ? 10 : period === '365d' ? 4 : Math.max(3, 300 / totalDays)
  const PAD_L = 32, PAD_R = 16
  const width = Math.max(PAD_L + totalDays * pxPerDay + PAD_R, 300)
  const xFor = (date: string) => {
    const t = new Date(date + 'T12:00:00').getTime()
    return PAD_L + ((t - startMs) / spanMs) * (width - PAD_L - PAD_R)
  }
  const gridDates: Array<{ x: number; label: string }> = []
  const useMonthly = period === '90d' || period === '365d' || period === 'all'
  const monthSkip = period === '365d' ? 2 : period === 'all' ? Math.max(1, Math.ceil(totalDays / 90)) : 1
  if (useMonthly) {
    const cur = new Date(startMs); cur.setDate(1); cur.setHours(12, 0, 0, 0)
    let monthCount = 0
    while (cur.getTime() <= endMs) {
      if (monthCount % monthSkip === 0) {
        const ds = toDateStr(cur)
        gridDates.push({ x: xFor(ds), label: cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) })
      }
      monthCount++; cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    const interval = period === '7d' ? 1 : 7
    const cur = new Date(startMs); cur.setHours(12, 0, 0, 0)
    while (cur.getTime() <= endMs) {
      const ds = toDateStr(cur)
      gridDates.push({ x: xFor(ds), label: cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) })
      cur.setDate(cur.getDate() + interval)
    }
  }
  return { xFor, width, gridDates }
}

function XGrid({ xScale, height }: { xScale: XScale; height: number }) {
  return <>{xScale.gridDates.map((g, i) => (
    <g key={i}>
      <line x1={g.x} x2={g.x} y1={0} y2={height - 16} stroke="#f0f0f0" strokeWidth={1} />
      <text x={g.x} y={height - 3} textAnchor="middle" fontSize={10} fill="#aaaaaa">{g.label}</text>
    </g>
  ))}</>
}

interface WeightTrendSectionProps {
  weightData: WD[]
  minW: number
  maxW: number
  xScale: XScale
}

function WeightTrendSection({ weightData, minW, maxW, xScale }: WeightTrendSectionProps) {
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

  const H = 144, padT = 14, chartH = 100
  const yFor = (w: number) => maxW === minW ? padT + chartH / 2 : padT + chartH - ((w - minW) / (maxW - minW)) * chartH
  const pts = weightData.map(d => `${xScale.xFor(d.date)},${yFor(d.w)}`).join(' ')
  const firstX = xScale.xFor(weightData[0]!.date)
  const lastX = xScale.xFor(weightData[weightData.length - 1]!.date)
  const areaBottom = `${lastX},${padT + chartH} ${firstX},${padT + chartH}`
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
        <svg width={xScale.width} height={H}>
          <defs>
            <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <XGrid xScale={xScale} height={H} />
          {([minW, (minW + maxW) / 2, maxW] as number[]).map((v, i) => {
            const y = yFor(v)
            return <g key={i}><line x1={0} x2={xScale.width} y1={y} y2={y} stroke="#f5f5f5" /><text x={2} y={y - 2} fontSize={11} fill="#767676">{v.toFixed(1)}</text></g>
          })}
          <polygon points={pts + ' ' + areaBottom} fill="url(#wtGrad)" />
          <polyline points={pts} fill="none" stroke={trendColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {weightData.map((d, i) => (
            <g key={i}>
              <circle cx={xScale.xFor(d.date)} cy={yFor(d.w)} r={4} fill={trendColor} />
              <text x={xScale.xFor(d.date)} y={yFor(d.w) - 8} textAnchor="middle" fontSize={11} fontWeight="600" fill={trendColor}>{d.w}</text>
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
  xScale: XScale
}

function BPTrendSection({ bpData, minBP, maxBP, allEntries, xScale }: BPTrendSectionProps) {
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

  const H = 144, pad = 10, chartH = 110
  const bpRange = maxBP - minBP || 40
  const yFor = (v: number) => pad + chartH - ((v - minBP) / bpRange) * chartH
  const gridLines = [80, 90, 120, 140].filter(v => v >= minBP && v <= maxBP)

  return (
    <Section title="BLOOD PRESSURE" accent="#e8457a">
      <ScrollRight>
        <svg width={xScale.width} height={H}>
          <XGrid xScale={xScale} height={H} />
          {gridLines.map(v => { const y = yFor(v); const isT = v === 140 || v === 90; return <g key={v}><line x1={0} x2={xScale.width} y1={y} y2={y} stroke={isT ? 'rgba(200,122,106,0.5)' : '#f5f5f5'} strokeDasharray={isT ? '4 2' : ''} /><text x={2} y={y - 2} fontSize={11} fill={isT ? '#e8457a' : '#767676'}>{v}</text></g> })}
          <polyline points={bpData.map(d => `${xScale.xFor(d.date)},${yFor(d.sys)}`).join(' ')} fill="none" stroke="#e8457a" strokeLinejoin="round" />
          <polyline points={bpData.map(d => `${xScale.xFor(d.date)},${yFor(d.dia)}`).join(' ')} fill="none" stroke="#5a8ad0" strokeLinejoin="round" strokeDasharray="4 2" />
          {bpData.map((d, i) => {
            const cat = bpCategory(d.sys, d.dia)
            const cx = xScale.xFor(d.date)
            return (<g key={i}>
              <circle cx={cx} cy={yFor(d.sys)} r={5} fill={cat?.dot ?? '#e8457a'} />
              <circle cx={cx} cy={yFor(d.dia)} r={4} fill="#5a8ad0" />
              <text x={cx} y={yFor(d.sys) - 7} textAnchor="middle" fontSize={11} fill="#e8457a">{d.sys}</text>
              <text x={cx} y={yFor(d.dia) + 14} textAnchor="middle" fontSize={11} fill="#5a8ad0">{d.dia}</text>
              {d.pulse && <text x={cx} y={yFor(d.dia) + 24} textAnchor="middle" fontSize={10} fill="#767676">♥{d.pulse}</text>}
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

const PERIODS: Array<[Period, string]> = [['7d', '1W'], ['30d', '1M'], ['90d', '3M'], ['365d', '1Y'], ['all', 'All']]

export default function InsightsTab({ entries }: InsightsTabProps) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysed, setAnalysed] = useState(false)
  const [error, setError] = useState('')
  const [editLayout, setEditLayout] = useState(false)
  const [period, setPeriod] = useState<Period>('30d')

  const xScale = buildXScale(period, entries)

  const cutoffMs = period === 'all'
    ? 0
    : (() => { const now = new Date(); now.setHours(23, 59, 59, 999); return now.getTime() - { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] * 86400000 })()

  const filteredDays = Object.entries(entries)
    .filter(([d]) => new Date(d + 'T00:00:00').getTime() >= cutoffMs)
    .sort((a, b) => a[0].localeCompare(b[0]))

  const moodData = filteredDays.map(([d, e]) => ({ d: shortDate(d), date: d, mood: e.mood ?? 0, energy: e.energy ?? 0 }))
  const calData = filteredDays.map(([d, e]) => ({ d: shortDate(d), date: d, cals: (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0) + (e.alcohol ?? []).reduce((s, a) => s + (a.calories || 0), 0) }))
  const weightData: WD[] = filteredDays.filter(([, e]) => e.weight).map(([d, e]) => ({ d: shortDate(d), date: d, w: parseFloat(e.weight!) }))
  const stepsData = filteredDays.filter(([, e]) => e.fitbit?.steps).map(([d, e]) => ({ d: shortDate(d), date: d, s: e.fitbit!.steps }))
  const alcData = filteredDays.map(([d, e]) => ({ d: shortDate(d), date: d, u: parseFloat(((e.alcohol ?? []).reduce((s, a) => s + (a.units || 0), 0)).toFixed(1)) }))
  const bpData: BD[] = filteredDays.flatMap(([d, e]) => {
    const labelAbbr: Record<string, string> = { Morning: 'AM', Afternoon: 'PM', Evening: 'Eve', Other: '' }
    if (e.bpSessions?.length) {
      return [...e.bpSessions]
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map(s => ({ d: shortDate(d) + (labelAbbr[s.label] ? ' ' + labelAbbr[s.label] : ''), date: d, sys: s.avg.sys, dia: s.avg.dia, pulse: s.avg.pulse ?? null, label: s.label }))
    }
    if (e.bpSystolic && e.bpDiastolic) return [{ d: shortDate(d), date: d, sys: e.bpSystolic, dia: e.bpDiastolic, pulse: e.bpPulse ?? null }]
    return []
  })

  const maxCals = Math.max(...calData.map(d => d.cals), 1)
  const maxSteps = Math.max(...stepsData.map(d => d.s), 1)
  const maxAlc = Math.max(...alcData.map(d => d.u), 1)
  const minW = Math.min(...weightData.map(d => d.w))
  const maxW = Math.max(...weightData.map(d => d.w))
  const minBP = Math.min(...bpData.map(d => d.dia), 60)
  const maxBP = Math.max(...bpData.map(d => d.sys), 160)

  const last14Days = Object.entries(entries).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)

  const getInsights = async () => {
    setLoading(true); setError('')
    const summary = last14Days.map(([d, e]) => ({
      date: d,
      calories: (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0) + (e.alcohol ?? []).reduce((s, a) => s + (a.calories || 0), 0),
      meals: (e.food ?? []).map(f => f.text).join('; '),
      mood: MOODS.find(m => m.value === e.mood)?.label,
      energy: ENERGY.find(m => m.value === e.energy)?.label,
      journalNotes: (e.notes ?? []).map(n => n.text).join(' | ') || null,
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
        `You are a health coach analysing a user's food diary, mood, energy, exercise, weight, Fitbit data (steps, sleep stages, heart rate), and personal journal notes.
Look for genuine correlations: e.g. poor sleep vs low energy/mood the next day, high step days vs mood, calorie intake vs weight trend, deep sleep vs energy levels, blood pressure trends relating to exercise/sleep/stress, symptoms in journal notes correlating with specific foods or alcohol.
Pay particular attention to journal notes — they contain the user's own words about how they feel, symptoms, and experiences.
Write 4-6 specific, evidence-based bullet points from the actual data. Warm but honest. Use • for bullets. British English.`
      )
      setInsight(resp); setAnalysed(true)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  const allDays = Object.entries(entries)
  if (allDays.length < 2) return <div style={{ textAlign: 'center', padding: 40, color: '#767676', fontSize: 15 }}>Log at least 2 days to unlock insights</div>

  const INSIGHTS_DEFAULT = ['mood_energy', 'calories', 'steps', 'weight', 'alcohol', 'bp', 'ai']

  const barWidth = (data: { date: string }[]) => Math.max(4, Math.min(20, xScale.width / Math.max(data.length, 1) - 4))

  const renderSection = (id: string) => {
    switch (id) {
      case 'mood_energy': return moodData.some(d => d.mood > 0 || d.energy > 0) ? (
        <Section title="MOOD & ENERGY" accent="#805d93">
          {(() => {
            const H = 144, padT = 10, chartH = 110
            const yFor = (v: number) => padT + chartH - ((v - 1) / 4) * chartH
            const moodPts = moodData.filter(d => d.mood > 0).map(d => `${xScale.xFor(d.date)},${yFor(d.mood)}`).join(' ')
            const engPts = moodData.filter(d => d.energy > 0).map(d => `${xScale.xFor(d.date)},${yFor(d.energy)}`).join(' ')
            return (
              <ScrollRight>
                <svg width={xScale.width} height={H}>
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
                  <XGrid xScale={xScale} height={H} />
                  {[1, 2, 3, 4, 5].map(v => <line key={v} x1={0} x2={xScale.width} y1={yFor(v)} y2={yFor(v)} stroke="#f5f5f5" />)}
                  {moodPts && <polyline points={moodPts} fill="none" stroke="#805d93" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
                  {engPts && <polyline points={engPts} fill="none" stroke="#26b5a8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />}
                  {moodData.map((d, i) => (
                    <g key={i}>
                      {d.mood > 0 && <circle cx={xScale.xFor(d.date)} cy={yFor(d.mood)} r={4} fill="#805d93" />}
                      {d.energy > 0 && <circle cx={xScale.xFor(d.date)} cy={yFor(d.energy)} r={3} fill="#26b5a8" />}
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
      ) : null
      case 'calories': return calData.some(d => d.cals > 0) ? (() => {
        const avgCals = Math.round(calData.filter(d => d.cals > 0).reduce((s, d) => s + d.cals, 0) / calData.filter(d => d.cals > 0).length)
        const bw = barWidth(calData)
        return (
          <Section title="DAILY CALORIES" accent="#9ebd6e">
            {(() => {
              const H = 144, pad = 22, barH = 100
              const aY = pad + barH - (avgCals / maxCals) * barH
              return (
                <ScrollRight>
                  <svg width={xScale.width} height={H}>
                    <XGrid xScale={xScale} height={H} />
                    <line x1={0} x2={xScale.width} y1={aY} y2={aY} stroke="#9ebd6e44" strokeDasharray="4 3" />
                    <text x={4} y={aY - 3} fontSize={11} fill="#767676">avg {avgCals}</text>
                    {calData.map((d, i) => {
                      const h = (d.cals / maxCals) * barH
                      const over = d.cals > 2500
                      const barTop = pad + barH - h
                      const cx = xScale.xFor(d.date)
                      return (
                        <g key={i}>
                          <rect x={cx - bw / 2} y={barTop} width={bw} height={h || 2} rx={3} fill={over ? '#e8457a' : '#9ebd6e'} opacity={d.cals ? 1 : 0.2} />
                          {d.cals > 0 && <text x={cx} y={Math.max(barTop - 4, 12)} textAnchor="middle" fontSize={10} fontWeight="600" fill="#555555">{d.cals}</text>}
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
            const H = 144, pad = 22, barH = 100
            const gY = pad + barH - (10000 / maxSteps) * barH
            const bw = barWidth(stepsData)
            return (
              <ScrollRight>
                <svg width={xScale.width} height={H}>
                  <XGrid xScale={xScale} height={H} />
                  <line x1={0} x2={xScale.width} y1={gY} y2={gY} stroke="#4a86d844" strokeDasharray="4 3" />
                  <text x={4} y={gY - 3} fontSize={11} fill="#767676">10k goal</text>
                  {stepsData.map((d, i) => {
                    const h = (d.s / maxSteps) * barH
                    const met = d.s >= 10000
                    const label = d.s >= 1000 ? Math.round(d.s / 100) / 10 + 'k' : String(d.s)
                    const barTop = pad + barH - h
                    const cx = xScale.xFor(d.date)
                    return (
                      <g key={i}>
                        <rect x={cx - bw / 2} y={barTop} width={bw} height={h || 2} rx={3} fill={met ? '#9ebd6e' : '#4a86d8'} />
                        <text x={cx} y={Math.max(barTop - 4, 12)} textAnchor="middle" fontSize={10} fontWeight="600" fill="#555555">{label}</text>
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
        <WeightTrendSection weightData={weightData} minW={minW} maxW={maxW} xScale={xScale} />
      ) : null
      case 'alcohol': return alcData.some(d => d.u > 0) ? (
        <Section title="ALCOHOL (UNITS)" accent="#f59c38">
          {(() => {
            const totalUnits = alcData.reduce((s, d) => s + d.u, 0).toFixed(1)
            const H = 144, pad = 22, barH = 100
            const gY = pad + barH - (2 / maxAlc) * barH
            const bw = barWidth(alcData)
            return (
              <>
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#111111' }}>{totalUnits}</span>
                  <span style={{ fontSize: 12, color: '#767676' }}>units this period</span>
                </div>
                <ScrollRight>
                  <svg width={xScale.width} height={H}>
                    <XGrid xScale={xScale} height={H} />
                    <line x1={0} x2={xScale.width} y1={gY} y2={gY} stroke="#f59c3844" strokeDasharray="4 3" />
                    <text x={4} y={gY - 3} fontSize={11} fill="#767676">2u/day</text>
                    {alcData.map((d, i) => {
                      const h = (d.u / maxAlc) * barH
                      const col = d.u > 6 ? '#e8457a' : d.u > 2 ? '#f59c38' : '#6a9e6a'
                      const barTop = pad + barH - (h || 0)
                      const cx = xScale.xFor(d.date)
                      return (
                        <g key={i}>
                          <rect x={cx - bw / 2} y={barTop} width={bw} height={h || 2} rx={3} fill={col} opacity={d.u > 0 ? 1 : 0.15} />
                          {d.u > 0 && <text x={cx} y={Math.max(barTop - 4, 12)} textAnchor="middle" fontSize={10} fontWeight="600" fill="#555555">{d.u}</text>}
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
      case 'bp': return bpData.length >= 1 ? (
        <BPTrendSection bpData={bpData} minBP={minBP} maxBP={maxBP} allEntries={entries} xScale={xScale} />
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
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {PERIODS.map(([p, label]) => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ flex: 1, padding: '6px 0', borderRadius: 20, border: 'none', background: period === p ? '#9ebd6e' : '#f0f0f0', color: period === p ? '#fff' : '#767676', fontSize: 11, fontFamily: 'inherit', fontWeight: period === p ? 700 : 400, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>
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
