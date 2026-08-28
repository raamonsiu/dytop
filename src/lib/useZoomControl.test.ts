import { afterEach, describe, expect, it } from "vitest";
import { MAX_UI_SCALE, MIN_UI_SCALE, nextScale, prefersNoForcedZoom } from "./useZoomControl";

describe("nextScale", () => {
  it("grows when zooming in and shrinks when zooming out", () => {
    expect(nextScale(1, "in")).toBeGreaterThan(1);
    expect(nextScale(1, "out")).toBeLessThan(1);
  });

  it("returns to the starting point after a step each way", () => {
    expect(nextScale(nextScale(1, "in"), "out")).toBeCloseTo(1, 10);
  });

  it("never exceeds the maximum, however many steps", () => {
    let scale = 1;
    for (let i = 0; i < 50; i++) scale = nextScale(scale, "in");
    expect(scale).toBe(MAX_UI_SCALE);
  });

  it("never drops below the minimum, however many steps", () => {
    let scale = 1;
    for (let i = 0; i < 50; i++) scale = nextScale(scale, "out");
    expect(scale).toBe(MIN_UI_SCALE);
  });

  it("reports no change once pinned at a bound", () => {
    // The hook uses this equality to skip redundant style writes.
    expect(nextScale(MAX_UI_SCALE, "in")).toBe(MAX_UI_SCALE);
    expect(nextScale(MIN_UI_SCALE, "out")).toBe(MIN_UI_SCALE);
  });

  it("still moves back inward from a bound", () => {
    expect(nextScale(MAX_UI_SCALE, "out")).toBeLessThan(MAX_UI_SCALE);
    expect(nextScale(MIN_UI_SCALE, "in")).toBeGreaterThan(MIN_UI_SCALE);
  });

  it("keeps the bounds either side of neutral", () => {
    expect(MIN_UI_SCALE).toBeLessThan(1);
    expect(MAX_UI_SCALE).toBeGreaterThan(1);
  });
});

describe("prefersNoForcedZoom", () => {
  afterEach(() => {
    // @ts-expect-error jsdom defines no matchMedia; each test restores its own stub.
    delete window.matchMedia;
  });

  it("is true when the primary pointer is coarse (touch)", () => {
    window.matchMedia = ((query: string) =>
      ({ matches: query.includes("coarse") }) as MediaQueryList) as typeof window.matchMedia;
    expect(prefersNoForcedZoom()).toBe(true);
  });

  it("is false when the primary pointer is fine (mouse/trackpad)", () => {
    window.matchMedia = (() => ({ matches: false }) as MediaQueryList) as typeof window.matchMedia;
    expect(prefersNoForcedZoom()).toBe(false);
  });

  it("is false when matchMedia isn't available at all", () => {
    expect(prefersNoForcedZoom()).toBe(false);
  });
});
