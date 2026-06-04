// ── Primitive value types ──────────────────────────────────────────────────────
export type MoodValue = 1 | 2 | 3 | 4 | 5
export type EnergyValue = 1 | 2 | 3 | 4 | 5

export type MoodOption = { emoji: string; label: string; value: MoodValue }
export type EnergyOption = { emoji: string; label: string; value: EnergyValue }

// ── Journal ────────────────────────────────────────────────────────────────────
export type JournalNote = {
  text: string
  timestamp: string   // ISO 8601 e.g. "2026-06-04T09:32:00"
}

// ── Food & drink ───────────────────────────────────────────────────────────────
export type FoodItem = {
  text: string
  meal?: string           // legacy field from nourish.html era
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  units: number           // 0 for non-alcoholic
  time: string            // "HH:00"
  drink_type?: string
  abv?: number
  volume_ml?: number
  commentary?: string     // not persisted after adding to log
}

// Same shape as FoodItem; units > 0 distinguishes drinks
export type DrinkItem = FoodItem

// ── Favourites ─────────────────────────────────────────────────────────────────
export type Favourite = {
  name?: string           // friendly display name (may differ from text)
  text: string            // original ingredient description
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  units: number
  useCount: number
}

// ── Blood pressure sessions ────────────────────────────────────────────────────
export type BPReading = { sys: number; dia: number; pulse?: number }
export type BPSessionLabel = 'Morning' | 'Afternoon' | 'Evening' | 'Other'
export type BPSession = {
  id: string              // ISO timestamp used as stable key
  label: BPSessionLabel
  timestamp: string       // ISO 8601 e.g. "2026-06-04T09:15:00"
  readings: BPReading[]   // 1–3 individual readings
  avg: BPReading          // computed average of readings
  note?: string
}

// ── Fitbit ─────────────────────────────────────────────────────────────────────
export type FitbitData = {
  steps: number
  activeMin: number
  calsBurned: number
  restingHR: number | null
  sleepMins: number
  deepMins: number
  remMins: number
  lightMins: number
  awakeMins: number
  sleepStart: string | null
  sleepEnd: string | null
  fetchedAt: number       // ms timestamp
}

export type FitbitToken = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number      // ms timestamp
  user_id?: string
}

// ── Google Drive ───────────────────────────────────────────────────────────────
export type GDriveToken = {
  access_token: string
  expires_at: number
}

// ── Day entry (the main data record) ──────────────────────────────────────────
export type DayEntry = {
  food?: FoodItem[]
  alcohol?: DrinkItem[]
  mood?: MoodValue
  energy?: EnergyValue
  moodNote?: string
  moodFeedback?: string
  exercise?: string
  exerciseFeedback?: string
  weight?: string         // stored as string (e.g. "74.5") — preserve existing localStorage shape
  weightFeedback?: string // legacy — no longer written by new code
  bpSessions?: BPSession[]
  // Legacy single-reading fields — read-only, never written by new code
  bpSystolic?: number
  bpDiastolic?: number
  bpPulse?: number
  bpNote?: string
  notes?: JournalNote[]
  fitbit?: FitbitData
  // legacy bp shape from nourish.html era — read-only, never written
  bp?: { systolic?: number; diastolic?: number; pulse?: number }
}

// ── Blood pressure ─────────────────────────────────────────────────────────────
export type BPCategory = {
  label: string
  short: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis'
  bg: string
  border: string
  text: string
  dot: string
}

// ── Anthropic API ──────────────────────────────────────────────────────────────
export type ClaudeMessage = { role: 'user' | 'assistant'; content: string }

export type ClaudeUsage = {
  input_tokens?: number
  output_tokens?: number
}

export type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>
  usage?: ClaudeUsage
  error?: { message?: string; type?: string }
}

// ── Token tracking ─────────────────────────────────────────────────────────────
export type UsageTotals = { input: number; output: number }

// ── Warning bar ────────────────────────────────────────────────────────────────
export type MealWarning = { type: 'meal' | 'fitbit'; msg: string; slot?: string }
