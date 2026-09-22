"""YouTube Data API v3 access: the only source of truth for what gets written.

Search results (ytmusicapi) and scraped playlists decide *which* video to use;
this module decides whether it can actually be scheduled, and with what
duration, because those are the facts every client's clock depends on.

Quota: playlistItems.list and videos.list cost 1 unit per call of up to 50
ids, so a whole station costs a handful of units. search.list (100 units) is
deliberately never used.
"""

from __future__ import annotations

import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

API_BASE = "https://www.googleapis.com/youtube/v3"
PAGE_SIZE = 50  # YouTube's max per page/batch for both endpoints used here.

# e.g. "PT1H2M10S", "PT4M13S", "PT45S"
ISO8601_DURATION_RE = re.compile(
    r"P(?:(?P<days>\d+)D)?T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?"
)


@dataclass(frozen=True)
class VideoInfo:
    video_id: str
    title: str
    author: str
    duration_sec: int
    embeddable: bool
    live: bool
    region_blocked: bool

    def unplayable_reason(self) -> str | None:
        """Why this video cannot hold a radio slot at all, or None if it can."""
        if self.live:
            return "live_broadcast"
        if self.duration_sec <= 0:
            return "no_duration"
        return None

    def refused_reason(self) -> str | None:
        """Why the embed would refuse to play it, or None if it should play."""
        if not self.embeddable:
            return "not_embeddable"
        if self.region_blocked:
            return "region_blocked"
        return None


def api_get(endpoint: str, params: dict) -> dict:
    url = f"{API_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url) as response:
            return json.load(response)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"YouTube API error ({e.code}) calling {endpoint}:\n{body}") from e


def extract_playlist_id(value: str) -> str:
    """Accepts a bare playlist id or a full playlist/watch URL."""
    if re.fullmatch(r"[\w-]+", value):
        return value
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(value).query)
    if "list" in qs:
        return qs["list"][0]
    raise SystemExit(f"Could not find a YouTube playlist id in: {value}")


def parse_iso8601_duration(value: str) -> int:
    match = ISO8601_DURATION_RE.fullmatch(value)
    if not match:
        return 0
    parts = {k: int(v) if v else 0 for k, v in match.groupdict().items()}
    return parts["days"] * 86400 + parts["hours"] * 3600 + parts["minutes"] * 60 + parts["seconds"]


def is_region_blocked(content_details: dict, region: str | None) -> bool:
    """YouTube expresses region limits as either a block list or an allow list."""
    if not region:
        return False
    restriction = content_details.get("regionRestriction") or {}
    if region in restriction.get("blocked", []):
        return True
    allowed = restriction.get("allowed")
    return allowed is not None and region not in allowed


def fetch_playlist_video_ids(playlist_id: str, api_key: str) -> list[str]:
    video_ids: list[str] = []
    page_token = None
    while True:
        params = {"part": "contentDetails", "playlistId": playlist_id, "maxResults": PAGE_SIZE, "key": api_key}
        if page_token:
            params["pageToken"] = page_token
        data = api_get("playlistItems", params)
        for item in data.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId")
            if video_id:
                video_ids.append(video_id)
        page_token = data.get("nextPageToken")
        if not page_token:
            return video_ids


def fetch_videos(video_ids: list[str], api_key: str, region: str | None) -> dict[str, VideoInfo]:
    """Details for every id YouTube still serves; private/deleted ids are absent."""
    unique_ids = list(dict.fromkeys(video_ids))
    videos: dict[str, VideoInfo] = {}
    for i in range(0, len(unique_ids), PAGE_SIZE):
        batch = unique_ids[i : i + PAGE_SIZE]
        data = api_get("videos", {"part": "snippet,contentDetails,status", "id": ",".join(batch), "key": api_key})
        for item in data.get("items", []):
            snippet = item["snippet"]
            content_details = item.get("contentDetails", {})
            videos[item["id"]] = VideoInfo(
                video_id=item["id"],
                title=html.unescape(snippet["title"]),
                author=html.unescape(snippet["channelTitle"]),
                duration_sec=parse_iso8601_duration(content_details.get("duration", "")),
                embeddable=item.get("status", {}).get("embeddable", True),
                live=snippet.get("liveBroadcastContent", "none") != "none",
                region_blocked=is_region_blocked(content_details, region),
            )
    return videos


def warn(message: str) -> None:
    print(message, file=sys.stderr)
