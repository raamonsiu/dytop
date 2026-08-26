import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { ProgressSlider } from "@/components/ProgressSlider";
import { IconButton } from "@/components/ui/IconButton";
import { formatRemaining, formatTime } from "@/lib/format";
import { setPref, usePref } from "@/lib/prefs";
import { subscribeToTime } from "@/player/clock";
import { playNext, playPrevious, togglePlayPause } from "@/player/controller";
import { useIsPlaying } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";

/**
 * Bottom-right transport and readout.
 *
 * The clock is a button: clicking it swaps elapsed for remaining, as in the
 * prototype. The choice persists, since it's a preference about how you read
 * time rather than a momentary peek.
 */
export function PlayerHud({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const track = useNowPlaying();
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

  return (
    <div
      className="fixed bottom-4 right-4 z-40 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
      // Hidden chrome must not be clickable or focusable, or tabbing would
      // land on invisible controls.
      inert={!visible}
      onPointerEnter={showScrubber}
      onPointerLeave={scheduleHideScrubber}
      // Keyboard users never fire pointerenter, so the scrubber would be
      // unreachable by tab without this.
      onFocusCapture={showScrubber}
      onBlurCapture={scheduleHideScrubber}
    >
      {/*
        Rises out from behind the mini-player rather than appearing beside it,
        so the HUD keeps its footprint until you actually reach for the bar.
      */}
      <div
        className="absolute inset-x-0 bottom-full mb-2 rounded-view border border-glass-border bg-glass-strong px-4 py-1 backdrop-blur-xl transition-all duration-300"
        style={{
          opacity: scrubberVisible ? 1 : 0,
          transform: scrubberVisible ? "translateY(0)" : "translateY(0.75rem)",
        }}
        inert={!scrubberVisible}
      >
        <ProgressSlider thick />
      </div>

      <div className="flex items-center gap-3 rounded-view border border-glass-border bg-glass-strong px-4 py-3 backdrop-blur-xl">
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

        <div className="hidden min-w-0 max-w-56 sm:block">
          <p className="truncate font-blobby text-xs" title={track?.title}>
            {track?.title ?? t("radio.nothingPlaying")}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{track?.author}</p>
        </div>

        <button
          type="button"
          onClick={() => setPref("showRemainingTime", !showRemaining)}
          aria-label={t("player.toggleTimeDisplay")}
          className="text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          <span ref={timeRef}>0:00</span>
        </button>
      </div>
    </div>
  );
}
