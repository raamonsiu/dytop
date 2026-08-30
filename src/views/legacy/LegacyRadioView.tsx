import { useEffect } from "react";
import { startRadio, stopRadio } from "@/radio/controller";
import { AmbientLyrics } from "./AmbientLyrics";

/** Legacy's radio screen: same lyrics-over-background look as the player, driven by the shared radio clock instead of the personal queue. */
export function LegacyRadioView() {
  useEffect(() => {
    startRadio();
    return () => stopRadio();
  }, []);

  return (
    <div className="absolute inset-0 z-10">
      <AmbientLyrics />
    </div>
  );
}
