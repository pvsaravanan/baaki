import { describe, expect, it } from "vitest";
import { shareHeight } from "./share-height";

describe("shareHeight", () => {
  it("gives every list its natural height when they all fit", () => {
    expect(shareHeight([300, 200, 100], 1000, 100)).toEqual([300, 200, 100]);
  });

  it("lets a short list keep what it needs and gives the rest to the long one", () => {
    // 600 to share: the short list needs 60, so the long one gets 540.
    expect(shareHeight([900, 60], 600, 100)).toEqual([540, 60]);
  });

  it("splits evenly between lists that are all longer than their share", () => {
    expect(shareHeight([900, 900, 900], 600, 100)).toEqual([200, 200, 200]);
  });

  it("never goes below the minimum, even when that overflows the space", () => {
    expect(shareHeight([900, 900, 900], 150, 100)).toEqual([100, 100, 100]);
  });

  it("does not stretch a list past its natural height", () => {
    expect(shareHeight([40], 500, 100)).toEqual([40]);
  });

  it("handles no lists", () => {
    expect(shareHeight([], 500, 100)).toEqual([]);
  });

  it("hands leftover space on in rounds", () => {
    // Evenly 300 each; the 150 one is capped, so the other two split its spare 150.
    expect(shareHeight([800, 150, 800], 900, 100)).toEqual([375, 150, 375]);
  });
});
