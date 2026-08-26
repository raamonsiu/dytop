import { useTranslation } from "react-i18next";
import { usePlayerError } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";
import { AddSongInline } from "./AddSongInline";
import { LyricsColumn } from "./LyricsColumn";
import { NowPlayingCard } from "./NowPlayingCard";
import { useMinimalOutletContext } from "./outletContext";

export function RadioView() {
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
          {t("radio.nothingPlaying")}
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

      <div
        className="flex shrink-0 flex-col items-center gap-4 px-6 pb-8 transition-opacity duration-500 short:gap-2 short:pb-3"
        style={{ opacity: chromeVisible ? 1 : 0 }}
        inert={!chromeVisible}
      >
        {errorKey ? <PlayerError messageKey={errorKey} /> : null}
        <NowPlayingCard track={nowPlaying} />
        {/* First thing to go when vertical room is scarce: the queue can also
            be fed from the legacy view, but the lyrics only live here. */}
        <div className="w-full max-w-xl short:hidden">
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
