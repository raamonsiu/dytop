/**
 * Backdrop tuning for the minimal view.
 *
 * Slower and dimmer than the reactbits demo defaults: this sits behind lyrics
 * for whole songs, so it has to stay in the background. `accentFactor` scales
 * the theme accent before it reaches the shader — the accent at full strength
 * floods the screen with flat purple and kills the contrast the lyrics rely on.
 */
export const DITHER_CONFIG = {
  waveSpeed: 0.028,
  waveFrequency: 3,
  waveAmplitude: 0.28,
  colorNum: 4,
  pixelSize: 2,
  accentFactor: 1,
  mouseRadius: 0.8,
} as const;
