import { ViewToggle } from "@/components/ViewToggle";
import { usePref } from "@/lib/prefs";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";

/**
 * Placeholder shell. Phases 6 and 7 fill this with the prototype's chrome:
 * the proximity-revealed navbar, the HUD, the perimeter progress ring and the
 * custom backgrounds.
 */
export function LegacyShell() {
  const scheme = usePref("colorScheme");

  return (
    <div
      data-view="legacy"
      style={themeStyle(resolveTheme("legacy", scheme))}
      className="relative h-full"
    >
      <ViewToggle current="legacy" className="absolute right-6 top-5" />
    </div>
  );
}
