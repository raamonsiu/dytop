import { normalizeAccent, pickAccent, SAMPLE_SIZE, type Rgb } from "./accent";

/**
 * A single reused canvas. Allocating one per sample would churn GPU-backed
 * surfaces several times a second while a video background plays.
 */
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (context) return context;

  canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  context = canvas.getContext("2d", { willReadFrequently: true });
  return context;
}

/**
 * Samples an accent colour from an image or video element.
 *
 * Returns null rather than throwing when the frame can't be read. The common
 * cause is a tainted canvas: drawing cross-origin media makes `getImageData`
 * throw a SecurityError, and a background that can't be sampled should quietly
 * leave the accent alone, not break the view.
 */
export function sampleAccent(source: HTMLImageElement | HTMLVideoElement): Rgb | null {
  const ctx = ensureCanvas();
  if (!ctx) return null;

  // A video with no decoded frame yet draws as a blank rectangle, which would
  // sample as transparent black and momentarily flatten the accent.
  if (source instanceof HTMLVideoElement && source.readyState < 2) return null;
  if (source instanceof HTMLImageElement && !source.complete) return null;

  try {
    ctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const picked = pickAccent(data);
    return picked ? normalizeAccent(picked) : null;
  } catch {
    return null;
  }
}
