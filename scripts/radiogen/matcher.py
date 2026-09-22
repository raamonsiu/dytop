"""Scores how likely a YouTube result is the same recording as a Spotify track.

Pure functions only, so the thresholds can be tuned against fixtures without
touching the network. There is no shared id to join on (Development Mode lost
ISRCs, and YouTube never exposed them), so the score combines three weak
signals that are strong together:

  - duration: Spotify's is the canonical master length, and a different
    version (radio edit, feat. remix, live) almost always differs by seconds;
  - title: token overlap after stripping upload noise;
  - artist: the primary artist must appear in YouTube's artists, channel or
    title, or the candidate is rejected outright.

Version words ("live", "remix", "sped up"...) the Spotify title does not have
are penalised, since those uploads share the title and artist by design.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher

ACCEPT_THRESHOLD = 0.80
REVIEW_THRESHOLD = 0.60

WEIGHT_TITLE = 0.35
WEIGHT_ARTIST = 0.30
WEIGHT_DURATION = 0.35
# Official audio ("Topic" ATV) and official videos beat re-uploads on a tie.
OFFICIAL_BONUS = 0.03
OFFICIAL_TYPES = {"MUSIC_VIDEO_TYPE_ATV", "MUSIC_VIDEO_TYPE_OMV"}

VERSION_PENALTY = 0.25
MAX_VERSION_PENALTY = 0.5
VERSION_MARKERS = (
    "live", "en vivo", "en directo", "ao vivo", "directo", "cover", "karaoke",
    "instrumental", "sped up", "speed up", "slowed", "reverb", "8d", "nightcore",
    "remix", "acoustic", "acustico", "acustic", "extended", "mashup", "bass boosted",
)  # fmt: skip

# Bracketed groups that describe the upload rather than the recording.
NOISE_BRACKET_RE = re.compile(
    r"[(\[][^()\[\]]*?\b(official|oficial|video|videoclip|clip|audio|lyrics?|letra|lletra|"
    r"visuali[sz]er|hd|hq|4k|mv|remaster(ed)?|explicit)\b[^()\[\]]*?[)\]]",
    re.I,
)
FEAT_RE = re.compile(r"[(\[]?\b(feat|ft|featuring)\b\.?.*?([)\]]|$)", re.I)
CHANNEL_NOISE_RE = re.compile(r"(vevo|\s[-–—]\stopic|\bofficial\b|\boficial\b|\bmusic\b|\btv\b)", re.I)


@dataclass(frozen=True)
class Candidate:
    video_id: str
    title: str
    artists: tuple[str, ...]  # as YouTube Music attributes them; uploader for UGC
    duration_sec: int | None
    video_type: str | None = None


@dataclass
class Score:
    total: float
    title: float
    artist: float
    duration: float
    duration_delta: int | None
    version_penalty: float
    problems: list[str] = field(default_factory=list)

    def describe(self) -> str:
        delta = "?" if self.duration_delta is None else f"{self.duration_delta:+d}s"
        return f"{self.total:.2f} (title {self.title:.2f}, artist {self.artist:.2f}, duration {delta})"


def fold(text: str) -> str:
    """Lowercase, accentless, punctuation to spaces: the form every comparison uses."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = text.replace("&", " and ").replace("$", "s")
    return " ".join(re.sub(r"[^\w\s]", " ", text).split())


def clean_title(title: str) -> str:
    """Drops upload noise and featured-artist credits before folding."""
    title = NOISE_BRACKET_RE.sub(" ", title)
    title = FEAT_RE.sub(" ", title)
    title = re.sub(r"\s\|\s.*$", "", title)  # "Song | Album name" trailers
    return fold(title)


def clean_channel(name: str) -> str:
    return fold(CHANNEL_NOISE_RE.sub(" ", name))


def contains_phrase(haystack: str, phrase: str) -> bool:
    """Whole-word containment on folded text, so "ozuna" never matches "ozunas"."""
    return bool(phrase) and f" {phrase} " in f" {haystack} "


def artist_score(spotify_artists: tuple[str, ...], candidate: Candidate) -> float:
    if not spotify_artists:
        return 0.0
    haystack = " ".join(
        [fold(candidate.title)]
        + [fold(a) for a in candidate.artists]
        + [clean_channel(a) for a in candidate.artists]
    )
    hits = [contains_phrase(haystack, fold(a)) for a in spotify_artists]
    primary, others = hits[0], hits[1:]
    if primary:
        return 0.7 + 0.3 * (sum(others) / len(others) if others else 1.0)
    # A feat. artist's own upload is plausible but far from certain.
    return 0.4 * sum(others) / len(others) if others else 0.0


def title_score(spotify_title: str, spotify_artists: tuple[str, ...], candidate: Candidate) -> float:
    wanted = clean_title(spotify_title)
    got = clean_title(candidate.title)
    # "Artist - Song" uploads: the artist words are not extra title words.
    for artist in spotify_artists:
        got = f" {got} ".replace(f" {fold(artist)} ", " ").strip()
    wanted_tokens, got_tokens = set(wanted.split()), set(got.split())
    if not wanted_tokens or not got_tokens:
        return 0.0
    common = wanted_tokens & got_tokens
    coverage = len(common) / len(wanted_tokens)
    precision = len(common) / len(got_tokens)
    return max(0.7 * coverage + 0.3 * precision, SequenceMatcher(None, wanted, got).ratio())


def duration_score(delta: int | None) -> float:
    """Masters match to the second; official videos add intros, re-uploads trim."""
    if delta is None:
        return 0.3
    delta = abs(delta)
    if delta <= 3:
        return 1.0
    if delta <= 10:
        return 0.8
    if delta <= 20:
        return 0.5
    if delta <= 40:
        return 0.2
    return 0.0


def version_markers(spotify_title: str, candidate_title: str) -> list[str]:
    wanted, got = fold(spotify_title), fold(candidate_title)
    return [m for m in VERSION_MARKERS if contains_phrase(got, m) and not contains_phrase(wanted, m)]


def score_candidate(spotify_title: str, spotify_artists: tuple[str, ...], spotify_duration: int, candidate: Candidate) -> Score:
    delta = None if candidate.duration_sec is None else candidate.duration_sec - spotify_duration
    t = title_score(spotify_title, spotify_artists, candidate)
    a = artist_score(spotify_artists, candidate)
    d = duration_score(delta)
    markers = version_markers(spotify_title, candidate.title)
    penalty = min(MAX_VERSION_PENALTY, VERSION_PENALTY * len(markers))
    bonus = OFFICIAL_BONUS if candidate.video_type in OFFICIAL_TYPES else 0.0
    total = WEIGHT_TITLE * t + WEIGHT_ARTIST * a + WEIGHT_DURATION * d - penalty + bonus

    problems = []
    if a == 0.0:
        problems.append("artist_mismatch")
        total = min(total, REVIEW_THRESHOLD - 0.01)  # never auto-accept a stranger
    elif a < 0.7:
        problems.append("primary_artist_missing")
        total = min(total, ACCEPT_THRESHOLD - 0.01)  # at best worth a human look
    if t < 0.6:
        problems.append("title_mismatch")
    if delta is not None and abs(delta) > 20:
        problems.append(f"duration_mismatch({delta:+d}s)")
    if markers:
        problems.append(f"other_version({', '.join(markers)})")

    return Score(
        total=round(max(0.0, min(1.0, total)), 3),
        title=round(t, 3),
        artist=round(a, 3),
        duration=d,
        duration_delta=delta,
        version_penalty=penalty,
        problems=problems,
    )
