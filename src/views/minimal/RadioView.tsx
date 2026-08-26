import { useTranslation } from "react-i18next";
import { usePlayerError } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";
import { AddSongInline } from "./AddSongInline";
import { NowPlayingCard } from "./NowPlayingCard";

export function RadioView() {
  const { t } = useTranslation();
  const nowPlaying = useNowPlaying();
  const errorKey = usePlayerError();

  return (
    <section className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-10">
      {nowPlaying ? (
        <NowPlayingCard track={nowPlaying} />
      ) : (
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("radio.nothingPlaying")}
        </p>
      )}

      <AddSongInline />

      {errorKey ? (
        <p role="alert" className="max-w-xl text-xs text-danger">
          {t(`errors.player.${errorKey}`)}
        </p>
      ) : null}
    </section>
  );
}
