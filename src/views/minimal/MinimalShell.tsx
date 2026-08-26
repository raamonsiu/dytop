import { Outlet } from "react-router-dom";
import { DITHER_CONFIG } from "@/constants/dither";
import { usePref } from "@/lib/prefs";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";
import { DitherBackground } from "./DitherBackground";
import { MinimalNav } from "./MinimalNav";

/**
 * Chrome shared by the radio and history routes: the palette, the nav and the
 * dither backdrop.
 *
 * The backdrop sits here rather than inside either route so that switching
 * tabs doesn't unmount the canvas — remounting would drop the WebGL context and
 * restart the wave from zero on every navigation.
 */
export function MinimalShell() {
  const scheme = usePref("colorScheme");

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
        className="pointer-events-none absolute inset-0 z-0"
        style={{ opacity: DITHER_CONFIG.opacity }}
      >
        <DitherBackground />
      </div>

      <div className="relative z-10">
        <MinimalNav />
      </div>
      <div className="relative z-10 min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
