import { useEffect, useRef, useState, type RefObject } from "react";
import { BACKGROUND_CROSSFADE_MS } from "@/constants/player";
import type { BackgroundEntry } from "./repo";

interface BackgroundLayerProps {
  entry: BackgroundEntry | null;
  /** Points at the visible media element, for accent sampling. */
  mediaRef: RefObject<HTMLImageElement | HTMLVideoElement | null>;
}

/**
 * Renders the active background, crossfading between changes.
 *
 * Both the outgoing and incoming media are kept mounted for the length of the
 * fade: swapping the `src` of one element would show a hard cut, since the new
 * source paints only once decoded.
 */
export function BackgroundLayer({ entry, mediaRef }: BackgroundLayerProps) {
  const [previous, setPrevious] = useState<BackgroundEntry | null>(null);
  const currentId = entry?.id ?? null;
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastIdRef.current === currentId) return;
    const outgoing = lastIdRef.current;
    lastIdRef.current = currentId;

    if (!outgoing) return;
    // Held only for the fade; keeping it longer would pin a decoded video.
    const timer = setTimeout(() => setPrevious(null), BACKGROUND_CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [currentId]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {previous ? <Media entry={previous} faded /> : null}
      {entry ? <Media key={entry.id} entry={entry} mediaRef={mediaRef} /> : null}

      {/* Darkens the top and bottom so chrome and lyrics stay legible over an
          arbitrary photo. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}

function Media({
  entry,
  mediaRef,
  faded,
}: {
  entry: BackgroundEntry;
  mediaRef?: RefObject<HTMLImageElement | HTMLVideoElement | null>;
  faded?: boolean;
}) {
  const className = "absolute inset-0 size-full object-cover transition-opacity";
  const style = {
    opacity: faded ? 0 : 1,
    transitionDuration: `${BACKGROUND_CROSSFADE_MS}ms`,
  };

  if (entry.kind === "video") {
    return (
      <video
        ref={mediaRef as RefObject<HTMLVideoElement>}
        src={entry.url}
        autoPlay
        loop
        // Background video is decoration; its audio would fight the player, and
        // muted is also what lets it autoplay at all.
        muted
        playsInline
        className={className}
        style={style}
      />
    );
  }

  return (
    <img
      ref={mediaRef as RefObject<HTMLImageElement>}
      src={entry.url}
      alt=""
      className={className}
      style={style}
    />
  );
}
