/**
 * The background: soft blue pools of light that drift around and follow
 * the pointer.
 *
 * A single full-screen quad. The blob positions are integrated on the CPU
 * and handed to the shader as three uniforms, so the fragment shader is
 * only four exp() calls per pixel — cheap enough to run at full rate on a
 * phone. Doing the motion in JavaScript also makes it easy to give each
 * blob a genuine wandering path rather than a loop.
 */

import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

import vertexShader from './shaders/gradient.vert.glsl?raw'
import fragmentShader from './shaders/gradient.frag.glsl?raw'

import { onTick } from '../core/ticker.js'
import { clamp, damp } from '../core/math.js'

/** A gradient carries no fine detail, so there is nothing to gain above this. */
const MAX_PIXEL_RATIO = { fine: 1.25, coarse: 1.0 }

/** Smooth 1D value noise — used to steer each blob's heading. */
function noise1(x) {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  const h = (n) => {
    const s = Math.sin(n * 127.1) * 43758.5453
    return s - Math.floor(s)
  }
  return h(i) + (h(i + 1) - h(i)) * u
}

/**
 * Each blob drifts under a slowly turning heading, pulled gently back
 * toward a home position so it never wanders off screen. The heading is
 * steered by noise, so the direction keeps changing instead of tracing an
 * orbit — an orbit is periodic and the eye spots the loop.
 */
function makeBlob(hx, hy, r, speed, seed) {
  return {
    hx, hy, r0: r, speed, seed,
    x: hx, y: hy, r,
    ang: seed * 6.2831,
  }
}

export async function initGradient({ canvas, stageEl, onReady } = {}) {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  let cap = coarse ? MAX_PIXEL_RATIO.coarse : MAX_PIXEL_RATIO.fine

  const blobs = [
    makeBlob(0.30, 0.74, 0.62, 0.052, 1.7),
    makeBlob(0.76, 0.38, 0.52, 0.044, 9.3),
    makeBlob(0.52, 0.56, 0.70, 0.038, 5.1),
  ]

  const uniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uPage: { value: new Color('#0b0a09') },
    uHover: { value: 0 },
    uScroll: { value: 0 },
    uBlobA: { value: new Vector3(0.30, 0.74, 0.62) },
    uBlobB: { value: new Vector3(0.76, 0.38, 0.52) },
    uBlobC: { value: new Vector3(0.52, 0.56, 0.70) },
    uPointerBlob: { value: new Vector3(0.5, 0.55, 0.30) },
  }

  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false

  const scene = new Scene()
  scene.add(mesh)
  // the vertex shader writes clip space directly; three.js just needs a camera
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false })

  let width = 1
  let height = 1

  function resize() {
    width = window.innerWidth
    height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, cap)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    uniforms.uResolution.value.set(width * dpr, height * dpr)
  }

  // ------------------------------------------------------------- pointer
  const target = { x: 0.5, y: 0.55, hover: 0 }

  function onMove(e) {
    target.x = e.clientX / width
    target.y = 1 - e.clientY / height // GL's Y runs the other way
    target.hover = 1
  }
  const onLeave = () => { target.hover = 0 }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onMove, { passive: true })
  window.addEventListener('pointerleave', onLeave, { passive: true })

  // no hover on touch, so give it a gentle presence of its own
  if (coarse) target.hover = 0.7

  // ----------------------------------------------------------- lifecycle
  let visible = true
  const onVisibility = () => { visible = !document.hidden }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('resize', resize)
  resize()

  // -------------------------------------------------------------- render
  let time = 0
  renderer.render(scene, camera)
  stageEl?.classList.add('is-ready')
  onReady?.()

  const slots = [uniforms.uBlobA.value, uniforms.uBlobB.value, uniforms.uBlobC.value]

  const stop = onTick((dt) => {
    if (!visible) return
    const step = Math.min(dt, 0.05)
    time += step

    const scroll = (() => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
    })()

    blobs.forEach((b, i) => {
      // steer, then move along the heading
      b.ang += (noise1(b.seed + time * 0.75) - 0.5) * step * 5.6
      b.x += Math.cos(b.ang) * b.speed * step * 5.6
      b.y += Math.sin(b.ang) * b.speed * step * 5.6

      // gentle pull home so it keeps roughly to its region of the screen
      // Tuned: at 6x speed / 0.45 homing they wandered off screen entirely.
      // This keeps every blob inside 0.03..0.98 of the viewport while still
      // covering ~7 viewport-widths a minute each.
      b.x += (b.hx - b.x) * 1.05 * step
      b.y += (b.hy - b.y) * 1.05 * step

      // breathing — a change of size reads as motion even when a blob is
      // momentarily travelling toward you rather than across
      b.r = b.r0 * (1 + 0.16 * Math.sin(time * (0.5 + i * 0.17) + b.seed))

      slots[i].set(b.x, b.y - scroll * 0.5, b.r)
    })

    // the shader fades blue -> grey on this
    uniforms.uScroll.value = scroll

    const pb = uniforms.uPointerBlob.value
    pb.x = damp(pb.x, target.x, 3.2, step)
    pb.y = damp(pb.y, target.y, 3.2, step)
    uniforms.uHover.value = damp(uniforms.uHover.value, target.hover, 2.4, step)

    renderer.render(scene, camera)
  })

  return {
    destroy() {
      stop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      mesh.geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
