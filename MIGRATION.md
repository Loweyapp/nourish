# Nourish — Project State

**Status: live**
URL: `https://loweyapp.github.io/nourish`
Production: GitHub Actions → GitHub Pages (on push to `main`)
PR previews: Vercel (auto-deploys each open PR at root `/`)
Last verified: 4 June 2026

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 6 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Build | Vite 8 |
| Lint | ESLint 9 + typescript-eslint 8 |
| Tests | Vitest (`npm test`) |
| Deploy | GitHub Actions → `actions/deploy-pages` |
| PR previews | Vercel |
| AI | Anthropic API (`claude-sonnet-4-20250514`), direct browser calls |
| Fitbit | PKCE OAuth via Cloudflare Worker proxy |
| Backup | Google Drive implicit OAuth (file-scoped) |
| Storage | localStorage only — no server-side state |

---

## Repo layout

```
/
├── app/                   Vite app (the live product)
│   ├── src/
│   │   ├── components/    UI components (shared/, and top-level tab/section components)
│   │   ├── hooks/         useEntries, useFavourites
│   │   ├── lib/           Pure logic: claude, storage, fitbit, gdrive, context, extractJSON, …
│   │   ├── styles/        global.css, tokens.ts
│   │   └── types/         index.ts — DayEntry, FoodItem, FitbitData, …
│   ├── public/            manifest.json, icons (copied to dist on build)
│   └── package.json
├── .github/workflows/
│   └── deploy.yml         Build app/ and deploy app/dist/ to Pages on push to main
├── index.html             Old single-file Babel app — dormant, not served, delete after stability window
├── manifest.json          Old root manifest — dormant, not served, delete after stability window
├── archive/
│   ├── nourish.html       Older parchment-themed prototype (kept for reference)
│   └── migration-notes.md Feature inventory, data shapes, design tokens, integration details
└── MIGRATION.md           This file
```

---

## Deployment notes

- `app/vite.config.ts` uses `base: '/nourish/'` for GitHub Pages and `base: '/'` when `process.env.VERCEL` is set. Vercel injects `VERCEL` automatically, so PR previews work without configuration.
- Icons and manifest live in `app/public/` — they're copied into `app/dist/` on every build.
- The `href` attributes for manifest and icons in `app/index.html` are relative (not root-absolute) so they resolve correctly under the `/nourish/` subpath.

---

## Backlog

### Next up — Phase 3b: no-scale portion sizing

Natural-language hand-portion descriptions in food entry. The idea: instead of weighing food, describe it in hands ("a palm of chicken, a fist of rice"). Claude interprets the description and returns calories as usual, but the prompt is aware of the hand-portion method. Also a reference modal explaining the method.

No design work done yet — start with a brief before building.

### Deferred candidates

These are real improvements but not blocking anything. Revisit when there's a clear motivation.

| Item | Why deferred | Risk if ignored |
|------|-------------|-----------------|
| **Google Drive PKCE migration** | Implicit flow still works; Google hasn't forced the change yet | Could break without warning if Google kills implicit flow for existing apps |
| **PWA service worker** | App works fine online; offline use isn't a real need yet | Can't install as a proper PWA on iOS; no offline fallback |
| **`weight` string → number migration** | Stored as `"74.5"` (string) for historical reasons; all read paths handle it | Low value; real risk of corrupting entries if migration is done carelessly |
| **API key via Cloudflare Worker proxy** | Single-user app on own device; threat model is low | Key is in localStorage and travels in request headers — readable via DevTools |

### Phase 4 thinking — Firebase

Potential cloud backend if multi-device sync becomes a real need (e.g. logging on phone + reviewing on desktop). Google Drive backup covers disaster recovery but not live sync.

**Don't start without a deliberate decision.** Firebase would change the data model, add a dependency on Google's infrastructure, and require auth. The current localStorage-only model is simple and private — worth preserving until there's a concrete reason to change it.

---

## Manual housekeeping owed

- [ ] **Alex**: remove `--legacy-peer-deps` from Vercel's install command override. No longer needed after the ESLint 10→9 downgrade landed in Phase 3a.
- [ ] **Stability window**: delete root `index.html` and root `manifest.json` once the new app has been live for a few weeks without issues.
