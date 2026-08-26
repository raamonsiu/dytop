import { describe, expect, it } from "vitest";
import { hexToRgbTriplet, scaleRgb } from "./color";

describe("hexToRgbTriplet", () => {
  it("parses a six-digit hex", () => {
    expect(hexToRgbTriplet("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToRgbTriplet("#000000")).toEqual([0, 0, 0]);
  });

  it("expands a three-digit hex", () => {
    expect(hexToRgbTriplet("#fff")).toEqual([1, 1, 1]);
  });

  it("works without the leading hash", () => {
    expect(hexToRgbTriplet("ffffff")).toEqual([1, 1, 1]);
  });

  it("parses the D1ITO accent", () => {
    const [r, g, b] = hexToRgbTriplet("#8806fa") ?? [];
    expect(r).toBeCloseTo(136 / 255);
    expect(g).toBeCloseTo(6 / 255);
    expect(b).toBeCloseTo(250 / 255);
  });

  it.each([
    ["rgba", "rgba(14, 16, 13, 0.46)"],
    ["a named colour", "rebeccapurple"],
    ["wrong length", "#ffff"],
    ["non-hex characters", "#gggggg"],
    ["empty", ""],
  ])("returns null for %s", (_label, input) => {
    expect(hexToRgbTriplet(input)).toBeNull();
  });
});

describe("scaleRgb", () => {
  it("scales each channel", () => {
    expect(scaleRgb([1, 0.5, 0], 0.5)).toEqual([0.5, 0.25, 0]);
  });
});
