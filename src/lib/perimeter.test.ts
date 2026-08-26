import { describe, expect, it } from "vitest";
import { perimeterGeometry, PERIMETER_INSET } from "./perimeter";

const WIDTH = 1000;
const HEIGHT = 600;
const INNER_W = WIDTH - PERIMETER_INSET * 2;
const INNER_H = HEIGHT - PERIMETER_INSET * 2;
const PERIMETER = 2 * (INNER_W + INNER_H);

describe("perimeterGeometry", () => {
  it("insets the rect by half the stroke width", () => {
    const geometry = perimeterGeometry(WIDTH, HEIGHT, 0);
    expect(geometry.x).toBe(PERIMETER_INSET);
    expect(geometry.y).toBe(PERIMETER_INSET);
    expect(geometry.width).toBe(INNER_W);
    expect(geometry.height).toBe(INNER_H);
    expect(geometry.perimeter).toBeCloseTo(PERIMETER);
  });

  it("draws nothing at ratio 0, starting from the top centre", () => {
    const { dasharray, dashoffset } = perimeterGeometry(WIDTH, HEIGHT, 0);
    expect(dasharray).toBe(`0 ${PERIMETER}`);
    // A zero-length dash parked exactly at the top edge's midpoint.
    expect(dashoffset).toBeCloseTo(-INNER_W / 2);
  });

  it("closes the full ring at ratio 1", () => {
    const { dasharray } = perimeterGeometry(WIDTH, HEIGHT, 1);
    expect(dasharray).toBe(`${PERIMETER} 0`);
  });

  it("stays centred on the top midpoint as it grows", () => {
    // The arc's midpoint must not drift: start + filled/2 is always topHalf.
    for (const ratio of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
      const { dasharray, dashoffset } = perimeterGeometry(WIDTH, HEIGHT, ratio);
      const filled = Number(dasharray.split(" ")[0]);
      const start = -dashoffset;
      expect(start + filled / 2).toBeCloseTo(INNER_W / 2);
    }
  });

  it("fills proportionally to the ratio", () => {
    const half = perimeterGeometry(WIDTH, HEIGHT, 0.5);
    expect(Number(half.dasharray.split(" ")[0])).toBeCloseTo(PERIMETER / 2);
  });

  it("clamps ratios outside 0..1", () => {
    // The clock can briefly report a time past the duration near a track end.
    expect(perimeterGeometry(WIDTH, HEIGHT, 1.4).dasharray).toBe(`${PERIMETER} 0`);
    expect(perimeterGeometry(WIDTH, HEIGHT, -0.2).dasharray).toBe(`0 ${PERIMETER}`);
  });

  it("never returns negative dimensions on a collapsed viewport", () => {
    // Happens on mobile browsers mid-rotation, and a negative rect width is an
    // SVG error rather than an empty ring.
    const geometry = perimeterGeometry(1, 1, 0.5);
    expect(geometry.width).toBe(0);
    expect(geometry.height).toBe(0);
    expect(geometry.perimeter).toBe(0);
  });
});
