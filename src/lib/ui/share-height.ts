/**
 * Splits `space` (px) between lists that would each like their natural height.
 * A list that needs less than an even share keeps only what it needs and the
 * rest goes to the longer ones; nobody drops below `min` (or their natural
 * height, if that is smaller) — when even those minimums don't fit, they are
 * returned as they are and the page scrolls instead.
 */
export function shareHeight(naturals: number[], space: number, min: number): number[] {
  const out = naturals.map((n) => Math.min(n, min));
  let remaining = space - out.reduce((a, b) => a + b, 0);
  let wanting = naturals.map((_, i) => i).filter((i) => out[i] < naturals[i]);
  while (remaining >= 1 && wanting.length > 0) {
    const share = remaining / wanting.length;
    const next: number[] = [];
    for (const i of wanting) {
      const give = Math.min(share, naturals[i] - out[i]);
      out[i] += give;
      remaining -= give;
      if (naturals[i] - out[i] >= 1) next.push(i);
    }
    wanting = next;
  }
  return out.map((h) => Math.floor(h));
}
