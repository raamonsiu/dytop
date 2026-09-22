"""Everything needed to rebuild a station, kept beside the repo so `sync` works.

One committed file per station, scripts/radio-stations/<id>.json:

    { "source": "spotify",
      "playlists": ["https://open.spotify.com/playlist/70DN..."],
      "region": "ES",
      "accept": 0.8,
      "review": 0.6,
      "overrides": { "spotify:track:abc": "dQw4w9WgXcQ",
                     "spotify:track:def": null },
      "lastBuilt": "2026-09-23" }

`overrides` is the hand-settled half and is never overwritten by a build, so
a re-sync keeps every decision made from a previous report.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import date

from .station_file import REPO_ROOT

CONFIG_DIR = os.path.join(REPO_ROOT, "scripts", "radio-stations")


@dataclass
class StationConfig:
    station_id: str
    source: str  # "yt" | "spotify"
    playlists: list[str]  # one for yt, one or more for spotify
    region: str = "ES"
    accept: float = 0.80
    review: float = 0.60
    overrides: dict[str, str | None] = field(default_factory=dict)
    last_built: str = ""

    def to_json(self) -> dict:
        return {
            "source": self.source,
            "playlists": self.playlists,
            "region": self.region,
            "accept": self.accept,
            "review": self.review,
            "overrides": self.overrides,
            "lastBuilt": self.last_built,
        }


def path_for(station_id: str) -> str:
    return os.path.join(CONFIG_DIR, f"{station_id}.json")


def exists(station_id: str) -> bool:
    return os.path.exists(path_for(station_id))


def load(station_id: str) -> StationConfig:
    try:
        with open(path_for(station_id), encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise SystemExit(
            f"No saved source for station {station_id!r}. Build it once with "
            f"`yt`/`spotify` and it will be remembered here."
        ) from None
    return StationConfig(
        station_id=station_id,
        source=data["source"],
        playlists=data["playlists"],
        region=data.get("region", "ES"),
        accept=data.get("accept", 0.80),
        review=data.get("review", 0.60),
        overrides=data.get("overrides", {}),
        last_built=data.get("lastBuilt", ""),
    )


def save(config: StationConfig) -> str:
    """Keeps the overrides already on disk: a build never discards hand work."""
    if exists(config.station_id):
        config.overrides = {**load(config.station_id).overrides, **config.overrides}
    config.last_built = date.today().isoformat()
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(path_for(config.station_id), "w", encoding="utf-8", newline="\n") as f:
        json.dump(config.to_json(), f, indent=2, ensure_ascii=False)
        f.write("\n")
    return path_for(config.station_id)


def list_station_ids() -> list[str]:
    if not os.path.isdir(CONFIG_DIR):
        return []
    return sorted(f[:-5] for f in os.listdir(CONFIG_DIR) if f.endswith(".json"))
