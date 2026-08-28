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
import { safeAreaOffset } from "@/lib/safeArea";
import { useIsCompactLayout } from "@/lib/useIsCompactLayout";
import { useUiVisibility } from "@/lib/useUiVisibility";
import { Outlet } from "react-router-dom";
import { LegacyNavbar } from "./LegacyNavbar";
import { PlayerHud } from "./PlayerHud";

/**
 * The prototype's view, rebuilt: user-supplied backgrounds, an accent sampled
 * from whatever is on screen, chrome that stays out of the way, and a progress
 * ring around the window.
 */
export function LegacyShell() {
  const scheme = usePref("colorScheme");
  const compact = useIsCompactLayout();
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

      <Outlet />

      <PerimeterProgress visible={ringVisible} />
      <LegacyNavbar revealed={chromeVisible} />

      {compact ? (
        /*
          Phone width: the two widgets stop competing for corners and become a
          stack of full-width rows, the same move the navbar makes at the top.
          One container owns the margins and the safe-area inset so the rows
          can't drift apart or overlap.
        */
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4"
          style={{
            paddingBottom: safeAreaOffset("bottom", 1),
            paddingLeft: safeAreaOffset("left", 1),
            paddingRight: safeAreaOffset("right", 1),
          }}
        >
          <PlayerHud visible={chromeVisible} compact />
          <UiVisibilityControl state={state} onChange={setState} compact />
        </div>
      ) : (
        <>
          <PlayerHud visible={chromeVisible} />
          <UiVisibilityControl
            state={state}
            onChange={setState}
            // Bottom-left: top-right sits under the navbar once it wraps to two
            // rows on a narrow screen, and bottom-right is PlayerHud's corner.
            className="fixed bottom-4 left-4 z-50"
            style={{
              left: safeAreaOffset("left", 1),
              bottom: safeAreaOffset("bottom", 1),
            }}
          />
        </>
      )}
    </div>
  );
}
