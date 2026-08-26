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
 * The prototype's view, rebuilt: chrome that stays out of the way, a progress
 * ring around the window, and lyrics as the main event.
 */
export function LegacyShell() {
  const scheme = usePref("colorScheme");
  const { state, chromeVisible, ringVisible, cycle } = useUiVisibility();
  const navRevealed = useRevealOnTopEdge(chromeVisible);

  return (
    <div
      data-view="legacy"
      style={themeStyle(resolveTheme("legacy", scheme))}
      className="relative h-full overflow-hidden"
    >
      {/* Phase 7 puts the custom background layer here, behind everything. */}

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
