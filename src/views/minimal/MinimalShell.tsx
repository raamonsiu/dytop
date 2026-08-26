import { Outlet } from "react-router-dom";
import { usePref } from "@/lib/prefs";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";
import { MinimalNav } from "./MinimalNav";

/**
 * Chrome shared by the radio and history routes: the palette, the nav, and
 * (from phase 4) the dither backdrop. Nested under RootLayout so navigating
 * between its children never touches the player.
 */
export function MinimalShell() {
  const scheme = usePref("colorScheme");

  return (
    <div
      data-view="minimal"
      style={themeStyle(resolveTheme("minimal", scheme))}
      className="flex h-full flex-col"
    >
      <MinimalNav />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
