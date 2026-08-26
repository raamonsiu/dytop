import { YT_IFRAME_API_SRC } from "@/constants/youtube";

let apiPromise: Promise<void> | null = null;

/**
 * Loads the IFrame API script, once.
 *
 * `window.onYouTubeIframeAPIReady` is a single global the script calls exactly
 * once, so it can't be treated as a per-caller callback: the promise is cached
 * and every caller awaits the same one. This also makes the loader safe under
 * StrictMode's double effect invocation, which would otherwise inject the
 * script twice and lose the first callback.
 */
export function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      // Chain rather than replace: another script on the page may rely on it.
      previous?.();
      resolve();
    };

    const script = document.createElement("script");
    script.src = YT_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      // Blocked by an extension or offline. Reset so a later retry can work.
      apiPromise = null;
      reject(new Error("Failed to load the YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}
