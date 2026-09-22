"""Reads a public Spotify playlist through its embed page, with no credentials.

Research branch, not an official API. Since Feb 2026 a Development Mode app
cannot read the items of a playlist it does not own, and has lost ISRCs, so
the embed widget is the only credential-free source left. Its limits:

  - Only the first 100 tracks. `fetch_playlist` reports the real total (read
    from the normal page's `music:song_count` meta) so callers can warn; split
    bigger playlists and pass them all.
  - Artists arrive as one display string, joined with ",<NBSP>". Splitting on
    that exact separator keeps names that contain a plain comma intact.
  - The page is a Next.js build; if Spotify reshapes `__NEXT_DATA__` this
    breaks loudly (SystemExit), never silently with an empty list.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from dataclasses import dataclass

EMBED_URL = "https://open.spotify.com/embed/playlist/{id}"
PAGE_URL = "https://open.spotify.com/playlist/{id}"
EMBED_TRACK_LIMIT = 100

# The embed serves its data to browsers; the normal page only puts the track
# count in its meta tags for link-preview crawlers.
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
CRAWLER_UA = "facebookexternalhit/1.1"

PLAYLIST_ID_RE = re.compile(r"(?:playlist[/:])([A-Za-z0-9]{22})")
# The links the Spotify app shares (open.spotify.com/s/..., spotify.link/...).
SHORT_LINK_RE = re.compile(r"^https?://(open\.spotify\.com/s/|spotify\.link/)", re.I)
NEXT_DATA_RE = re.compile(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S)
SONG_COUNT_RE = re.compile(r'music:song_count" content="(\d+)"')
ARTIST_SEPARATOR = ", "


@dataclass(frozen=True)
class SpotifyTrack:
    uri: str
    title: str
    artists: tuple[str, ...]
    duration_sec: int

    @property
    def label(self) -> str:
        return f"{', '.join(self.artists)} - {self.title}"


@dataclass(frozen=True)
class SpotifyPlaylist:
    playlist_id: str
    name: str
    tracks: tuple[SpotifyTrack, ...]
    total_tracks: int | None  # None when the count could not be read

    @property
    def truncated(self) -> bool:
        return self.total_tracks is not None and self.total_tracks > len(self.tracks)


def resolve_short_link(url: str) -> str:
    """Share links hide their target from browsers; only crawlers get the real page."""
    match = PLAYLIST_ID_RE.search(fetch_text(url, CRAWLER_UA))
    if not match:
        raise SystemExit(f"Short link does not point at a playlist: {url}")
    return match.group(1)


def extract_playlist_id(value: str) -> str:
    """Accepts a playlist URL (any locale path), a share link, a URI or a bare id."""
    if re.fullmatch(r"[A-Za-z0-9]{22}", value):
        return value
    if SHORT_LINK_RE.match(value):
        return resolve_short_link(value)
    match = PLAYLIST_ID_RE.search(value)
    if not match:
        raise SystemExit(f"Could not find a Spotify playlist id in: {value}")
    return match.group(1)


def fetch_text(url: str, user_agent: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept-Language": "en"})
    try:
        with urllib.request.urlopen(request) as response:
            return response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Spotify returned {e.code} for {url} (private or deleted playlist?)") from e


def parse_embed(playlist_id: str, page: str) -> tuple[str, tuple[SpotifyTrack, ...]]:
    match = NEXT_DATA_RE.search(page)
    if not match:
        raise SystemExit("Spotify embed page has no __NEXT_DATA__ block; its markup changed.")
    try:
        entity = json.loads(match.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
        track_list = entity["trackList"]
    except (KeyError, TypeError) as e:
        raise SystemExit(f"Spotify embed data changed shape (missing {e}); update parse_embed.") from e

    tracks = tuple(
        SpotifyTrack(
            uri=item["uri"],
            title=item["title"].strip(),
            artists=tuple(a.strip() for a in item.get("subtitle", "").split(ARTIST_SEPARATOR) if a.strip()),
            duration_sec=round(item.get("duration", 0) / 1000),
        )
        for item in track_list
        if item.get("entityType", "track") == "track"
    )
    return entity.get("name") or playlist_id, tracks


def parse_song_count(page: str) -> int | None:
    match = SONG_COUNT_RE.search(page)
    return int(match.group(1)) if match else None


def fetch_playlist(value: str) -> SpotifyPlaylist:
    playlist_id = extract_playlist_id(value)
    name, tracks = parse_embed(playlist_id, fetch_text(EMBED_URL.format(id=playlist_id), BROWSER_UA))
    try:
        total = parse_song_count(fetch_text(PAGE_URL.format(id=playlist_id), CRAWLER_UA))
    except SystemExit:
        total = None  # the count is only used to warn; the tracks are what matter
    return SpotifyPlaylist(playlist_id=playlist_id, name=name, tracks=tracks, total_tracks=total)
