# Projust design system

Direction: **security print**. Projust issues credentials, so the look borrows from certificates and banknotes: guilloché seals, serial numbers, stamps, hairline frames. Light theme only.

## Colour (60-30-10)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F3F5F4` | Page canvas (60%). Cool grey-green, not cream. |
| `paper-2` | `#E9ECEB` | Band sections, empty bars |
| `sheet` | `#FFFFFF` | Cards, certificate, panels (30%) |
| `rule` / `rule-strong` | `#DDE2E0` / `#C6CDCA` | 1px borders, hairlines |
| `ink` | `#14181F` | Text, primary button |
| `ink-2` / `ink-3` | `#596170` / `#6B7280` | Secondary text / meta |
| `seal` | `#2F3FD0` | The one accent: links, focus, seal lines, active state (10%) |
| `mark` / `mark-soft` | `#E2FF5C` / `#F3FFBF` | **Pop: highlighter.** Fill only, always with ink text on it. Used for: hero "understand it." swipe, one phrase per key heading, primary button hover, highlighted code lines, current step, active tab, stamps. |
| `pass` | `#1E8A5A` | Only "verified / unlocked" |
| `warn` | `#B4232C` | Only "below floor / not found" |

Tokens live in `app/globals.css` (`:root` + `@theme`), so Tailwind classes are `bg-paper`, `text-ink-2`, `border-rule`, `text-seal`…

Depth: border first, then soft shadow (`--shadow-soft`, `--shadow-lift`, alpha < 0.08). No backdrop blur, no gradient buttons.

## Type

- **Newsreader** (display, 400/500): `font-display`. Headings, names on certificates, prices.
- **Geist** (UI/body, 400/500/600).
- **Geist Mono**: only for real code, file paths, cert IDs and numbers.
- Scale (minor third from 16px): `text-meta` 12 · `text-secondary` 14 · `text-body` 16 · `text-lead` 19 · `text-h3` 23 · `text-h2` 33→57 · `text-h1` 42→74 (fluid).
- Headings lh 1.02–1.25 with −0.02em; body lh 1.55. Nothing under 12px.
- Do not: all-caps labels, one italic word in a headline, `→` on buttons, `A · B · C` meta strings.

## Motion

Tokens in `lib/motion.ts` and CSS vars: **100 / 150 / 200 / 300 ms**, ease-out `cubic-bezier(.16,1,.3,1)` to enter, ease-in `cubic-bezier(.7,0,.84,0)` to exit. Animate only `transform` and `opacity`.

- Chrome (nav, buttons, tabs, accordions): tokens only, no bounce.
- **One orchestrated moment**: the hero stage (read → extract → seal).
- Scroll scenes are scrubbed by the user's scroll (Problem pin, Loop rail), so they have no fixed duration.
- Ambient: the seal turns with the cursor only. No looping decoration.
- `prefers-reduced-motion`: Lenis off, hero starts at the end state, scroll pins off, CSS durations ~0.

Why a highlighter: teachers mark what matters, and Projust literally highlights the lines in your code that hold each concept. One pop colour, used where we want the eye to go.

## Signature pieces

- `components/ui/Mark.tsx`: highlighter swipe (`--mark-p` 0→1). One per heading, max.
- Hero: big centered serif, dot-grid backdrop, a 980px seal that turns with the cursor, repo input that drives the demo, margin-note questions tied to code lines, live certificate ticker.

- `components/seal/Guilloche.tsx`: parametric seal. Rings are `r = R + A·sin(kθ)`, centre is a hypotrochoid. Props: `size`, `color`, `drawDuration`, `spin` (MotionValue).
- `components/ui/Radar.tsx`: six-aspect radar + geometry helpers.
- Certificate frame: outer `rounded-[16px] border-rule p-1.5` + inner `rounded-[11px] border-seal/25`.

## References

- Mood board: Mindly hero shot (airy space, big serif, floating cards linked by lines).
- Restraint: Linear, Stripe, Vercel, WorkOS. Trend: hero shows the workflow, not a stock photo ([SaaSFrame 2026 trends](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)).
- Scroll wiring: [Lenis + ScrollTrigger in Next.js](https://rahhuul.github.io/blog/gsap-scrolltrigger-lenis-nextjs-scroll-animations/), [Codrops on GSAP/Lenis architecture](https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/).
