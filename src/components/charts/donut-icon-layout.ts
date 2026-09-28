/**
 * Layout for the icons around the category donut: every slice gets an icon,
 * so small neighbouring slices' icons are spread apart instead of stacking.
 */

/**
 * Middle angle (degrees) of each slice, computed exactly as Recharts' Pie does
 * for startAngle 0 / endAngle 360 with the given padding and minimum angle —
 * so the icons can be laid out before Recharts renders them one by one.
 */
export function pieMidAngles(values: number[], paddingAngle: number, minAngle: number): number[] {
  const sum = values.reduce((s, v) => s + v, 0);
  if (sum <= 0) return values.map(() => 0);
  const notZero = values.filter((v) => v !== 0).length;
  const realTotalAngle = 360 - notZero * minAngle - notZero * paddingAngle;
  const mids: number[] = [];
  let prevEnd = 0;
  values.forEach((v, i) => {
    const start = i === 0 ? 0 : prevEnd + (v !== 0 ? paddingAngle : 0);
    const end = start + (v !== 0 ? minAngle : 0) + (v / sum) * realTotalAngle;
    mids.push((start + end) / 2);
    prevEnd = end;
  });
  return mids;
}

/**
 * Spread angles (ascending, degrees) around a full circle so neighbours are at
 * least `minSep` apart, moving each as little as possible from where it
 * started. Overlapping neighbours are pushed apart symmetrically until no pair
 * is too close; if the circle can't fit them all, they share it evenly.
 */
export function spreadAngles(angles: number[], minSep: number): number[] {
  const n = angles.length;
  if (n < 2) return [...angles];
  if (n * minSep >= 360) {
    // No room to spare: space them evenly, rotated to sit closest (on
    // average) to where they want to be.
    const step = 360 / n;
    const offset = angles.reduce((s, a, i) => s + (a - i * step), 0) / n;
    return angles.map((_, i) => offset + i * step);
  }
  const sep = minSep;
  const pos = [...angles];
  for (let iter = 0; iter < 2000; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const gap = pos[j] - pos[i] + (j === 0 ? 360 : 0);
      if (gap < sep - 1e-6) {
        const push = (sep - gap) / 2;
        pos[i] -= push;
        pos[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pos;
}
