import json
import unittest

from radiogen import spotify_embed, station_file, youtube_api, youtube_public


def embed_page(track_list, name="Mix"):
    data = {"props": {"pageProps": {"state": {"data": {"entity": {"name": name, "trackList": track_list}}}}}}
    return f'<html><script id="__NEXT_DATA__" type="application/json">{json.dumps(data)}</script></html>'


class SpotifyEmbedTest(unittest.TestCase):
    def test_extracts_the_id_from_every_link_shape(self):
        pid = "37i9dQZF1DXcBWIGoYBM5M"
        for value in (
            pid,
            f"https://open.spotify.com/playlist/{pid}?si=abc",
            f"https://open.spotify.com/intl-es/playlist/{pid}",
            f"spotify:playlist:{pid}",
        ):
            self.assertEqual(spotify_embed.extract_playlist_id(value), pid)

    def test_recognises_a_share_link_without_resolving_it_here(self):
        self.assertTrue(spotify_embed.SHORT_LINK_RE.match("https://open.spotify.com/s/MfMJL1p"))
        self.assertTrue(spotify_embed.SHORT_LINK_RE.match("https://spotify.link/abc123"))
        self.assertFalse(spotify_embed.SHORT_LINK_RE.match("https://open.spotify.com/playlist/x"))

    def test_parses_tracks_and_splits_artists_only_on_the_nbsp_separator(self):
        page = embed_page([
            {"uri": "spotify:track:1", "title": "Under Pressure", "subtitle": "Queen, David Bowie", "duration": 248440, "entityType": "track"},
            {"uri": "spotify:track:2", "title": "EARFQUAKE", "subtitle": "Tyler, The Creator", "duration": 190066, "entityType": "track"},
        ])  # fmt: skip
        name, tracks = spotify_embed.parse_embed("x", page)
        self.assertEqual(name, "Mix")
        self.assertEqual(tracks[0].artists, ("Queen", "David Bowie"))
        self.assertEqual(tracks[0].duration_sec, 248)
        self.assertEqual(tracks[1].artists, ("Tyler, The Creator",))

    def test_changed_markup_fails_loudly(self):
        with self.assertRaises(SystemExit):
            spotify_embed.parse_embed("x", "<html></html>")

    def test_reads_the_real_track_count(self):
        self.assertEqual(spotify_embed.parse_song_count('<meta name="music:song_count" content="200"/>'), 200)


class YouTubeApiTest(unittest.TestCase):
    def test_parses_iso_durations(self):
        self.assertEqual(youtube_api.parse_iso8601_duration("PT4M13S"), 253)
        self.assertEqual(youtube_api.parse_iso8601_duration("PT1H2M"), 3720)
        self.assertEqual(youtube_api.parse_iso8601_duration("P0D"), 0)

    def test_region_restrictions_cover_block_and_allow_lists(self):
        self.assertTrue(youtube_api.is_region_blocked({"regionRestriction": {"blocked": ["ES"]}}, "ES"))
        self.assertTrue(youtube_api.is_region_blocked({"regionRestriction": {"allowed": ["US"]}}, "ES"))
        self.assertFalse(youtube_api.is_region_blocked({"regionRestriction": {"allowed": ["ES"]}}, "ES"))
        self.assertFalse(youtube_api.is_region_blocked({}, "ES"))
        self.assertFalse(youtube_api.is_region_blocked({"regionRestriction": {"blocked": ["ES"]}}, ""))


class YouTubePublicTest(unittest.TestCase):
    """The keyless backend must answer the same questions as the Data API one."""

    def info(self, oembed, embeddable, details):
        return youtube_public.to_video_info("vid", oembed, embeddable, details)

    def test_an_embeddable_video_prefers_the_uploads_own_title_and_channel(self):
        video = self.info(
            {"title": "Danny Ocean - Me Rehúso (Official Audio)", "author_name": "Danny Ocean"},
            True,
            {"title": "Me Rehúso", "author": "Danny Ocean", "lengthSeconds": "206", "isLiveContent": False},
        )
        self.assertEqual(video.title, "Danny Ocean - Me Rehúso (Official Audio)")
        self.assertEqual(video.duration_sec, 206)
        self.assertIsNone(video.unplayable_reason())
        self.assertIsNone(video.refused_reason())

    def test_a_refused_embed_has_no_oembed_data_and_falls_back_to_music_metadata(self):
        video = self.info(None, False, {"title": "Sexy Bitch", "author": "David Guetta", "lengthSeconds": "211"})
        self.assertEqual(video.title, "Sexy Bitch")
        self.assertEqual(video.refused_reason(), "not_embeddable")

    def test_a_live_stream_is_unplayable_whatever_length_it_claims(self):
        video = self.info({"title": "lofi radio", "author_name": "Lofi Girl"}, True, {"lengthSeconds": "121601512", "isLiveContent": True})
        self.assertEqual(video.unplayable_reason(), "live_broadcast")

    def test_region_restrictions_are_never_claimed_without_the_data_api(self):
        self.assertFalse(self.info({"title": "t", "author_name": "a"}, True, {"lengthSeconds": "200"}).region_blocked)


class StationFileTest(unittest.TestCase):
    def test_renders_escaped_entries_and_only_flags_blocked_ones(self):
        ts = station_file.render(
            [
                station_file.Entry("a", 200, 'Say "Hi"', "Chan"),
                station_file.Entry("b", 180, "Back\\slash", "Chan", blocked=True),
            ],
            ["https://example.com/p"],
        )
        self.assertIn('{ videoId: "a", durationSec: 200, title: "Say \\"Hi\\"", author: "Chan" },', ts)
        self.assertIn('title: "Back\\\\slash", author: "Chan", blocked: true },', ts)
        self.assertIn("export const manifest: RadioManifestEntry[] = [", ts)

    def test_reads_the_fallback_id_from_the_real_manifest(self):
        self.assertEqual(station_file.read_fallback_video_id(), "kJQP7kiw5Fk")

    def test_rejects_station_ids_that_are_not_file_safe(self):
        with self.assertRaises(SystemExit):
            station_file.validate_station_id("Latin Mix")


if __name__ == "__main__":
    unittest.main()
