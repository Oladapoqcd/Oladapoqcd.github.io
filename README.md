# Oladapo Olaogun — portfolio

Three.js + HTML + CSS + vanilla JavaScript. No framework.

```bash
npm install
npm run dev      # http://localhost:4173 — live editing, hot reload
npm run build    # static site into dist/
npm test         # 54 checks: content truth, DOM, shaders, scroll maths
node serve.mjs   # serve the pre-built copy in preview/, zero dependencies
```

---

## Design

Light mode. Warm paper (`#f6f3ee`), near-black ink (`#14110e`), one deep
orange-red accent (`#c23b17`). Type is **Fraunces** for headings and
**Manrope** for everything else — the exact pair used by the reference site,
read out of its stylesheet rather than guessed from a screenshot.

The name is set in Title Case serif, not capitals, with a small letterspaced
label above it and the description underneath. The wordmark repeats the name
top-left.

Every colour pair is contrast-checked in `npm test`:

| | on paper |
| --- | --- |
| body text `#423d37` | 9.71 : 1 |
| muted text `#6c655c` | 5.19 : 1 |
| accent `#c23b17` | 4.83 : 1 |

### Switching to light mode was not a colour swap

The particles were drawn with **additive blending**, which can only ever
make pixels brighter. On a light page that is invisible. Two things had to
change together:

1. **Blending** — additive → normal "over" compositing, so dark points can
   darken the paper.
2. **The sampler had to invert.** Density follows *darkness* now, not light
   (`const v = ink ? 1 - lum : lum`). Skip this and you render a
   photographic negative: the lit side of the face becomes a hole.
   `tools/lightmode_check.png` shows exactly that failure next to the fix.

The result reads as a stipple engraving rather than a glow. The generated
shapes needed no change — their per-point weights already meant
"prominence", which maps to ink density just as well as it mapped to
brightness.

`samplePortrait(url, count, grid, { ink })` still supports both, so going
back to a dark theme is one flag plus the blending mode.

---

## The particle field

One field, **seven shapes**, driven entirely by scroll position:

| Anchor | Shape |
| --- | --- |
| `#home` | your face, sampled from `public/portrait.png` |
| `#about` | neural network |
| `#what` | terminal |
| `#work` | laptop |
| `#work-list` | open book |
| `#education` | rocket |
| `#connect` | LinkedIn badge |

Only the face comes from a photograph. The rest are generated from maths in
`formations.js` — no images, no fonts, nothing extra to download.

> A bar-chart shape exists in the code (`buildChart`) but is **not in
> use**. A chart implies impact metrics, and those numbers have not been
> gathered yet — showing one would be a claim. Add it back to `GENERATED`
> once the figures are real.

### Two attributes, seven shapes

Holding every shape on the GPU would need one `vec3` attribute each, and
some mobile GPUs cap you at sixteen attributes total. So only the pair you
are between is uploaded:

```glsl
vec3 pos = mix(aFrom, aTo, progress(uMix, aStagger));
```

JavaScript swaps the buffers at each boundary. That is safe because
`progress()` reaches exactly `1.0` at `uMix = 1` for every point whatever
its stagger, so at the swap `aFrom` already equals what is on screen.
Measured worst-case jump: `3.7e-11` world units. Invisible.

### Scroll → stage

`src/js/core/scroll.js` computes the stage as a **pure function of
`window.scrollY`**. Not "when section X appears, trigger Y" — triggers fight
each other when you scroll fast or reverse, and the shape never settles. A
pure function is monotonic and perfectly reversible.

`MORPH_SPAN = 0.6` completes each morph in the first 60% of the gap between
anchors, then holds the shape. Spreading it over the whole gap felt like a
long wait before anything happened.

### Nothing is ever still

Four motions run continuously:

1. **Coherent sway** — 3D noise at a *low spatial frequency* (`pos * 0.05`).
   One noise cell is ~20 world units while the face is 5.6 tall, so the face
   **translates** rather than warping. That buys large visible drift for
   free. At a shorter wavelength the same amplitude smeared the eyes and
   mouth into a blob.
2. **Turbulence** — short-wavelength noise, but *only* while morphing.
3. **A private orbit per point** — small, always running.
4. **Brightness twinkle** — reads as life without moving anything.

### The portrait asset

`tools/make_portrait.py` cuts the subject out with **U2Net** (via `rembg`)
and crops to the alpha bounding box.

An earlier threshold-based version produced a bad matte: a chunk bitten out
of the left sleeve, a notch at the jaw, the right arm sliced off at the
image border, and the whole thing desaturated to greyscale. Cropping to the
subject rather than to a fixed rectangle is what stops limbs being cut.

Saved as **WebP**: 82 kB against 920 kB for the same pixels as PNG. Alpha is
preserved, and any browser that can render this site's CSS (`svh` units)
has supported WebP for years.

The alpha channel matters twice over — it is what lets the giant name run
*behind* the head in the banner, and the sampler reads it to know where the
subject is.

### Colour

The particles carry the photograph's own colour (`aTint`), lifted a little
because additive blending over a dark page swallows dark hues. `uTint` fades
that out as the field morphs into the generated shapes, which are line art
and want the monochrome ramp instead.

### Keeping the face recognisable

---

## Content rules

The brief is explicit: **do not invent facts, numbers, clients,
testimonials or projects.** The test suite enforces this — `npm test` fails
if fabricated stat counters, invented percentages or the removed placeholder
projects reappear.

Impact numbers are not gathered yet. Three are marked in `index.html`:

```
TODO(oladapo): how many students used the check-in app?
TODO(oladapo): how many students received the CBT apps, and how many courses?
```

Each sits next to a commented-out block ready to uncomment once the real
figure exists.

---

## Structure

```
index.html                  all copy, one readable file
netlify.toml                deploy config
serve.mjs                   zero-dependency static server
smoke.test.mjs              npm test
public/
  portrait.png              matted photo (colour + alpha)
src/
  styles/main.css           design tokens in :root
  js/
    main.js                 entry — DOM first, WebGL second
    ui.js                   preloader, nav, reveals, headline split
    core/
      scroll.js             scrollY → stage
      ticker.js             one shared requestAnimationFrame
      math.js               clamp / lerp / damp / smoothstep
    hero/
      particles.js          the field: geometry, camera, render loop
      portraitSampler.js    photo → points
      formations.js         generated shapes + ANCHORS
      shaders/              particles.vert.glsl · particles.frag.glsl
tools/                      make_portrait.py, plus rendered design checks
```

### Why the 3D loads last

`main.js` pulls Three.js in with a dynamic `import()`:

```
index.js       6.1 kB   ← preloader, nav, reveals. Ships immediately.
particles.js 537 kB     ← Three.js. Fetched after first paint.
```

### Performance tiers

| Tier | Points | Sample grid | DPR cap | When |
| --- | --- | --- | --- | --- |
| high | 30,000 | 620 cols | 2.0 | desktop, 8+ cores |
| mid | 15,000 | 470 cols | 2.0 | phones, tablets |
| low | 7,000 | 330 cols | 1.4 | ≤4 cores or ≤2 GB RAM |

`prefers-reduced-motion` skips the 3D and the preloader entirely. The
renderer pauses on `visibilitychange`.

---

## Editing it

| What | Where |
| --- | --- |
| All copy | `index.html` |
| Colours, type | `src/styles/main.css` (`:root`) |
| Which shape a section maps to | `formations.js` — `ANCHORS` |
| Adding a shape | write a builder, add to `GENERATED`, add an anchor |
| How long a morph takes | `scroll.js` — `MORPH_SPAN` |
| How much everything moves | `particles.vert.glsl` — the motion blocks |
| Point counts | `particles.js` — `TIERS` |

**New photo:** drop it in `uploads/`, point `SRC` in `make_portrait.py` at
it, then `python3 tools/make_portrait.py`. The sampler reads
`portrait.png` directly at runtime — nothing else to regenerate.

---

## Deploying to Netlify

`netlify.toml` is already set up, so there is nothing to configure.

1. Push this folder to a GitHub repo.
2. Netlify → **Add new site** → **Import an existing project** → pick it.
3. It reads `netlify.toml` and fills in `npm run build` / `dist` itself.

Or without Git: `npm run build`, then drag `dist` onto
[app.netlify.com/drop](https://app.netlify.com/drop).

> Note: `node_modules` and `dist` are not kept in the workspace snapshot, so
> after a restart run `npm ci` before `npm run dev`. The `preview/` folder
> and `serve.mjs` do persist — `node serve.mjs` works with no install.
