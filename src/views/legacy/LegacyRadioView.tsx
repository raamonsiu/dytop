import { AmbientLyrics } from "./AmbientLyrics";

/** Legacy's main screen: lyrics over the background, nothing else. */
export function LegacyRadioView() {
  return (
    <div className="absolute inset-0 z-10">
      <AmbientLyrics />
    </div>
  );
}
