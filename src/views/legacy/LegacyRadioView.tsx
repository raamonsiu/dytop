import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { startRadio, stopRadio, unlockRadioPlayback, useRadio } from "@/radio/controller";
import { AmbientLyrics } from "./AmbientLyrics";

/** Legacy's radio screen: same lyrics-over-background look as the player, driven by the shared radio clock instead of the personal queue. */
export function LegacyRadioView() {
  const { t } = useTranslation();
  const { needsGesture } = useRadio();

  useEffect(() => {
    startRadio();
    return () => stopRadio();
  }, []);

  if (needsGesture) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <button
          type="button"
          onClick={unlockRadioPlayback}
          className="text-xs uppercase tracking-widest text-white/70 underline underline-offset-4"
        >
          {t("radio.tapToListen")}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10">
      <AmbientLyrics />
    </div>
  );
}
