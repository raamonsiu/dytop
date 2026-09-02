import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Volume2, VolumeX } from "lucide-react";
import { clamp } from "@/lib/clamp";
import { cn } from "@/lib/cn";
import { setVolume } from "@/player/controller";
import { useVolume } from "@/player/playerStore";

/** Volume moved per arrow key press. */
const ARROW_STEP = 5;

/** Segments in the LED-meter-style bar. Within the 10-20 range that still
 * reads as discrete blocks without looking sparse. */
const SEGMENT_COUNT = 16;

/** Above this level the mute glyph is fully faded out and the volume glyph
 * fully in; below it they crossfade. Anchoring the swap to a range rather
 * than the single point where audio actually goes silent (0) makes nudging
 * off zero read as a continuous un-mute instead of an instant icon swap. */
const ICON_CROSSFADE_CEILING = 50;

interface VolumeSliderProps {
  className?: string;
}

/**
 * Vertical volume control, shared by every view: there is one embed, so
 * dragging this in D1, legacy or radio all move the same needle.
 *
 * The mute/volume glyph is always on screen rather than only appearing at
 * zero — it's the at-a-glance answer to "is this audible right now" that a
 * bar fill alone doesn't give you. Clicking it toggles mute, restoring the
 * last audible level rather than jumping to a fixed one, since "what it was
 * before you muted it" is the only answer a listener actually expects.
 */
export function VolumeSlider({ className }: VolumeSliderProps) {
  const { t } = useTranslation();
  const volume = useVolume();
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  /** Updated on every render where volume is audible, so the mute button
   * always has something sensible to restore, even before this component
   * itself ever changed the volume (e.g. a level restored from prefs). */
  const lastAudibleRef = useRef(volume > 0 ? volume : 100);
  useEffect(() => {
    if (volume > 0) lastAudibleRef.current = volume;
  }, [volume]);

  const ratioFromEvent = (clientY: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const { top, height } = track.getBoundingClientRect();
    if (height === 0) return null;
    // Inverted from a normal y-axis: the top of the track is full volume.
    return clamp((top + height - clientY) / height, 0, 1);
  };

  const commit = (ratio: number) => setVolume(Math.round(ratio * 100));

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromEvent(event.clientY);
    if (ratio === null) return;
    draggingRef.current = true;
    commit(ratio);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const ratio = ratioFromEvent(event.clientY);
    if (ratio !== null) commit(ratio);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowUp: ARROW_STEP,
      ArrowRight: ARROW_STEP,
      ArrowDown: -ARROW_STEP,
      ArrowLeft: -ARROW_STEP,
    };

    if (event.key in steps) {
      event.preventDefault();
      setVolume(clamp(volume + (steps[event.key] ?? 0), 0, 100));
    } else if (event.key === "Home") {
      event.preventDefault();
      setVolume(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setVolume(100);
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(clamp(lastAudibleRef.current, 1, 100));
    }
  };

  const filled = Math.round((volume / 100) * SEGMENT_COUNT);
  // 1 at true silence, 0 at/past the crossfade ceiling, linear between.
  const muteGlyphOpacity = clamp(1 - volume / ICON_CROSSFADE_CEILING, 0, 1);

  return (
    <div className={cn("flex h-full w-9 flex-col items-center gap-1", className)}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t("player.volume")}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volume}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 w-full flex-1 cursor-pointer touch-none flex-col-reverse gap-[2px] px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <div
            key={index}
            className={cn(
              "min-h-0 w-full flex-1 rounded-[1px] transition-colors",
              index < filled ? "bg-accent" : "bg-surface-border",
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={t(volume > 0 ? "player.mute" : "player.unmute")}
        className="relative flex size-5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Volume2
          size={14}
          className="absolute transition-opacity duration-150"
          style={{ opacity: 1 - muteGlyphOpacity }}
        />
        <VolumeX
          size={14}
          className="absolute transition-opacity duration-150"
          style={{ opacity: muteGlyphOpacity }}
        />
      </button>
    </div>
  );
}
