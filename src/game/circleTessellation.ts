const sizes = [8, 12, 16, 24, 32, 48, 64, 96, 128, 192] as const;
const rings = new Map<number, Float64Array>();
/** Less than .25 world-pixel chord error, including high-DPI small particles. */
export function circleRing(radius: number) {
  const wanted = Math.ceil(
    Math.PI * Math.sqrt(Math.max(1, Math.abs(radius)) * 2),
  );
  const count = sizes.find((n) => n >= wanted) || 192;
  let ring = rings.get(count);
  if (!ring) {
    ring = new Float64Array((count + 1) * 2);
    for (let i = 0; i <= count; i++) {
      ring[i * 2] = Math.cos((i / count) * Math.PI * 2);
      ring[i * 2 + 1] = Math.sin((i / count) * Math.PI * 2);
    }
    rings.set(count, ring);
  }
  return ring;
}

export function arcSpan(start: number, end: number, anticlockwise = false) {
  const tau = Math.PI * 2;
  let span = end - start;
  if (anticlockwise) {
    if (span < -tau) span = -tau;
    else if (span > 0) span = -tau + (span % tau);
  } else if (span > tau) span = tau;
  else if (span < 0) span = tau + (span % tau);
  return span;
}
