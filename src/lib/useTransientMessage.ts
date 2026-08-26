import { useCallback, useEffect, useRef, useState } from "react";

/** Long enough to read a short confirmation, short enough not to linger. */
const DEFAULT_DURATION_MS = 3_500;

export interface TransientMessage<T> {
  message: T | null;
  show: (message: T) => void;
  clear: () => void;
}

/**
 * A message that dismisses itself.
 *
 * Feedback like "added to the queue" is only interesting for a moment; leaving
 * it on screen turns it into permanent furniture that no longer refers to
 * anything the user just did.
 *
 * Showing a new message restarts the clock rather than stacking timers, so
 * pasting several URLs in a row doesn't leave one clearing early.
 */
export function useTransientMessage<T>(
  duration = DEFAULT_DURATION_MS,
): TransientMessage<T> {
  const [message, setMessage] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const show = useCallback(
    (next: T) => {
      clearTimer();
      setMessage(next);
      timerRef.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );

  const clear = useCallback(() => {
    clearTimer();
    setMessage(null);
  }, []);

  // A pending timer would fire into an unmounted component after navigating
  // away mid-message.
  useEffect(() => clearTimer, []);

  return { message, show, clear };
}
