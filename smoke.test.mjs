import fs from 'node:fs'
import { JSDOM } from 'jsdom'

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '')
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom

global.window = window
global.document = window.document
global.navigator = window.navigator
global.Element = window.Element
global.HTMLElement = window.HTMLElement
global.Node = window.Node
global.Window = window.constructor
global.CustomEvent = window.CustomEvent
global.MutationObserver = window.MutationObserver
global.devicePixelRatio = 2
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
global.matchMedia = window.matchMedia
window.scrollTo = () => {}
class IO { constructor(cb) { this.cb = cb } observe(el) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this) } unobserve() {} disconnect() {} }
global.IntersectionObserver = window.IntersectionObserver = IO
class RO { observe() {} unobserve() {} disconnect() {} }
global.ResizeObserver = window.ResizeObserver = RO

const errors = []
const log = (ok, msg) => { if (!ok) errors.push(msg); console.log(`${ok ? '  ok ' : ' FAIL'}  ${msg}`) }

// ───────────────────────────────────────────────── structure
console.log('\n── structure')
const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]
const TEXT = document.body.textContent.replace(/\s+/g, ' ')
const HTML = document.body.innerHTML

log($('#stage') && $('#stage').parentElement === document.body, '#stage is a fixed layer on <body>')
log($('#stage canvas#gl') !== null, '#gl canvas lives inside #stage')
log($('#loader') !== null, 'preloader present')
log($('#loader-start') === null, 'no Start button — the intro plays on its own')
log($('#cursor') !== null && $('.cursor__ring') !== null, 'custom cursor markup present')
log(HTML.includes('noscript'), 'noscript guard so the loader cannot trap a no-JS visitor')

for (const id of ['home', 'about', 'what', 'work', 'education', 'connect'])
  log(document.getElementById(id) !== null, `section #${id} exists`)
{
  const nav = $$('.nav__links a').map((a) => a.textContent.trim())
  log(nav.length === 3, `nav trimmed to ${nav.length}: ${nav.join(' · ')}`)
  log(nav.every((t) => document.getElementById($$('.nav__links a').find((a) => a.textContent.trim() === t).getAttribute('href').slice(1))),
    'every nav link points at a section that exists')
}

// ── facts from the brief ────────────────────────────────────────────
console.log('\n── content is true to the brief')
log(TEXT.includes('Oladapo Q. Olaogun'), 'full name "Oladapo Q. Olaogun" appears')
log(!/Oladapo Olaogun(?!\s)/.test(TEXT.replace(/Oladapo Q\. Olaogun/g, '')), 'no bare "Oladapo Olaogun" left behind')
log(HTML.includes('linkedin.com/in/oladapo-quadri-olaogun'), 'new LinkedIn URL')
log(!HTML.includes('olaogun-oladapo'), 'old LinkedIn URL gone')
log(HTML.includes('x.com/oladapoqcd'), 'X link')
log(HTML.includes('instagram.com/oladapo_qcd'), 'Instagram link')
log(HTML.includes('facebook.com/oladapoqcd'), 'Facebook link')
log(HTML.includes('olaogunquadri2@gmail.com'), 'email')
log(/Oct 2025/.test(TEXT) && /Dec 2030/.test(TEXT), 'FUTA dates Oct 2025 – Dec 2030')
log(/AI literacy/i.test(TEXT), 'AI literacy positioning present')
log(/internships/i.test(TEXT), 'open to internships stated')

// ── nothing invented ────────────────────────────────────────────────
console.log('\n── nothing invented')
log($$('[data-count]').length === 0, 'no fabricated stat counters')
{
  // the preloader legitimately shows "0%" — exclude it, check everything else
  const clone = document.body.cloneNode(true)
  clone.querySelector('#loader')?.remove()
  const copy = clone.textContent.replace(/\s+/g, ' ')
  const hits = copy.match(/\b\d{1,3}\s?%/g) || []
  log(hits.length === 0, `no invented percentages in visible copy${hits.length ? ' — found ' + hits.join(', ') : ''}`)
}
log(!/\b(2024)\b/.test(TEXT), 'no invented 2024 project year')
log(!/Candela/i.test(TEXT), 'old Candela project copy removed')
log(!/CSC 102|GST 112|MEE 102|COS 102/i.test(TEXT), 'unverified course codes removed')
log(!/Probability/i.test(TEXT), 'unverified LaTeX coursebook removed')
log($$('.work').length === 3, `exactly 3 real projects (${$$('.work').length})`)
log(!/portfolio/i.test($$('.work').map((w) => w.textContent).join(' ')), 'this site is not listed as a project')
const todos = (document.documentElement.innerHTML.match(/TODO\(oladapo\)/g) || []).length
log(todos >= 2, `${todos} clearly-marked TODOs left for the missing impact numbers`)
log(!TEXT.includes('Built with Three.js'), 'no Three.js footer credit')

// ───────────────────────────────────────────────── ui.js
console.log('\n── ui.js behaviour')
const { initUI } = await import('./src/js/ui.js')
const { startTicker, stopTicker } = await import('./src/js/core/ticker.js')
let rafSeq = 1
const rafMap = new Map()
global.requestAnimationFrame = window.requestAnimationFrame = (cb) => {
  const id = rafSeq++
  rafMap.set(id, setTimeout(() => cb(Date.now()), 16))
  return id
}
global.cancelAnimationFrame = window.cancelAnimationFrame = (id) => {
  clearTimeout(rafMap.get(id)); rafMap.delete(id)
}
try { initUI(); startTicker(); log(true, 'initUI() ran without throwing') }
catch (e) { log(false, `initUI() threw: ${e.message}`) }

const chars = $$('.big__ch')
log(chars.length >= 8, `heading split into ${chars.length} animatable characters`)
{
  const h = $('#connect .big').textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  log(h === 'Let\u2019s talk', `connect heading intact after splitting: "${h}"`)
  log($('.nav__logo').textContent.trim() === 'Oladapo Q. Olaogun', 'nav wordmark is the name, top-left')
  log($('.hero__intro') !== null, 'introduction over the banner')
}

log($('#burger') === null, 'no burger — three short links stay inline at every width')
log($('#year').textContent.trim() === String(new Date().getFullYear()), `footer year = ${$('#year').textContent.trim()}`)

// ───────────────────────────────────────────────── typography
console.log('\n── typography (exact pair read from the reference stylesheet)')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const main = fs.readFileSync('src/js/main.js', 'utf8')
  log(/--display:\s*'Fraunces Variable'/.test(css), 'display face is Fraunces (her --font-serif)')
  log(/--sans:\s*'Manrope Variable'/.test(css), 'body face is Manrope (her --font-sans)')
  log(main.includes('@fontsource-variable/fraunces'), 'Fraunces is actually imported')
  log(main.includes('@fontsource-variable/manrope'), 'Manrope is actually imported')
  log(!main.includes('archivo-black') && !main.includes('inter/'), 'old Archivo Black / Inter imports removed')
  log(!/text-transform:\s*uppercase/.test(css.slice(css.indexOf('.mega {'), css.indexOf('.mega__line'))),
    '.mega is not force-uppercased')
}

// ───────────────────────────────────────────────── theme
console.log('\n── dark theme + contrast')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const hex = (v) => css.match(new RegExp(v + ':\\s*(#[0-9a-f]{6})', 'i'))?.[1]
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const bg = hex('--bg')
  log(lum(bg) < 0.05, `page background is dark (${bg})`)
  for (const [name, v] of [['heading', '--cream'], ['body text', '--text'], ['muted text', '--text-2'], ['accent', '--accent']]) {
    const h = hex(v); const r = ratio(h, bg)
    log(r >= 4.5, `${name} ${h} on ${bg} = ${r.toFixed(2)}:1 (WCAG AA needs 4.5)`)
  }

  // white on this orange is only 2.35:1, so button labels must be dark
  const onAccent = hex('--on-accent')
  log(onAccent && ratio(onAccent, hex('--accent')) >= 4.5,
    `button label ${onAccent} on accent ${hex('--accent')} = ${ratio(onAccent, hex('--accent')).toFixed(2)}:1`)
  log(/\.btn--primary\s*\{[^}]*color:\s*var\(--on-accent\)/.test(css),
    'primary button uses the dark label, not white')

  const surfaces = [...css.matchAll(/background(?:-color)?:\s*([^;]+);/g)].map((m) => m[1])
  const pale = surfaces.filter((v) => /#f[0-9a-f]{5}/i.test(v))
  log(pale.length === 0, `no leftover light-mode surfaces${pale.length ? ' — ' + pale[0] : ''}`)
}

// ───────────────────────────────────────────────── the header
console.log('\n── header')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const frag = fs.readFileSync('src/js/hero/shaders/gradient.frag.glsl', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  // layout: name left, photo right
  log($('.hero__name')?.textContent.trim() === 'Oladapo Q. Olaogun',
    `name reads "${$('.hero__name')?.textContent.trim()}"`)
  log($('.hero__photo img')?.getAttribute('src') === '/portrait.webp', 'photo present')
  const over = $('.hero__over')
  log(over.children[0].classList.contains('hero__copy') &&
      over.children[1].classList.contains('hero__photo'),
    'copy comes before the photo in source order — so it stacks copy-first on mobile')
  log(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1\.08fr\)/.test(rule('.hero__over')),
    'two columns, photo column slightly wider')

  // the breakpoint that was dropping the photo below the text
  {
    // read ONLY the max-width:1000px block, not everything up to the next
    // breakpoint — other media queries now sit between them
    const start = css.indexOf('@media (max-width: 1000px)')
    let depth = 0, end = start
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    const block = css.slice(start, end)
    log(!/\.hero__over/.test(block),
      'hero does NOT stack at 1000px — an 826px window keeps the photo on the right')
  }
  log(/\.hero__over \{\s*grid-template-columns:\s*1fr/.test(css.slice(css.indexOf('@media (max-width: 700px)'))),
    'hero stacks only below 700px, where two columns genuinely will not fit')

  const img = rule('.hero__photo img')
  log(/max-height:\s*min\(820px, calc\(max\(100svh, 620px\) - 150px\)\)/.test(img),
    'photo sized from the hero, not the viewport')

  // head level == name level
  log(/align-items:\s*start/.test(rule('.hero__over')),
    'columns align to the top, so the head sits level with the name')
  log(/align-self:\s*start/.test(rule('.hero__photo')), 'photo aligns to the top of its column')
  log(!/margin-bottom:\s*-/.test(rule('.hero__photo')),
    'no negative offset — that would drop the head below the name again')

  // the photo must fit inside the hero, or the bottom mask is cropped off
  // and you get a hard edge
  const A = 0.819
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [826, 444]]) {
    const short = h <= 700
    const heroH = short ? h : Math.max(h, 620)
    const byHero = short ? h - 130 : Math.min(820, Math.max(h, 620) - 150)
    const shell = Math.min(1180, w * 0.9)
    const gap = Math.min(54, Math.max(18, w * 0.03))
    const col = (shell - gap) * 1.08 / 2.08
    const ph = Math.min(byHero, col / A)
    const room = heroH - 118 - ph
    log(room > 0, `${w}x${h}: photo ${Math.round(ph)}px tall, ${Math.round(room)}px clear of the hero's bottom`)
  }

  // the old split-name banner is gone
  log($('.banner__name') === null && $('.banner__word') === null, 'split name removed')
  log(!/\.banner__glow/.test(css), 'static blue fill removed — the live gradient shows through')

  // 60/40
  const fade = rule('.banner__fade')
  log(/height:\s*44%/.test(fade), 'lower 44% is darkened, leaving ~60% colour on top')
  log(/linear-gradient\(\s*to top/.test(fade), 'fades upward into the gradient')
  log(/mask-image:\s*linear-gradient\(to top/.test(rule('.hero__photo img')),
    'photo melts into the page rather than ending on a hard crop')

  // motion
  // motion
  const g2 = fs.readFileSync('src/js/hero/gradient.js', 'utf8')
  log(/exp\(-d \* d \* 1\.5\)/.test(frag), 'soft gaussian blobs (not the plasma)')
  log(!/float fbm\(/.test(frag), 'plasma removed')
  log(/uBlobA/.test(frag) && /uBlobA/.test(g2),
    'blob positions come from the CPU, so the shader is four exp() calls')
  log(/b\.ang \+= \(noise1/.test(g2), 'headings are steered by noise, not on fixed orbits')
  log(/step \* 5\.6/.test(g2) && /1\.05 \* step/.test(g2),
    'travel sped up, homing raised to match so they stay on screen')
  log(/b\.r = b\.r0 \* \(1 \+ 0\.16/.test(g2), 'blobs breathe as well as drift')
}

// ───────────────────────────────────────────────── stacked panels
console.log('\n── sections fold over each other')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const ui = fs.readFileSync('src/js/ui.js', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  const kids = [...$('main').children].map((n) => n.className.split(' ')[0])
  log(kids.join(',') === 'stack,stack', `main holds [${kids.join(', ')}]`)

  const s1 = [...$$('main > .stack')[0].children].map((n) => n.id)
  log(s1.join(',') === 'home,about', `stack one: [${s1.join(', ')}] — hero released when it ends`)
  const s2 = [...$$('main > .stack')[1].children].map((n) => n.id)
  log(s2.join(',') === 'work,what,education,connect',
    `stack two opens with Work over the gradient: [${s2.join(', ')}]`)

  log(/@media \(min-width: 701px\) and \(min-height: 520px\)/.test(css),
    'sticky activates from 520px tall — a 640px floor switched it off on a 620px window')
  log(/position:\s*sticky; top: 0;/.test(css.slice(css.indexOf('@media (min-width: 701px) and (min-height: 520px)'))),
    'panels pin to the top')

  // every panel must hold its content at the height where sticky turns on,
  // or pinning hides the bottom of it
  {
    const cl = (a, b, c) => Math.min(Math.max(a, b), c)
    const bad = []
    for (const [W, H] of [[1317, 620], [1295, 648], [1440, 900], [1280, 800],
      [1024, 768], [900, 560], [760, 540]]) {
      const room = H - 2 * cl(56, H * 0.10, 150)
      const label = 40 + cl(22, W * 0.03, 38)
      const stF = cl(25.6, Math.min(W * 0.052, H * 0.09), 68.8)
      const wF = cl(30.4, Math.min(W * 0.074, H * 0.105), 96)
      const rowPad = 2 * cl(7, H * 0.015, 22)
      const tF = cl(18.4, W * 0.019, 25.6)
      const dF = cl(13.4, W * 0.01, 14.9)
      const tallest = Math.max(
        label + 3 * 1.06 * stF,
        label + 4 * (wF * 1.04 + rowPad),
        label + 26 + 20 + 2 * 1.1 * tF + 6 * 1.6 * dF + 36 + 20,
      )
      if (tallest > room) bad.push(`${W}x${H}`)
    }
    log(bad.length === 0,
      `every panel fits its viewport at all sticky sizes${bad.length ? ' — overflow at ' + bad.join(', ') : ''}`)
  }

  // the sizing that makes that true
  log(/padding: clamp\(56px, 10svh, 150px\)/.test(rule('.panel')),
    'panel padding is height-driven (11vw ate half a short window)')
  log(!/panel--tall/.test(css) && !/panel--tall/.test(HTML),
    'every panel folds now — Work was the last exception')
  const panel = rule('.panel')
  log(/background:\s*var\(--bg\)/.test(panel), 'panels are opaque, so each hides the one behind')
  log(/box-shadow:\s*0 -34px/.test(panel), 'each casts a shadow onto the panel it is covering')
  log(/min-height:\s*100svh/.test(panel), 'each fills a screen')

  log($('.breather') === null, 'the empty breather is gone — Work occupies that space now')
  log($('#work').classList.contains('panel--glass'), 'Work is the panel that sits over the gradient')
  log(/background:\s*none/.test(rule('.panel--glass')),
    'it has no background of its own, so the gradient shows through')

  log(/overflow-x:\s*clip/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')),
    'body uses overflow-x: clip — `hidden` would break every sticky panel')
  // every panel leaves, not just the hero — otherwise it reads as a pile
  log(/initPanelParallax/.test(ui) && !/initHeroParallax/.test(ui),
    'parallax applies to every panel, not just the hero')
  log(/querySelectorAll\('\.hero, \.panel'\)/.test(ui), 'it collects the hero and every panel')
  log(/--lift/.test(css) && /--lift/.test(ui), 'outgoing panel content drifts up')
  log(/--dim/.test(css) && /--dim/.test(ui), 'and fades out as it goes')
  log(/panel > \.shell \{[\s\S]{0,120}translateY\(var\(--lift/.test(css),
    'the content moves while the panel stays pinned for the next one to cover')
  log(/nextElementSibling \|\| panel\.parentElement\?\.nextElementSibling/.test(ui),
    'progress read from whatever will cover it, since a pinned panel does not move')
  log(/if \(reduced\) return/.test(ui), 'parallax respects prefers-reduced-motion')
}

// ───────────────────────────────────────────────── chrome + education
console.log('\n── nav, edge label, education')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  log($('.edge') !== null, 'vertical label on the right edge')
  log(/writing-mode:\s*vertical-rl/.test(rule('.edge')), 'it runs vertically')
  log($('.edge').textContent.trim() === 'Open to internships',
    `and says "${$('.edge').textContent.trim()}" — back on the page after the About paragraph was cut`)

  log($$('#education .hist__row').length === 2, 'education has two rows')
  log(document.body.textContent.includes('Lagos, Nigeria'),
    'Lagos is back on the page')
  log($('#education .big') === null, 'education has no oversized display heading')
  log(/Federal University of Technology/.test($('#education').textContent),
    'the university name still appears, in the row rather than as a heading')
  log($$('.label__dot').length === 0, 'the accent dots are gone from every label')
  log($$('.label').length === 5, `five section labels: ${$$('.label').map((n) => n.textContent.trim()).join(' · ')}`)
}

// ───────────────────────────────────────────────── work + connect
console.log('\n── work and connect')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  log($$('.work').length === 3, `three real projects (${$$('.work').length})`)
  log(/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/.test(rule('.works')),
    'three columns on a wide screen, so the list fits one viewport and can fold')
  {
    // model the panel height where sticky is active
    const fits = []
    for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [900, 700], [760, 640]]) {
      const pad = 2 * Math.min(150, Math.max(96, w * 0.11))
      const label = 40 + Math.min(38, Math.max(22, w * 0.03))
      const titleH = 2 * 1.1 * Math.min(25.6, Math.max(18.4, w * 0.019))
      const descH = 6 * 1.6 * Math.min(14.9, Math.max(13.4, w * 0.01))
      const total = pad + label + 26 + 20 + titleH + descH + 36 + 20
      fits.push([`${w}x${h}`, Math.round(total) <= h])
    }
    log(fits.every(([, ok]) => ok),
      `work fits the viewport at every sticky size (${fits.map(([v]) => v).join(', ')})`)
  }
  log(/font-family:\s*var\(--geo\)/.test(rule('.work__title')),
    'project titles share the geometric face with the What I do rows')
  log(/border-radius:\s*16px/.test(rule('.work')) && /backdrop-filter/.test(rule('.work')),
    'work cards are glass now, sitting over the gradient')
  log((document.documentElement.innerHTML.match(/TODO\(oladapo\)/g) || []).length === 2,
    'both impact-number TODOs survived the rebuild')

  // the orphan my own cleanup created
  log($('#connect .big')?.textContent.replace(/\u00a0/g, ' ').trim() === 'Let\u2019s talk',
    'the Connect heading is styled again (.mega was deleted out from under it)')
  log(!/\bmega\b/.test(document.documentElement.innerHTML), 'no orphaned .mega markup left')
  log(/font-family:\s*var\(--geo\)/.test(rule('.big')), 'and set in the same display face')
}

// ───────────────────────────────────────────────── hero copy
console.log('\n── hero intro')
{
  const t = $('.hero__intro').textContent.replace(/\s+/g, ' ').trim()
  log(t.startsWith('Helping people understand'), `opens with "${t.slice(0, 34)}..."`)
  log(!/I work on AI literacy/.test(t), 'the "I work on AI literacy —" opener is gone')
  log(!/Computer Science undergraduate/.test(t), 'the FUTA / Lagos line is out of the hero')
  // but those facts must not vanish from the site
  // splitHeadings() swaps spaces for \u00a0 when it wraps each letter, so
  // normalise before matching
  const page = document.body.textContent.replace(/\u00a0/g, ' ')
  log(/FUTA|Federal University of Technology/.test(page), 'FUTA still appears (Education)')
  log(/Lagos/.test(page), 'Lagos still appears (Education)')
}

// ───────────────────────────────────────────────── mobile layout
console.log('\n── phone layout')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  log(!/nav__burger/.test(css), 'burger styles removed')
  log(/@media \(max-width: 560px\)/.test(css), 'nav scales down instead of collapsing')
  {
    const bad = []
    for (const W of [360, 390, 430, 560]) {
      const f = W <= 560 ? 9.5 : 13
      const need = 2 * W * 0.04 + 18 * f * 0.70 + 16 * (W <= 560 ? 9 : 11) * 0.62 + 2 * (W <= 560 ? 14 : 30)
      if (need >= W) bad.push(String(W))
    }
    log(bad.length === 0, `inline nav fits every phone width${bad.length ? ' — overflows at ' + bad.join(', ') : ''}`)
  }

  const narrow = css.slice(css.indexOf('@media (max-width: 700px)'))
  log(/\.works \{[\s\S]{0,240}overflow-x: auto/.test(narrow),
    'work cards scroll left-to-right on a phone rather than stacking')
  log(/scroll-snap-type: x mandatory/.test(narrow), 'with snap points so each card parks cleanly')
}

// ───────────────────────────────────────────────── socials
console.log('\n── social links')
{
  const want = {
    'x.com/oladapoqcd': 'X',
    'github.com/Oladapoqcd': 'GitHub',
    'facebook.com/oladapoqcd': 'Facebook',
    'instagram.com/oladapo_qcd': 'Instagram',
    'linkedin.com/in/oladapo-quadri-olaogun': 'LinkedIn',
  }
  for (const [url, name] of Object.entries(want)) log(HTML.includes(url), `${name} → ${url}`)
  log(!/Isr_candela/.test(document.documentElement.innerHTML), 'the old X handle is gone everywhere')
  log($$('.rail a').length === 5, `${$$('.rail a').length} icons in the side rail`)
  log($$('.links a').length === 5, `${$$('.links a').length} links in Connect`)
}

// ───────────────────────────────────────────────── hero type
console.log('\n── hero type')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }
  log(/font-size:\s*clamp\(2\.3rem, 6vw, 4\.6rem\)/.test(rule('.hero__name')),
    'name back at 6vw')
  log(/font-size:\s*clamp\(1\.25rem, 1\.85vw, 1\.6rem\)/.test(rule('.hero__intro')),
    'line under it raised again, to 1.85vw')
  log(!/font-weight:\s*600/.test(rule('.hero__intro')), 'regular weight')

  const t = $('.hero__intro').textContent.replace(/\s+/g, ' ').trim()
  log(t === 'Helping people understand AI well enough to make their own informed choices.',
    `intro is the single sentence (${t.length} chars)`)
  log(!/Plain language|no hype|ones I have built/.test(t), 'the second sentence is gone')
}

// ───────────────────────────────────────────────── connect fits
console.log('\n── contact panel is reachable')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  log(/\.panel--end \{ align-content: center/.test(css),
    'overflow is centred, not pushed off the top where a sticky panel hides it forever')
  log(!/\.panel--end \{ align-content: end/.test(css), 'align-content: end removed')

  // the email lives in this panel; if the panel overflows, it is unreachable
  const cl = (a, b, c) => Math.min(Math.max(a, b), c)
  const bad = []
  for (const [W, H] of [[1317, 620], [1280, 700], [1440, 900], [1024, 768],
    [900, 560], [760, 540], [390, 844]]) {
    const room = H - 2 * cl(56, H * 0.10, 150)
    const label = 40 + cl(32, H * 0.06, 64)
    const big = cl(32, Math.min(W * 0.08, H * 0.11), 96) * 1.02 + cl(14, H * 0.026, 40)
    const mail = cl(16, W * 0.022, 25.6) * 1.4 + 6
    const cols = Math.max(1, Math.floor((Math.min(1180, W * 0.9) + 56) / 296))
    const row = 2 * cl(10, H * 0.018, 17) + 20
    const links = Math.ceil(5 / cols) * row + cl(18, H * 0.03, 48)
    const avail = 18 + cl(14, H * 0.024, 44)
    const foot = 56 + cl(20, H * 0.034, 64)
    if (label + big + mail + links + avail + foot > room) bad.push(`${W}x${H}`)
  }
  log(bad.length === 0,
    `contact panel fits every viewport, so the email is always on screen${bad.length ? ' — overflows at ' + bad.join(', ') : ''}`)
}

// ───────────────────────────────────────────────── contact address
console.log('\n── email')
{
  const a = $('.mail')
  log(a?.getAttribute('href') === 'mailto:olaogunquadri2@gmail.com', 'plain mailto: link')
  log(a?.textContent.trim() === 'olaogunquadri2@gmail.com', 'shown in full as readable text')
  log(!/&#\d+;|&#x/i.test(HTML), 'no HTML-entity obfuscation anywhere')
  log(!/cf_email|email-protection|data-cfemail/i.test(HTML), 'no email-protection wrapper')
}

// ───────────────────────────────────────────────── portrait artefact
console.log('\n── the square behind the portrait')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const block = (css.match(/^\.hero__photo img \{([\s\S]*?)^\}/m) || [])[1] || ''
  const code = block.replace(/\/\*[\s\S]*?\*\//g, '')
  log(/mask-image/.test(code), 'the photo is still masked at the bottom')
  log(!/filter:/.test(code),
    'no filter beside the mask — together, the filter region becomes the element BOX '
    + 'and draws a dark rectangle behind the cut-out')
}

// ───────────────────────────────────────────────── work content
console.log('\n── selected work')
{
  log($$('.work__no').length === 0, 'the 01 / 02 / 03 numbers are gone')
  log($$('.work__links').length === 0, 'the Read on X / LinkedIn links are gone')
  log($$('.work').length === 3, 'still three projects')
  log($$('#work .shell').length === 1, 'one shell, not two')
  log((document.documentElement.innerHTML.match(/TODO\(oladapo\)/g) || []).length === 2,
    'both impact-number TODOs survived')
}

// ───────────────────────────────────────────────── glass + grey
console.log('\n── glass work panel and the grey gradient')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const frag = fs.readFileSync('src/js/hero/shaders/gradient.frag.glsl', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  const w = rule('.work')
  log(/backdrop-filter:\s*blur/.test(w), 'glass: the cards blur the gradient behind them')
  log(/rgba\(255, 255, 255, 0\.1/.test(w), 'translucent fill')
  log(/border:\s*1px solid rgba\(255, 255, 255/.test(w), 'a bright edge to catch the light')
  log(/inset 0 1px 0 rgba\(255, 255, 255/.test(w), 'inner highlight along the top')
  log(/border-radius:\s*16px/.test(w), 'rounded')

  // blue at the top, grey below — cross-faded on scroll
  log(/float header = 1\.0 - smoothstep\(0\.0, 0\.20, uScroll\)/.test(frag),
    'palette is interpolated on scroll position')
  const mixes = [...frag.matchAll(/mix\(vec3\(([\d., ]+)\), vec3\(([\d., ]+)\), header\)/g)]
  log(mixes.length === 4, `${mixes.length} colours cross-fade between grey and blue`)
  log(mixes.map((m) => m[1].split(',').map(Number))
    .every(([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) <= 0.06),
    'the scrolled-down end is neutral grey')
  log(mixes.map((m) => m[2].split(',').map(Number)).every(([r, , b]) => b - r > 0.3),
    'the header end is properly blue')

  // the uniform must exist AND be fed, or `header` is permanently 0
  const gj = fs.readFileSync('src/js/hero/gradient.js', 'utf8')
  log(/uniform float uScroll/.test(frag), 'uScroll declared in the shader')
  log(/uScroll: \{ value: 0 \}/.test(gj) && /uniforms\.uScroll\.value = scroll/.test(gj),
    'and supplied from JS — declared-but-unfed would pin the whole page to grey')
  log(!/1\.0, 0\.54, 0\.24/.test(frag), 'the orange accent blob is gone too')
}

// ───────────────────────────────────────────────── word wrapping
console.log('\n── heading word breaks')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const ui = fs.readFileSync('src/js/ui.js', 'utf8')
  log(/big__word/.test(ui) && /big__word \{ display: inline-block; white-space: nowrap; \}/.test(css),
    'words are wrapped in nowrap boxes')
  log(/for \(const chunk of text\.split/.test(ui), 'split by word before by character')
  // per-character inline-blocks make every letter a break opportunity,
  // which is what produced "TECHNOL / OGY"
  const heads = $$('.big')
  log(heads.every((h) => h.querySelectorAll('.big__word').length > 0),
    `${heads.length} display heading(s), all split word-first`)
}

// ───────────────────────────────────────────────── copy edits
console.log('\n── copy')
{
  const ai = [...$$('.doing__row')].find((r) => /AI literacy/i.test(r.textContent))
  const note = ai.querySelector('.doing__note').textContent.replace(/\s+/g, ' ').trim()
  log(!/without hype/.test(note), `AI literacy note drops "without hype": "${note}"`)

  // the writing project, reframed toward advocacy
  const w = [...$$('.work')].find((n) => /AI literacy advocacy/i.test(n.textContent))
  log(!!w, 'the writing project is framed as AI literacy advocacy')
  log(!/no jargon, no hype, no overclaiming/.test(w.textContent),
    'the three-negatives construction is gone')
  log(!/^Ongoing\./.test(w.querySelector('.work__desc').textContent.trim()),
    'no longer opens with "Ongoing." inside a section called Past work')

  // phrasings that read as machine-written
  const prose = [...$$('.work__desc, .doing__note, .hero__intro, .statement')]
    .map((n) => n.textContent.replace(/\s+/g, ' ').trim())
  const tells = [/\bdelve\b/i, /\bleverage\b/i, /\bseamless/i, /\bunlock\b/i,
    /\bdive into\b/i, /\bin today's\b/i, /\bnot just .*, but\b/i,
    /\bno \w+, no \w+, no \w+/i]
  const hits = prose.filter((t) => tells.some((re) => re.test(t)))
  log(hits.length === 0, `no machine-written tells in the body copy${hits.length ? ' — ' + hits[0].slice(0, 50) : ''}`)
  const dashes = prose.filter((t) => (t.match(/—/g) || []).length > 0).length
  log(dashes <= 1, `em-dashes used sparingly (${dashes} of ${prose.length} passages)`)
}

// ───────────────────────────────────────────────── what I do
console.log('\n── what I do')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const ui = fs.readFileSync('src/js/ui.js', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  const words = $$('.doing__word').map((n) => n.textContent.trim())
  log(words.length === 4, `four rows: ${words.join(' · ')}`)
  const w = rule('.doing__word')
  log(/font-family:\s*var\(--geo\)/.test(w), 'set in Adventor, the same face as the reference')
  log(/text-transform:\s*uppercase/.test(w), 'uppercase')
  log(/font-size:\s*clamp\(1\.9rem, min\(7\.4vw, 10\.5svh\), 6rem\)/.test(w),
    'set huge, but capped by viewport height so four rows always fit')
  log(/border-bottom:\s*1px solid/.test(rule('.doing__row')), 'a rule under every row')

  log(/background-clip:\s*text/.test(w),
    'the fill is clipped to the glyphs, so it follows the letterforms')
  log(/var\(--fill, 0%\)/.test(w), 'fill driven by a custom property')
  log(/initWordFill/.test(ui), 'and set from scroll position')
  log(/reduced\)\s*\{\s*words\.forEach/.test(ui.replace(/\n\s*/g, ' ')),
    'reduced-motion gets the words fully lit rather than animating')
  log($('#what .label')?.textContent.trim() === 'What I do', 'the What I do label, no dot')
}

// ───────────────────────────────────────────────── about section
console.log('\n── about section')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
    return m ? m[1] : ''
  }

  const ids = [...HTML.matchAll(/<section[^>]*id="([a-z-]+)"/g)].map((m) => m[1])
  log(ids[0] === 'home' && ids[1] === 'about',
    `about comes straight after the banner (${ids.slice(0, 3).join(' → ')})`)

  const st = rule('.statement')
  log(/font-family:\s*var\(--geo\)/.test(st), 'statement uses Adventor — the free Avant Garde')
  log(/font-weight:\s*700/.test(st), 'set bold, matching the reference\'s weight 700')
  log(/font-size:\s*clamp\(1\.6rem, min\(5\.2vw, 9svh\), 4\.3rem\)/.test(st),
    'set large, and height-capped like the rest')
  log(/line-height:\s*1\.06/.test(st), 'tight leading')
  log(/letter-spacing:\s*-0\.004em/.test(st),
    'tracking close to normal — heavy negative tracking ran the words together')
  log($$('#about .statement').length === 1, 'about is a single statement, no trailing paragraph')
  log(!document.body.textContent.includes('I study Computer Science'),
    'the "I study Computer Science..." paragraph is gone')
  log(/--geo:\s*'Adventor'/.test(css), 'Adventor token defined')
  log(/@font-face \{[^}]*'Adventor'[^}]*\}/.test(css.replace(/\n/g, '')), 'Adventor is self-hosted via @font-face')
  log(fs.existsSync('src/assets/fonts/adventor-bold.woff2'), 'bold weight shipped')
  log(!fs.existsSync('src/assets/fonts/adventor-regular.woff2'),
    'regular weight dropped — only 700 is ever used')
  log(fs.existsSync('src/assets/fonts/README.txt'), 'font licence + provenance recorded')
  {
    const kb = fs.statSync('src/assets/fonts/adventor-bold.woff2').size / 1024
    log(kb < 15, `${kb.toFixed(0)} kB subset (176 kB as raw OTF)`)
  }
  log(/\.statement strong \{ color: var\(--accent\)/.test(css),
    'highlighted phrase carries the accent')
  log(/color: var\(--text-2\)/.test(rule('.label')),
    'section label is muted, so the accent belongs to the highlight alone')
  log(/#about \.statement \{ max-width: 24ch; margin-inline: auto; \}/.test(css),
    'about statement keeps its centred measure')
  log(/#about \.label \{ max-width: none; margin-inline: 0; \}/.test(css),
    'about label sits at the left edge instead of indenting to meet it')
  log(/margin-bottom:\s*clamp\(32px, 6svh, 64px\)/.test(rule('.label')),
    'more air between every label and what follows it')

  const strongs = [...$('#about .statement').querySelectorAll('strong')]
  log(strongs.length === 1, `exactly one highlighted phrase (${strongs.map((n) => n.textContent).join(', ')})`)
}

// ───────────────────────────────────────────────── intro + cursor
console.log('\n── start gate and cursor')
{
  const css = fs.readFileSync('src/styles/main.css', 'utf8')
  const ui = fs.readFileSync('src/js/ui.js', 'utf8')

  log(/body\.is-loading \{ overflow: hidden; \}/.test(css), 'page cannot scroll during the intro')
  log(/\.loader\.is-leaving/.test(css) && /translateY\(-100%\)/.test(css),
    'the loader rises like a curtain rather than just fading')
  log(/setTimeout\(leave, 4000\)/.test(ui), 'loader lifts itself even if the counter fails')
  log(!/loader__start/.test(css) && !/armStart/.test(ui), 'Start gate fully removed')

  // the page must be visible even if the script never runs
  log(!/^main, \.nav, \.rail \{\s*opacity: 0/m.test(css),
    'nothing is hidden by default — a script failure cannot blank the page')

  for (const [name, sel] of [['nav slides down', 'navDown'], ['banner name rises', 'riseIn'],
    ['photo eases in', 'photoIn']]) {
    log(new RegExp('@keyframes ' + sel).test(css), `entrance: ${name}`)
  }
  log(/body\.is-started \.nav \{ animation: navDown[^}]*backwards/.test(css),
    'nav entrance uses `backwards`, not `both` — `both` would freeze its transform and break hide-on-scroll')
  log(/prefers-reduced-motion[\s\S]{0,400}animation: none/.test(css),
    'entrance animations respect prefers-reduced-motion')

  // the bug that made the cursor paint over text instead of inverting it
  log(/\.cursor\.is-invert \{ mix-blend-mode: difference; \}/.test(css),
    'blend mode is on the OUTER cursor element')
  const ring = css.slice(css.indexOf('.cursor {'), css.indexOf('.cursor.is-invert'))
  log(!/will-change/.test(ring),
    'no will-change on the cursor — it would create a stacking context and isolate the blend')
  {
    const rule = (sel) => {
      const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const m = new RegExp('^' + esc + '\\s*\\{([^}]*)\\}', 'm').exec(css)
      return m ? m[1] : ''
    }
    const ringRule = rule('.cursor__ring')
    log(/background:\s*var\(--accent\)/.test(ringRule), 'cursor fill is solid accent, not a transparent wash')
    log(/border:[^;]*var\(--accent\)/.test(ringRule), 'stroke is the same colour as the fill')
    log(!/rgba\(255, 138, 61/.test(ringRule), 'no leftover translucent fill')
  }
  log(/\.cursor\.is-link \{ mix-blend-mode: difference; \}/.test(css),
    'links invert too — a solid orange disc would disappear on the orange button')
  log(/INVERTS = /.test(ui) && /\.doing__word/.test(ui) && /\.big/.test(ui),
    'headings trigger the invert')
  log(!/hover \.doing__word/.test(css) && !/hover \.work__title/.test(css),
    'headings no longer recolour on hover — that fought the invert and you saw orange, not black')
  log(/damp\(x, tx, 9/.test(ui), 'ring trails the arrow with a visible lag')
  log(/damp\(x, tx/.test(ui), 'cursor trails the pointer rather than snapping')
  log(/\.cursor \{ display: none; \}/.test(css), 'custom cursor hidden on touch')
  log(!/cursor:\s*none/.test(css),
    'the native arrow is visible — the ring trails it rather than replacing it')
  log(/\(pointer: coarse\)'\)\.matches\) return/.test(ui), 'cursor JS bails out on touch')
}

// ───────────────────────────────────────────────── background gradient
console.log('\n── interactive gradient')
{
  const g = fs.readFileSync('src/js/hero/gradient.js', 'utf8')
  const frag = fs.readFileSync('src/js/hero/shaders/gradient.frag.glsl', 'utf8')
  const main = fs.readFileSync('src/js/main.js', 'utf8')

  log(!fs.existsSync('src/js/hero/particles.js'), 'particle system removed')
  log(!fs.existsSync('src/js/hero/formations.js'), 'formation geometry removed')
  log(!fs.existsSync('src/js/hero/portraitSampler.js'), 'portrait sampler removed')
  log(main.includes('./hero/gradient.js'), 'entry lazy-loads the gradient')

  log(/uPointer/.test(frag) && /uHover/.test(frag), 'gradient reacts to the pointer')
  log(/pointermove/.test(g), 'pointer is tracked')
  log(/damp\(pb\.x, target\.x/.test(g), 'pointer follow is damped, not snapped')
  log(/scroll \* 0\.5/.test(g), 'blobs drift as you scroll')
  log(/if \(coarse\)/.test(g), 'touch devices get motion even though they cannot hover')
  log(/MAX_PIXEL_RATIO = \{ fine: 1\.25, coarse: 1\.0 \}/.test(g),
    'capped pixel ratio — a gradient has no fine detail to resolve')
  log(/\(n - 0\.5\) \/ 255\.0/.test(frag), 'dithered against 8-bit banding')
}

// ───────────────────────────────────────────────── deployment
console.log('\n── deploy config')
{
  const vc = fs.readFileSync('vite.config.js', 'utf8')
  log(/base: process\.env\.BASE_PATH \|\| '\/'/.test(vc),
    'base path is configurable — GitHub Pages serves from a sub-path, Netlify from the root')

  log(fs.existsSync('.github/workflows/deploy.yml'), 'GitHub Pages workflow present')
  const wf = fs.readFileSync('.github/workflows/deploy.yml', 'utf8')
  log(/npm test/.test(wf), 'the workflow runs the tests before deploying')
  log(/github\.repository_owner \}\}\.github\.io/.test(wf),
    'handles both <user>.github.io (root) and a project repo (sub-path)')
  log(/touch dist\/\.nojekyll/.test(wf),
    'adds .nojekyll so GitHub does not run the output through Jekyll')
  log(/actions\/deploy-pages@v4/.test(wf), 'uses the official Pages deploy action')

  log(fs.existsSync('netlify.toml'), 'netlify.toml still there, so either host works')
}

// ───────────────────────────────────────────────── shaders
console.log('\n── shaders')
{
  const { parser } = await import('@shaderfrog/glsl-parser')
  // Approximate what three.js prepends to a WebGL2 ShaderMaterial.
  const VHEAD = `#version 300 es
#define attribute in
#define varying out
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
`
  const FHEAD = `#version 300 es
#define varying in
#define gl_FragColor pc_fragColor
precision highp float;
out highp vec4 pc_fragColor;
`
  for (const [f, head] of [['gradient.vert.glsl', VHEAD], ['gradient.frag.glsl', FHEAD]]) {
    const src = head + fs.readFileSync('src/js/hero/shaders/' + f, 'utf8')
    let ok = true
    try { parser.parse(src, { quiet: true }) } catch (e) { ok = false; console.log('   ' + e.message.split('\n')[0]) }
    log(ok, `${f} compiles`)
  }
}

stopTicker()
console.log(`\n${errors.length === 0 ? '✓ all checks passed' : `✗ ${errors.length} failure(s)`}`)
if (errors.length) { errors.forEach((e) => console.log('   - ' + e)); process.exit(1) }
