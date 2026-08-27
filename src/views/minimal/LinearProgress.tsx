import { useEffect, useRef } from "react";
import { ProgressSlider } from "@/components/ProgressSlider";
import { formatTime } from "@/lib/format";
import { subscribeToTime } from "@/player/clock";

/**
 * Elapsed / total either side of a scrubbable bar.
 *
 * The readouts are written to the DOM by ref on every frame: routing them
 * through state would re-render this subtree ~60 times a second to change two
 * short strings.
 */
export function LinearProgress() {
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribeToTime(({ current, duration }) => {
        if (elapsedRef.current) {
          elapsedRef.current.textContent = formatTime(current);
        }
        if (totalRef.current) {
          // duration 0 means live or not yet known: a dash reads better
          // than a total of 0:00 that never arrives.
          totalRef.current.textContent = duration ? formatTime(duration) : "-:-";
        }
      }),
    [],
  );

  return (
    <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
      <span ref={elapsedRef}>0:00</span>
      <ProgressSlider className="flex-1" />
      <span ref={totalRef}>-:-</span>
    </div>
  );
}
