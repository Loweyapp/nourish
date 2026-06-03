# Nourish Migration Plan

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Inventory, scaffold, plan | ✅ Done |
| Phase 2 | Execute migration — move components, add types | ✅ Done |
| Phase 3a | Ship migration — GH Pages, lint fix, extractJSON, manifest, archive, audits | ✅ Done |
| Phase 3b | No-scale portion sizing | ⏳ Pending |

---

## 1. Codebase Inventory

### 1.1 Files

| File | Purpose |
|------|---------|
| `index.html` | **Live app** — 2,680-line single-file React + Babel app |
| `nourish.html` | Older version of the app with a warm-brown (parchment) theme. Fewer features — no BP section, no favourites system, no stats bar, no warning bar, no layout reordering, no Google Drive, no coaching style, no token tracking, no multi-meal parsing. Keep as historical reference; do not migrate it. |
| `manifest.json` | PWA manifest — references parchment colours (`#fdf8f2`, `#3d2b1a`) matching `nourish.html`, not `index.html`. **Inconsistency to fix in Phase 3.** |
| `icon-192.png`, `icon-512.png` | PWA icons |

### 1.2 Feature Inventory

#### Food & Drink logging
- Free-text entry textarea (with "be specific for best accuracy" placeholder)
- Camera capture and gallery picker — resizes to 1024px max, JPEG 0.85, sends base64 to Claude for food/drink identification
- Multi-meal parsing in a single entry (e.g. "Lunch: eggs and salad. Dinner: steak") — Claude returns a `{multi: true, items: [...]}` response and bulk-adds to log
- Single-item analysis returns calories, protein, carbs, fat, alcohol units, drink_type, ABV, volume_ml, plus a 2–3 sentence commentary
- Type classification: `"food"`, `"alcohol"`, or `"both"` (both adds to food AND drink lists simultaneously)
- Pending preview with macro pills before confirming "Add to log"
- Per-item time picker (HourSelect, 6am–midnight, hourly)
- Unified timeline view of food + drink items sorted by time; last 3 always shown, older items behind an accordion
- "Log another item" reset button
- Save-to-favourites flow: after analysing, tap ⭐ Save → optional custom display name input → saves with original text + macros

#### Favourites
- Stored as array of `{name?, text, calories, protein_g, carbs_g, fat_g, units, useCount}` objects
- `name` is the friendly display name; `text` is the original ingredient description — these are deliberately separate
- Sorted by `useCount` descending (most-used float to top)
- Dropdown overlay from the "Saved" button — checkbox multi-select, adds directly without AI call
- Deduplication: same `text` → updates existing entry rather than duplicating; same `name` → blocked
- Manageable in Settings (list view with delete, add-new with optional calories; AI estimates calories if blank)

#### Fitbit integration
- PKCE OAuth flow: `pkce()` generates verifier + SHA-256 challenge, redirects to Fitbit, exchanges code on return
- Cloudflare Worker proxy at `rapid-star-52f2.alexlowe1.workers.dev/fitbit` (proxies all Fitbit API calls — the Fitbit client secret lives in the Worker, not the browser)
- Auto-refresh of access token using `refresh_token`
- Auto-sync on app open if not yet fetched today (debounced by `FB_FETCH_KEY` date)
- Fetches: activities summary (steps, active minutes, calories burned), sleep (minutesAsleep, deep/REM/light/wake stages, start/end times), heart rate (resting HR)
- Arc-ring visualisation in the Fitbit section card
- Sleep breakdown cards (Deep / REM / Light / Active minutes)
- Steps progress bar

#### Blood Pressure
- Inputs: systolic, diastolic, pulse (optional), free-text notes
- Live NHS category pill while typing (Normal / Elevated / Stage 1 / Stage 2 / Hypertensive Crisis)
- `bpCategory()` function applies NHS thresholds
- On Save: banner with plain-English message and colour-coded feedback
- "Detailed trend analysis in Insights" nudge link

#### Mood & Energy
- Emoji picker for mood (5 states: Exhausted → Energised) and energy (5 states: Drained → Peak)
- Free-text notes field
- "Get AI feedback" → Claude gives 2-3 sentences connecting mood/energy to food, sleep, exercise
- Save button (separate from AI analysis) with 1.5s "Saved ✓" flash
- ChatWidget for follow-ups

#### Exercise
- Single free-text textarea (e.g. "30 min run")
- "Get AI feedback" → Claude acknowledges, estimates calories burned, connects to Fitbit/food/mood
- ChatWidget for follow-ups

#### Weight
- Numeric input (kg, 1dp)
- On Save: smart banner comparing to previous entry (change since last, weekly trend) with colour-coded tone (green=down, red=up, neutral=stable)
- No AI call on save — banner is computed locally from stored entries
- "Detailed trend analysis in Insights" nudge

#### AI coaching
- `askClaude()` function: takes messages array + system prompt, appends coaching style from Settings
- Every AI feature has a `ChatWidget` for follow-up conversations
- Day context (`buildDayContext()`) is injected into every AI call
- `getCompletenessNote()` adds a DATA COMPLETENESS WARNING to Claude's context when calories look understated (based on time of day or Fitbit deficit)

#### Insights tab (charts)
- All charts are hand-drawn SVG — no charting library
- `ScrollRight` wrapper auto-scrolls SVG to the rightmost (most recent) point on mount
- **Mood & Energy**: dual-line area chart (mood=purple, energy=teal dashed), 14 days
- **Daily Calories**: bar chart, red if >2,500 kcal, average line dashed
- **Daily Steps**: bar chart, green if ≥10,000, dashed 10k goal line
- **Weight Trend**: area line chart with gradient fill, trend delta header (`+/-X kg`)
- **Alcohol (Units)**: bar chart, colour-coded (green ≤2u, amber 2–6u, red 6u+), 2u/day guideline line, period total
- **Blood Pressure**: dual-line chart (systolic=pink, diastolic=blue dashed), NHS threshold lines at 140 and 90, pulse shown as ♥ annotation; "Copy readings" formats for GP clipboard
- **AI Pattern Analysis**: sends 14-day summary JSON to Claude, returns bullet-point correlations
- Reorderable layout (same DraggableLayout system as Log tab)

#### Stats Bar
- Sticky bar below header, always visible
- Day / Week / Month toggle
- Shows: Net Cals (cals in − cals out), Cals In / Cals Out (tap to toggle), Steps / Miles (tap to toggle), Units / Pints (tap to toggle)
- Units warning turns pink if above 2u/day average for the period

#### Warning Bar
- Sits above the header, yellow background
- Fires when: nothing logged by 10:30am; <300 kcal by 1:30pm; <600 kcal by 8pm; Fitbit deficit >1,200 kcal

#### Date Navigator
- Prev/next arrow buttons (1 day each)
- Invisible `<input type="date">` overlaid on the date display — lets user pick any past date
- Capped at today (future dates blocked)
- "↩ today" pill when not on today
- All tabs respect `currentDay`, so History → click a day → jumps to Log for that day

#### History Tab
- Reverse-chronological list of all logged days
- Per-row: date, meal count, kcal, steps, sleep, exercise flag, weight, BP, alcohol units
- Tap row → jumps to Log tab for that date

#### Settings
- **API Key**: password input, save/show partial key, `console.anthropic.com` link
- **API Usage**: lifetime token counts + cost (£), session token counts + cost; reset button; pricing note (Claude Sonnet 4: £2.37/M input, £11.85/M output)
- **Coaching Style**: free-text textarea appended to every Claude prompt globally
- **Fitbit**: connected/disconnected status, disconnect button
- **Google Drive Backup**: connect/disconnect, manual backup, last backup timestamp
- **Favourites**: full management (view, delete, add-new with AI calorie estimate)
- **Demo Data**: clears the 7-day seeded sample data

#### Reorderable Layout
- `DraggableLayout` component: stores order in localStorage, up/down arrow buttons in edit mode
- Log tab sections: `['food','fitbit','mood','exercise','weight','bp']`
- Insights tab sections: `['mood_energy','calories','steps','weight','alcohol','bp','ai']`

#### PWA
- `manifest.json` with standalone display mode
- `<meta name="apple-mobile-web-app-capable">` for iOS home screen
- No service worker currently

#### Google Drive Backup
- Implicit token flow (no PKCE — tokens returned in URL hash)
- Saves to `"Nourish Backups"` folder, weekly auto-backup on app open
- Manual backup from Settings
- Token expiry checked before use; clears if expired

#### Dummy data seeder
- On first launch, seeds 7 days of BP and alcohol data so Insights charts are visible
- Controlled by `DUMMY_SEEDED_KEY` — value `"cleared"` means user explicitly removed it, value `"1"` means already seeded

---

### 1.3 localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `nourish-entries-v1` | `Record<string, DayEntry>` | All daily entries, keyed by `YYYY-MM-DD` |
| `nourish-api-key` | `string` | Anthropic API key (raw string, not JSON) |
| `nourish-fitbit-token` | `FitbitToken` | Fitbit OAuth token + expiry |
| `nourish-fitbit-verifier` | `string` | PKCE verifier (temp, deleted after exchange) |
| `nourish-fitbit-fetched` | `string` | Date string of last Fitbit sync (`YYYY-MM-DD`) |
| `nourish-coaching-style` | `string` | User's coaching preferences appended to all prompts |
| `nourish-gdrive-token` | `GDriveToken` | Google Drive token + expiry timestamp |
| `nourish-last-backup` | `string` | ISO timestamp of last successful backup |
| `nourish-dummy-seeded` | `"1" \| "cleared"` | Controls demo data state |
| `nourish-favourites` | `Favourite[]` | Saved food/drink items |
| `nourish-log-layout` | `string[]` | Reordered section order for Log tab |
| `nourish-insights-layout` | `string[]` | Reordered section order for Insights tab |
| `nourish-usage-total` | `{input: number, output: number}` | Cumulative token counts |

#### DayEntry shape (approximate)

```ts
type DayEntry = {
  food?: FoodItem[]
  alcohol?: DrinkItem[]
  mood?: 1 | 2 | 3 | 4 | 5
  energy?: 1 | 2 | 3 | 4 | 5
  moodNote?: string
  moodFeedback?: string
  exercise?: string
  exerciseFeedback?: string
  weight?: string          // stored as string (e.g. "74.5")
  weightFeedback?: string  // legacy — no longer written by new code
  bpSystolic?: number
  bpDiastolic?: number
  bpPulse?: number
  bpNote?: string
  fitbit?: FitbitData
}

type FoodItem = {
  text: string
  meal?: string            // legacy field from nourish.html era
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  units: number            // 0 for non-alcoholic
  time: string             // "HH:00"
  drink_type?: string
  abv?: number
  volume_ml?: number
  commentary?: string      // not persisted after adding to log
}

type DrinkItem = FoodItem  // same shape, units > 0

type Favourite = {
  name?: string            // friendly display name (may differ from text)
  text: string             // original ingredient description
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  units: number
  useCount: number
}

type FitbitToken = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number       // ms timestamp
  user_id?: string
}

type GDriveToken = {
  access_token: string
  expires_at: number
}

type FitbitData = {
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
  fetchedAt: number        // ms timestamp
}
```

---

### 1.4 External Integrations

#### Anthropic API

- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Model**: `claude-sonnet-4-20250514`
- **Auth header**: `x-api-key: <key>` — key sourced from localStorage (see §2 below)
- **Required header**: `anthropic-dangerous-direct-browser-access: true` — Anthropic's explicit opt-in for direct browser calls
- **Calls made**:
  - `FoodSection.analyse()` — nutrition analysis, single or multi-meal
  - `FoodSection.handleImage()` — image-to-text food/drink identification (vision)
  - `MoodSection.analyse()` — wellbeing feedback
  - `ExerciseSection.analyse()` — exercise feedback
  - `WeightTrendSection.analyse()` — weight trend commentary
  - `BPTrendSection.analyse()` — BP trend analysis with lifestyle correlations
  - `InsightsTab.getInsights()` — multi-day pattern analysis
  - `ChatWidget.send()` — follow-up chat in any section
  - `SettingsScreen.addFav()` — calorie estimation for manually-added favourites
- **Token tracking**: `trackUsage()` accumulates session + lifetime totals in localStorage after every call
- **Coaching style**: `getCoachingStyle()` appends user's coaching preferences to every system prompt

#### Fitbit OAuth (PKCE)

- **Client ID**: `23TXZL` (public, safe to commit)
- **Flow**: PKCE — `crypto.subtle` SHA-256 challenge, redirects to `fitbit.com/oauth2/authorize`
- **Redirect URI**: `https://loweyapp.github.io/nourish`
- **Token exchange**: browser calls `api.fitbit.com/oauth2/token` directly
- **Proxy**: `https://rapid-star-52f2.alexlowe1.workers.dev/fitbit` — all Fitbit data requests route through this Cloudflare Worker, which forwards with the auth header. The client secret is not in the browser — PKCE doesn't require one.
- **Scopes**: `activity sleep heartrate`
- **Token refresh**: `refresh_token` grant, client-side, stored in localStorage

#### Google Drive OAuth (implicit flow)

- **Client ID**: `841458188245-8rdmltdj4acjb0c4fisrf44vmedovuc3.apps.googleusercontent.com`
- **Flow**: implicit — `response_type=token`, token returned in URL hash
- **Redirect URI**: `https://loweyapp.github.io/nourish`
- **Scope**: `https://www.googleapis.com/auth/drive.file`
- **API calls**: direct from browser (no proxy) — `drive.googleapis.com/drive/v3/files` and multipart upload
- **Security note**: implicit flow is deprecated by Google in favour of PKCE for SPAs. Worth addressing in Phase 3 if Google eventually forces it.

---

### 1.5 JSON Parsing

There is **no `extractJSON` character-walking parser** in the current codebase. The prompt mentioned one, but it does not exist. JSON from Claude is parsed with:

```js
JSON.parse(resp.replace(/```json|```/g, "").trim())
```

This is fragile — it will fail if Claude wraps the response in a code fence using a different fence style, adds explanatory text before/after the JSON, or if there are nested backtick strings within the JSON strings. Phase 2 should implement a proper `extractJSON` that walks character-by-character to find the outermost `{` and `}`, making it robust against all these cases. This is a real fragility fix worth doing as part of the migration, not a feature addition.

---

### 1.6 Design System

#### Aesthetic

Monzo-inspired: clean white cards on `#f5f5f5` page background, high-contrast dark text, pill/rounded corners throughout.

#### Colour palette

| Token | Value | Use |
|-------|-------|-----|
| Page background | `#f5f5f5` | App bg |
| Card background | `#ffffff` | All Section cards |
| Primary text | `#111111` | Body text — WCAG AA+ on white |
| Secondary text | `#767676` | Labels, meta — 4.54:1 AA on white |
| Muted text | `#aaaaaa` | Disabled states |
| Green (primary accent) | `#9ebd6e` | Nav active, buttons, progress |
| Green dark | `#7aA050` / `#6a9e6a` | Button hover states, "add" actions |
| Blue (Fitbit) | `#4a86d8` | Fitbit section, step charts |
| Purple (mood) | `#805d93` | Mood section, mood chart line |
| Orange (exercise) | `#f59c38` | Exercise section, alcohol chart |
| Pink (BP/alerts) | `#e8457a` | Blood pressure, warnings, errors |
| Teal (energy) | `#26b5a8` | Energy chart line |
| Warning yellow | `#f0c040` | Warning bar background |

**WCAG rules enforced in the current code:**
- Palette colours (green, blue, purple, orange, pink, teal) are applied only to borders, icon fills, chart elements, button backgrounds, and accent dots — **never to text**
- All body text uses `#111111` or `#767676`
- Minimum font size in use: 9px (SVG chart axis labels only) — everything else ≥12px
- The 12px floor must be enforced in Phase 2 CSS/Tailwind — SVG chart labels are a known exception

#### Typography

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

System stack — no web fonts.

#### Card pattern

```
background: #ffffff
border-radius: 16px
padding: 16px 18px 20px
box-shadow: 0 1px 6px rgba(0,0,0,0.04)
border: 1px solid #efefef
```

Section title: 8px accent dot + uppercase label, `#555555`, 12px, letter-spacing 1.

#### Section header accent

```
● [accent dot] SECTION TITLE IN UPPERCASE
```

---

### 1.7 Babel-Standalone Gotchas

These are issues in Babel-standalone that do **not** apply in a proper Vite/TS build, but Phase 2 must ensure equivalent code is written correctly:

1. **Nested backtick template literals**: Babel-standalone 7.23 occasionally misparses template literals that contain other template literals. The workaround in `index.html` is the string concatenation at line 780:
   ```js
   const parsed = JSON.parse(resp.replace(/` + "```" + `json|` + "```" + `/g,"").trim());
   ```
   In the migrated code, write this as a normal regex literal — no workaround needed.

2. **Literal newlines in JSX strings**: In Babel-standalone, string props with literal newlines can be mishandled. All newlines in strings in the current code are embedded as `\n` escape sequences.

3. **No type annotations**: The current code has no TypeScript. Phase 2 adds types — be careful not to accidentally change runtime behaviour when adding type assertions.

---

## 2. API Key Diagnosis

### Where does the key come from?

The Anthropic API key is **user-supplied via the app's own UI** and stored in `localStorage` under the key `"nourish-api-key"` as a plain string (not JSON-encoded). It is not hardcoded, not in an environment variable, and not baked into the build.

Flow:
1. On first launch, `getApiKey()` returns empty → `ApiKeyScreen` is rendered
2. User pastes their `sk-ant-...` key into a password input and taps "Get started"
3. `saveApiKey()` calls `localStorage.setItem("nourish-api-key", key)`
4. Every `askClaude()` call reads the key from localStorage and sends it as `x-api-key: <key>` directly to `api.anthropic.com`

The header `"anthropic-dangerous-direct-browser-access": "true"` is Anthropic's explicit acknowledgement that the app is making a direct browser call — they require this header to opt in to CORS access.

### Security implications

**This is a client-exposed secret.** Consequences:

1. **Anyone on the device can read the key** from DevTools → Application → LocalStorage. This is unavoidable for any single-user app that runs entirely in the browser.

2. **The key travels over the network in every API request header.** Any HTTP proxy, browser extension with network access, or person watching DevTools Network tab can see it.

3. **The key is scoped to the user's Anthropic account** — it has full billing access. If it leaks, an attacker can make API calls at the user's expense.

4. **There is no rate limiting or cost cap** in the current architecture. A leaked key can run up an uncapped bill.

5. **However:** The app is a single-user personal tool deployed at a private GitHub Pages URL. The realistic threat model is low — the key is their own, on their own device. The risk is similar to keeping a personal API key in a dotfile.

### Recommended fix (Phase 3)

Add a second Cloudflare Worker proxy mirroring the existing Fitbit pattern:

```
Browser → POST /api/claude (Worker) → api.anthropic.com
```

The Worker:
- Holds the Anthropic API key as a Worker secret (not visible to the browser)
- Validates requests (e.g. check `Origin`, optionally add a shared secret header)
- Forwards to Anthropic and streams the response back
- Can add rate limiting and per-day spend caps

The browser sends no API key — it talks only to the Worker endpoint.

This is consistent with the existing architecture (Fitbit already goes through a Worker). Google Drive's implicit OAuth is a separate issue (the *access* token is in the browser but it's OAuth-scoped to `drive.file` only, which limits blast radius).

---

## 3. Proposed Component Breakdown

### Folder structure

```
src/
  components/
    layout/          App chrome: Header, NavBar, DateNavigator, StatsBar, WarningBar
    log/             Log tab sections: FoodSection, FitbitSection, MoodSection,
                     ExerciseSection, WeightSection, BPSection, DraggableLayout
    insights/        Insights tab charts: MoodEnergyChart, CaloriesChart,
                     StepsChart, WeightTrendSection, AlcoholChart, BPTrendSection,
                     AIPatternAnalysis
    shared/          Reusable primitives: Section, Label, Spinner, AIBubble,
                     ChatWidget, Pill, EmojiPicker, AnalyseBtn, HourSelect,
                     StatPill, ProgressBar, ScrollRight, Icon
    screens/         Full-screen overlays: ApiKeyScreen, SettingsScreen
  hooks/
    useEntries.ts    CRUD for all day entries (load/save/update)
    useFitbit.ts     Fitbit token management + fetchFitbitDay
    useFavourites.ts Favourites CRUD + incrementUseCount
    useGDrive.ts     Google Drive token + backup logic
  lib/
    claude.ts        askClaude(), trackUsage(), calcCost(), getLifetimeUsage()
    storage.ts       ls helpers + all localStorage key constants
    fitbit.ts        pkce(), fitbitAuthUrl(), exchangeCode(), refreshFitbitToken()
    gdrive.ts        startGDriveAuth(), findOrCreateFolder(), backupToDrive()
    context.ts       buildDayContext(), getMealWarnings(), getCompletenessNote()
    bpCategory.ts    bpCategory() function and BP category type
    dummyData.ts     seedDummyData(), clearDummyData()
    extractJSON.ts   Robust JSON extractor (replaces the current regex approach)
  types/
    index.ts         DayEntry, FoodItem, DrinkItem, Favourite, FitbitData,
                     FitbitToken, GDriveToken, Mood, Energy, BPCategory
  styles/
    tokens.ts        ✅ Already created — design system tokens
    global.css       Reset + scrollbar + keyframes (from the <style> block)
```

### Component responsibilities

#### `src/lib/storage.ts`
- All 13 localStorage key constants
- `ls` helper object (get/set/del/str/setStr)
- Typed read/write functions for each domain (entries, favourites, tokens, etc.)
- **Owns no state** — pure read/write functions

#### `src/lib/claude.ts`
- `askClaude(messages, systemPrompt)` — the single Anthropic API call function
- `trackUsage(usage)` — cumulates session + lifetime token counts
- `calcCost(inp, out)` and `estimateCost()` — cost display
- `getLifetimeUsage()`, `sessionUsage` module-level accumulator
- **No React** — pure async functions

#### `src/lib/fitbit.ts`
- PKCE functions: `b64url()`, `pkce()`, `fitbitAuthUrl()`
- `exchangeCode()`, `refreshFitbitToken()`, `getFitbitAccessToken()`
- `fitbitGet()` — proxy-routed authenticated fetch
- `fetchFitbitDay()` — assembles the FitbitData object
- `FITBIT_PROXY`, `FITBIT_CLIENT_ID`, `REDIRECT_URI` constants

#### `src/hooks/useEntries.ts`
- State: `entries: Record<string, DayEntry>`, `currentDay: string`
- Load from localStorage on init, persist on every update
- Returns `updateEntry(data)`, `selectDay(d)` 
- Handles Fitbit auto-sync side-effect on mount

#### `src/hooks/useFavourites.ts`
- State: `favourites: Favourite[]`
- `addFavourite()`, `removeFavourite()`, `incrementFavUseCount()`

#### `src/components/shared/Section.tsx`
- White card container with accent-dot + uppercase title
- Props: `title`, `accent` (colour string), `children`

#### `src/components/shared/ChatWidget.tsx`
- Self-contained follow-up chat history
- Props: `systemPrompt`, `contextSummary?`, `placeholder?`
- Owns its own `history`, `input`, `loading`, `error` state

#### `src/components/shared/EmojiPicker.tsx`
- Props: `options: {emoji, label, value}[]`, `value`, `onChange`

#### `src/components/shared/Icon.tsx`
- SVG icon sprite — all 20+ icons defined as path data
- Props: `name`, `size?`, `color?`

#### `src/components/log/FoodSection.tsx`
- **Largest component.** Owns: text input, image loading, pending food/drink items, favourites dropdown state, save-favourite flow
- Props: `foodItems`, `onUpdate`, `alcoholItems`, `onAlcoholUpdate`, `dayContext`, `fitbitData?`
- Sub-components: `FoodSummaryHeader`, image resize logic, `renderLogItem` (food vs drink row)

#### `src/components/log/FitbitSection.tsx`
- Props: `fitbitData?`, `onUpdate`, `connected`
- Contains the `Arc` ring component (internal, not exported)

#### `src/components/log/MoodSection.tsx`
- Props: `entry: {mood?, energy?, moodNote?, moodFeedback?}`, `onUpdate`, `dayContext`

#### `src/components/log/ExerciseSection.tsx`
- Props: `entry: {exercise?, exerciseFeedback?}`, `onUpdate`, `dayContext`

#### `src/components/log/WeightSection.tsx`
- Props: `entry: {weight?}`, `allEntries`, `currentDay`, `onUpdate`, `dayContext`
- `computeBanner()` logic is internal

#### `src/components/log/BPSection.tsx`
- Props: `entry: {bpSystolic?, bpDiastolic?, bpPulse?, bpNote?}`, `onUpdate`

#### `src/components/log/DraggableLayout.tsx`
- Props: `storageKey`, `defaultOrder: string[]`, `editMode`, `renderSection: (id: string) => ReactNode`

#### `src/components/insights/WeightTrendSection.tsx`
- Props: `weightData`, `minW`, `maxW`, `allEntries`
- Contains the area+line SVG chart and AI analysis button

#### `src/components/insights/BPTrendSection.tsx`
- Props: `bpData`, `minBP`, `maxBP`, `allEntries`
- Contains dual-line SVG chart, "Copy readings for GP" logic

#### `src/components/layout/StatsBar.tsx`
- Owns: `period`, `stepsMode`, `unitsMode`, `calsMode` local state
- Props: `entries: Record<string, DayEntry>`

#### `src/components/layout/WarningBar.tsx`
- Props: `entries`
- Calls `getMealWarnings(entry[today()])`

#### `src/components/screens/SettingsScreen.tsx`
- Owned state: key, coaching, backup status, favs list, new-fav inputs
- All settings sections inlined (can be split further in Phase 3 if it gets unwieldy)

---

## 4. Proposed Migration Order (Phase 2)

Each chunk should be small enough to verify against the live `index.html` side-by-side.

### Chunk 1 — Design tokens (already done in scaffold)
- ✅ `src/styles/tokens.ts`
- `src/styles/global.css` — extract the 6-line `<style>` block (reset, scrollbar, `@keyframes spin`)

### Chunk 2 — Type definitions
- `src/types/index.ts` — write all interfaces from the shapes in §1.3
- No runtime code, just types — easy to verify by TS compiler

### Chunk 3 — Data layer (no React)
- `src/lib/storage.ts` — all localStorage key constants + `ls` helpers + typed accessors
- `src/lib/claude.ts` — `askClaude()`, `trackUsage()`, cost functions, `sessionUsage`
- `src/lib/fitbit.ts` — PKCE + Fitbit fetch functions
- `src/lib/gdrive.ts` — Google Drive auth + backup functions
- `src/lib/context.ts` — `buildDayContext()`, `getMealWarnings()`, `getCompletenessNote()`
- `src/lib/bpCategory.ts` — `bpCategory()` function
- `src/lib/dummyData.ts` — seeder
- `src/lib/extractJSON.ts` — implement the robust JSON extractor (replaces the fragile regex)
- Verify: unit-testable, no React imports

### Chunk 4 — Shared UI primitives
- `Icon`, `Spinner`, `AIBubble`, `Pill`, `EmojiPicker`, `Label`, `Section`, `AnalyseBtn`, `HourSelect`, `StatPill`, `ProgressBar`, `ScrollRight`, `ChatWidget`
- These have no business logic — straightforward 1:1 port
- Verify: render each in a test page and compare visually

### Chunk 5 — Hooks
- `useEntries.ts`, `useFavourites.ts`, `useFitbit.ts`, `useGDrive.ts`
- Wire to the lib layer from Chunk 3
- Verify: app can load, edit, and persist a day's entry

### Chunk 6 — ApiKeyScreen + App shell
- `ApiKeyScreen`, `App` root component, `Header`, `NavBar`, `DateNavigator`
- No section content yet — just the chrome
- Verify: tab switching, date navigation, settings button

### Chunk 7 — Log tab sections (one at a time)
1. `FoodSection` (most complex — do first to shake out types)
2. `FitbitSection`
3. `MoodSection`
4. `ExerciseSection`
5. `WeightSection`
6. `BPSection`
7. `DraggableLayout`
- After each: load the live `index.html` alongside and check behaviour is identical

### Chunk 8 — Stats Bar + Warning Bar
- `StatsBar` — verify all three period modes and all four toggle modes
- `WarningBar` — verify each of the four warning conditions

### Chunk 9 — History tab
- `HistoryTab` — straightforward list render

### Chunk 10 — Insights tab
- Port each chart section (5 SVG charts + `WeightTrendSection` + `BPTrendSection` + `AIPatternAnalysis`)
- Charts are the most fiddly — compare SVG output against live app

### Chunk 11 — Settings screen
- `SettingsScreen` — all settings sub-sections

### Chunk 12 — Integration + smoke test
- Wire OAuth redirect handlers (Fitbit + Google Drive) in `App.useEffect`
- Verify PKCE round-trip end-to-end
- Verify auto-backup fires on open

---

## 5. Risks and Open Questions

1. **`nourish.html` vs `index.html`**: The prompt refers to `nourish.html` as the app, but `index.html` is clearly the current, more featureful version deployed at the GitHub Pages URL. Confirmed: migrate `index.html`. `nourish.html` is archived.

2. **`manifest.json` colour mismatch**: The manifest uses parchment colours matching `nourish.html`. This means the installed PWA splash/theme doesn't match the actual app chrome. Fix in Phase 3.

3. **`extractJSON` does not exist**: The prompt listed this as a component to preserve verbatim. It's not in the code — the current approach is `resp.replace(/```json|```/g, "").trim()`. Phase 2 should implement a real character-walking extractor as a genuine improvement. Flagged here so it doesn't get added as a "Phase 3 feature" — it's actually a reliability fix that belongs in Phase 2.

4. **Google Drive implicit flow**: `response_type=token` puts the access token in the URL hash. Google deprecated this for client apps. It still works but could break if Google enforces PKCE. Track for Phase 3.

5. **`weight` stored as string**: `entry.weight` is `"74.5"` (string), not `74.5` (number). This is presumably historical. Phase 2 should preserve this to avoid breaking existing localStorage data. Phase 3 could migrate it.

6. **No PWA service worker**: The app is a PWA via manifest but has no service worker, so it doesn't work offline. Not a migration concern — just noting it for Phase 3.

7. **React 19 vs CDN React 18**: The scaffold uses React 19.2 (via npm). The live app uses React 18.2 (via CDN). There should be no behavioural differences for the code in use, but worth a visual smoke test after migration.

8. **`DraggableLayout` uses mutation pattern**: `renderSection(id)` is called at render time — fine in class components but the current implementation passes a closure that captures fresh props. Phase 2 must ensure this renders correctly in strict mode with the React 19 double-render in dev.

---

## 6. Phase 3a — Ship Migration

### Task 0: GitHub Pages deployment

**Workflow**: `.github/workflows/deploy.yml` — triggers on push to `main` and manual dispatch.  
Builds `app/` with `npm ci && npm run build`, deploys `app/dist/` via `actions/deploy-pages@v4`.

**Manual step required**: Settings → Pages → Source → change from "Deploy from a branch" to **GitHub Actions**. Do this once before the first merge to `main`. After that, every push to `main` auto-deploys.

**Asset changes**:
- `base` in `app/vite.config.ts` is environment-aware: `'/nourish/'` by default (GitHub Pages), `'/'` when `process.env.VERCEL` is set. Vercel injects this variable automatically during build, so PR previews work at root without any extra config.
- Icons and manifest moved to `app/public/` so they're included in the build output
- `app/index.html` href attributes changed from root-absolute (`/manifest.json`) to relative (`manifest.json`) so they resolve against the document base (`/nourish/`)
- Root `index.html` and root `manifest.json` become dormant once the new workflow runs — they are not deleted yet (stability window)

### Task 1: ESLint peer dependency fix

Downgraded `eslint` and `@eslint/js` from `^10.x` to `^9.39.4`.  
`eslint-plugin-react@7` only supports `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7` — ESLint 10 was outside that range.

**Vercel manual step**: Remove the `--legacy-peer-deps` override from Vercel's install command after this branch lands on `main`. It's no longer needed.

### Task 2: `extractJSON` rewrite

Replaced `resp.replace(/\`\`\`json|\`\`\`/g, '').trim()` with a character-walking brace-depth extractor in `app/src/lib/extractJSON.ts`.

Handles: surrounding prose, code fences, nested structures, strings containing braces, escape sequences including `\\`. Throws a descriptive error if no valid JSON structure is found.

16 unit tests at `app/src/lib/__tests__/extractJSON.test.ts`. Run with `npm test`.

Added Vitest as dev dependency (`npm test` = `vitest run`).

Wired into `FoodSection.tsx` (meal parsing) and `SettingsScreen.tsx` (calorie estimation).

### Task 3: `manifest.json` colours

`app/public/manifest.json` created with:
- `background_color: "#f5f5f5"` (was `#fdf8f2`)
- `theme_color: "#111111"` (was `#3d2b1a`)

Root `manifest.json` is dormant after GH Pages cutover.

### Task 4: Archive `nourish.html`

Moved `nourish.html` → `archive/nourish.html`. This was the older parchment-themed prototype (warm-brown `#3d2b1a` colour scheme, fewer features — no BP section, no favourites, no stats bar, no GDrive, no coaching style, no token tracking, no multi-meal parsing). Kept as historical reference.

### Task 5: Strict-mode double-invoke audit

React 19 `<StrictMode>` double-invokes effects and state initialisers in development. Findings for every effect in `app/src/`:

| Location | Effect | Double-invoke risk | Verdict |
|----------|--------|--------------------|---------|
| `App.tsx` | `handleOAuthCallback()` | Processes URL hash/params on first call, clears them with `history.replaceState`. Second call finds nothing and exits immediately. | ✅ Safe |
| `App.tsx` | `autoBackup()` | Both calls run before the async backup completes, so both see "no recent backup" and fire. **Dev-only** (strict mode is disabled in the production build). | ℹ️ Dev-only double-backup |
| `App.tsx` | `autoSyncFitbit()` | Same pattern: both calls see `lastFetch !== today()` and fire a Fitbit request. **Dev-only**. | ℹ️ Dev-only double-fetch |
| `ScrollRight.tsx` | Sets `scrollLeft = scrollWidth` | Idempotent DOM mutation. | ✅ Safe |
| `ChatWidget.tsx` | Scrolls bottom ref into view | Idempotent. | ✅ Safe |
| `useEntries.ts` | `seedDummyData()` in `useState` initialiser | Guarded by `DUMMY_SEEDED_KEY` in localStorage; second invocation returns early. | ✅ Safe |

The dev-only double-fire for `autoBackup` and `autoSyncFitbit` is not worth adding ref guards for — it would complicate verbatim-ported code to fix a dev-environment inconvenience. Production builds (via Vite) strip `StrictMode`.

### Task 6: Settings API key update UI

Confirmed: `SettingsScreen.tsx` already has the full API key management UI:
- Password input with current key pre-filled
- Save button that calls `saveApiKey(key.trim())`
- Masked preview showing first 10 and last 4 characters + length
- Basic `sk-ant-` prefix validation added (rejects save if key doesn't start with `sk-ant-`)

---

## 7. Remaining candidates (Phase 3b+)

- **No-scale portion sizing** — Phase 3b
- **Google Drive PKCE migration** — implicit flow deprecated by Google
- **`weight` string→number migration** — one-time localStorage migration
- **PWA service worker** — app has manifest but no SW; doesn't work offline
- **API key security** — currently plaintext in localStorage; consider a proxy
