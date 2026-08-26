import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { subscribeToTime } from "@/player/clock";
import { seekTo } from "@/player/controller";

/** Seconds moved per arrow key, and per Page key. */
const ARROW_STEP_SECONDS = 5;
const PAGE_STEP_SECONDS = 30;

interface ProgressSliderProps {
  className?: string;
  /** Legacy wants a chunkier bar than the hairline D1 uses. */
  thick?: boolean;
}

/**
 * Scrubbable playback position.
 *
 * The visible bar stays thin, but the pointer target is the full padded height
 * around it — a 1px line is close to impossible to hit deliberately, and
 * widening the line itself would wreck the restraint of the minimal view. The
 * padding is the hit area; the bar is only the paint.
 *
 * Dragging updates the fill locally and commits a single seek on release.
 * Seeking on every pointer move would fire dozens of cross-frame calls into the
 * YouTube player for one gesture, and it stutters badly.
 */
export function ProgressSlider({ className, thick = false }: ProgressSliderProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const durationRef = useRef(0);
  const currentRef = useRef(0);
  /** While true the clock must not repaint the fill, or the bar snaps back to
   * the playhead under the user's finger. */
  const draggingRef = useRef(false);

  const paint = (ratio: number) => {
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
    }
  };

  useEffect(
    () =>
      subscribeToTime(({ current, duration }) => {
        durationRef.current = duration;
        currentRef.current = current;

        const root = rootRef.current;
        if (root) {
          root.setAttribute("aria-valuemax", String(Math.round(duration)));
          root.setAttribute("aria-valuenow", String(Math.round(current)));
          root.setAttribute("aria-valuetext", formatTime(current));
        }

        if (!draggingRef.current) {
          paint(duration > 0 ? current / duration : 0);
        }
      }),
    [],
  );

  const ratioFromEvent = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track || durationRef.current <= 0) return null;
    const { left, width } = track.getBoundingClientRect();
    if (width === 0) return null;
    return Math.min(Math.max((clientX - left) / width, 0), 1);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromEvent(event.clientX);
    if (ratio === null) return;

    draggingRef.current = true;
    paint(ratio);
    // Capture so the drag keeps tracking after the pointer leaves the element,
    // which it will — the bar is a few pixels tall and hands are not precise.
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const ratio = ratioFromEvent(event.clientX);
    if (ratio !== null) paint(ratio);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);

    const ratio = ratioFromEvent(event.clientX);
    if (ratio !== null) seekTo(ratio * durationRef.current);
  };

  const nudge = (seconds: number) => {
    const duration = durationRef.current;
    if (duration <= 0) return;
    const next = Math.min(Math.max(currentRef.current + seconds, 0), duration);
    paint(next / duration);
    seekTo(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowRight: ARROW_STEP_SECONDS,
      ArrowLeft: -ARROW_STEP_SECONDS,
      PageUp: PAGE_STEP_SECONDS,
      PageDown: -PAGE_STEP_SECONDS,
    };

    if (event.key in steps) {
      event.preventDefault();
      nudge(steps[event.key] ?? 0);
    } else if (event.key === "Home") {
      event.preventDefault();
      nudge(-Number.MAX_SAFE_INTEGER);
    } else if (event.key === "End") {
      event.preventDefault();
      nudge(Number.MAX_SAFE_INTEGER);
    }
  };

  return (
    <div
      ref={rootRef}
      role="slider"
      tabIndex={0}
      aria-label={t("player.seek")}
      aria-valuemin={0}
      aria-valuemax={0}
      aria-valuenow={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        // The padding is the point: it triples the grabbable height without
        // changing anything you can see.
        "group/slider relative flex cursor-pointer touch-none items-center py-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
        className,
      )}
    >
      <div
        ref={trackRef}
        className={cn(
          "relative w-full rounded-full bg-surface-border transition-[height]",
          thick ? "h-1" : "h-px group-hover/slider:h-0.5",
        )}
      >
        <div
          ref={fillRef}
          className="h-full origin-left rounded-full bg-accent"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
