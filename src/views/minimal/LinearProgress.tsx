import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatTime } from "@/lib/format";
import { subscribeToTime } from "@/player/clock";
import { seekTo } from "@/player/controller";

/**
 * Progress bar and clock, driven straight from the rAF clock.
 *
 * Nothing here is React state: the fill width and both time readouts are
 * written to the DOM by ref on every frame. Routing that through useState would
 * re-render this subtree ~60 times a second to move one div.
 */
export function LinearProgress() {
  const { t } = useTranslation();
  const fillRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /** Mirrors the clock so the seek handler can convert a click to seconds
   * without subscribing to state. */
  const durationRef = useRef(0);

  useEffect(
    () =>
      subscribeToTime(({ current, duration }) => {
        durationRef.current = duration;

        if (fillRef.current) {
          const ratio = duration > 0 ? Math.min(current / duration, 1) : 0;
          fillRef.current.style.transform = `scaleX(${ratio})`;
        }
        if (elapsedRef.current) {
          elapsedRef.current.textContent = formatTime(current);
        }
        if (totalRef.current) {
          // duration 0 means live or not yet known — an em dash reads better
          // than a total of 0:00 that never arrives.
          totalRef.current.textContent = duration ? formatTime(duration) : "—:—";
        }
      }),
    [],
  );

  function handleSeek(event: React.MouseEvent<HTMLDivElement>) {
    const duration = durationRef.current;
    const track = trackRef.current;
    if (!duration || !track) return;

    const { left, width } = track.getBoundingClientRect();
    const ratio = (event.clientX - left) / width;
    seekTo(Math.max(0, Math.min(1, ratio)) * duration);
  }

  return (
    <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
      <span ref={elapsedRef}>0:00</span>
      <div
        ref={trackRef}
        onClick={handleSeek}
        role="presentation"
        className="h-px flex-1 cursor-pointer bg-surface-border"
        title={t("player.seek")}
      >
        <div
          ref={fillRef}
          className="h-full origin-left bg-accent"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
      <span ref={totalRef}>—:—</span>
    </div>
  );
}
