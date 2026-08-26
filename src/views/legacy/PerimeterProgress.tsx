import { useEffect, useRef } from "react";
import { perimeterGeometry } from "@/lib/perimeter";
import { subscribeToTime } from "@/player/clock";

/**
 * The progress ring that traces the window edge.
 *
 * Written straight to the DOM from the rAF clock, like every other time-driven
 * element. The prototype needed a hand-rolled rAF tween here because a CSS
 * transition raced the 300 ms polling and made one side of the ring stutter;
 * with the clock as the single source of truth the value already arrives
 * per-frame, so there is nothing left to tween.
 */
export function PerimeterProgress({ visible }: { visible: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const trackRef = useRef<SVGRectElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const ratioRef = useRef(0);

  useEffect(() => {
    function draw() {
      const geometry = perimeterGeometry(
        window.innerWidth,
        window.innerHeight,
        ratioRef.current,
      );

      svgRef.current?.setAttribute(
        "viewBox",
        `0 0 ${window.innerWidth} ${window.innerHeight}`,
      );

      for (const rect of [trackRef.current, fillRef.current]) {
        if (!rect) continue;
        rect.setAttribute("x", String(geometry.x));
        rect.setAttribute("y", String(geometry.y));
        rect.setAttribute("width", String(geometry.width));
        rect.setAttribute("height", String(geometry.height));
      }

      if (trackRef.current) {
        trackRef.current.style.strokeDasharray = String(geometry.perimeter);
        trackRef.current.style.strokeDashoffset = "0";
      }
      if (fillRef.current) {
        fillRef.current.style.strokeDasharray = geometry.dasharray;
        fillRef.current.style.strokeDashoffset = String(geometry.dashoffset);
      }
    }

    const unsubscribe = subscribeToTime(({ current, duration }) => {
      ratioRef.current = duration > 0 ? current / duration : 0;
      draw();
    });

    // The ring is sized from the viewport, so it has to be redrawn on resize
    // even while paused.
    window.addEventListener("resize", draw);
    draw();

    return () => {
      unsubscribe();
      window.removeEventListener("resize", draw);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 size-full transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
      preserveAspectRatio="none"
    >
      <rect
        ref={trackRef}
        fill="none"
        stroke="var(--surface-border)"
        strokeWidth={3}
      />
      <rect ref={fillRef} fill="none" stroke="var(--accent)" strokeWidth={3} />
    </svg>
  );
}
