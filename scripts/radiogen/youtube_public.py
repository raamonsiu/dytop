"""The same facts as youtube_api, read without a Data API key.

Two public endpoints stand in for the key, each for what it alone can answer:

  - **oEmbed** decides embeddability, which is the question that matters most:
    it answers 401 for exactly the videos an iframe refuses (verified against
    the manifest's hand-flagged `blocked` entry) and 404 for deleted ones.
  - **YouTube Music's own API** (via ytmusicapi) gives the duration the
    schedule is built from, and flags live streams, which have no fixed length
    to schedule and must never be added.

Its playability, on the other hand, is not the embed's: the known-blocked
video comes back "OK" there, so only oEmbed settles that question.

What is lost without a key: region restrictions. Nothing public exposes them,
so entries are never pre-flagged `blocked` for a country here, and a video
refused only in some countries is left for the radio's runtime fallback to
substitute. Pass --api-key to get that check back.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from .youtube_api import VideoInfo, warn
from .ytmusic_client import client

OEMBED_URL = "https://www.youtube.com/oembed?url={watch}&format=json"
WATCH_URL = "https://www.youtube.com/watch?v={id}"
WORKERS = 8


def fetch_oembed(video_id: str) -> tuple[dict | None, bool]:
    """Returns (metadata, embeddable). Metadata is None when YouTube refuses it."""
    url = OEMBED_URL.format(watch=urllib.parse.quote(WATCH_URL.format(id=video_id), safe=""))
    try:
        with urllib.request.urlopen(url) as response:
            return json.load(response), True
    except urllib.error.HTTPError:
        # 401: embedding disabled (or private). 404: no such video.
        return None, False


def to_video_info(video_id: str, oembed: dict | None, embeddable: bool, details: dict) -> VideoInfo:
    """Merges both sources; oEmbed wins on title/author, being the upload's own."""
    return VideoInfo(
        video_id=video_id,
        title=(oembed or {}).get("title") or details.get("title", ""),
        author=(oembed or {}).get("author_name") or details.get("author", ""),
        duration_sec=int(details.get("lengthSeconds") or 0),
        embeddable=embeddable,
        live=bool(details.get("isLiveContent")),
        region_blocked=False,  # not knowable without the Data API
    )


def fetch_video(video_id: str) -> VideoInfo | None:
    try:
        song = client().get_song(video_id)
    except Exception as e:  # ytmusicapi raises bare Exceptions on HTTP/parse errors
        warn(f"  lookup failed for {video_id}: {e}")
        return None
    if song.get("playabilityStatus", {}).get("status") == "ERROR":
        return None  # deleted or private, same as an id the Data API omits
    oembed, embeddable = fetch_oembed(video_id)
    return to_video_info(video_id, oembed, embeddable, song.get("videoDetails", {}))


def fetch_videos(video_ids: list[str], region: str | None = None) -> dict[str, VideoInfo]:
    if region:
        warn(f"No API key: cannot check {region} region restrictions (runtime fallback covers those).")
    unique_ids = list(dict.fromkeys(video_ids))
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = pool.map(fetch_video, unique_ids)
    return {video.video_id: video for video in results if video is not None}


def fetch_playlist_video_ids(playlist_id: str) -> list[str]:
    """YouTube Music serves classic YouTube playlists (PL..., OLAK5uy_...) too."""
    try:
        playlist = client().get_playlist(playlist_id, limit=None)
    except Exception as e:
        # ytmusicapi reports a parse failure by dumping the whole response.
        raise SystemExit(
            f"Could not read YouTube playlist {playlist_id} without an API key "
            f"({type(e).__name__}); is it public, and a PL.../OLAK5uy_... id?"
        ) from e
    return [track["videoId"] for track in playlist.get("tracks", []) if track.get("videoId")]
