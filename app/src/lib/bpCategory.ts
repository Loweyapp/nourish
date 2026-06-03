import type { BPCategory } from '../types'

// Verbatim port from index.html — NHS BP threshold categorisation
export function bpCategory(s: number | string | undefined, d: number | string | undefined): BPCategory | null {
  if (!s || !d) return null
  const sv = Number(s), dv = Number(d)
  if (sv > 180 || dv > 120) return { label: 'Hypertensive Crisis', short: 'Crisis',   bg: '#fce8e8', border: '#b02020', text: '#700020', dot: '#b02020' }
  if (sv >= 140 || dv >= 90) return { label: 'High — Stage 2',     short: 'Stage 2',  bg: '#fff5f7', border: '#e8457a', text: '#801030', dot: '#e8457a' }
  if (sv >= 130 || dv >= 80) return { label: 'High — Stage 1',     short: 'Stage 1',  bg: '#fff8f0', border: '#9ebd6e', text: '#7a4010', dot: '#9ebd6e' }
  if (sv >= 120 && dv < 80)  return { label: 'Elevated',           short: 'Elevated', bg: '#fffbe0', border: '#c8a000', text: '#5a5000', dot: '#c8a000' }
  return                             { label: 'Normal',             short: 'Normal',   bg: '#edfaf2', border: '#6a9e6a', text: '#3a7a40', dot: '#6a9e6a' }
}
