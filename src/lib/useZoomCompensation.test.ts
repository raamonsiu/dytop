import { describe, expect, it } from "vitest";
import { compensationFor } from "./useZoomCompensation";

const BASE = 1;

describe("compensationFor", () => {
  it("leaves the UI alone at the baseline zoom", () => {
    expect(compensationFor(1, BASE)).toBe(1);
  });

  it("leaves zooming in alone", () => {
    // Asking for a bigger UI and getting one is correct behaviour.
    expect(compensationFor(1.5, BASE)).toBe(1);
    expect(compensationFor(2, BASE)).toBe(1);
  });

  it("ignores a small zoom-out, which is usually deliberate", () => {
    expect(compensationFor(0.9, BASE)).toBe(1);
    expect(compensationFor(0.8, BASE)).toBe(1);
  });

  it("scales up once zoomed out past the threshold", () => {
    // 67% zoom halves nothing yet, but 10px labels are already marginal.
    expect(compensationFor(0.67, BASE)).toBeCloseTo(1 / 0.67, 5);
    expect(compensationFor(0.5, BASE)).toBeCloseTo(1.8, 5);
  });

  it("caps the compensation", () => {
    // Without a ceiling, extreme zoom-out would scale the UI up so far that
    // zooming out stops doing anything at all.
    expect(compensationFor(0.25, BASE)).toBe(1.8);
    expect(compensationFor(0.05, BASE)).toBe(1.8);
  });

  it("works from a retina baseline", () => {
    // On a 2x display, 50% zoom reports 1 — that is zoom-out, not native scale.
    expect(compensationFor(1, 2)).toBeCloseTo(1.8, 5);
    expect(compensationFor(2, 2)).toBe(1);
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("returns 1 for a %s ratio", (_label, dpr) => {
    expect(compensationFor(dpr, BASE)).toBe(1);
  });
});
