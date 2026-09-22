import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPrefs, setPref, usePref } from "@/lib/prefs";
import { usePlayerError } from "@/player/playerStore";
import type { RadioStationId } from "@/radio/manifest";
import { entryToTrack } from "@/radio/position";
import { retune, startRadio, stopRadio, unlockRadioPlayback, useRadio } from "@/radio/controller";
import { LyricsColumn } from "./LyricsColumn";
import { NextUpIndicator } from "./NextUpIndicator";
import { NowPlayingCard } from "./NowPlayingCard";
import { StationSelector } from "./StationSelector";
import { useMinimalOutletContext } from "./outletContext";

export function RadioView() {
  const { t } = useTranslation();
  const { chromeVisible } = useMinimalOutletContext();
  const { active, entry, next, needsGesture, stationId } = useRadio();
  const errorKey = usePlayerError();
  const preferredStation = usePref("radioStation");

  useEffect(() => {
    // The stored station is only the one a *new* session starts on: reading it
    // here rather than in a dependency keeps a mid-session change to `retune`,
    // which swaps the schedule without tearing the session down.
    startRadio(getPrefs().radioStation);
    return () => stopRadio();
  }, []);

  const selectStation = (id: RadioStationId) => {
    setPref("radioStation", id);
    retune(id);
  };

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

  if (needsGesture) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-16">
        <button
          type="button"
          onClick={unlockRadioPlayback}
          className="text-xs uppercase tracking-widest text-muted-foreground underline underline-offset-4"
        >
          {t("radio.tapToListen")}
        </button>
        {errorKey ? <PlayerError messageKey={errorKey} /> : null}
      </section>
    );
  }

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
          <div className="flex w-full max-w-xl flex-col">
            <StationSelector
              stationId={stationId ?? preferredStation}
              onSelect={selectStation}
            />
            <NowPlayingCard track={track} interactive={false} />
          </div>
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
