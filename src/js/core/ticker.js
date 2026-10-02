/**
 * One requestAnimationFrame loop for the whole site.
 *
 * Every animated thing subscribes here instead of starting its own rAF.
 * That means a single place to pause when the tab is hidden, and a single
 * delta-time value everyone agrees on.
 */

const subscribers = new Set()
let last = performance.now()
let running = false
let rafId = 0
let elapsed = 0

function frame(now) {
  rafId = requestAnimationFrame(frame)
  // clamp: after a tab has been backgrounded, `now - last` can be enormous
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  elapsed += dt
  subscribers.forEach((fn) => fn(dt, elapsed))
}

export function startTicker() {
  if (running) return
  running = true
  last = performance.now()
  rafId = requestAnimationFrame(frame)
}

export function stopTicker() {
  running = false
  cancelAnimationFrame(rafId)
}

export function onTick(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopTicker()
  else startTicker()
})
