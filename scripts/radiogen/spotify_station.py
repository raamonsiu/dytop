"""Spotify playlist -> radio entries, via YouTube Music search.

For each track: search YouTube Music (songs, then videos), score every result
with `matcher`, then validate the viable ones in one batched pass through
whichever backend the caller passed (Data API, or the keyless one). A track
is only added when its best *playable* candidate clears ACCEPT_THRESHOLD; everything else lands in the report with the reason and the
best candidate, to be settled by hand through the overrides file.

Overrides, keyed by Spotify track URI, come from the station's config file
(see station_config): a videoId forces that video, null leaves the track out.
An overridden video is still validated, but never scored.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field

from . import matcher
from .spotify_embed import SpotifyTrack
from .youtube_api import VideoInfo, warn
from .ytmusic_client import client

SONG_RESULTS = 5
VIDEO_RESULTS = 3
# Only this many of a track's best-scoring candidates are sent to validation;
# the rest could not win anyway.
VALIDATED_PER_TRACK = 4
SEARCH_PAUSE_SEC = 0.2  # ytmusicapi is unofficial; stay polite


@dataclass
class ScoredCandidate:
    candidate: matcher.Candidate
    score: matcher.Score
    rejected_because: str | None = None  # set by validation


@dataclass
class TrackResult:
    track: SpotifyTrack
    status: str  # "accepted" | "review" | "rejected"
    reason: str = ""
    video: VideoInfo | None = None
    chosen: ScoredCandidate | None = None
    candidates: list[ScoredCandidate] = field(default_factory=list)
    overridden: bool = False


def to_candidate(result: dict) -> matcher.Candidate | None:
    video_id = result.get("videoId")
    if not video_id:
        return None
    return matcher.Candidate(
        video_id=video_id,
        title=result.get("title") or "",
        artists=tuple(a["name"] for a in result.get("artists") or [] if a.get("name")),
        duration_sec=result.get("duration_seconds"),
        video_type=result.get("videoType"),
    )


def search_candidates(track: SpotifyTrack) -> list[matcher.Candidate]:
    query = f"{track.title} {' '.join(track.artists)}"
    seen: dict[str, matcher.Candidate] = {}
    for search_filter, limit in (("songs", SONG_RESULTS), ("videos", VIDEO_RESULTS)):
        try:
            results = client().search(query, filter=search_filter, limit=limit)[:limit]
        except Exception as e:  # ytmusicapi raises bare Exceptions on HTTP/parse errors
            warn(f"  search failed for {track.label!r} ({search_filter}): {e}")
            results = []
        for result in results:
            candidate = to_candidate(result)
            if candidate and candidate.video_id not in seen:
                seen[candidate.video_id] = candidate
        time.sleep(SEARCH_PAUSE_SEC)
    return list(seen.values())


def from_override(track: SpotifyTrack, video_id: str | None) -> TrackResult:
    """A hand-settled track: null drops it, an id is taken on trust and only validated."""
    if video_id is None:
        return TrackResult(track, "rejected", "override_skip", overridden=True)
    settled = matcher.Score(total=1.0, title=1.0, artist=1.0, duration=1.0, duration_delta=None, version_penalty=0.0)
    forced = matcher.Candidate(video_id=video_id, title="", artists=(), duration_sec=None)
    return TrackResult(track, "accepted", overridden=True, chosen=ScoredCandidate(forced, settled))


def score_all(track: SpotifyTrack, candidates: list[matcher.Candidate]) -> list[ScoredCandidate]:
    scored = [
        ScoredCandidate(c, matcher.score_candidate(track.title, track.artists, track.duration_sec, c))
        for c in candidates
    ]
    return sorted(scored, key=lambda s: s.score.total, reverse=True)


def resolve(
    tracks: list[SpotifyTrack],
    fetch_videos: Callable[[list[str]], dict[str, VideoInfo]],
    overrides: dict[str, str | None],
    accept: float = matcher.ACCEPT_THRESHOLD,
    review: float = matcher.REVIEW_THRESHOLD,
) -> list[TrackResult]:
    pending: list[TrackResult] = []
    for index, track in enumerate(tracks, 1):
        warn(f"[{index}/{len(tracks)}] {track.label}")
        if track.uri in overrides:
            pending.append(from_override(track, overrides[track.uri]))
            continue
        scored = score_all(track, search_candidates(track))
        pending.append(TrackResult(track, "pending", candidates=scored))

    to_validate = [r.chosen.candidate.video_id for r in pending if r.overridden and r.chosen]
    for result in pending:
        viable = [s for s in result.candidates if s.score.total >= review][:VALIDATED_PER_TRACK]
        to_validate.extend(s.candidate.video_id for s in viable)
    warn(f"Validating {len(set(to_validate))} candidate videos...")
    videos = fetch_videos(to_validate)

    for result in pending:
        if result.overridden:
            if result.chosen:
                decide_override(result, videos)
            continue
        decide(result, videos, accept, review)
    return pending


def playability(video_id: str, videos: dict[str, VideoInfo]) -> str | None:
    video = videos.get(video_id)
    if video is None:
        return "unavailable"
    return video.unplayable_reason() or video.refused_reason()


def decide_override(result: TrackResult, videos: dict[str, VideoInfo]) -> None:
    video_id = result.chosen.candidate.video_id
    problem = playability(video_id, videos)
    if problem:
        result.status, result.reason = "rejected", f"override_{problem}"
    else:
        result.video = videos[video_id]


def decide(result: TrackResult, videos: dict[str, VideoInfo], accept: float, review: float) -> None:
    if not result.candidates:
        result.status, result.reason = "rejected", "no_results"
        return

    best_overall = result.candidates[0]
    for scored in result.candidates:
        if scored.score.total < review:
            break
        problem = playability(scored.candidate.video_id, videos)
        if problem:
            scored.rejected_because = problem
            continue
        result.chosen, result.video = scored, videos[scored.candidate.video_id]
        if scored.score.total >= accept:
            result.status = "accepted"
        else:
            result.status = "review"
            result.reason = "low_confidence: " + (", ".join(scored.score.problems) or "borderline score")
        return

    result.chosen = best_overall
    if best_overall.score.total >= review:
        result.reason = "no_playable_match: " + ", ".join(
            f"{s.candidate.video_id} {s.rejected_because}" for s in result.candidates if s.rejected_because
        )
    else:
        result.reason = "low_score: " + (", ".join(best_overall.score.problems) or "weak overall match")
    result.status = "rejected"
