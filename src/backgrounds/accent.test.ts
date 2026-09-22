import { describe, expect, it } from "vitest";
import {
  centreColour,
  hslToRgb,
  luma,
  LYRICS_SCRIM_MAX,
  LYRICS_SCRIM_MIN,
  lyricsScrimColour,
  lyricsScrimFor,
  normalizeAccent,
  pickAccent,
  rgbToHsl,
} from "./accent";

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

describe("centreColour", () => {
  /** A size×size buffer where the centre region is `centre` and the rest `edge`. */
  function framed(size: number, centre: number[], edge: number[]): Uint8ClampedArray {
    const pixels: number[][] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inside = y >= size * 0.3 && y < size * 0.7 && x >= size * 0.2 && x < size * 0.8;
        pixels.push(inside ? centre : edge);
      }
    }
    return imageData(pixels);
  }

  it("reads only the centre, ignoring a dark frame around it", () => {
    const colour = centreColour(framed(10, [240, 200, 160, 255], [0, 0, 0, 255]), 10);
    expect(colour).toEqual({ r: 240, g: 200, b: 160 });
  });

  it("returns null when the centre is transparent", () => {
    expect(centreColour(framed(10, [255, 255, 255, 0], [0, 0, 0, 255]), 10)).toBeNull();
  });
});

describe("lyricsScrimColour", () => {
  it("keeps the hue but lands dark enough under white text", () => {
    const source = { r: 244, g: 217, b: 184 }; // light cream
    const [sourceHue] = rgbToHsl(source);
    const scrim = lyricsScrimColour(source);
    const [hue] = rgbToHsl(scrim);
    expect(hue).toBeCloseTo(sourceHue, 1);
    expect(luma(scrim)).toBeLessThan(0.45);
  });
});

describe("lyricsScrimFor", () => {
  it("keeps the floor on dark backgrounds", () => {
    expect(lyricsScrimFor(0.1)).toBe(LYRICS_SCRIM_MIN);
  });

  it("reaches the ceiling on bright backgrounds", () => {
    expect(lyricsScrimFor(0.95)).toBe(LYRICS_SCRIM_MAX);
  });

  it("ramps in between", () => {
    const mid = lyricsScrimFor(0.5);
    expect(mid).toBeGreaterThan(LYRICS_SCRIM_MIN);
    expect(mid).toBeLessThan(LYRICS_SCRIM_MAX);
  });
});
