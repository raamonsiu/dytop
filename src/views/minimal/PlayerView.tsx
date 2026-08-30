import { useTranslation } from "react-i18next";
import { usePlayerError } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";
import { AddSongInline } from "./AddSongInline";
import { LyricsColumn } from "./LyricsColumn";
import { NextUpIndicator } from "./NextUpIndicator";
import { NowPlayingCard } from "./NowPlayingCard";
import { useMinimalOutletContext } from "./outletContext";

export function PlayerView() {
  const { t } = useTranslation();
  const { chromeVisible } = useMinimalOutletContext();
  const nowPlaying = useNowPlaying();
  const errorKey = usePlayerError();

  // Nothing queued yet: the paste box is the only thing worth showing, so it
  // takes the centre instead of sitting under an empty player.
  if (!nowPlaying) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("player.nothingPlaying")}
        </p>
        <AddSongInline />
        {errorKey ? <PlayerError messageKey={errorKey} /> : null}
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col">
      {/*
        min-h-0 lets this shrink below its content, and a floor keeps it from
        being squeezed to nothing: without both, the card and the paste box took
        their natural height and left the lyrics a two-line sliver on a short
        window.
      */}
      <div className="min-h-32 flex-1 shrink">
        <LyricsColumn />
      </div>

      {/*
        Collapses to nothing when the chrome hides, so the lyrics above drift
        down into the freed space and settle in the middle of the view: the
        transport is gone, so there is no reason to keep sitting above where it
        used to be.

        The grid-rows 1fr/0fr pair is what makes that animatable: `height: auto`
        is not a transitionable value, and a fixed pixel height would have to be
        guessed and would break the moment the card wraps or the short: variant
        changes the padding. Slower than the fade on purpose: the point is
        drifting, not snapping.
      */}
      <div
        className="grid shrink-0 transition-[grid-template-rows] duration-1000 ease-in-out"
        style={{ gridTemplateRows: chromeVisible ? "1fr" : "0fr" }}
      >
        <div
          // min-h-0 is required: grid items default to min-height:auto and
          // refuse to shrink below their content, which left the track stuck a
          // dozen pixels short of collapsed.
          className="flex min-h-0 flex-col items-center gap-4 overflow-hidden px-6 pb-8 transition-opacity duration-500 short:gap-2 short:pb-3"
          style={{ opacity: chromeVisible ? 1 : 0 }}
          inert={!chromeVisible}
        >
          {errorKey ? <PlayerError messageKey={errorKey} /> : null}
          <NowPlayingCard track={nowPlaying} />
          <NextUpIndicator />
          {/*
            Never hidden, only compacted. An earlier version dropped this on
            short viewports, which also fired on zoom-in: zooming shrinks the
            viewport in CSS pixels, so the only way to add a track vanished at
            exactly the moment someone was trying to read the page more closely.
          */}
          <AddSongInline />
        </div>
      </div>
    </section>
  );
}

function PlayerError({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();
  return (
    <p role="alert" className="max-w-xl text-xs text-danger">
      {t(`errors.player.${messageKey}`)}
    </p>
  );
}
