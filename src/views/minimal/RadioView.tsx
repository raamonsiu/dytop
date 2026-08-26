import { useTranslation } from "react-i18next";
import { usePlayerError } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";
import { AddSongInline } from "./AddSongInline";
import { LyricsColumn } from "./LyricsColumn";
import { NowPlayingCard } from "./NowPlayingCard";

export function RadioView() {
  const { t } = useTranslation();
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
      <div className="min-h-0 flex-1">
        <LyricsColumn />
      </div>

      <div className="flex flex-col items-center gap-4 px-6 pb-8">
        {errorKey ? <PlayerError messageKey={errorKey} /> : null}
        <NowPlayingCard track={nowPlaying} />
        <AddSongInline />
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
