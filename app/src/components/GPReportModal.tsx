import { useState } from 'react'
import type { DayEntry } from '../types'
import { askClaude, bpCategory, formatDate, fmtMins } from '../lib'

interface GPReportModalProps {
  entries: Record<string, DayEntry>
  onClose: () => void
}

export default function GPReportModal({ entries, onClose }: GPReportModalProps) {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const days = Object.entries(entries).sort((a, b) => a[0].localeCompare(b[0])).slice(-30)

  const generate = async () => {
    setLoading(true); setError('')
    const bpReadings = days.flatMap(([d, e]) => {
      if (e.bpSessions?.length) {
        return e.bpSessions.map(s => {
          const cat = bpCategory(s.avg.sys, s.avg.dia)
          const readingsStr = s.readings.length > 1 ? ` (${s.readings.map(r => `${r.sys}/${r.dia}`).join(', ')} → avg)` : ''
          return `${formatDate(d)} ${s.label}: ${s.avg.sys}/${s.avg.dia} mmHg${s.avg.pulse ? ` pulse ${s.avg.pulse}bpm` : ''}${readingsStr} [${cat?.short ?? ''}]${s.note ? ` — "${s.note}"` : ''}`
        })
      }
      if (e.bpSystolic && e.bpDiastolic) {
        const cat = bpCategory(e.bpSystolic, e.bpDiastolic)
        return [`${formatDate(d)}: ${e.bpSystolic}/${e.bpDiastolic} mmHg${e.bpPulse ? ` pulse ${e.bpPulse}bpm` : ''} [${cat?.short ?? ''}]`]
      }
      return []
    })

    const journalEntries = days
      .filter(([, e]) => e.notes?.length)
      .flatMap(([d, e]) => (e.notes ?? []).map(n => `${formatDate(d)} ${n.timestamp.slice(11, 16)}: ${n.text}`))

    const foodSummary = days
      .filter(([, e]) => (e.food ?? []).length > 0)
      .map(([d, e]) => {
        const cals = (e.food ?? []).reduce((s, f) => s + (f.calories || 0), 0)
        const items = (e.food ?? []).map(f => f.text).join(', ')
        return `${formatDate(d)}: ${cals} kcal — ${items}`
      })

    const sleepSummary = days
      .filter(([, e]) => e.fitbit?.sleepMins)
      .map(([d, e]) => `${formatDate(d)}: ${fmtMins(e.fitbit!.sleepMins)} sleep (deep ${fmtMins(e.fitbit!.deepMins)}, REM ${fmtMins(e.fitbit!.remMins)})`)

    const alcSummary = days
      .filter(([, e]) => (e.alcohol ?? []).length > 0)
      .map(([d, e]) => {
        const units = (e.alcohol ?? []).reduce((s, a) => s + (a.units || 0), 0)
        return `${formatDate(d)}: ${units.toFixed(1)} units`
      })

    const weightReadings = days
      .filter(([, e]) => e.weight)
      .map(([d, e]) => `${formatDate(d)}: ${e.weight} kg`)

    const prompt = `You are helping a patient prepare a health summary for their GP. Generate a clear, factual report using the data below.

Structure the report as follows:
1. **Summary** — 2-3 sentences covering the period, key concerns, and overall health picture
2. **Blood Pressure** — trend, average, highest/lowest readings, any patterns noted
3. **Symptoms & Wellbeing** — key themes from the patient's own notes (symptoms, energy, sleep quality, digestive issues, headaches etc.)
4. **Diet & Nutrition** — average calorie intake, any notable patterns
5. **Sleep** — average duration and quality where available
6. **Alcohol** — weekly units where available
7. **Weight** — trend if available
8. **Patterns & Possible Correlations** — any connections you notice between BP, diet, symptoms, sleep

Be factual and objective. Use British English. Write for a GP who will read this quickly. Do not make diagnoses. Flag anything that looks clinically significant. Use the patient's own words from their journal notes where relevant.`

    const data = [
      bpReadings.length ? `BLOOD PRESSURE READINGS:\n${bpReadings.join('\n')}` : null,
      journalEntries.length ? `PATIENT JOURNAL NOTES:\n${journalEntries.join('\n')}` : null,
      foodSummary.length ? `FOOD DIARY:\n${foodSummary.join('\n')}` : null,
      sleepSummary.length ? `SLEEP DATA:\n${sleepSummary.join('\n')}` : null,
      alcSummary.length ? `ALCOHOL:\n${alcSummary.join('\n')}` : null,
      weightReadings.length ? `WEIGHT:\n${weightReadings.join('\n')}` : null,
    ].filter(Boolean).join('\n\n')

    try {
      const resp = await askClaude(
        [{ role: 'user', content: data }],
        prompt
      )
      setReport(resp)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  const copyReport = () => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    }).catch(() => {})
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #efefef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111111' }}>GP Summary Report</div>
            <div style={{ fontSize: 12, color: '#767676', marginTop: 2 }}>Last 30 days of data · AI-generated</div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f5', border: 'none', fontSize: 18, color: '#767676', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {!report && !loading && !error && (
            <div>
              <div style={{ fontSize: 14, color: '#767676', lineHeight: 1.7, marginBottom: 20 }}>
                This will generate a structured health summary using your blood pressure readings, journal notes, food diary, sleep data, and alcohol log from the last 30 days.<br /><br />
                You can copy it and share it with your GP, paste it into an email, or print it before an appointment.
              </div>
              <div style={{ background: '#fef9e7', border: '1.5px solid #f0d060', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#7a6020', marginBottom: 20, lineHeight: 1.6 }}>
                ⚠ This is not a medical document and should not replace professional advice. Your GP should interpret the data in full clinical context.
              </div>
              <button onClick={() => void generate()}
                style={{ padding: '12px 28px', background: '#5a9ea0', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', fontWeight: 700 }}>
                ✦ Generate report
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#767676' }}>
              <div style={{ fontSize: 14 }}>Generating your report…</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>This may take a few seconds.</div>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#e8457a', marginBottom: 16 }}>{error}</div>
          )}

          {report && (
            <div>
              <div style={{ fontSize: 13, color: '#111111', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{report}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #efefef', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={copyReport}
              style={{ flex: 1, padding: '11px', background: copied ? '#6a9e6a' : '#5a9ea0', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
              {copied ? 'Copied ✓' : 'Copy to clipboard'}
            </button>
            <button onClick={() => { setReport(''); setError('') }}
              style={{ padding: '11px 16px', background: 'none', border: '1.5px solid #efefef', color: '#767676', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }}>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
