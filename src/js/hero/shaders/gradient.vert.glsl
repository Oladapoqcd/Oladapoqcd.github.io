// The geometry is a plane spanning -1..1, which is already clip space, so
// the vertex stage is a straight pass-through — no camera, no matrices.
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
