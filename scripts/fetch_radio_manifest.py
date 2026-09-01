#!/usr/bin/env python3
"""
Fetches a YouTube playlist via the YouTube Data API v3 and writes a
`MANIFEST: RadioManifestEntry[]` array in the exact shape src/radio/manifest.ts
expects, ready to paste in place of the current MANIFEST array there.

Setup (one-time, free, no OAuth needed -- this only reads public data):
  1. https://console.cloud.google.com/ -> create or pick a project
  2. APIs & Services > Library -> enable "YouTube Data API v3"
  3. APIs & Services > Credentials -> Create credentials -> API key

Usage:
  python3 scripts/fetch_radio_manifest.py PLAYLIST_URL_OR_ID --api-key YOUR_KEY
  # or: export YOUTUBE_API_KEY=... and drop --api-key

  python3 scripts/fetch_radio_manifest.py PLAYLIST_URL_OR_ID --out src/radio/manifest.generated.ts

Only the standard library is used (no `pip install` needed).

Caveats worth knowing before you trust the output blindly:
  - `blocked: true` is set only when YouTube reports the video as globally
    non-embeddable (status.embeddable == false). Per-country region
    restrictions are a *separate* flag YouTube exposes
    (contentDetails.regionRestriction) that this script does not check --
    a video can come back embeddable=true here and still fail to play in
    some countries. Spot-check a few tracks after generating.
  - Deleted, private, and live/upcoming-broadcast entries are skipped with a
    warning on stderr rather than guessed at.
  - Durations come from YouTube's own metadata (contentDetails.duration),
    which is why this script exists: oEmbed (used elsewhere in this app for
    on-demand lookups) doesn't return duration at all.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://www.googleapis.com/youtube/v3"
PAGE_SIZE = 50  # YouTube's max per page/batch for both endpoints used here.


def api_get(endpoint: str, params: dict) -> dict:
    url = f"{API_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url) as response:
            return json.load(response)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        print(f"YouTube API error ({e.code}) calling {endpoint}:\n{body}", file=sys.stderr)
        sys.exit(1)


def extract_playlist_id(value: str) -> str:
    """Accepts a bare playlist id or a full playlist/watch URL."""
    if re.fullmatch(r"[\w-]+", value) and not value.startswith("http"):
        return value
    parsed = urllib.parse.urlparse(value)
    qs = urllib.parse.parse_qs(parsed.query)
    if "list" in qs:
        return qs["list"][0]
    raise SystemExit(f"Could not find a playlist id in: {value}")


def fetch_playlist_video_ids(playlist_id: str, api_key: str) -> list:
    video_ids = []
    page_token = None
    while True:
        params = {
            "part": "contentDetails",
            "playlistId": playlist_id,
            "maxResults": PAGE_SIZE,
            "key": api_key,
        }
        if page_token:
            params["pageToken"] = page_token
        data = api_get("playlistItems", params)
        for item in data.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId")
            if video_id:
                video_ids.append(video_id)
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return video_ids


# e.g. "PT1H2M10S", "PT4M13S", "PT45S"
ISO8601_DURATION_RE = re.compile(
    r"P(?:(?P<days>\d+)D)?T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?"
)


def parse_iso8601_duration(value: str) -> int:
    match = ISO8601_DURATION_RE.fullmatch(value)
    if not match:
        return 0
    parts = {k: int(v) if v else 0 for k, v in match.groupdict().items()}
    return parts["days"] * 86400 + parts["hours"] * 3600 + parts["minutes"] * 60 + parts["seconds"]


def chunked(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def fetch_video_details(video_ids: list, api_key: str) -> list:
    entries = []
    for batch in chunked(video_ids, PAGE_SIZE):
        params = {
            "part": "snippet,contentDetails,status",
            "id": ",".join(batch),
            "key": api_key,
        }
        data = api_get("videos", params)
        by_id = {item["id"]: item for item in data.get("items", [])}

        for video_id in batch:
            item = by_id.get(video_id)
            if item is None:
                print(f"skip {video_id}: private, deleted, or otherwise unavailable", file=sys.stderr)
                continue

            snippet = item["snippet"]
            title = html.unescape(snippet["title"])

            if snippet.get("liveBroadcastContent", "none") != "none":
                print(f"skip {video_id} ({title!r}): live/upcoming broadcast, not a fixed-length track", file=sys.stderr)
                continue

            duration_sec = parse_iso8601_duration(item["contentDetails"]["duration"])
            if duration_sec <= 0:
                print(f"skip {video_id} ({title!r}): missing/zero duration", file=sys.stderr)
                continue

            embeddable = item.get("status", {}).get("embeddable", True)
            entries.append(
                {
                    "videoId": video_id,
                    "durationSec": duration_sec,
                    "title": title,
                    "author": html.unescape(snippet["channelTitle"]),
                    "blocked": not embeddable,
                }
            )
    return entries


def ts_string_literal(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def to_typescript(entries: list) -> str:
    lines = [
        "// Generated by scripts/fetch_radio_manifest.py -- paste the array below",
        "// in place of MANIFEST in src/radio/manifest.ts.",
        "export const MANIFEST: RadioManifestEntry[] = [",
    ]
    for entry in entries:
        fields = [
            f'videoId: {ts_string_literal(entry["videoId"])}',
            f'durationSec: {entry["durationSec"]}',
            f'title: {ts_string_literal(entry["title"])}',
            f'author: {ts_string_literal(entry["author"])}',
        ]
        if entry["blocked"]:
            fields.append("blocked: true")
        lines.append("  { " + ", ".join(fields) + " },")
    lines.append("];")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("playlist", help="Playlist ID or full YouTube playlist URL")
    parser.add_argument(
        "--api-key",
        default=os.environ.get("YOUTUBE_API_KEY"),
        help="YouTube Data API v3 key (or set YOUTUBE_API_KEY)",
    )
    parser.add_argument("--out", default="manifest.generated.ts", help="Output file path")
    args = parser.parse_args()

    if not args.api_key:
        parser.error("an API key is required: pass --api-key or set YOUTUBE_API_KEY")

    playlist_id = extract_playlist_id(args.playlist)
    print(f"Fetching playlist {playlist_id}...", file=sys.stderr)
    video_ids = fetch_playlist_video_ids(playlist_id, args.api_key)
    print(f"Found {len(video_ids)} videos, fetching details...", file=sys.stderr)
    entries = fetch_video_details(video_ids, args.api_key)

    blocked_count = sum(1 for e in entries if e["blocked"])
    print(f"Resolved {len(entries)} playable entries ({blocked_count} flagged blocked).", file=sys.stderr)

    with open(args.out, "w", encoding="utf-8") as f:
        f.write(to_typescript(entries))
        f.write("\n")

    print(f"Wrote {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
