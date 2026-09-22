#!/usr/bin/env python3
"""
Builds a radio station file, src/radio/stations/<station>.ts, from a playlist.

  yt       a YouTube playlist, taken as is (every playable video is added)
  spotify  one or more public Spotify playlists, each track matched to a
           YouTube video by confidence score (research: reads the embed page,
           first 100 tracks per playlist; see scripts/radiogen/spotify_embed.py)
  sync     rebuild a station from the source it was built from, and report
           what the playlist gained or lost since

A station remembers its source in scripts/radio-stations/<station>.json, so
after the first build a refresh is just `sync <station>` (or `sync --all`).
That file also holds the station's overrides, which a rebuild never discards.

Durations, embeddability and live-stream flags are read either way:
  - with --api-key (or YOUTUBE_API_KEY), from the YouTube Data API v3 (free,
    no OAuth: Google Cloud console -> enable "YouTube Data API v3" ->
    Credentials -> API key). Only this way can region restrictions be checked.
  - without a key, from YouTube's public oEmbed endpoint and YouTube Music.
    Everything works except the region check; see radiogen/youtube_public.py.

Setup:  pip install -r scripts/requirements.txt

Examples (run from anywhere; paths resolve against the repo root):
  python scripts/build_radio_station.py yt "https://www.youtube.com/playlist?list=PL..." --station chill
  python scripts/build_radio_station.py spotify https://open.spotify.com/playlist/AAA https://open.spotify.com/playlist/BBB --station latin
  python scripts/build_radio_station.py spotify URL --station latin --dry-run   # report only
  python scripts/build_radio_station.py sync latin
  python scripts/build_radio_station.py sync --all

Spotify runs write radio-reports/<station>.md: what was added, with the
confidence of each match, and what was left out and why. To settle a track,
put its URI in the station's `overrides` with a videoId (use it) or null
(skip it), then sync again.

Caveats:
  - Region checks need --api-key and use --region (default ES). A video can
    pass every check here and still be refused on some device; the radio's
    runtime fallback covers that.
  - Deleted, private and live entries are skipped, never guessed at.
"""

from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Callable
from dataclasses import dataclass

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "scripts"))

from radiogen import report, spotify_embed, spotify_station, station_config, station_file  # noqa: E402
from radiogen import youtube_api, youtube_public  # noqa: E402
from radiogen.matcher import ACCEPT_THRESHOLD, REVIEW_THRESHOLD  # noqa: E402
from radiogen.station_config import StationConfig  # noqa: E402
from radiogen.youtube_api import warn  # noqa: E402


@dataclass(frozen=True)
class Backend:
    """Where video facts come from: the Data API, or the keyless endpoints."""

    name: str
    list_playlist: Callable[[str], list[str]]
    fetch_videos: Callable[[list[str]], dict[str, youtube_api.VideoInfo]]


def choose_backend(api_key: str | None, region: str) -> Backend:
    if api_key:
        return Backend(
            "from the YouTube Data API",
            lambda playlist_id: youtube_api.fetch_playlist_video_ids(playlist_id, api_key),
            lambda ids: youtube_api.fetch_videos(ids, api_key, region),
        )
    return Backend(
        "without an API key (oEmbed + YouTube Music)",
        youtube_public.fetch_playlist_video_ids,
        lambda ids: youtube_public.fetch_videos(ids, region),
    )


def build_from_youtube(
    config: StationConfig, backend: Backend, fallback_id: str | None
) -> tuple[list[station_file.Entry], list[str]]:
    playlist_id = youtube_api.extract_playlist_id(config.playlists[0])
    warn(f"Fetching YouTube playlist {playlist_id}...")
    video_ids = backend.list_playlist(playlist_id)
    videos = backend.fetch_videos(video_ids)

    entries: list[station_file.Entry] = []
    seen: set[str] = set()
    for video_id in video_ids:
        video = videos.get(video_id)
        if video is None:
            warn(f"skip {video_id}: private, deleted, or otherwise unavailable")
            continue
        problem = video.unplayable_reason()
        if problem:
            warn(f"skip {video_id} ({video.title!r}): {problem}")
            continue
        if video_id == fallback_id or video_id in seen:
            reason = "is the radio fallback" if video_id == fallback_id else "duplicate"
            warn(f"skip {video_id} ({video.title!r}): {reason}")
            continue
        seen.add(video_id)
        refused = video.refused_reason()
        if refused:
            warn(f"flag {video_id} ({video.title!r}) blocked: {refused}")
        entries.append(
            station_file.Entry(video_id, video.duration_sec, video.title, video.author, blocked=bool(refused))
        )
    return entries, [f"https://www.youtube.com/playlist?list={playlist_id}"]


def build_from_spotify(
    config: StationConfig, backend: Backend, fallback_id: str | None
) -> tuple[list[station_file.Entry], list[str]]:
    tracks: list[spotify_embed.SpotifyTrack] = []
    urls: list[str] = []
    labelled: list[str] = []
    notes: list[str] = []
    for value in config.playlists:
        playlist = spotify_embed.fetch_playlist(value)
        url = f"https://open.spotify.com/playlist/{playlist.playlist_id}"
        urls.append(url)
        labelled.append(f"{url} ({playlist.name})")
        warn(f"Spotify playlist {playlist.name!r}: {len(playlist.tracks)} tracks read")
        if playlist.truncated:
            note = (
                f"{playlist.name!r} has {playlist.total_tracks} tracks but the embed only exposes the first "
                f"{len(playlist.tracks)}; split it into playlists of at most {spotify_embed.EMBED_TRACK_LIMIT}."
            )
            warn(f"WARNING: {note}")
            notes.append(note)
        tracks.extend(playlist.tracks)
    tracks = list({t.uri: t for t in tracks}.values())  # the same song in two source playlists

    if config.overrides:
        warn(f"Applying {len(config.overrides)} overrides from {station_config.path_for(config.station_id)}")
    results = spotify_station.resolve(tracks, backend.fetch_videos, config.overrides, config.accept, config.review)

    entries: list[station_file.Entry] = []
    taken: dict[str, str] = {}
    for result in results:
        if result.status != "accepted":
            continue
        video = result.video
        if video.video_id == fallback_id:
            result.status, result.reason = "rejected", "is_radio_fallback (cannot also be scheduled)"
            continue
        if video.video_id in taken:
            result.status, result.reason = "rejected", f"duplicate_video (same as {taken[video.video_id]})"
            continue
        taken[video.video_id] = result.track.label
        # Spotify's clean "Artists - Title" beats the upload title for the
        # lyrics lookup, which parses exactly that shape (parseTitleGuess).
        entries.append(station_file.Entry(video.video_id, video.duration_sec, result.track.label, video.author))

    report_path = report.write(config.station_id, labelled, results, notes)
    counts = {s: sum(1 for r in results if r.status == s) for s in ("accepted", "review", "rejected")}
    warn(f"\n{counts['accepted']} added, {counts['review']} to review, {counts['rejected']} rejected -> {report_path}")
    return entries, urls


def build(config: StationConfig, api_key: str | None, dry_run: bool) -> None:
    backend = choose_backend(api_key, config.region)
    warn(f"Station {config.station_id!r}: reading video details {backend.name}.")
    fallback_id = station_file.read_fallback_video_id()
    before = station_file.read_entries(config.station_id)

    builder = build_from_youtube if config.source == "yt" else build_from_spotify
    entries, sources = builder(config, backend, fallback_id)
    if not entries:
        raise SystemExit("No playable tracks resolved; nothing written.")

    if before:
        changes = station_file.describe_changes(before, {e.video_id: e.title for e in entries})
        warn("\n".join(changes) if changes else "No change since the last build.")
    if dry_run:
        warn(f"Dry run: {len(entries)} entries resolved, station file not written.")
        return

    path = station_file.write(config.station_id, entries, sources)
    warn(f"Wrote {path} ({len(entries)} tracks, {sum(e.duration_sec for e in entries) // 60} min loop).")
    config.playlists = sources  # store the resolved URLs, not the share link typed
    warn(f"Source remembered in {station_config.save(config)}; refresh it with `sync {config.station_id}`.")
    if not station_file.is_registered(config.station_id):
        warn(station_file.registration_hint(config.station_id))


def config_from_args(args) -> StationConfig:
    """A rebuild through `yt`/`spotify` keeps whatever overrides are on disk."""
    previous = station_config.load(args.station) if station_config.exists(args.station) else None
    return StationConfig(
        station_id=args.station,
        source=args.source,
        playlists=[args.playlist] if args.source == "yt" else args.playlists,
        region=args.region,
        accept=getattr(args, "accept", ACCEPT_THRESHOLD),
        review=getattr(args, "review", REVIEW_THRESHOLD),
        overrides=previous.overrides if previous else {},
    )


def main() -> None:
    # Shared by every subcommand, so flags work wherever they are typed.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--api-key",
        default=os.environ.get("YOUTUBE_API_KEY"),
        help="YouTube Data API v3 key (or YOUTUBE_API_KEY); without it, public endpoints are used",
    )
    common.add_argument("--dry-run", action="store_true", help="resolve and report, but do not write the station file")

    from_playlist = argparse.ArgumentParser(add_help=False)
    from_playlist.add_argument("--station", required=True, help="station id, also the file name")
    from_playlist.add_argument(
        "--region", default="ES", help="ISO country to check region restrictions against, needs --api-key (default ES)"
    )

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="source", required=True)

    yt = sub.add_parser("yt", parents=[common, from_playlist], help="YouTube playlist")
    yt.add_argument("playlist", help="playlist URL or id")

    sp = sub.add_parser("spotify", parents=[common, from_playlist], help="public Spotify playlist(s)")
    sp.add_argument("playlists", nargs="+", help="playlist URLs, share links, URIs or ids, merged in order")
    sp.add_argument("--accept", type=float, default=ACCEPT_THRESHOLD, help=f"score to add a track (default {ACCEPT_THRESHOLD})")
    sp.add_argument("--review", type=float, default=REVIEW_THRESHOLD, help=f"score to list it for review (default {REVIEW_THRESHOLD})")

    sync = sub.add_parser("sync", parents=[common], help="rebuild station(s) from their remembered source")
    target = sync.add_mutually_exclusive_group(required=True)
    target.add_argument("station", nargs="?", help="station id to refresh")
    target.add_argument("--all", action="store_true", help="refresh every station with a saved source")

    args = parser.parse_args()
    os.chdir(REPO_ROOT)

    if args.source == "sync":
        station_ids = station_config.list_station_ids() if args.all else [args.station]
        if not station_ids:
            raise SystemExit("No station has a saved source yet; build one with `yt` or `spotify` first.")
        for station_id in station_ids:
            station_file.validate_station_id(station_id)
            build(station_config.load(station_id), args.api_key, args.dry_run)
        return

    station_file.validate_station_id(args.station)
    build(config_from_args(args), args.api_key, args.dry_run)


if __name__ == "__main__":
    main()
