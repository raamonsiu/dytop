import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useChromeHold } from "@/lib/useUiVisibility";
import {
  RADIO_STATION_IDS,
  RADIO_STATIONS,
  stationAtOffset,
  type RadioStationId,
} from "@/radio/manifest";

/** How long a key stays down after a click, matching the CSS transition. */
const KEY_PRESS_MS = 180;
/** Must match the station-enter/leave animations in globals.css. */
const SLIDE_MS = 260;

/**
 * Station transport: two cassette keys and a lit tuner display, sitting on
 * the player card's top edge like the keys and window of a deck.
 *
 * Renders nothing while there is only one station, since a selector that
 * cannot select is just furniture.
 */
export function StationSelector({
  stationId,
  onSelect,
}: {
  stationId: RadioStationId;
  onSelect: (id: RadioStationId) => void;
}) {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<1 | -1>(1);
  // Auto-hide measures idleness by pointer movement, and a pointer resting on
  // a key it just pressed is perfectly still — so without this the transport
  // slides away two seconds after every press, taking the card with it.
  const [engaged, setEngaged] = useState(false);
  useChromeHold(engaged);

  if (RADIO_STATION_IDS.length < 2) return null;

  const step = (offset: 1 | -1) => {
    setDirection(offset);
    onSelect(stationAtOffset(stationId, offset));
  };

  return (
    // -mb-px so the keys and the screen share the card's top border instead of
    // drawing a second line a pixel above it, and no padding so both sit flush
    // with the deck's own edges.
    <div
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      // A touch pointer is destroyed on lift, which fires pointerleave; cancel
      // covers the gestures that never get that far.
      onPointerCancel={() => setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
      className="-mb-px flex select-none items-end justify-between gap-2"
    >
      <div className="flex gap-1">
        <CassetteKey label={t("radio.previousStation")} onPress={() => step(-1)}>
          <ChevronLeft size={14} />
        </CassetteKey>
        <CassetteKey label={t("radio.nextStation")} onPress={() => step(1)}>
          <ChevronRight size={14} />
        </CassetteKey>
      </div>

      <StationScreen name={RADIO_STATIONS[stationId].name} direction={direction} />
    </div>
  );
}

function CassetteKey({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        // Driven by state rather than :active so a keyboard press travels too.
        setPressed(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setPressed(false), KEY_PRESS_MS);
        onPress();
      }}
      className={cn(
        "grid h-7 w-11 place-items-center border border-b-0 border-surface-border bg-surface",
        // Tailwind v4 moves this through the `translate` property, not
        // `transform`, so the transition has to name that one to ease at all.
        "text-muted-foreground transition-[translate,color] duration-150 ease-out",
        // The key travels down into the deck as it is held. While pressed it
        // keeps the accent: hover would otherwise win the cascade and swallow
        // the only colour change the press has, since the pointer is still on it.
        pressed
          ? "translate-y-[3px] text-accent"
          : "translate-y-0 hover:text-foreground focus-visible:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The station name behind the glass of a tuner display.
 *
 * On a change the outgoing name slides out and the new one slides in behind
 * it, in the direction the key pressed: the screen reads as one strip of
 * stations being wound past, not as text being replaced.
 */
function StationScreen({ name, direction }: { name: string; direction: 1 | -1 }) {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState<string | null>(null);
  const shown = useRef(name);

  useEffect(() => {
    const previous = shown.current;
    if (previous === name) return;
    shown.current = name;
    if (!reducedMotion) setLeaving(previous);
  }, [name, reducedMotion]);

  // Cleared on a timer rather than on animationend, which a browser that
  // stops animating (a backgrounded tab mid-slide) may never deliver —
  // leaving the old name parked over the new one for good.
  useEffect(() => {
    if (leaving === null) return;
    const timer = setTimeout(() => setLeaving(null), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  return (
    <div
      role="status"
      aria-label={t("radio.station")}
      style={{ "--station-dir": direction } as React.CSSProperties}
      className="relative h-7 w-40 overflow-hidden border border-b-0 border-station-screen-border bg-station-screen"
    >
      {leaving === null ? null : (
        <ScreenLine key={`${leaving}-out`} text={leaving} className="animate-station-leave" />
      )}
      <ScreenLine key={name} text={name} className={leaving === null ? undefined : "animate-station-enter"} />
      {/* Last, so the glass sits over the names and not under them. */}
      <span aria-hidden className="station-screen-glass pointer-events-none absolute inset-0" />
    </div>
  );
}

function ScreenLine({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        // The name as the station spells it: the screen is the one place it
        // appears, so upper-casing it here would lose the only styling it has.
        "station-screen-text absolute inset-0 grid place-items-center",
        "font-display text-sm tracking-[0.25em]",
        className,
      )}
    >
      {text}
    </span>
  );
}
