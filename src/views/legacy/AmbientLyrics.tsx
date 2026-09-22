import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { usePref } from "@/lib/prefs";
import { useActiveLyricsLine } from "@/lyrics/useActiveLyricsLine";
import { useCentredColumn } from "@/lyrics/useCentredColumn";
import { useLyrics } from "@/lyrics/lyricsStore";
import { LYRICS_SCRIM_MIN } from "@/backgrounds/accent";

const LYRICS_SHADOW =
  "0 1px 2px rgb(0 0 0 / 0.35), 0 2px 12px rgb(0 0 0 / 0.25), 0 0 32px rgb(0 0 0 / 0.2)";

// The active line glows in its own white, over the same soft shadow so it still
// separates from a light background.
const ACTIVE_LYRICS_SHADOW = `0 0 12px rgb(255 255 255 / 0.55), ${LYRICS_SHADOW}`;

// Material's FastOutSlowIn, which the Apple-style lyric UIs animate on.
const LINE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const LINE_TRANSITION = [
  `opacity 250ms ${LINE_EASE}`,
  `transform 400ms ${LINE_EASE}`,
  `filter 600ms ${LINE_EASE}`,
  `text-shadow 300ms ${LINE_EASE}`,
].join(", ");

/** Opacity by distance from the active line: a soft curve rather than past/future steps. */
function lineOpacity(distance: number): number {
  if (distance === 0) return 1;
  if (distance === 1) return 0.75;
  if (distance === 2) return 0.5;
  if (distance === 3) return 0.3;
  return 0.2;
}

/** Blur by distance: the neighbours stay sharp, the far edges of the column go soft. */
function lineBlur(distance: number): number {
  if (distance <= 2) return 0;
  if (distance === 3) return 2;
  if (distance === 4) return 4;
  return 6;
}

/**
 * Deepens the middle of the screen behind the lyrics in the background's own
 * (darkened) centre colour, so it reads as the image shading rather than a
 * black blob. Opacity follows the sampled brightness; both it and the colour
 * (a registered property, see globals.css) glide between samples.
 */
function LyricsScrim() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: `var(--lyrics-scrim, ${LYRICS_SCRIM_MIN})`,
        background:
          "radial-gradient(ellipse 65% 50% at 50% 50%, var(--lyrics-scrim-colour) 0%, color-mix(in srgb, var(--lyrics-scrim-colour) 60%, transparent) 45%, transparent 100%)",
        transition: "opacity 1200ms ease-out, --lyrics-scrim-colour 1200ms ease-out",
      }}
    />
  );
}

/**
 * Legacy's lyric display: large, centred, and scaled rather than the minimal
 * view's flat opacity ladder: this is the "look at the screen" mode.
 */
export function AmbientLyrics() {
  const { t } = useTranslation();
  const lyrics = useLyrics();
  const delay = usePref("lyricsDelay");
  const enabled = usePref("lyricsVisible");

  const lines = lyrics.status === "synced" ? lyrics.lines : null;
  const activeIndex = useActiveLyricsLine(lines, delay, enabled);
  const { columnRef, activeLineRef } = useCentredColumn<
    HTMLDivElement,
    HTMLParagraphElement
  >([activeIndex, lines, enabled]);

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
      <>
        <LyricsScrim />
        <div className="relative h-full overflow-y-auto px-8 py-12">
          <p
            className="mx-auto max-w-3xl whitespace-pre-line text-center font-blobby text-xl leading-loose text-foreground/75"
            style={{ textShadow: LYRICS_SHADOW }}
          >
            {lyrics.text}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <LyricsScrim />
      <div
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
            // activeIndex is -1 before the first line, which makes line 0 the
            // "next" one rather than leaving the whole column dimmed.
            const distance = Math.abs(index - activeIndex);
            const blur = lineBlur(distance);
            return (
              <p
                key={`${line.time}-${index}`}
                aria-current={isActive}
                ref={isActive ? activeLineRef : null}
                className={cn(
                  "mx-auto max-w-4xl px-8 py-3 text-center leading-tight text-foreground",
                  // DynaPuff, the prototype's face. The rounded display type is
                  // most of what separates this view from the D1 one.
                  "font-blobby text-[clamp(1.25rem,3.4vw,2.6rem)]",
                  isActive ? "scale-105" : "scale-100",
                )}
                style={{
                  opacity: lineOpacity(distance),
                  filter: blur ? `blur(${blur}px)` : undefined,
                  textShadow: isActive ? ACTIVE_LYRICS_SHADOW : LYRICS_SHADOW,
                  transition: LINE_TRANSITION,
                }}
              >
                {line.text || "♪"}
              </p>
            );
          })}
        </div>
      </div>
    </>
  );
}
