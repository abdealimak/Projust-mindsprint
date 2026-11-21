# CLAUDE.md: working on the Projust landing page

Read this before you change anything. Product spec context: Projust verifies that students understand the repos they built (repo, then concepts, then tutor, then a course with quizzes, then six skill scores, then a dynamic certificate `PJ-YYYY-XXXXXX`). Hackathon judges are mostly **teachers**.

## Run and check

- Serve the folder with `python3 -m http.server 4321` (needed for the `.glb`). `.claude/launch.json` has this config as `site`.
- **Desktop 1440×900 is the priority.** Check there first. Mobile must not break (no sideways scroll), but polish comes later.
- After editing, check the browser console for errors. The 3D code logs `head normals ok|flipped` once.
- Optional copy check, if the tasteskill skill is installed: `node ~/.claude/skills/design-taste-frontend/scripts/copy-lint.mjs index.html --kind software` (aim for 0 FAIL).

## Files

- `index.html`: everything except the 3D. Inline `<style>`, then the markup by section, then one IIFE `<script>` (GSAP, ScrollTrigger, Lenis).
- `assets/story.js`: an ES module, the dotted character on one fixed `<canvas id="gl">`.
- `assets/models/head.glb`: the head scan. Keep its credit in the footer (`#credits`) and in the README.
- `AUDIT.md`: persona audits and the ranked roadmap. Update its "Fixed" and "Next" lists when you ship something from it.
- Ignored: `shots/` (screenshots) and `.taste-skill/` (checker cache).

## Design rules (keep them)

- **Light theme.** Paper `--bg #F3F1EC`, ink `--ink #111110`, `--muted #5E5B56`, accents lime `#CDEB5A`, orange `#FF7A3D`, sky `#7FB8FF`, mint. **No violet or lavender**, ever.
- **Type:** Instrument Serif for display (h1/h2, with the second clause in `<em>` italic grey), Geist for UI, JetBrains Mono for IDs, labels and code. h2 is `clamp(40px,5.4vw,76px)`.
- **One system:** a pill button family (`.btn`, `.btn.ghost`), radii 12/20/28, one card look (white, 1px `--line` border). Splits sit on a **12-column grid with a 24px gutter** (`grid-column:1/6` + `7/13`, certificate `1/8` + `9/13`).
- **One section per screen** where possible. Only the certificate band is dark.
- **Motion:** the hero enters once, the orbit runs, there are card loops, one scroll word-reveal, the pinned how-it-works, the radar morph, the certificate version loop and the marquee. Hover: lift 2px, buttons press. **Respect `prefers-reduced-motion`.** Don't add fade-in-on-scroll to every block.
- **No captions under visuals.** Credits go in one footer line.

## Content rules (honesty: the judges check this)

- Never present mocked features as built. Interview viva, injected-bug challenge, company listings and the teacher dashboard are **Planned** or "preview".
- No invented users, testimonials, logos or adoption numbers.
- Sample data must agree everywhere. Scores: Concepts 78, Code 72, Debugging 64, Architecture 70, Security 58, AI collaboration 81 (average 71). Attempt 1: 52/48/38/55/41/60 (locked). Unlock rule: **average ≥ 60 and no skill < 40**.
- Prices in ₹: Free; Pro ₹299/month or ₹699/3 months; Interview ₹399–₹599; Companies per listing.
- Placeholder contacts use `.example` domains.

## The dotted character (`assets/story.js`)

- `N` points (36k desktop, 16k under 900px) and **7 targets**: 0 hero student, 1 student + "?", 2 graph, 3 radar, 4 seal, 5 dust, 6 close student. Each builder must fill exactly `N` (use `Target.push` / `fillFrom`).
- The per-point attribute `kind*2 + shade` is packed into `aKA` (targets 0–3) and `aKB` (4–6). Kinds: 0 ink, 1 orange, 2 green, 3 blue, 4 lime.
- **Anchors are live:** in `frame()` each target's `uA[i]` and `uS[i]` come from a DOM element's `getBoundingClientRect` (`.photo-arch`, `.story figure`, `.how .app`, `#radar` via `getScreenCTM`, `#paper`, `#close`). If you rename or move those elements, update `el` in `main()`.
- **Morph index:** sections `#story #how #scores #certificate #who #close` each push `uM` up by one as their top rises through the viewport.
- **Layering:** the canvas is `z-index:1`. Section `.wrap`s and the footer are `z-index:2`. Hero text is 3. The back half of the orbit (`#orbitBack`) is 0, so cards pass behind the head. Opaque boxes (the app window, the certificate paper) hide dots behind them on purpose.
- **Shading** is ink-on-paper: dark = shadow (`shadeAt`). The head normals are auto-flipped outward. Don't remove that check.
- To add a shape: write `buildX(t)` in local units, add it to `tg`, the attribute packing, `uAl`/`uSz` and an anchor, and give it a section in `secs`.

## Commits

- Work on the `landing-page` branch. Keep the attribution trailer the session provides.
- Don't commit `shots/`, `.taste-skill/` or secrets.
