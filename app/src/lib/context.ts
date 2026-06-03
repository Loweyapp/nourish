import type { DayEntry, MealWarning } from '../types'
import { fmtMins } from './utils'

const MOODS = [
  { emoji: '😴', label: 'Exhausted', value: 1 },
  { emoji: '😔', label: 'Low',       value: 2 },
  { emoji: '😐', label: 'Okay',      value: 3 },
  { emoji: '🙂', label: 'Good',      value: 4 },
  { emoji: '⚡', label: 'Energised', value: 5 },
] as const

const ENERGY = [
  { emoji: '🪫',  label: 'Drained', value: 1 },
  { emoji: '😮‍💨', label: 'Tired',   value: 2 },
  { emoji: '😌',  label: 'Steady',  value: 3 },
  { emoji: '💪',  label: 'Strong',  value: 4 },
  { emoji: '🔥',  label: 'Peak',    value: 5 },
] as const

// Verbatim from index.html
export function buildDayContext(entry: DayEntry | undefined): string {
  if (!entry) return 'No data logged today yet.'
  const parts: string[] = []
  if (entry.food?.length) {
    const totalCals = entry.food.reduce((s, f) => s + (f.calories || 0), 0)
    parts.push(`Food: ${entry.food.map((f) => `${f.meal}: ${f.text} (${f.calories} kcal)`).join('; ')}. Total: ${totalCals} kcal.`)
  }
  if (entry.mood)     parts.push(`Mood: ${MOODS.find((m) => m.value === entry.mood)?.label}.`)
  if (entry.energy)   parts.push(`Energy: ${ENERGY.find((e) => e.value === entry.energy)?.label}.`)
  if (entry.moodNote) parts.push(`Wellbeing notes: "${entry.moodNote}".`)
  if (entry.exercise) parts.push(`Exercise: ${entry.exercise}.`)
  if (entry.weight)   parts.push(`Weight: ${entry.weight}kg.`)
  if (entry.bp?.systolic) parts.push(`Blood pressure: ${entry.bp.systolic}/${entry.bp.diastolic} mmHg.`)
  if (entry.bpSystolic && entry.bpDiastolic) parts.push(`Blood pressure: ${entry.bpSystolic}/${entry.bpDiastolic} mmHg${entry.bpPulse ? `, pulse ${entry.bpPulse} bpm` : ''}.`)
  if (entry.alcohol?.length) {
    const totalUnits = entry.alcohol.reduce((s, a) => s + (a.units || 0), 0).toFixed(1)
    parts.push(`Alcohol: ${entry.alcohol.map((a) => a.text).join(', ')}. Total units: ${totalUnits}.`)
  }
  if (entry.fitbit) {
    const f = entry.fitbit
    if (f.steps)     parts.push(`Steps: ${f.steps.toLocaleString()}.`)
    if (f.sleepMins) parts.push(`Sleep last night: ${fmtMins(f.sleepMins)} (deep ${fmtMins(f.deepMins)}, REM ${fmtMins(f.remMins)}, light ${fmtMins(f.lightMins)}).`)
    if (f.restingHR) parts.push(`Resting heart rate: ${f.restingHR} bpm.`)
    if (f.activeMin) parts.push(`Active minutes: ${f.activeMin}.`)
    if (f.calsBurned) parts.push(`Calories burned (total): ${f.calsBurned}.`)
  }
  const base = parts.length ? parts.join(' ') : 'No data logged today yet.'
  return base + getCompletenessNote(entry)
}

export function getMealWarnings(entry: DayEntry | undefined): MealWarning[] {
  const now = new Date()
  const timeDecimal = now.getHours() + now.getMinutes() / 60
  const food = entry?.food || []
  const loggedCals = food.reduce((s, f) => s + (f.calories || 0), 0)
  const warnings: MealWarning[] = []

  if (timeDecimal >= 10.5 && loggedCals === 0) {
    warnings.push({ type: 'meal', msg: "Nothing logged yet today — don't forget to add what you've eaten." })
  }

  if (timeDecimal >= 13.5 && loggedCals > 0 && loggedCals < 300) {
    warnings.push({ type: 'meal', msg: `Only ${loggedCals} kcal logged by lunchtime — are some meals missing?` })
  }

  if (timeDecimal >= 20.0 && loggedCals < 600) {
    warnings.push({ type: 'meal', msg: `Only ${loggedCals} kcal logged — if you've had dinner, don't forget to add it. You can always roll earlier meals in with dinner.` })
  }

  const burned = entry?.fitbit?.calsBurned || 0
  if (burned > 0 && (burned - loggedCals) > 1200) {
    warnings.push({ type: 'fitbit', msg: `Fitbit shows ${burned} kcal burned but only ${loggedCals} kcal logged — some meals may be missing.` })
  }

  return warnings
}

function getCompletenessNote(entry: DayEntry): string {
  const warnings = getMealWarnings(entry)
  if (!warnings.length) return ''
  const slots = warnings.filter((w) => w.type === 'meal').map((w) => w.slot).filter(Boolean)
  const fitbitWarn = warnings.find((w) => w.type === 'fitbit')
  const parts: string[] = []
  if (slots.length) parts.push(`Possibly missing meals: ${slots.join(', ')}`)
  if (fitbitWarn) parts.push(fitbitWarn.msg)
  return `\n\nDATA COMPLETENESS WARNING: ${parts.join('. ')}. The logged calorie total may be significantly understated. Factor this uncertainty into your analysis — do not treat the logged figure as accurate.`
}
