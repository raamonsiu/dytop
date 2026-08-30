import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { ProgressSlider } from "@/components/ProgressSlider";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { formatRemaining, formatTime } from "@/lib/format";
import { setPref, usePref } from "@/lib/prefs";
import { safeAreaOffset } from "@/lib/safeArea";
import { subscribeToTime } from "@/player/clock";
import { playNext, playPrevious, togglePlayPause } from "@/player/controller";
import { useIsPlaying } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";
import { NextUpIndicator } from "./NextUpIndicator";

/**
 * Transport and readout: a bottom-right widget normally, a full-width row when
 * `compact` (see useIsCompactLayout), where the parent stacks it above the
 * visibility control.
 *
 * The clock is a button: clicking it swaps elapsed for remaining, as in the
 * prototype. The choice persists, since it's a preference about how you read
 * time rather than a momentary peek.
 */
interface RadioHudInfo {
  entry: { title: string; author: string } | null;
  next: { title: string; author: string } | null;
}

export function PlayerHud({
  visible,
  compact = false,
  radio = null,
}: {
  visible: boolean;
  compact?: boolean;
  /** Radio mode: no transport, no seek, track/next come from the shared
   * schedule instead of the personal queue. */
  radio?: RadioHudInfo | null;
}) {
  const { t } = useTranslation();
  const queueTrack = useNowPlaying();
  const track = radio ? radio.entry : queueTrack;
  const isPlaying = useIsPlaying();
  const showRemaining = usePref("showRemainingTime");
  const timeRef = useRef<HTMLSpanElement>(null);

  const [scrubberVisible, setScrubberVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const showScrubber = () => {
    clearHideTimer();
    setScrubberVisible(true);
  };

  /**
   * The delay is what makes the scrubber usable: it sits above the HUD, so
   * travelling to it briefly leaves both elements, and hiding immediately would
   * pull the bar away mid-reach. Pointer events from the scrubber bubble to the
   * same wrapper, so hovering it counts as staying.
   */
  const scheduleHideScrubber = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setScrubberVisible(false), 2_000);
  };

  useEffect(() => clearHideTimer, []);

  useEffect(
    () =>
      subscribeToTime(({ current, duration }) => {
        const node = timeRef.current;
        if (!node) return;
        node.textContent = duration
          ? `${showRemaining ? formatRemaining(current, duration) : formatTime(current)} / ${formatTime(duration)}`
          : formatTime(current);
      }),
    [showRemaining],
  );

  const transport = radio ? null : (
    <div className="flex items-center gap-1">
      <IconButton onClick={playPrevious} aria-label={t("player.previous")}>
        <SkipBack size={14} />
      </IconButton>
      <IconButton
        onClick={togglePlayPause}
        aria-label={t(isPlaying ? "player.pause" : "player.play")}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </IconButton>
      <IconButton onClick={playNext} aria-label={t("player.next")}>
        <SkipForward size={14} />
      </IconButton>
    </div>
  );

  const clock = (
    <button
      type="button"
      onClick={() => setPref("showRemainingTime", !showRemaining)}
      aria-label={t("player.toggleTimeDisplay")}
      className="shrink-0 text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
    >
      <span ref={timeRef}>0:00</span>
    </button>
  );

  const trackInfo = (
    <div className={cn("min-w-0", compact ? "block" : "hidden max-w-56 sm:block")}>
      <p className="truncate font-blobby text-xs" title={track?.title}>
        {track?.title ?? t("player.nothingPlaying")}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{track?.author}</p>
    </div>
  );

  return (
    <div
      className={cn(
        "z-40 transition-opacity duration-500",
        compact ? "relative w-full" : "fixed bottom-4 right-4",
      )}
      style={{
        opacity: visible ? 1 : 0,
        // max() clears the home-indicator/rounded-corner area on notched
        // phones without pushing the HUD in on ordinary screens. When compact
        // the parent stack owns the insets instead.
        ...(compact
          ? null
          : {
              right: safeAreaOffset("right", 1),
              bottom: safeAreaOffset("bottom", 1),
            }),
      }}
      // Hidden chrome must not be clickable or focusable, or tabbing would
      // land on invisible controls.
      inert={!visible}
      // Hover reveals the scrubber only in the corner-widget layout; the
      // compact one shows it permanently, so there is nothing to reveal.
      onPointerEnter={compact ? undefined : showScrubber}
      onPointerLeave={compact ? undefined : scheduleHideScrubber}
      // Keyboard users never fire pointerenter, so the scrubber would be
      // unreachable by tab without this.
      onFocusCapture={compact ? undefined : showScrubber}
      onBlurCapture={compact ? undefined : scheduleHideScrubber}
    >
      {/*
        Rises out from behind the mini-player rather than appearing beside it,
        so the HUD keeps its footprint until you actually reach for the bar.
        Compact puts the same slider inline instead: there is no hover to rise
        on, and a bar floating over the content has nowhere to go.
      */}
      {compact ? null : (
        <div
          className="absolute inset-x-0 bottom-full mb-2 rounded-view border border-glass-border bg-glass-strong px-4 py-1 backdrop-blur-xl transition-all duration-300"
          style={{
            opacity: scrubberVisible ? 1 : 0,
            transform: scrubberVisible ? "translateY(0)" : "translateY(0.75rem)",
          }}
          inert={!scrubberVisible}
        >
          <ProgressSlider thick interactive={!radio} />
        </div>
      )}

      <div
        className={cn(
          "rounded-view border border-glass-border bg-glass-strong backdrop-blur-xl",
          compact ? "flex flex-col gap-1 px-4 py-2" : "flex items-center gap-3 px-4 py-3",
        )}
      >
        {compact ? (
          <>
            {trackInfo}
            <ProgressSlider thick interactive={!radio} />
            <div className="flex items-center justify-between gap-3">
              {transport}
              {clock}
            </div>
          </>
        ) : (
          <>
            {transport}
            {trackInfo}
            {clock}
          </>
        )}
      </div>

      <NextUpIndicator
        compact={compact}
        overrideNext={radio ? (radio.next ?? null) : undefined}
      />
    </div>
  );
}
