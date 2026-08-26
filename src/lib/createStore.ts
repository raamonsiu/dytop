import { useSyncExternalStore } from "react";

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

/**
 * Minimal external store.
 *
 * The app deliberately keeps state out of React Context: two views share one
 * player, and Context would re-render the whole tree on every change. An
 * external store lets each component subscribe to just the slice it draws.
 *
 * Note this is for *discrete* state (track, playing, queue). Playback time is
 * not state — see player/clock.ts, which writes to the DOM directly.
 */
export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set(next) {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Subscribes to the whole store value. */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * Subscribes to a slice.
 *
 * The selector must return a primitive or a referentially stable value —
 * returning a fresh object or array every call makes React loop, because it
 * compares snapshots with Object.is.
 */
export function useStoreSelector<T, S>(store: Store<T>, select: (value: T) => S): S {
  const snapshot = () => select(store.get());
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
