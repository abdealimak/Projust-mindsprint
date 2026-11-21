# Projust · landing page

**Projust** checks that developers actually *understand* the projects they built, especially projects built with AI. It reads a GitHub repo, teaches the concepts inside it, quizzes the student on their own code across six scored skills, and issues a dynamic certificate that recruiters can verify by its ID (`PJ-YYYY-XXXXXX`).

> Name: **Pro**ject + **Just**ice: fair credit for students who understand what they build.

This repo currently holds the **marketing landing page**: a single static page built for desktop first. It has a light theme, serif-led type and heavy motion. A dotted 3D student carries the story from section to section.

---

## Run it

No build step. Serve the folder over http (the page loads a `.glb` model, which `file://` can't do):

```bash
python3 -m http.server 4321
```

Open http://localhost:4321.

## What's on the page

| # | Section | What it shows | Dotted character |
|---|---|---|---|
| 0 | Hero | "Same repo. Two students. *Only one can explain it.*" A draggable line splits the stage: vibe-coded (AI prompt, code falling through, failed viva) vs learned with Projust (tutor on their own line, quiz, concepts sinking in) | One head, split down the face: grey dots leak away on the vibe side; ink dots, streams and the reading scan on the learner side |
| 1 | The gap | The professor's unanswered question, read word by word | The student looking down under an orange "?" |
| 2 | The loop | A pinned 4-step app demo: import, concept map, tutor, quiz | A concept constellation around the app window |
| 3 | The score | A six-skill radar going from locked to opened, with scores counting up | The radar web |
| 3b | Rubric | How one answer becomes a score, line by line | (the radar scrolls past) |
| 4 | The proof | The certificate: ID, QR, version history, verify tag | A certificate seal around the paper, light on the dark band |
| 5 | The people | Students, teachers, recruiters, companies; pricing in ₹; a notes wall with a live composer (Example cards until real feedback arrives) | Drifting dust |
| 6 | Close | "Built it? *Prove it.*" plus a concept marquee | The student again, facing forward |

A chapter rail on the left (01 The gap … 05 The people) tracks the story as you scroll.

## Stack

- **HTML/CSS/JS in one file** (`index.html`). Tokens live on `:root`: warm paper `#F3F1EC`, ink `#111110`, lime, orange and sky accents. There is no violet.
- **Fonts** (Google Fonts): Instrument Serif (display, italics), Geist (UI), JetBrains Mono (IDs, code).
- **Motion:** GSAP 3.12.5 + ScrollTrigger (cdnjs) and Lenis 1.1.13 for smooth scroll (unpkg).
- **3D:** three.js 0.160.0 through an import map (jsdelivr). `assets/story.js` drives one fixed canvas of about 36k points.

```
index.html          page: markup, styles, GSAP/Lenis interactions
assets/story.js     the dotted character: shape builders, morph shader, scroll anchoring
assets/models/head.glb   head scan (Lee Perry-Smith, Infinite Realities, CC BY 3.0)
AUDIT.md            persona audits (Awwwards juror, professor, student/recruiter, creative dev) + roadmap
CLAUDE.md           working notes for AI coding agents
```

## How the dotted story works

1. On load, the head scan is welded (`mergeVertices`) and scored for **curvature**. The sampler puts more dots where the surface turns sharply (eyes, nose, lips, ears) and on the face rather than the back of the head.
2. Seven **target shapes** are built with exactly the same number of points: student, student + "?", graph, radar, seal, dust, student.
3. Each shape is **z-order sorted**, so dot *n* sits in a similar place in every shape and morphs flow instead of crossing.
4. Every frame, each shape's anchor and scale come from its section's **live position on screen** (for example `.how .app` or the radar's SVG transform). Shapes scroll with their sections.
5. The morph index comes from how far each section has risen up the viewport. The vertex shader blends along a curved path with a stagger per dot.
6. The head is shaded like **ink on paper**: dense dark dots in shadow with hatch lines, a rim on the silhouette, and back-facing dots faded out. On top of that: cursor repulsion, orange "neuron" twinkles and a green reading scan.

If WebGL is missing, `html.no-gl` shows a CSS dotted fallback. With `prefers-reduced-motion`, everything rests.

## Status and honesty

- This is a **hackathon build**. Interview viva, the injected-bug challenge and company listings are marked **Planned** on the page.
- Sample data (Aarav Mehta, `shopkart`, scores) is illustrative and kept consistent across sections.
- `hello@projust.example` is a placeholder email address.
- Mobile layout works but is not yet polished. Desktop is the priority.

See **AUDIT.md** for the ranked roadmap: a real `/cert/[id]` verification page, a lower-friction first step, a teacher class view, an honest proof strip.

## Credits

- Head scan: *Lee Perry-Smith* by Infinite Realities, CC BY 3.0, distributed with the three.js examples.
- Libraries: three.js (MIT), GSAP (Standard License), Lenis (MIT).
