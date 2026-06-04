import type { DayEntry } from '../types'
import { loadEntries, saveEntries, ls, DUMMY_SEEDED_KEY } from './storage'

const DUMMY_ALC_TEXTS = new Set([
  '2 pints of lager (4%)',
  'Glass of red wine (175ml, 13%)',
  '3 pints of lager (4%), double gin & tonic',
  'Bottle of beer (330ml, 5%)',
])

export function seedDummyData(): Record<string, DayEntry> | null {
  const seeded = ls.str(DUMMY_SEEDED_KEY)
  if (seeded === 'cleared' || seeded === '1') return null
  const entries = loadEntries()
  const alcDays: Array<Array<{ text: string; units: number }>> = [
    [],
    [{ text: '2 pints of lager (4%)', units: 4.6 }],
    [],
    [{ text: 'Glass of red wine (175ml, 13%)', units: 2.3 }],
    [],
    [{ text: '3 pints of lager (4%), double gin & tonic', units: 8.9 }],
    [{ text: 'Bottle of beer (330ml, 5%)', units: 1.65 }],
  ]
  const bpData = [
    { sys: 128, dia: 84, pulse: 68 },
    { sys: 132, dia: 86, pulse: 72 },
    { sys: 126, dia: 82, pulse: 65 },
    { sys: 135, dia: 88, pulse: 75 },
    { sys: 124, dia: 80, pulse: 64 },
    { sys: 138, dia: 90, pulse: 78 },
    { sys: 129, dia: 83, pulse: 70 },
  ]
  let changed = false
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0] as string
    const idx = 6 - i
    const existing = entries[dateStr] ?? {}
    const needsBP  = !existing.bpSystolic
    const alcDay   = alcDays[idx] ?? []
    const needsAlc = !existing.alcohol?.length && alcDay.length > 0
    const bp       = bpData[idx]
    if ((needsBP || needsAlc) && bp) {
      entries[dateStr] = {
        ...existing,
        ...(needsBP  ? { bpSystolic: bp.sys, bpDiastolic: bp.dia, bpPulse: bp.pulse } : {}),
        ...(needsAlc ? { alcohol: alcDay.map((a) => ({
          text: a.text,
          calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
          units: a.units, time: '20:00',
        })) } : {}),
      }
      changed = true
    }
  }
  if (changed) saveEntries(entries)
  ls.setStr(DUMMY_SEEDED_KEY, '1')
  return changed ? entries : null
}

export function clearDummyData(): void {
  const entries = loadEntries()
  let changed = false
  for (const [date, entry] of Object.entries(entries)) {
    let needsUpdate = false
    const cleaned = { ...entry }
    if (cleaned.bpSystolic !== undefined || cleaned.bpDiastolic !== undefined || cleaned.bpPulse !== undefined) {
      delete cleaned.bpSystolic
      delete cleaned.bpDiastolic
      delete cleaned.bpPulse
      needsUpdate = true
      changed = true
    }
    if (cleaned.alcohol?.some(a => DUMMY_ALC_TEXTS.has(a.text))) {
      const filtered = cleaned.alcohol.filter(a => !DUMMY_ALC_TEXTS.has(a.text))
      if (filtered.length > 0) {
        cleaned.alcohol = filtered
      } else {
        delete cleaned.alcohol
      }
      needsUpdate = true
      changed = true
    }
    if (needsUpdate) entries[date] = cleaned
  }
  if (changed) saveEntries(entries)
  ls.setStr(DUMMY_SEEDED_KEY, 'cleared')
}
