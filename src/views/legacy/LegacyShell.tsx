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
import { AmbientLyrics } from "./AmbientLyrics";
import { HideUiToggle } from "./HideUiToggle";
import { LegacyNavbar } from "./LegacyNavbar";
import { PerimeterProgress } from "./PerimeterProgress";
import { PlayerHud } from "./PlayerHud";
import { useRevealOnTopEdge } from "./hooks/useRevealOnTopEdge";
import { useUiVisibility } from "./hooks/useUiVisibility";

/**
 * The prototype's view, rebuilt: user-supplied backgrounds, an accent sampled
 * from whatever is on screen, chrome that stays out of the way, and a progress
 * ring around the window.
 */
export function LegacyShell() {
  const scheme = usePref("colorScheme");
  const { state, chromeVisible, ringVisible, cycle } = useUiVisibility();
  const navRevealed = useRevealOnTopEdge(chromeVisible);

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
      <LegacyNavbar revealed={navRevealed} />
      <PlayerHud visible={chromeVisible} />
      <HideUiToggle state={state} onCycle={cycle} />
    </div>
  );
}
