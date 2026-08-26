/**
 * @types/youtube declares the `YT` namespace but nothing about how the script
 * publishes itself. Both of these are how the IFrame API actually loads: it
 * assigns `window.YT` and then calls the global ready callback.
 */
declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
