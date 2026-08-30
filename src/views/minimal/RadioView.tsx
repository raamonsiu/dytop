import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerError } from "@/player/playerStore";
import { entryToTrack } from "@/radio/position";
import { startRadio, stopRadio, useRadio } from "@/radio/controller";
import { LyricsColumn } from "./LyricsColumn";
import { NextUpIndicator } from "./NextUpIndicator";
import { NowPlayingCard } from "./NowPlayingCard";
import { useMinimalOutletContext } from "./outletContext";

export function RadioView() {
  const { t } = useTranslation();
  const { chromeVisible } = useMinimalOutletContext();
  const { active, entry, next } = useRadio();
  const errorKey = usePlayerError();

  useEffect(() => {
    startRadio();
    return () => stopRadio();
  }, []);

  // Same treatment as PlayerView's empty state: nothing to show yet, so
  // centre a status line instead of an empty chrome section.
  if (!active || !entry) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("radio.offline")}
        </p>
        {errorKey ? <PlayerError messageKey={errorKey} /> : null}
      </section>
    );
  }

  const track = entryToTrack(entry);

  return (
    <section className="flex h-full flex-col">
      <div className="min-h-32 flex-1 shrink">
        <LyricsColumn />
      </div>

      <div
        className="grid shrink-0 transition-[grid-template-rows] duration-1000 ease-in-out"
        style={{ gridTemplateRows: chromeVisible ? "1fr" : "0fr" }}
      >
        <div
          className="flex min-h-0 flex-col items-center gap-4 overflow-hidden px-6 pb-8 transition-opacity duration-500 short:gap-2 short:pb-3"
          style={{ opacity: chromeVisible ? 1 : 0 }}
          inert={!chromeVisible}
        >
          {errorKey ? <PlayerError messageKey={errorKey} /> : null}
          <NowPlayingCard track={track} interactive={false} />
          <NextUpIndicator
            overrideNext={next ? { title: next.title, author: next.author } : null}
          />
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
