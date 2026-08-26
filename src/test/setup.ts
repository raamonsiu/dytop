// jsdom ships no IndexedDB implementation, and the background/queue repos are
// exercised in tests. Imported for its side effect of defining the globals.
import "fake-indexeddb/auto";
