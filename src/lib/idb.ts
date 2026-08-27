const DB_NAME = "dytop";
const DB_VERSION = 1;

export const STORES = {
  /** Background media: `{ id, kind, blob, createdAt }`. Blobs, so localStorage
   * is not an option. */
  backgrounds: "backgrounds",
  /** Single-record documents keyed by name, e.g. the saved queue. */
  state: "state",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.backgrounds)) {
        db.createObjectStore(STORES.backgrounds, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.state)) {
        db.createObjectStore(STORES.state, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    // Fires when another tab holds an older version open. Rejecting beats
    // hanging forever on a promise nobody will settle.
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
  });

  return dbPromise;
}

/** Wraps a request in a promise that also fails when the transaction does:
 * quota errors surface on the transaction, not the request. */
function fromRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    request.transaction?.addEventListener("abort", () => {
      reject(request.transaction?.error ?? new Error("IndexedDB transaction aborted"));
    });
  });
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  return fromRequest<T | undefined>(
    db.transaction(store, "readonly").objectStore(store).get(key) as IDBRequest<T | undefined>,
  );
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return fromRequest<T[]>(
    db.transaction(store, "readonly").objectStore(store).getAll() as IDBRequest<T[]>,
  );
}

export async function idbPut(store: StoreName, value: unknown): Promise<void> {
  const db = await openDatabase();
  await fromRequest(db.transaction(store, "readwrite").objectStore(store).put(value));
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  await fromRequest(db.transaction(store, "readwrite").objectStore(store).delete(key));
}

/** Documents in the `state` store are `{ key, value }` pairs. */
export async function readState<T>(key: string): Promise<T | undefined> {
  const record = await idbGet<{ key: string; value: T }>(STORES.state, key);
  return record?.value;
}

export async function writeState<T>(key: string, value: T): Promise<void> {
  await idbPut(STORES.state, { key, value });
}
