import { describe, expect, it } from "vitest";
import { pieMidAngles, spreadAngles } from "./donut-icon-layout";

const circularGaps = (a: number[]) => a.map((v, i) => (i === a.length - 1 ? a[0] + 360 - v : a[i + 1] - v));

describe("pieMidAngles", () => {
  it("matches Recharts' slice angles with padding and a minimum angle", () => {
    // 3 slices, padding 3, minAngle 4: real total = 360 - 12 - 9 = 339, so
    // slices span [0, 173.5], [176.5, 265.25], [268.25, 357].
    const mids = pieMidAngles([2, 1, 1], 3, 4);
    expect(mids[0]).toBeCloseTo((0 + 173.5) / 2);
    expect(mids[1]).toBeCloseTo((176.5 + 265.25) / 2);
    expect(mids[2]).toBeCloseTo((268.25 + 357) / 2);
  });

  it("gives even tiny slices a real angle", () => {
    const mids = pieMidAngles([1000, 1, 1], 3, 4);
    expect(mids[2] - mids[1]).toBeGreaterThanOrEqual(4 + 3 - 0.01);
  });
});

describe("spreadAngles", () => {
  it("leaves already well-spaced angles alone", () => {
    expect(spreadAngles([10, 100, 200], 20)).toEqual([10, 100, 200]);
  });

  it("pushes a cluster apart until every neighbour is far enough, keeping order", () => {
    const out = spreadAngles([100, 102, 104, 106, 108, 300], 12);
    expect(Math.min(...circularGaps(out))).toBeGreaterThanOrEqual(12 - 0.01);
    expect([...out].sort((a, b) => a - b)).toEqual(out);
    // The cluster stays centred where it was.
    expect((out[0] + out[4]) / 2).toBeCloseTo(104, 0);
  });

  it("handles a cluster that wraps past 360°", () => {
    const out = spreadAngles([2, 4, 180, 356, 358], 15);
    expect(Math.min(...circularGaps(out))).toBeGreaterThanOrEqual(15 - 0.01);
  });

  it("separates every icon for a realistic spread of 14 categories", () => {
    const values = [148000, 73000, 36220, 12961, 12494, 9118, 4185, 3583, 2642, 1500, 1000, 881, 635, 448];
    const out = spreadAngles(pieMidAngles(values, 3, 4), 11);
    expect(Math.min(...circularGaps(out))).toBeGreaterThanOrEqual(11 - 0.01);
  });

  it("shares the circle evenly when there are too many to fit", () => {
    const out = spreadAngles(Array.from({ length: 40 }, (_, i) => i), 20);
    expect(Math.min(...circularGaps(out))).toBeGreaterThanOrEqual(360 / 40 - 0.01);
  });
});
