import { Outlet } from "react-router-dom";
import { PerimeterProgress } from "@/components/PerimeterProgress";
import { UiVisibilityControl } from "@/components/UiVisibilityControl";
import { DITHER_CONFIG } from "@/constants/dither";
import { usePref } from "@/lib/prefs";
import { safeAreaOffset } from "@/lib/safeArea";
import { useIsCompactLayout } from "@/lib/useIsCompactLayout";
import { useUiVisibility } from "@/lib/useUiVisibility";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";
import type { MinimalOutletContext } from "./outletContext";
import { DitherBackground } from "./DitherBackground";
import { MinimalNav } from "./MinimalNav";

/**
 * Chrome shared by the player and history routes: the palette, the nav, the
 * dither backdrop and the progress ring.
 *
 * The backdrop sits here rather than inside either route so that switching
 * tabs doesn't unmount the canvas: remounting would drop the WebGL context and
 * restart the wave from zero on every navigation.
 */
export function MinimalShell() {
  const scheme = usePref("colorScheme");
  const compact = useIsCompactLayout();
  const { state, chromeVisible, ringVisible, setState } = useUiVisibility();

  return (
    <div
      data-view="minimal"
      style={themeStyle(resolveTheme("minimal", scheme))}
      className="relative flex h-full flex-col"
    >
      {/*
        z-0 with the content above, never a negative z-index: [data-view] paints
        an opaque `background`, and a child at -z-10 sits behind its own
        parent's background, which rendered the whole backdrop invisible even
        though the canvas was drawing correctly.
      */}
      <div
        aria-hidden
        // overflow-hidden because the backdrop is deliberately laid out larger
        // than this box before its inverse zoom shrinks it back: see
        // DitherBackground.
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{ opacity: DITHER_CONFIG.opacity }}
      >
        <DitherBackground />
      </div>

      <PerimeterProgress visible={ringVisible} />

      {/*
        Collapses along with the rest of the chrome, so the lyrics below land on
        the view's true vertical centre. Left occupying its space, the nav would
        push everything down and the lyrics would settle below the middle.
      */}
      <div
        className="relative z-10 grid transition-[grid-template-rows] duration-1000 ease-in-out"
        style={{ gridTemplateRows: chromeVisible ? "1fr" : "0fr" }}
      >
        <div
          className="min-h-0 overflow-hidden transition-opacity duration-500"
          style={{ opacity: chromeVisible ? 1 : 0 }}
          inert={!chromeVisible}
        >
          <MinimalNav />
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1">
        <Outlet context={{ chromeVisible } satisfies MinimalOutletContext} />
      </div>

      {/*
        Compact drops it into the flex flow as the last row, so it claims its
        own full-width band and the player above simply gets less room. Nothing
        is overlapped because nothing is overlapping: the alternative, a
        fixed full-width bar, would sit on top of the add-song field.
      */}
      <UiVisibilityControl
        state={state}
        onChange={setState}
        compact={compact}
        // Bottom-left, not bottom-right: the add-song field's submit button
        // lives in that corner, and a touch-sized control there covers it.
        className={compact ? "relative z-50 shrink-0" : "fixed bottom-4 left-4 z-50"}
        style={
          compact
            ? {
                marginBottom: safeAreaOffset("bottom", 1),
                marginLeft: safeAreaOffset("left", 1),
                marginRight: safeAreaOffset("right", 1),
              }
            : {
                left: safeAreaOffset("left", 1),
                bottom: safeAreaOffset("bottom", 1),
              }
        }
      />
    </div>
  );
}
