# Landing page map

Route `/` → `app/page.tsx`. Each section is one component in `components/landing/`. All data is fake, from `lib/demo-data.ts`.

| # | Section | Component | What moves / what you can do |
|---|---|---|---|
| — | Nav | `Nav.tsx` | Border appears on scroll. Mobile menu (Esc closes). |
| 1 | Hero | `Hero.tsx`, `HeroStage.tsx` | 3-act load: code types in → concept chips lift out of their lines → chips fly into the certificate (shared `layoutId`), seal draws, ID settles like a serial. Hover a chip to light its lines. Cursor tilts the stage and turns the seal. Click = skip, "Replay" restarts. |
| 2 | Problem | `Problem.tsx` | Desktop: pinned, scroll-scrubbed. Prof's question types out, "typing…" then "no answer", then the reframe. Mobile: static. |
| 3 | How it works | `Loop.tsx`, `components/scenes/Scenes.tsx` | Steps scroll left, scene sticks right and swaps at 55% of the viewport. Rail fills with scroll. Scenes: concept map (click nodes), tutor (streams answer), quiz (auto-answers, bars move), carry (resume tag, README badge, LinkedIn). |
| 4 | Scoring | `AspectRadar.tsx` | Drag radar points or use arrow keys (Shift = ×5). Live average / lowest, unlock rule from `lib/scoring.ts`. Presets show pass, edge (all 60), and fail-on-floor cases. |
| 5 | Verify | `VerifyCert.tsx` | Enter `PJ-YYYY-XXXXXX`. Format error on blur. idle → checking (600ms skeleton) → found card with QR + versions, or not-found. |
| 6 | For teams | `Audience.tsx` | Tabs (arrow keys) for Students, Recruiters, Teachers, Companies (marked planned). |
| 7 | Trust | `Trust.tsx` | Accordion of anti-cheat layers, each marked Built or Planned. |
| 8 | Pricing | `Pricing.tsx` | Free / Pro ₹299 / Interview ₹399–599. Draft. |
| 9 | CTA + footer | `Footer.tsx` | Static seal, two CTAs. |

## Honesty rules (from the spec)

- Mocked items say "Planned" or "Coming next". Do not claim them as built.
- Certificate = "strong evidence, not absolute proof" (footer).
- Private repo code is never shown publicly.

## Wiring left for the app

- `#start` CTAs → real GitHub OAuth (`/login`).
- Verify form → `GET /api/cert/[code]` instead of `findCert()`.
- "Open full report" → `/cert/[code]/report`.
- Reuse `lib/scoring.ts` in the scoring engine so the landing page and the app share the same rule.

## Run

```bash
npm install
npm run dev
```
