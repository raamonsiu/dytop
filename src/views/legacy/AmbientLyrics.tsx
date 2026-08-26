import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { usePref } from "@/lib/prefs";
import { findActiveLine } from "@/lyrics/findActiveLine";
import { useLyrics } from "@/lyrics/lyricsStore";
import { subscribeToTime } from "@/player/clock";

/**
 * Legacy's lyric display: large, centred, and scaled rather than the minimal
 * view's flat opacity ladder — this is the "look at the screen" mode.
 */
export function AmbientLyrics() {
  const { t } = useTranslation();
  const lyrics = useLyrics();
  const delay = usePref("lyricsDelay");
  const enabled = usePref("lyricsVisible");
  const [activeIndex, setActiveIndex] = useState(-1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  const lines = lyrics.status === "synced" ? lyrics.lines : null;

  useEffect(() => {
    if (!lines || !enabled) return;

    return subscribeToTime(({ current }) => {
      const next = findActiveLine(lines, current + delay);
      setActiveIndex((previous) => (previous === next ? previous : next));
    });
  }, [lines, delay, enabled]);

  useLayoutEffect(() => {
    const column = columnRef.current;
    const viewport = viewportRef.current;
    const active = activeLineRef.current;
    if (!column || !viewport) return;

    const offset = active
      ? active.offsetTop + active.offsetHeight / 2 - viewport.clientHeight / 2
      : 0;
    column.style.transform = `translateY(${-offset}px)`;
  }, [activeIndex, lines, enabled]);

  if (!enabled || lyrics.status === "idle") return null;

  if (lyrics.status === "loading" || lyrics.status === "not-found" || lyrics.status === "error") {
    return (
      <p className="grid h-full place-items-center text-xs uppercase tracking-widest text-muted-foreground">
        {t(`lyrics.${lyrics.status === "loading" ? "loading" : lyrics.status === "error" ? "error" : "notFound"}`)}
      </p>
    );
  }

  if (lyrics.status === "plain") {
    return (
      <div className="h-full overflow-y-auto px-8 py-12">
        <p className="mx-auto max-w-3xl whitespace-pre-line text-center text-xl leading-loose text-foreground/75">
          {lyrics.text}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="relative h-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
      }}
    >
      <div
        ref={columnRef}
        className="absolute inset-x-0 top-1/2 transition-transform duration-700 ease-out"
      >
        {lyrics.lines.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          return (
            <p
              key={`${line.time}-${index}`}
              aria-current={isActive}
              ref={isActive ? activeLineRef : null}
              className={cn(
                "mx-auto max-w-4xl px-8 py-3 text-center leading-tight transition-all duration-500",
                "text-[clamp(1.25rem,3.4vw,2.6rem)]",
                isActive && "scale-100 text-foreground opacity-100",
                !isActive && isPast && "scale-[0.96] opacity-25",
                !isActive && !isPast && "scale-[0.96] opacity-40",
              )}
              style={{ textShadow: isActive ? "0 2px 24px rgba(0,0,0,0.6)" : undefined }}
            >
              {line.text || "♪"}
            </p>
          );
        })}
      </div>
    </div>
  );
}
