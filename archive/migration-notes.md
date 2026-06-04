# Nourish — Migration Notes (Archive)

These notes were written during the Phase 1–3a migration and are kept here for reference.
The live `MIGRATION.md` is the forward-looking project state document.

---

## Feature inventory (as of migration, June 2026)

### Food & Drink logging
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

### Favourites
- Stored as array of `{name?, text, calories, protein_g, carbs_g, fat_g, units, useCount}` objects
- `name` is the friendly display name; `text` is the original ingredient description — these are deliberately separate
- Sorted by `useCount` descending (most-used float to top)
- Dropdown overlay from the "Saved" button — checkbox multi-select, adds directly without AI call
- Deduplication: same `text` → updates existing entry rather than duplicating; same `name` → blocked
- Manageable in Settings (list view with delete, add-new with optional calories; AI estimates calories if blank)

### Fitbit integration
- PKCE OAuth flow: `pkce()` generates verifier + SHA-256 challenge, redirects to Fitbit, exchanges code on return
- Cloudflare Worker proxy at `rapid-star-52f2.alexlowe1.workers.dev/fitbit` (proxies all Fitbit API calls — the Fitbit client secret lives in the Worker, not the browser)
- Auto-refresh of access token using `refresh_token`
- Auto-sync on app open if not yet fetched today (debounced by `FB_FETCH_KEY` date)
- Fetches: activities summary (steps, active minutes, calories burned), sleep (minutesAsleep, deep/REM/light/wake stages, start/end times), heart rate (resting HR)
- Arc-ring visualisation in the Fitbit section card
- Sleep breakdown cards (Deep / REM / Light / Active minutes)
- Steps progress bar

### Blood Pressure
- Inputs: systolic, diastolic, pulse (optional), free-text notes
- Live NHS category pill while typing (Normal / Elevated / Stage 1 / Stage 2 / Hypertensive Crisis)
- `bpCategory()` function applies NHS thresholds
- On Save: banner with plain-English message and colour-coded feedback

### Mood & Energy
- Emoji picker for mood (5 states: Exhausted → Energised) and energy (5 states: Drained → Peak)
- Free-text notes field
- "Get AI feedback" → Claude gives 2–3 sentences connecting mood/energy to food, sleep, exercise
- Save button (separate from AI analysis) with 1.5s "Saved ✓" flash
- ChatWidget for follow-ups

### Exercise
- Single free-text textarea (e.g. "30 min run")
- "Get AI feedback" → Claude acknowledges, estimates calories burned, connects to Fitbit/food/mood
- ChatWidget for follow-ups

### Weight
- Numeric input (kg, 1dp)
- On Save: smart banner comparing to previous entry (change since last, weekly trend) with colour-coded tone (green=down, red=up, neutral=stable)
- No AI call on save — banner is computed locally from stored entries

### AI coaching
- `askClaude()` function: takes messages array + system prompt, appends coaching style from Settings
- Every AI feature has a `ChatWidget` for follow-up conversations
- Day context (`buildDayContext()`) is injected into every AI call
- `getCompletenessNote()` adds a DATA COMPLETENESS WARNING to Claude's context when calories look understated

### Insights tab (charts)
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

### Stats Bar
- Sticky bar below header, always visible
- Day / Week / Month toggle
- Shows: Net Cals, Cals In / Cals Out (tap to toggle), Steps / Miles (tap to toggle), Units / Pints (tap to toggle)
- Units warning turns pink if above 2u/day average for the period

### Warning Bar
- Yellow background bar above the tabs
- Fires when: nothing logged by 10:30am; <300 kcal by 1:30pm; <600 kcal by 8pm; Fitbit deficit >1,200 kcal

### Date Navigator
- Prev/next arrow buttons (1 day each)
- Invisible `<input type="date">` overlaid on the date display — lets user pick any past date
- Capped at today (future dates blocked)
- "↩ today" pill when not on today

### History Tab
- Reverse-chronological list of all logged days
- Per-row: date, meal count, kcal, steps, sleep, exercise flag, weight, BP, alcohol units
- Tap row → jumps to Log tab for that date

### Settings
- **API Key**: password input, save/show partial key, `sk-ant-` prefix validation
- **API Usage**: lifetime token counts + cost (£), session token counts + cost; reset button
- **Coaching Style**: free-text textarea appended to every Claude prompt globally
- **Fitbit**: connected/disconnected status, disconnect button
- **Google Drive Backup**: connect/disconnect, manual backup, last backup timestamp
- **Favourites**: full management (view, delete, add-new with AI calorie estimate)
- **Demo Data**: clears the 7-day seeded sample data

### PWA
- `manifest.json` with standalone display mode
- `<meta name="apple-mobile-web-app-capable">` for iOS home screen
- No service worker

### Google Drive Backup
- Implicit token flow (tokens returned in URL hash) — deprecated by Google but still working
- Saves to "Nourish Backups" folder, weekly auto-backup on app open
- Manual backup from Settings

### Dummy data seeder
- On first launch, seeds 7 days of data so Insights charts are visible
- Controlled by `DUMMY_SEEDED_KEY` — `"1"` means seeded, `"cleared"` means user explicitly removed it

---

## localStorage key shapes

| Key | Type | Notes |
|-----|------|-------|
| `nourish-entries-v1` | `Record<string, DayEntry>` | Keyed by `YYYY-MM-DD` |
| `nourish-api-key` | `string` | Raw string, not JSON-encoded |
| `nourish-fitbit-token` | `FitbitToken` | Includes `expires_at` ms timestamp |
| `nourish-fitbit-verifier` | `string` | Temp PKCE verifier, deleted after exchange |
| `nourish-fitbit-fetched` | `string` | Date of last Fitbit sync (`YYYY-MM-DD`) |
| `nourish-coaching-style` | `string` | Appended to every Claude system prompt |
| `nourish-gdrive-token` | `GDriveToken` | Includes `expires_at` ms timestamp |
| `nourish-last-backup` | `string` | ISO timestamp of last successful backup |
| `nourish-dummy-seeded` | `"1" \| "cleared"` | Controls demo data state |
| `nourish-favourites` | `Favourite[]` | Sorted by `useCount` desc at read time |
| `nourish-log-layout` | `string[]` | Reordered section order for Log tab |
| `nourish-insights-layout` | `string[]` | Reordered section order for Insights tab |
| `nourish-usage-total` | `{input: number, output: number}` | Cumulative token counts |

**Important**: `weight` inside `DayEntry` is stored as a `string` (e.g. `"74.5"`), not a number. This is historical and intentional to avoid corrupting existing data. See backlog item in `MIGRATION.md`.

---

## External integrations

### Anthropic API
- Endpoint: `https://api.anthropic.com/v1/messages`
- Model: `claude-sonnet-4-20250514`
- Auth: `x-api-key` header; key from localStorage
- Required header: `anthropic-dangerous-direct-browser-access: true`
- Token tracking after every call; lifetime + session totals in localStorage

### Fitbit OAuth (PKCE)
- Client ID: `23TXZL` (public, safe to commit)
- Redirect URI: `https://loweyapp.github.io/nourish`
- Proxy: `https://rapid-star-52f2.alexlowe1.workers.dev/fitbit` — all data requests routed here; client secret lives in the Worker
- Scopes: `activity sleep heartrate`
- Token refresh: `refresh_token` grant, client-side

### Google Drive OAuth (implicit flow)
- Client ID: `841458188245-8rdmltdj4acjb0c4fisrf44vmedovuc3.apps.googleusercontent.com`
- Redirect URI: `https://loweyapp.github.io/nourish`
- Scope: `https://www.googleapis.com/auth/drive.file`
- Flow: `response_type=token` — token returned in URL hash (deprecated by Google for SPAs; see backlog)

---

## Design system

| Token | Value | Use |
|-------|-------|-----|
| Page background | `#f5f5f5` | App bg |
| Card background | `#ffffff` | Section cards |
| Primary text | `#111111` | Body text |
| Secondary text | `#767676` | Labels, meta |
| Green (primary) | `#9ebd6e` | Nav active, buttons |
| Blue (Fitbit) | `#4a86d8` | Fitbit section, step charts |
| Purple (mood) | `#805d93` | Mood section, mood chart |
| Orange (exercise) | `#f59c38` | Exercise, alcohol chart |
| Pink (BP/alerts) | `#e8457a` | Blood pressure, warnings |
| Teal (energy) | `#26b5a8` | Energy chart line |
| Warning yellow | `#f0c040` | Warning bar background |

Palette colours are never applied to text — only borders, icons, chart elements, button backgrounds. All text is `#111111` or `#767676`.

Card pattern: `background #fff`, `border-radius 16px`, `padding 16px 18px 20px`, `box-shadow 0 1px 6px rgba(0,0,0,0.04)`, `border 1px solid #efefef`.

System font stack — no web fonts.

---

## Phase 3a decisions log

- **ESLint**: downgraded `eslint` + `@eslint/js` from 10.x → 9.x to satisfy `eslint-plugin-react@7` peer range.
- **Vite base path**: environment-aware — `'/nourish/'` default, `'/'` when `process.env.VERCEL` is set.
- **manifest.json**: moved to `app/public/` with corrected colours (`#f5f5f5` / `#111111`). Root manifest dormant.
- **extractJSON**: replaced regex strip with character-walking brace-depth extractor; 16 unit tests.
- **Strict-mode audit**: `autoBackup` and `autoSyncFitbit` can double-fire in dev; production-safe. No fix warranted.
- **API key validation**: Settings input now rejects keys not starting with `sk-ant-`.
- **nourish.html**: moved to `archive/nourish.html` — older parchment prototype, kept for reference.
