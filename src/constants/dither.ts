/**
 * Backdrop tuning for the minimal view.
 *
 * Slower than the reactbits demo defaults: this sits behind lyrics for whole
 * songs, so it has to stay in the background.
 *
 * Brightness is controlled in two independent places, and they are not
 * interchangeable:
 *
 * - `accentFactor` scales the theme accent *before* the shader. Push it too low
 *   and the 4-level Bayer quantisation plus the shader's own 0.2 bias collapse
 *   the entire field to black — at 0.42 nothing renders at all. It has to stay
 *   high enough for the dither to land across several levels.
 * - `opacity` composites the finished layer over the background. This is the
 *   knob for "how loud", and the one to turn: at full strength the field is a
 *   wall of neon that the lyrics cannot compete with.
 */
export const DITHER_CONFIG = {
  waveSpeed: 0.028,
  waveFrequency: 3,
  waveAmplitude: 0.28,
  colorNum: 4,
  pixelSize: 2,
  accentFactor: 1,
  opacity: 0.22,
  mouseRadius: 0.8,
} as const;
