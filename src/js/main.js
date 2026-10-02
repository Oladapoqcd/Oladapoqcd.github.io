/**
 * Entry point.
 *
 * Load order is deliberate — the 3D must never hold up the content:
 *   1. CSS + fonts (bundled, no external requests)
 *   2. DOM behaviour — the page is fully usable from here
 *   3. only then, lazily, the Three.js bundle
 *
 * Until (and unless) WebGL arrives, the hero shows a plain <img> of the same
 * photo. Nobody gets an empty box.
 */

// The exact pair from the reference site: Fraunces for headings,
// Manrope for everything else.
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '../styles/main.css'

import { startTicker } from './core/ticker.js'
import { initUI } from './ui.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

initUI()
startTicker()

const stage = document.getElementById('stage')
const hint = document.getElementById('stage-hint')

async function bootFigure() {
  if (!webglAvailable()) {
    console.info('[gradient] no WebGL — keeping the flat background')
    return
  }

  try {
    const { initGradient } = await import('./hero/gradient.js')
    const field = await initGradient({
      canvas: document.getElementById('gl'),
      stageEl: stage,
      onReady: () => {
        document.body.classList.add('has-gl')
        setTimeout(() => hint?.classList.add('is-shown'), 1600)
        console.info('[gradient] ready')
      },
    })

    // the hint has done its job the moment they scroll
    window.addEventListener(
      'scroll',
      () => hint?.classList.add('is-used'),
      { once: true, passive: true },
    )

    return field
  } catch (err) {
    console.warn('[gradient] failed to start — the page keeps its flat background', err)
  }
}

if (reduced) {
  console.info('[gradient] prefers-reduced-motion — flat background only')
} else {
  const boot = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(bootFigure, { timeout: 1500 })
      : setTimeout(bootFigure, 200)

  if (document.readyState === 'complete') boot()
  else window.addEventListener('load', boot, { once: true })
}
