export type RgbTriplet = [number, number, number];

/**
 * Parses `#rgb` or `#rrggbb` into components in the 0..1 range that WebGL
 * shaders expect. Returns null for anything else — including the rgba() values
 * the legacy palette uses for its glass tokens, which have no business being
 * fed to a shader.
 */
export function hexToRgbTriplet(hex: string): RgbTriplet | null {
  const value = hex.trim().replace(/^#/, "");

  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;

  return [
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255,
  ];
}

/** Scales a colour towards black. Used to dim the accent before handing it to
 * the dither, which would otherwise wash the whole screen in flat purple. */
export function scaleRgb(color: RgbTriplet, factor: number): RgbTriplet {
  return [color[0] * factor, color[1] * factor, color[2] * factor];
}
