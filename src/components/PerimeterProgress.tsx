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
      const svg = svgRef.current;
      if (!svg) return;

      // Measured from the element rather than window.innerWidth: the root is
      // counter-scaled with CSS zoom to resist zoom-out (useZoomCompensation),
      // and under that the window's CSS pixels no longer match this element's
      // own coordinate space, the ring would be drawn to the wrong size.
      const { width, height } = svg.getBoundingClientRect();
      const geometry = perimeterGeometry(width, height, ratioRef.current);

      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

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

    // Redraws whenever its own box changes: window resize, the zoom
    // compensation kicking in, or any other reflow, including while playback
    // is paused and the clock is quiet.
    const observer = new ResizeObserver(draw);
    if (svgRef.current) observer.observe(svgRef.current);
    draw();

    return () => {
      unsubscribe();
      observer.disconnect();
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
