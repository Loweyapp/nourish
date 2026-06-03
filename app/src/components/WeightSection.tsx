import { useState } from 'react'
import type { DayEntry } from '../types'
import { formatDate } from '../lib'
import { Section } from './shared'

interface WeightSectionProps {
  entry: Pick<DayEntry, 'weight' | 'weightFeedback'>
  allEntries: Record<string, DayEntry>
  currentDay: string
  onUpdate: (d: Partial<DayEntry>) => void
  dayContext: string
}

type BannerTone = 'good' | 'bad' | 'neutral'
type Banner = { msg: string; tone: BannerTone }

export default function WeightSection({ entry, allEntries, currentDay, onUpdate }: WeightSectionProps) {
  const [weight, setWeight] = useState(entry.weight ?? '')
  const [banner, setBanner] = useState<Banner | null>(null)

  const computeBanner = (w: string): Banner | null => {
    const kg = parseFloat(w)
    if (!kg) return null
    const prev = Object.entries(allEntries)
      .filter(([d, e]) => d < currentDay && e.weight)
      .sort((a, b) => a[0].localeCompare(b[0]))
    const lastEntry = prev[prev.length - 1]
    const lastKg = lastEntry ? parseFloat(lastEntry[1].weight!) : null
    const diff = lastKg !== null ? +(kg - lastKg).toFixed(1) : null
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0] as string
    const weekEntries = prev.filter(([d]) => d >= cutoffStr)
    const weekTrend = weekEntries.length >= 2
      ? +(parseFloat(weekEntries[weekEntries.length - 1]![1].weight!) - parseFloat(weekEntries[0]![1].weight!)).toFixed(1)
      : null

    const msgs: string[] = []
    let tone: BannerTone = 'neutral'

    if (diff !== null) {
      if (diff <= -0.3) {
        msgs.push(`⬇ Down ${Math.abs(diff)}kg since ${formatDate(lastEntry![0])} — great work!`)
        tone = 'good'
      } else if (diff >= 0.3) {
        msgs.push(`⬆ Up ${diff}kg since ${formatDate(lastEntry![0])}.`)
        tone = 'bad'
      } else {
        const changeStr = Math.abs(diff) < 0.05 ? 'no change' : (diff < 0 ? 'down ' + Math.abs(diff) + 'kg' : 'up ' + diff + 'kg')
        msgs.push(`Weight saved — ${changeStr} from last entry.`)
      }
    } else {
      msgs.push('Weight saved.')
    }

    if (weekTrend !== null && Math.abs(weekTrend) >= 0.8) {
      if (weekTrend > 0) {
        msgs.push(`Trend: up ${weekTrend}kg over the past week — worth keeping an eye on.`)
        if (tone === 'neutral') tone = 'bad'
      } else {
        msgs.push(`Trend: down ${Math.abs(weekTrend)}kg over the past week — great progress!`)
        if (tone === 'neutral') tone = 'good'
      }
    }
    return { msg: msgs.join(' '), tone }
  }

  const save = () => {
    if (!weight) return
    onUpdate({ weight })
    setBanner(computeBanner(weight))
  }

  const bc: Record<BannerTone, { bg: string; border: string; text: string }> = {
    good: { bg: '#edfaf2', border: '#6a9e6a', text: '#3a7a40' },
    bad: { bg: '#fff5f7', border: '#e8457a', text: '#801030' },
    neutral: { bg: '#f5f5f5', border: '#dddddd', text: '#767676' },
  }

  return (
    <Section title="WEIGHT" accent="#767676">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input type="number" step="0.1" placeholder="0.0" value={weight}
          onChange={e => setWeight(e.target.value)}
          style={{ width: 120, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: '#111111', outline: 'none', textAlign: 'center' }} />
        <span style={{ color: '#767676', fontSize: 16, fontWeight: 500 }}>kg</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={save} disabled={!weight}
          style={{ padding: '10px 24px', background: !weight ? '#e0e0e0' : '#767676', color: !weight ? '#aaaaaa' : '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          Save
        </button>
      </div>
      {banner && (() => { const c = bc[banner.tone]; return (
        <div style={{ marginTop: 10, padding: '10px 14px', background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, fontSize: 13, color: c.text, lineHeight: 1.6 }}>
          {banner.msg}
        </div>
      ) })()}
      <div style={{ marginTop: 8, fontSize: 12, color: '#767676' }}>Detailed trend analysis in Insights → Weight Trend</div>
    </Section>
  )
}
