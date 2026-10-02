precision highp float;

uniform vec2 uResolution;
uniform vec3 uPage;      // the page background colour
uniform float uHover;
uniform float uScroll;   // 0..1 down the page — drives blue -> grey

// Blob centres and radii, computed on the CPU each frame.
// xy = position in 0..1 viewport space, z = radius.
uniform vec3 uBlobA;
uniform vec3 uBlobB;
uniform vec3 uBlobC;
uniform vec3 uPointerBlob;

/**
 * Soft blob with a gaussian falloff. exp() has a much gentler shoulder
 * than smoothstep, which is what keeps these reading as pools of light
 * rather than as circles.
 */
float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c) / r;
  return exp(-d * d * 1.5);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float ar = uResolution.x / uResolution.y;

  // aspect-corrected, so the blobs stay round on a wide window
  vec2 p = vec2(uv.x * ar, uv.y);
  vec2 a = vec2(uBlobA.x * ar, uBlobA.y);
  vec2 b = vec2(uBlobB.x * ar, uBlobB.y);
  vec2 c = vec2(uBlobC.x * ar, uBlobC.y);
  vec2 m = vec2(uPointerBlob.x * ar, uPointerBlob.y);

  vec3 col = uPage;

  /* Blue in the header, grey below it. One canvas covers the whole page,
     so the palette is interpolated on scroll rather than run as two
     renderers. `header` is 1 at the top and 0 once the first panel has
     risen. The grey is weaker too — it sits behind text, the header does
     not. */
  float header = 1.0 - smoothstep(0.0, 0.20, uScroll);

  vec3 cA = mix(vec3(0.62, 0.62, 0.64), vec3(0.10, 0.34, 0.96), header);
  vec3 cB = mix(vec3(0.80, 0.80, 0.83), vec3(0.26, 0.56, 1.00), header);
  vec3 cC = mix(vec3(0.30, 0.30, 0.32), vec3(0.05, 0.15, 0.58), header);
  vec3 cM = mix(vec3(0.88, 0.88, 0.91), vec3(0.36, 0.64, 1.00), header);

  col += blob(p, a, uBlobA.z) * cA * mix(0.38, 0.82, header);
  col += blob(p, b, uBlobB.z) * cB * mix(0.24, 0.60, header);
  col += blob(p, c, uBlobC.z) * cC * mix(0.42, 0.88, header);

  // the interactive one — brighter and tighter, so it reads as a light you
  // are carrying rather than another background shape
  col += blob(p, m, uPointerBlob.z) * cM * mix(0.32, 0.54, header) * uHover;

  // vignette so the edges settle back into the page
  float v = 1.0 - 0.28 * length((uv - 0.5) * vec2(1.05, 1.0));
  col *= v;

  // Ordered dither. Smooth dark gradients band badly on 8-bit panels and a
  // sub-LSB of noise is the standard fix.
  float n = fract(dot(gl_FragCoord.xy, vec2(0.0983, 0.0719)) * 43.17);
  col += (n - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
