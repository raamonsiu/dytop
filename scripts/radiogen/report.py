"""Markdown report of a Spotify import: what was left out, why, and what to try."""

from __future__ import annotations

import os
from datetime import date

from .spotify_station import TrackResult

REPORTS_DIR = "radio-reports"


def youtube_link(video_id: str) -> str:
    return f"https://youtu.be/{video_id}"


def md_cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def minutes(seconds: int) -> str:
    return f"{seconds // 60}:{seconds % 60:02d}"


def render(station_id: str, sources: list[str], results: list[TrackResult], notes: list[str]) -> str:
    accepted = [r for r in results if r.status == "accepted"]
    review = [r for r in results if r.status == "review"]
    rejected = [r for r in results if r.status == "rejected"]

    lines = [
        f"# Radio station `{station_id}` — import report ({date.today().isoformat()})",
        "",
        *[f"- Source: {s}" for s in sources],
        f"- **{len(accepted)} added**, {len(review)} to review, {len(rejected)} rejected, out of {len(results)} tracks.",
        *[f"- ⚠ {n}" for n in notes],
        "",
        "Only the *Added* tracks went into the station. To settle any other track, or to",
        "replace one that was added, put its URI in the overrides file with a videoId",
        "(use it) or `null` (skip it), and run the script again.",
        "",
    ]

    def section(title: str, rows: list[TrackResult]) -> None:
        if not rows:
            return
        lines.extend([
            f"## {title} ({len(rows)})",
            "",
            "| Spotify track | Length | Reason | Best candidate | Score |",
            "|---|---|---|---|---|",
        ])  # fmt: skip
        for r in rows:
            candidate, score = "—", "—"
            if r.chosen and r.chosen.candidate.title:
                c = r.chosen.candidate
                candidate = f"[{md_cell(c.title)}]({youtube_link(c.video_id)}) · {md_cell(', '.join(c.artists))}"
                score = r.chosen.score.describe()
            lines.append(
                f"| {md_cell(r.track.label)}<br>`{r.track.uri}` | {minutes(r.track.duration_sec)} "
                f"| {md_cell(r.reason)} | {candidate} | {score} |"
            )
        lines.append("")

    section("To review", review)
    section("Rejected", rejected)
    # Lowest confidence first: on a first run these are the ones worth opening.
    section("Added, lowest confidence first", sorted(accepted, key=lambda r: r.chosen.score.total if r.chosen else 0))
    return "\n".join(lines)


def write(station_id: str, sources: list[str], results: list[TrackResult], notes: list[str]) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"{station_id}.md")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(render(station_id, sources, results, notes))
    return path
