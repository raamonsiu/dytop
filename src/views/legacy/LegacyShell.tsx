import { useEffect, useRef } from "react";
import { BackgroundLayer } from "@/backgrounds/BackgroundLayer";
import {
  hydrateBackgrounds,
  useActiveBackground,
} from "@/backgrounds/backgroundsStore";
import { useBackgroundRotation } from "@/backgrounds/useBackgroundRotation";
import { useDynamicAccent } from "@/backgrounds/useDynamicAccent";
import { usePref } from "@/lib/prefs";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";
import { PerimeterProgress } from "@/components/PerimeterProgress";
import { UiVisibilityControl } from "@/components/UiVisibilityControl";
import { useUiVisibility } from "@/lib/useUiVisibility";
import { AmbientLyrics } from "./AmbientLyrics";
import { LegacyNavbar } from "./LegacyNavbar";
import { PlayerHud } from "./PlayerHud";

/**
 * The prototype's view, rebuilt: user-supplied backgrounds, an accent sampled
 * from whatever is on screen, chrome that stays out of the way, and a progress
 * ring around the window.
 */
export function LegacyShell() {
  const scheme = usePref("colorScheme");
  const { state, chromeVisible, ringVisible, setState } = useUiVisibility();

  const shellRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const background = useActiveBackground();

  useEffect(() => {
    void hydrateBackgrounds();
  }, []);

  useBackgroundRotation();
  // Writes --accent-override on this shell only, which is what keeps the
  // sampled colour from following the user into the minimal view.
  useDynamicAccent(shellRef, mediaRef, background?.id ?? null);

  return (
    <div
      ref={shellRef}
      data-view="legacy"
      style={themeStyle(resolveTheme("legacy", scheme))}
      className="relative h-full overflow-hidden"
    >
      <BackgroundLayer entry={background} mediaRef={mediaRef} />

      <div className="absolute inset-0 z-10">
        <AmbientLyrics />
      </div>

      <PerimeterProgress visible={ringVisible} />
      <LegacyNavbar revealed={chromeVisible} />
      <PlayerHud visible={chromeVisible} />
      <UiVisibilityControl
        state={state}
        onChange={setState}
        className="fixed right-4 top-4 z-50"
      />
    </div>
  );
}
