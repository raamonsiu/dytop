import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { usePref } from "@/lib/prefs";
import { useActiveLyricsLine } from "@/lyrics/useActiveLyricsLine";
import { useCentredColumn } from "@/lyrics/useCentredColumn";
import { useLyrics } from "@/lyrics/lyricsStore";

/**
 * Opacity by distance from the current line. The active line is the only fully
 * opaque thing on screen; everything else recedes. This ladder is the whole
 * visual idea of the minimal view, so it lives here as data rather than as a
 * pile of conditional classes.
 */
const OPACITY_BY_DISTANCE = [1, 0.45, 0.28, 0.16, 0.08];
const FAINTEST_OPACITY = 0.04;

function opacityForDistance(distance: number): number {
  return OPACITY_BY_DISTANCE[distance] ?? FAINTEST_OPACITY;
}

export function LyricsColumn() {
  const { t } = useTranslation();
  const lyrics = useLyrics();
  const delay = usePref("lyricsDelay");

  const lines = lyrics.status === "synced" ? lyrics.lines : null;
  const activeIndex = useActiveLyricsLine(lines, delay);
  const { columnRef, activeLineRef } = useCentredColumn<
    HTMLDivElement,
    HTMLParagraphElement
  >([activeIndex, lines]);

  if (lyrics.status === "idle") return null;

  if (lyrics.status === "loading") {
    return <Status text={t("lyrics.loading")} />;
  }

  if (lyrics.status === "not-found") {
    return <Status text={t("lyrics.notFound")} />;
  }

  if (lyrics.status === "error") {
    return <Status text={t("lyrics.error")} />;
  }

  if (lyrics.status === "plain") {
    return (
      <div className="h-full overflow-y-auto px-6">
        <p className="mx-auto max-w-2xl whitespace-pre-line text-center text-sm leading-loose text-foreground/70">
          {lyrics.text}
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative h-full overflow-hidden"
      // Fades the ends instead of cutting them, so lines enter and leave
      // rather than popping at a hard edge.
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
      }}
    >
      <div
        ref={columnRef}
        className="absolute inset-x-0 top-1/2 transition-transform duration-500 ease-out"
      >
        {lyrics.lines.map((line, index) => {
          const isActive = index === activeIndex;
          return (
            <p
              key={`${line.time}-${index}`}
              ref={isActive ? activeLineRef : null}
              aria-current={isActive}
              style={{ opacity: opacityForDistance(Math.abs(index - activeIndex)) }}
              className={cn(
                "mx-auto max-w-2xl px-6 py-2 text-center font-mono text-lg leading-snug transition-opacity duration-500",
                isActive ? "text-foreground" : "text-foreground",
              )}
            >
              {/* An empty line is an instrumental gap, not a missing lyric. */}
              {line.text || "♪"}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function Status({ text }: { text: string }) {
  return (
    <p className="grid h-full place-items-center text-xs uppercase tracking-widest text-muted-foreground">
      {text}
    </p>
  );
}
