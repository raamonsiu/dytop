import { clamp } from "@/lib/clamp";

/** Half the stroke width, so the stroke sits flush against the viewport edge
 * instead of being clipped in half by it. */
export const PERIMETER_INSET = 1.5;

export interface PerimeterGeometry {
  /** Rect attributes, inset so the stroke stays on screen. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Total path length of the rect outline. */
  perimeter: number;
  dasharray: string;
  dashoffset: number;
}

/**
 * Geometry for the progress ring that traces the viewport edge.
 *
 * An SVG <rect> path starts at the top-left corner and runs clockwise, so a
 * naive dash would grow from the corner. The ring is meant to read like a
 * clock: one arc centred on the top edge's midpoint, growing symmetrically in
 * both directions and closing at the bottom-centre when the track ends.
 *
 * That's done with a dash of length `filled` followed by a gap for the rest,
 * shifted so the dash begins at `topHalf - filled / 2`. `stroke-dashoffset`
 * expresses "start at position X" as `-X`.
 */
export function perimeterGeometry(
  viewportWidth: number,
  viewportHeight: number,
  ratio: number,
): PerimeterGeometry {
  const innerWidth = Math.max(0, viewportWidth - PERIMETER_INSET * 2);
  const innerHeight = Math.max(0, viewportHeight - PERIMETER_INSET * 2);

  const perimeter = 2 * (innerWidth + innerHeight);
  const topHalf = innerWidth / 2;

  const clamped = clamp(ratio, 0, 1);
  const filled = perimeter * clamped;

  return {
    x: PERIMETER_INSET,
    y: PERIMETER_INSET,
    width: innerWidth,
    height: innerHeight,
    perimeter,
    dasharray: `${filled} ${perimeter - filled}`,
    dashoffset: -(topHalf - filled / 2),
  };
}
