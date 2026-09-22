export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Downscale target for sampling. 48×48 is 2304 pixels: enough to find the
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
 * Hue is kept: that's the part that ties the interface to the image, while
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

/**
 * Average colour of the centre of a square RGBA sample: the middle 40% of rows
 * and 60% of columns, which is roughly where legacy centres its lyrics.
 * Returns null when every pixel there is (near) transparent.
 */
export function centreColour(data: Uint8ClampedArray, size: number): Rgb | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = Math.floor(size * 0.3); y < Math.ceil(size * 0.7); y++) {
    for (let x = Math.floor(size * 0.2); x < Math.ceil(size * 0.8); x++) {
      const i = (y * size + x) * 4;
      if ((data[i + 3] ?? 0) < 200) continue;
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
      count++;
    }
  }

  if (!count) return null;
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

/** Luma (0–1) of a gamma-encoded colour. */
export function luma({ r, g, b }: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * The background's own centre colour, pushed down in lightness so white text
 * reads over it. Saturation gets a slight lift because darkening alone turns
 * most tones muddy.
 */
export function lyricsScrimColour(centre: Rgb): Rgb {
  const [hue, saturation, lightness] = rgbToHsl(centre);
  return hslToRgb(hue, Math.min(1, saturation * 1.15), lightness * 0.45);
}

export const LYRICS_SCRIM_MIN = 0.15;
export const LYRICS_SCRIM_MAX = 0.55;

/**
 * Opacity of the tinted scrim behind the lyrics for a given centre luma. Dark
 * backgrounds keep a barely-there floor; from mid-grey up it ramps linearly so
 * white text holds its contrast on a bright photo.
 */
export function lyricsScrimFor(luminance: number): number {
  const t = Math.min(1, Math.max(0, (luminance - 0.25) / 0.5));
  return LYRICS_SCRIM_MIN + (LYRICS_SCRIM_MAX - LYRICS_SCRIM_MIN) * t;
}
