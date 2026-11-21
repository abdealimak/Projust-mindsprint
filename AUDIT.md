# Projust landing page: audit report

Desktop-only review (1440×900), 21 Nov 2026. Four reviewers, each a different persona, read the page code, the three.js figure and the section screenshots.

| Persona | Verdict in one line |
|---|---|
| Awwwards jury member | About 7.5/10 (Design 7.5, Usability 8, Creativity 6.5, Content 8). A strong Honorable Mention, but not Site of the Day yet because the 3D student and the story never connect. |
| Engineering professor (hackathon judge) | The problem moment (token vs cookie) lands. Lost trust over unexplained grading, inconsistent sample numbers, overclaimed anti-cheating and dead links. |
| Student (Priya) and recruiter (Daniel) | Priya is hooked by the problem but scared by "Sign in with GitHub" first and vague free-tier limits. Daniel only cares about a live verification page, which doesn't exist yet. |
| Creative developer (three.js / GSAP) | Solid base. It runs two WebGL contexts and loops that never stop, the points are drawn unsorted, and the orbit moves DOM nodes every frame. Biggest upgrade: one fixed canvas whose dots morph from section to section. |

## Fixed in this pass

**3D model**
- Denser figure: 26k dots instead of 15k, with smaller dots.
- Rim light, and the far side of the head fades out.
- A green "reading" scan band sweeps down the head every 4.5 s.
- Random dots twinkle orange, like neurons firing.
- Dots part around the cursor.
- A dotted graduation cap with an orange tassel, so it reads as a student.
- Bigger figure, set lower so it doesn't crowd the buttons.
- Softer, smaller knowledge streams.
- The story "?" is denser.

**Hero**
- Orbit cut from 8 cards to 6, with a wider, slower ring.
- The orbit stops working when the hero is off screen.

**Consistency and honesty (teacher and recruiter audits)**
- The hero score cards now match the score section.
- "Pass six skills" became "Earn a certificate across six scored skills", which matches the unlock rule.
- Removed "Most picked".
- The trust section is retitled "Layered checks, because none is perfect alone". It names the phone loophole and adds a team-project fairness line.

**New: "How one answer becomes a score" section**
- A real free-text question.
- An answer that types itself out.
- Rubric lines that tick with points.
- A score that counts up, plus a study-plan note.
- Three question types: Why, What if, Find the bug.

**Storytelling**
- A fixed chapter rail on the left (01 The gap, 02 The loop, 03 The score, 04 The proof, 05 The people). It tracks the scroll and turns light over the dark certificate band.

**Polish**
- A custom blend-mode cursor that grows over links and cards.
- Magnetic main buttons.
- ScrollTrigger refreshes after fonts load.

## Next, ranked by impact

1. **One continuous dotted character (story spine).**
   - Replace the two canvases with one fixed full-page WebGL canvas.
   - The same dots morph with the scroll: student head (hero), then the "?" (problem), then the concept graph (how it works), then the six-point radar (scores), then the certificate's QR and seal (proof).
   - Pair dots between shapes by sorted rank so morphs flow, and drive `uMorph` with one scrubbed ScrollTrigger timeline.
   - This is the change that moves the page from Honorable Mention to Site of the Day.
2. **A real sample certificate page** (`/cert/PJ-2026-A7X9K2` and `/report`).
   - Show scores, flags, version history, suggested interview questions and a "verified at" stamp.
   - Wire "See a sample certificate" and "Open the sample report" to it, and add a "Verify a certificate ID" box.
   - Both the recruiter and the professor called this make-or-break.
3. **A lower-friction first step.**
   - Change the nav button from "Sign in with GitHub" to "Try free".
   - Add a line under the hero buttons: "Read-only access. Free. No card."
   - Add a "What we read and store" panel, and allow pasting a public repo URL without logging in.
4. **A teacher view.** A labelled preview of a class table (per-skill scores, integrity flags, CSV export) and how a teacher assigns a repo. The judges are teachers.
5. **Specific free tier.** Exact limits (tutor questions a day, which modules), what a "Basic" certificate looks like, and ₹699 for 3 months shown as a price rather than a bullet.
6. **Failing is private.** Next to the locked radar, say that failed attempts are never public and become a study plan.
7. **Rhythm variety.**
   - "Both sides" and "Pricing" are both 4-up white card grids.
   - Make "Both sides" a pinned horizontal scroller with three large persona panels.
   - Make pricing a quieter comparison table.
8. **A certificate finale.**
   - A holographic sheen that follows the pointer, and a QR scan-line sweep.
   - Dots fly from the figure into the QR as the dark band arrives.
   - Fix the light header over the dark band.
9. **Bigger type scale.** H1 about 168px and H2 about 96px, with italic grey no lighter than #5E5C57. Optical alignment for italic descenders.
10. **Tech hygiene.**
    - One renderer and one clock (gsap.ticker).
    - Additive or sorted point blending.
    - Debounced `drawWires`.
    - Snap the pinned "How it works" steps to quarters, so the typing effects don't re-trigger while scrubbing.
11. **An honest proof strip.**
    - Once real numbers exist: repos analysed, certificates issued, pilot college.
    - Until then: "Early access: first 100 students get Pro free" and a "Built in 24 hours: what works today vs planned" strip.

## Still open

**GATE: OPEN.** All 3 rounds of the tasteskill gate are used up, with 101 FAILs open and no waivers. The full list is in `.taste-skill/gate.json`, with crops in `.taste-skill/gate/consistency`. The main ones:
- **Clash with the requested look (by design):**
  - `pinned` on the how-it-works demo;
  - `tilt` on the spinning badge and the orbit cards;
  - `motion-layer` and `button-styles`, because the motion and buttons are custom rather than the kit's.
- **Real, worth fixing:**
  - `no-visual` on the how, rubric, certificate, audience and trust sections. The checker doesn't count the HTML mock-ups as visuals.
  - `spill` on the right hero card (`#fr`) and the last trust layer.
  - `cut-text` on the first h1 line, from the `overflow:hidden` reveal mask.
  - `flush` on the hero wires SVG.
  - `heading-scale` on the closing headline.
  - `text-contrast` on the reveal text's unlit grey words, which is deliberate.
  - `focus-visible` on the nav links.
  - Section-height and sparse checks on several sections.
- The phone layout hasn't been reviewed in this pass, by request.
- The head scan is the free Lee Perry-Smith model (CC BY 3.0, credited in the footer).
