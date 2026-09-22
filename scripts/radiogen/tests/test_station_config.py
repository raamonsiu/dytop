import json
import os
import tempfile
import unittest
from unittest import mock

from radiogen import station_config, station_file
from radiogen.station_config import StationConfig


class StationConfigTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        patcher = mock.patch.object(station_config, "CONFIG_DIR", self.dir.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def config(self, **kwargs):
        return StationConfig(station_id="latin", source="spotify", playlists=["https://open.spotify.com/playlist/a"], **kwargs)

    def test_a_saved_source_comes_back_the_same(self):
        station_config.save(self.config(region="FR", accept=0.9))
        loaded = station_config.load("latin")
        self.assertEqual(loaded.source, "spotify")
        self.assertEqual(loaded.playlists, ["https://open.spotify.com/playlist/a"])
        self.assertEqual(loaded.region, "FR")
        self.assertEqual(loaded.accept, 0.9)
        self.assertTrue(loaded.last_built)

    def test_a_rebuild_never_discards_hand_settled_overrides(self):
        station_config.save(self.config(overrides={"spotify:track:a": "vid1", "spotify:track:b": None}))
        station_config.save(self.config(overrides={}))  # a plain rebuild passes none
        self.assertEqual(station_config.load("latin").overrides, {"spotify:track:a": "vid1", "spotify:track:b": None})

    def test_an_unknown_station_says_how_to_create_it(self):
        with self.assertRaises(SystemExit) as caught:
            station_config.load("nope")
        self.assertIn("Build it once", str(caught.exception))

    def test_lists_only_saved_stations(self):
        self.assertEqual(station_config.list_station_ids(), [])
        station_config.save(self.config())
        with open(os.path.join(self.dir.name, "notes.txt"), "w", encoding="utf-8") as f:
            f.write("ignored")
        self.assertEqual(station_config.list_station_ids(), ["latin"])

    def test_writes_readable_json(self):
        path = station_config.save(self.config())
        with open(path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["source"], "spotify")


class StationDiffTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def test_reads_back_what_a_generated_station_holds(self):
        station_file.write(
            "latin",
            [station_file.Entry("a", 200, 'Artist - Say "Hi"', "Chan"), station_file.Entry("b", 180, "Other", "Chan")],
            ["https://example.com"],
            out_dir=self.dir.name,
        )
        self.assertEqual(station_file.read_entries("latin", self.dir.name), {"a": 'Artist - Say "Hi"', "b": "Other"})

    def test_an_unbuilt_station_has_nothing_to_compare(self):
        self.assertEqual(station_file.read_entries("never-built", self.dir.name), {})

    def test_changes_name_what_the_playlist_gained_and_lost(self):
        changes = station_file.describe_changes({"a": "Gone", "b": "Kept"}, {"b": "Kept", "c": "New"})
        self.assertEqual(changes, ["- Gone", "+ New"])

    def test_no_changes_when_the_playlist_stood_still(self):
        self.assertEqual(station_file.describe_changes({"a": "Same"}, {"a": "Same"}), [])


if __name__ == "__main__":
    unittest.main()
