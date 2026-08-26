import { Outlet } from "react-router-dom";
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
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <DitherBackground />
      </div>

      <MinimalNav />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
