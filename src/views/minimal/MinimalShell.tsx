import { Outlet } from "react-router-dom";
import { PerimeterProgress } from "@/components/PerimeterProgress";
import { UiVisibilityControl } from "@/components/UiVisibilityControl";
import { DITHER_CONFIG } from "@/constants/dither";
import { usePref } from "@/lib/prefs";
import { useUiVisibility } from "@/lib/useUiVisibility";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";
import type { MinimalOutletContext } from "./outletContext";
import { DitherBackground } from "./DitherBackground";
import { MinimalNav } from "./MinimalNav";

/**
 * Chrome shared by the radio and history routes: the palette, the nav, the
 * dither backdrop and the progress ring.
 *
 * The backdrop sits here rather than inside either route so that switching
 * tabs doesn't unmount the canvas — remounting would drop the WebGL context and
 * restart the wave from zero on every navigation.
 */
export function MinimalShell() {
  const scheme = usePref("colorScheme");
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
        parent's background — which rendered the whole backdrop invisible even
        though the canvas was drawing correctly.
      */}
      <div
        aria-hidden
        // overflow-hidden because the backdrop is deliberately laid out larger
        // than this box before its inverse zoom shrinks it back — see
        // DitherBackground.
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{ opacity: DITHER_CONFIG.opacity }}
      >
        <DitherBackground />
      </div>

      <PerimeterProgress visible={ringVisible} />

      <div
        className="relative z-10 transition-opacity duration-500"
        style={{ opacity: chromeVisible ? 1 : 0 }}
        inert={!chromeVisible}
      >
        <MinimalNav />
      </div>

      <div className="relative z-10 min-h-0 flex-1">
        <Outlet context={{ chromeVisible } satisfies MinimalOutletContext} />
      </div>

      <UiVisibilityControl
        state={state}
        onChange={setState}
        className="fixed bottom-4 right-4 z-50"
      />
    </div>
  );
}
