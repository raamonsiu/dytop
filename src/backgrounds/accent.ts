export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Used when nothing can be sampled: a tainted canvas, a video that hasn't
 * decoded a frame yet, or a fully transparent image. */
export const FALLBACK_ACCENT: Rgb = { r: 200, g: 224, b: 106 };

/** Downscale target for sampling. 48×48 is 2304 pixels — enough to find the
 * dominant colour, small enough to redo several times a second for video. */
export const SAMPLE_SIZE = 48;

export function rgbToHsl({ r, g, b }: Rgb): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) return [0, 0, lightness];

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue: number;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return [hue / 6, saturation, lightness];
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

/**
 * Picks the most accent-worthy pixel out of sampled image data.
 *
 * Scores saturation weighted by how close the pixel is to mid-lightness, so a
 * near-black shadow or a blown-out highlight can't win just by being common.
 * Nearly transparent pixels are skipped: their colour is whatever happened to
 * be in the buffer.
 *
 * Returns null when there was nothing to look at, letting the caller decide
 * between a fallback and keeping the current accent.
 */
export function pickAccent(data: Uint8ClampedArray): Rgb | null {
  let bestScore = -1;
  let best: Rgb | null = null;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0;
    if (alpha < 200) continue;

    const pixel: Rgb = { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 };
    const [, saturation, lightness] = rgbToHsl(pixel);

    // Peaks at l = 0.55 and falls off either side; floored so a fully
    // desaturated image still yields its least-extreme pixel instead of none.
    const lightnessScore = 1 - Math.abs(lightness - 0.55) * 1.6;
    const score = saturation * Math.max(lightnessScore, 0.05);

    if (score > bestScore) {
      bestScore = score;
      best = pixel;
    }
  }

  return best;
}

/**
 * Forces a sampled colour into a range that works as UI text and glow.
 *
 * Hue is kept — that's the part that ties the interface to the image — while
 * saturation gets a floor and lightness is pinned. Without this, a background
 * that's mostly dark navy yields an accent invisible against the panels.
 */
export function normalizeAccent(color: Rgb): Rgb {
  const [hue, saturation] = rgbToHsl(color);
  return hslToRgb(hue, Math.max(saturation, 0.45), 0.62);
}

export function toCssRgb({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}
