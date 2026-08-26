import { lazy, Suspense, useMemo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DITHER_CONFIG } from "@/constants/dither";
import { hexToRgbTriplet, scaleRgb, type RgbTriplet } from "@/lib/color";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { usePref } from "@/lib/prefs";
import { resolveTheme } from "@/themes/themes";

/**
 * Loaded on demand. This one import is what pulls in three, react-three-fiber
 * and postprocessing — more bytes than the rest of the app combined — and the
 * legacy view must never pay for it.
 */
const Dither = lazy(() => import("./vendor/Dither"));

/** Flat theme background: the fallback while the chunk loads, and the
 * permanent state if WebGL is unavailable. */
function FlatBackdrop() {
  return <div className="size-full bg-background" />;
}

export function DitherBackground() {
  const scheme = usePref("colorScheme");
  const prefersReducedMotion = usePrefersReducedMotion();

  const waveColor = useMemo<RgbTriplet>(() => {
    const accent = hexToRgbTriplet(resolveTheme("minimal", scheme).accent);
    // The palette could carry a non-hex accent; mid grey keeps the backdrop
    // rendering rather than throwing inside the shader.
    if (!accent) return [0.5, 0.5, 0.5];
    return scaleRgb(accent, DITHER_CONFIG.accentFactor);
  }, [scheme]);

  return (
    <ErrorBoundary fallback={<FlatBackdrop />}>
      <Suspense fallback={<FlatBackdrop />}>
        <Dither
          waveColor={waveColor}
          waveSpeed={DITHER_CONFIG.waveSpeed}
          waveFrequency={DITHER_CONFIG.waveFrequency}
          waveAmplitude={DITHER_CONFIG.waveAmplitude}
          colorNum={DITHER_CONFIG.colorNum}
          pixelSize={DITHER_CONFIG.pixelSize}
          mouseRadius={DITHER_CONFIG.mouseRadius}
          // A full-screen animated field is exactly what reduced-motion is
          // about; freeze the wave but keep the texture.
          disableAnimation={prefersReducedMotion}
          enableMouseInteraction={!prefersReducedMotion}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
