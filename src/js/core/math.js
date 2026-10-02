export const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v)

export const lerp = (a, b, t) => a + (b - a) * t

/**
 * Frame-rate independent easing. A plain `a += (b - a) * 0.1` moves twice as
 * fast on a 120Hz screen as on a 60Hz one; this does not.
 */
export const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt))

export const smoothstep = (v) => {
  const x = clamp(v)
  return x * x * (3 - 2 * x)
}

/** Cubic ease-out, used for the intro resolve. */
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3)
