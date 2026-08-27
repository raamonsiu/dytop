# Parity with the prototype

Checklist of behaviours in `docs/prototype.html` and their status in the React
app. The prototype is kept verbatim in this repo so the two can be compared
side by side.

## Player

| Behaviour | Status | Notes |
|---|---|---|
| YouTube IFrame API, no Data API key | ✅ | `src/player/engine.ts` |
| oEmbed for title / channel / thumbnail | ✅ | `src/lib/youtube/oembed.ts` |
| URL forms: `watch?v=`, `youtu.be`, `/shorts/`, `/embed/` | ✅ | Also `youtube-nocookie.com` |
| Rejects malformed ids | ⬆️ | Improved: the prototype forwarded them to the player, which failed with a code-2 error a second later |
| 4s fallback when `onReady` never fires | ✅ | |
| Error codes 2 / 5 / 100 / 101 / 150 / 153 | ✅ | Mapped to i18n keys |
| Auto-skip on 100 / 101 / 150 only | ✅ | 5 and 153 fail identically for every video, so skipping would burn the queue |
| Re-assert unmute/volume on UNSTARTED and CUED | ✅ | |
| Live streams | ⬆️ | New: duration reported as 0 rather than an unbounded value that rendered as `33778:11:52` |

## Queue

| Behaviour | Status | Notes |
|---|---|---|
| Three lists: history / nowPlaying / upcoming | ✅ | |
| History capped at 30, oldest dropped | ✅ | `HISTORY_MAX` |
| Jump to any track from any section | ✅ | Single click, see deviation below |
| Reorder upcoming by drag | ⚠️ | **Deviation**: dragging is armed from an explicit grip handle. In the prototype rows were both `draggable` and `dblclick`-able, and some browsers fire `dragstart` before the second click completes, making the jump gesture unreliable |
| Jump by double click | ⚠️ | **Deviation**: single click, for the same reason |
| Queue survives reload | ✅ | IndexedDB, restored paused: browsers reject autoplay without a gesture |

## Lyrics

| Behaviour | Status | Notes |
|---|---|---|
| lrclib search by guessed artist/title | ✅ | |
| Synced preferred over plain | ✅ | Any result with synced wins over a higher-ranked plain-only one |
| LRC parsing, multiple timestamps per line | ✅ | |
| Sync offset in ±0.25s steps | ✅ | Persisted |
| Opacity ladder around the active line | ✅ | Flat in minimal, scaled in legacy |
| Fractions of 1-3 digits, minutes of 1-3 | ⬆️ | Prototype required exactly two of each |
| Empty timestamps kept as instrumental gaps | ✅ | Rendered as ♪ |
| Cancels in-flight lookups on track change | ⬆️ | New: prevents a slow earlier response landing after a faster later one |

## Legacy chrome

| Behaviour | Status | Notes |
|---|---|---|
| Navbar revealed by proximity to the top edge | ✅ | 90px zone, 900ms hide delay, 2600ms on touch |
| Perimeter progress starting at top centre | ✅ | `src/lib/perimeter.ts`, symmetry unit-tested |
| Ring redrawn on resize | ✅ | |
| HUD with transport, title, artist, clock | ✅ | |
| Clock toggles elapsed / remaining on click | ✅ | Persisted |
| Three-state hide-UI toggle | ✅ | visible / hidden-all / hidden-partial |
| Panels: add song, queue, lyrics | ✅ | |
| Panels: background | ✅ | |

## Backgrounds

| Behaviour | Status | Notes |
|---|---|---|
| Upload images / video / GIF to IndexedDB | ✅ | |
| Three modes: fixed / random 45s / on song change | ✅ | |
| Accent sampled from the background | ✅ | Scoped to the legacy shell, verified not to leak into minimal on client-side navigation |
| 1.1s crossfade | ✅ | Both media kept mounted for the fade; swapping one element's src showed a hard cut |
| Random pick excludes the current background | ✅ | |
| Upload size limit and quota errors surfaced | ⬆️ | New: the prototype swallowed `QuotaExceededError`, so a large video failed silently |
| Object URLs minted per session | ⬆️ | Fixed: the prototype persisted them, and a URL from a previous load is already revoked |

## Dropped on purpose

- **`file://` support.** The prototype omitted the `origin` player parameter
  when opened from the filesystem and documented error 153 as the consequence.
  A built SPA is always served over http(s), so `origin` is always sent.

Legend: ✅ parity · ⬆️ improved on the prototype · ⚠️ deliberate deviation ·
⏳ not yet built
