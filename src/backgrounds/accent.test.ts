import { describe, expect, it } from "vitest";
import { hslToRgb, normalizeAccent, pickAccent, rgbToHsl } from "./accent";

/** Builds sampled image data from a list of RGBA pixels. */
function imageData(pixels: number[][]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat());
}

describe("rgbToHsl", () => {
  it("reports greys as unsaturated", () => {
    const [, saturation] = rgbToHsl({ r: 128, g: 128, b: 128 });
    expect(saturation).toBe(0);
  });

  it("round-trips through hslToRgb", () => {
    for (const color of [
      { r: 200, g: 224, b: 106 },
      { r: 136, g: 6, b: 250 },
      { r: 12, g: 200, b: 180 },
    ]) {
      const [h, s, l] = rgbToHsl(color);
      const back = hslToRgb(h, s, l);
      expect(back.r).toBeCloseTo(color.r, -0.5);
      expect(back.g).toBeCloseTo(color.g, -0.5);
      expect(back.b).toBeCloseTo(color.b, -0.5);
    }
  });
});

describe("pickAccent", () => {
  it("returns null when every pixel is transparent", () => {
    expect(pickAccent(imageData([[255, 0, 0, 0], [0, 255, 0, 10]]))).toBeNull();
  });

  it("prefers a saturated mid-lightness pixel over a dark one", () => {
    const picked = pickAccent(
      imageData([
        [10, 0, 0, 255], // near-black red: saturated but far too dark
        [220, 60, 60, 255], // the one a person would call the accent
      ]),
    );
    expect(picked).toEqual({ r: 220, g: 60, b: 60 });
  });

  it("prefers a saturated pixel over a blown-out highlight", () => {
    const picked = pickAccent(
      imageData([
        [252, 250, 250, 255], // near-white
        [40, 160, 200, 255],
      ]),
    );
    expect(picked).toEqual({ r: 40, g: 160, b: 200 });
  });

  it("skips pixels below the alpha threshold", () => {
    const picked = pickAccent(
      imageData([
        [255, 0, 255, 199], // just under the cutoff
        [80, 120, 140, 255],
      ]),
    );
    expect(picked).toEqual({ r: 80, g: 120, b: 140 });
  });

  it("still returns something for a fully grey image", () => {
    // The lightness score is floored, so a desaturated image yields its
    // least-extreme pixel rather than nothing at all.
    expect(pickAccent(imageData([[128, 128, 128, 255]]))).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });
});

describe("normalizeAccent", () => {
  it("lifts a near-black colour into a usable range", () => {
    const [, , lightness] = rgbToHsl(normalizeAccent({ r: 8, g: 0, b: 20 }));
    expect(lightness).toBeCloseTo(0.62, 1);
  });

  it("gives a grey enough saturation to read as a colour", () => {
    const [, saturation] = rgbToHsl(normalizeAccent({ r: 128, g: 128, b: 128 }));
    expect(saturation).toBeGreaterThanOrEqual(0.44);
  });

  it("keeps the hue, which is what ties the UI to the image", () => {
    const source = { r: 30, g: 90, b: 20 };
    const [sourceHue] = rgbToHsl(source);
    const [resultHue] = rgbToHsl(normalizeAccent(source));
    expect(resultHue).toBeCloseTo(sourceHue, 1);
  });
});
