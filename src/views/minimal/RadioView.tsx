import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { formatTime } from "@/lib/format";
import { subscribeToTime } from "@/player/clock";
import { addTrackByUrl, playNext, togglePlayPause } from "@/player/controller";
import { useIsPlaying, usePlayerError } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";

/** Temporary scaffolding for phase 3 — phase 4 replaces this with the real
 * now-playing card. It exists so playback can be verified end to end. */
export function RadioView() {
  const { t } = useTranslation();
  const nowPlaying = useNowPlaying();
  const isPlaying = useIsPlaying();
  const errorKey = usePlayerError();
  const [url, setUrl] = useState("");
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribeToTime(({ current, duration }) => {
        const node = timeRef.current;
        if (!node) return;
        // duration 0 means unknown or live — show elapsed alone rather than a
        // total that will never be reached.
        node.textContent = duration
          ? `${formatTime(current)} / ${formatTime(duration)}`
          : formatTime(current);
      }),
    [],
  );

  return (
    <section className="grid h-full place-items-center px-6">
      <div className="flex w-full max-w-xl flex-col gap-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addTrackByUrl(url).then((result) => {
              if (result.ok) setUrl("");
            });
          }}
        >
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://youtu.be/…"
            className="min-w-0 flex-1 border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
          />
          <Button type="submit" variant="primary">
            add
          </Button>
        </form>

        <p className="truncate text-sm">
          {nowPlaying?.title ?? t("radio.nothingPlaying")}
        </p>
        <p className="text-xs text-muted-foreground">{nowPlaying?.author}</p>

        <div className="flex items-center gap-3">
          <Button onClick={togglePlayPause}>{isPlaying ? "pause" : "play"}</Button>
          <Button onClick={playNext}>next</Button>
          <span ref={timeRef} className="text-xs tabular-nums text-muted-foreground">
            0:00 / 0:00
          </span>
        </div>

        {errorKey ? <p className="text-xs text-danger">error: {errorKey}</p> : null}
      </div>
    </section>
  );
}
