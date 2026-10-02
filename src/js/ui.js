/**
 * Everything that isn't WebGL: the preloader, nav, scroll reveals and the
 * letter-by-letter headline. No dependencies.
 */

import { onTick } from './core/ticker.js'
import { damp } from './core/math.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ─────────────────────────────────────────────────────── preloader */
/**
 * Counts to 100, then lifts on its own — no button to press. As it rises,
 * the page animates into place behind it (see the entrance keyframes in
 * main.css).
 *
 * The count is deliberately NOT tied to real asset progress: the heavy
 * chunk is lazy-loaded after first paint, so a true progress bar would sit
 * at 100% before the interesting part had begun downloading.
 */
function initLoader() {
  const el = document.getElementById('loader')
  if (!el) return

  const num = document.getElementById('loader-num')
  const bar = document.getElementById('loader-bar')

  document.body.classList.add('is-loading')

  let left = false
  const leave = () => {
    if (left) return
    left = true
    document.body.classList.remove('is-loading')
    document.body.classList.add('is-started')
    el.classList.add('is-leaving')
    setTimeout(() => el.remove(), 1300)
  }

  if (reduced) {
    if (num) num.textContent = '100'
    if (bar) bar.style.width = '100%'
    leave()
    return
  }

  let pct = 0
  const began = performance.now()
  const tick = () => {
    const elapsed = performance.now() - began
    const target = Math.min(100, (elapsed / 1300) * 100)
    pct += (target - pct) * 0.2
    const shown = Math.min(100, Math.round(pct))
    if (num) num.textContent = shown
    if (bar) bar.style.width = `${shown}%`
    if (elapsed > 1550) {
      if (num) num.textContent = '100'
      if (bar) bar.style.width = '100%'
      setTimeout(leave, 220)
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  // never leave anyone stuck behind it
  setTimeout(leave, 4000)
}

/* ────────────────────────────────────────────────── custom cursor */
/**
 * A ring that trails the pointer, inverting over headings.
 *
 * The inversion is `mix-blend-mode: difference` on a white circle: it
 * subtracts whatever is underneath from white, so dark type goes light and
 * the blue gradient flips. No duplicated text, no clip-paths.
 *
 * Two nested elements on purpose — the outer one is moved every frame, the
 * inner one carries the CSS transitions. Putting both on one element would
 * make the size transition fight the position update.
 */
const INVERTS = 'h1, h2, .doing__word, .work__title, .big, .statement'
const LINKS = 'a, button'

function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return
  const el = document.getElementById('cursor')
  if (!el) return

  document.body.classList.add('has-cursor')

  let x = window.innerWidth / 2
  let y = window.innerHeight / 2
  let tx = x
  let ty = y
  let awake = false

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX
    ty = e.clientY
    if (!awake) {
      awake = true
      x = tx
      y = ty
      el.classList.add('is-awake')
    }
    // Resolve the hover state here rather than with per-element listeners,
    // so it keeps working for anything added to the page later.
    const t = e.target
    const invert = t.closest?.(INVERTS)
    const link = !invert && t.closest?.(LINKS)
    el.classList.toggle('is-invert', !!invert)
    el.classList.toggle('is-link', !!link)
  }, { passive: true })

  window.addEventListener('pointerleave', () => {
    awake = false
    el.classList.remove('is-awake')
  }, { passive: true })

  onTick((dt) => {
    if (!awake) return
    // Damped follow — the ring should lag slightly behind the pointer.
    // 9 rather than 14: enough lag that the ring visibly trails the arrow
    // instead of sitting locked under it.
    x = damp(x, tx, 9, dt)
    y = damp(y, ty, 9, dt)
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  })
}

/* ────────────────────────────────────────────── split the headline */
/**
 * Wrap every character in a span so they can rise independently. The line
 * itself has overflow:hidden, so they slide up from behind its own edge.
 */
function splitHeadings() {
  const heads = [...document.querySelectorAll('.big')]
  if (!heads.length) return

  // Wrap WORDS as well as characters. Characters alone are inline-block,
  // so the browser treats every one as a break opportunity and happily
  // splits a word down the middle — "TECHNOL / OGY". Keeping each word in
  // a nowrap box restores normal word wrapping.
  for (const head of heads) {
    const text = head.textContent.trim()
    head.textContent = ''
    let i = 0
    for (const chunk of text.split(/(\s+)/)) {
      if (chunk === '') continue
      if (/^\s+$/.test(chunk)) {
        head.appendChild(document.createTextNode(' '))
        continue
      }
      const word = document.createElement('span')
      word.className = 'big__word'
      for (const ch of chunk) {
        const span = document.createElement('span')
        span.className = 'big__ch'
        span.textContent = ch
        span.style.transitionDelay = `${i++ * 0.03}s`
        word.appendChild(span)
      }
      head.appendChild(word)
    }
  }

  // reveal when it enters view
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    },
    { threshold: 0.2 },
  )
  heads.forEach((h) => io.observe(h))
}

/* ─────────────────────────────────────────────────────────── nav */
function initNav() {
  const nav = document.getElementById('nav')
  const links = document.getElementById('nav-links')
  if (!nav) return

  let last = window.scrollY

  onTick(() => {
    const y = window.scrollY
    nav.classList.toggle('is-stuck', y > 40)
    // hide on the way down, show on the way up — but never while the menu is open
    nav.classList.toggle('is-hidden', y > 320 && y > last + 4)
    if (Math.abs(y - last) > 4) last = y
  })

  // active link follows the section in view
  const sections = [...links.querySelectorAll('a')]
    .map((a) => {
      const id = a.getAttribute('href')?.slice(1)
      const el = id && document.getElementById(id)
      return el ? { a, el } : null
    })
    .filter(Boolean)

  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          sections.forEach(({ a, el }) => a.classList.toggle('is-active', el === e.target))
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach(({ el }) => spy.observe(el))
  }
}

/* ─────────────────────────────────────────────────────── reveals */
function initReveals() {
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]')
  if (!targets.length) return

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('is-in')
        io.unobserve(e.target) // once only
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  )
  targets.forEach((t) => io.observe(t))
}

/* ────────────────────────────────────────────── panel parallax */
/**
 * Every panel drifts upward and fades as the next one rises over it.
 *
 * Pinning alone reads as a pile of cards: the outgoing panel just sits
 * there, frozen, while a new one slides across it. Moving it up — slower
 * than the incoming panel, so the two close on each other — and fading it
 * out is what makes it read as the old page leaving rather than being
 * buried.
 *
 * Progress comes from the position of whatever will cover this panel: its
 * next sibling, or if it is last in a stack, whatever follows the stack.
 * That is more robust than measuring the panel itself, which does not move
 * once it is pinned.
 */
function initPanelParallax() {
  if (reduced) return

  const items = [...document.querySelectorAll('.hero, .panel')]
    .map((panel) => {
      const inner = panel.querySelector('.hero__over, .shell')
      const coverer = panel.nextElementSibling || panel.parentElement?.nextElementSibling
      return inner && coverer ? { inner, coverer, idle: true } : null
    })
    .filter(Boolean)

  if (!items.length) return

  onTick(() => {
    const vh = window.innerHeight || 1
    for (const item of items) {
      const top = item.coverer.getBoundingClientRect().top

      // not on screen yet — reset once, then skip
      if (top > vh) {
        if (!item.idle) {
          item.idle = true
          item.inner.style.removeProperty('--lift')
          item.inner.style.removeProperty('--dim')
        }
        continue
      }
      item.idle = false

      const t = Math.min(1, Math.max(0, 1 - top / vh))
      item.inner.style.setProperty('--lift', `${(-t * vh * 0.3).toFixed(1)}px`)
      item.inner.style.setProperty('--dim', (1 - t * 0.92).toFixed(3))
    }
  })
}

/* ─────────────────────────────────────────── what-I-do word fill */
/**
 * Each word lights up from the left as its row travels up the screen.
 *
 * The fill is a percentage stop in a linear-gradient that is clipped to
 * the glyphs, so it follows the letterforms rather than sliding a box over
 * them. Reading getBoundingClientRect for four rows per frame is cheap;
 * an IntersectionObserver cannot give a continuous value, only crossings.
 */
function initWordFill() {
  const words = [...document.querySelectorAll('.doing__word')]
  if (!words.length) return

  if (reduced) {
    words.forEach((w) => w.style.setProperty('--fill', '100%'))
    return
  }

  onTick(() => {
    const vh = window.innerHeight || 1
    for (const w of words) {
      const r = w.getBoundingClientRect()
      if (r.bottom < -80 || r.top > vh + 80) continue
      // 0 when the row is at 78% down the screen, 1 by the time it reaches 28%
      const t = Math.min(1, Math.max(0, (vh * 0.78 - r.top) / (vh * 0.5)))
      w.style.setProperty('--fill', `${(t * 100).toFixed(1)}%`)
    }
  })
}

/* ───────────────────────────────────────────────────────── year */
function initYear() {
  const el = document.getElementById('year')
  if (el) el.textContent = String(new Date().getFullYear())
}

export function initUI() {
  initLoader()
  initCursor()
  splitHeadings()
  initNav()
  initReveals()
  initPanelParallax()
  initWordFill()
  initYear()
}
