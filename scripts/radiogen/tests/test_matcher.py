import unittest

from radiogen.matcher import ACCEPT_THRESHOLD, REVIEW_THRESHOLD, Candidate, clean_title, score_candidate


def score(title, artists, duration, candidate):
    return score_candidate(title, tuple(artists), duration, candidate)


class CleanTitleTest(unittest.TestCase):
    def test_strips_upload_noise_and_features(self):
        self.assertEqual(clean_title("Tití Me Preguntó (Official Video) ft. Someone"), "titi me pregunto")
        self.assertEqual(clean_title("Song [4K Remaster] | Album Name"), "song")

    def test_keeps_version_words_that_change_the_recording(self):
        self.assertEqual(clean_title("Song (Live)"), "song live")


class ScoreCandidateTest(unittest.TestCase):
    def test_official_audio_with_matching_length_is_accepted(self):
        c = Candidate("a", "Jenifer", ("Els Catarres",), 232, "MUSIC_VIDEO_TYPE_ATV")
        self.assertGreaterEqual(score("Jenifer", ["Els Catarres"], 232, c).total, ACCEPT_THRESHOLD)

    def test_music_video_with_intro_is_still_accepted(self):
        c = Candidate("a", "Els Catarres - Jenifer (Videoclip Oficial)", ("Els Catarres",), 240, "MUSIC_VIDEO_TYPE_OMV")
        self.assertGreaterEqual(score("Jenifer", ["Els Catarres"], 232, c).total, ACCEPT_THRESHOLD)

    def test_same_title_other_recording_loses_on_duration(self):
        right = Candidate("a", "Jenifer", ("Els Catarres",), 232, "MUSIC_VIDEO_TYPE_ATV")
        wrong = Candidate("b", "Jenifer", ("Els Catarres", "Figa Flawas"), 177, "MUSIC_VIDEO_TYPE_ATV")
        s_right = score("Jenifer", ["Els Catarres"], 232, right)
        s_wrong = score("Jenifer", ["Els Catarres"], 232, wrong)
        self.assertGreater(s_right.total, s_wrong.total)
        self.assertLess(s_wrong.total, ACCEPT_THRESHOLD)
        self.assertIn("duration_mismatch(-55s)", s_wrong.problems)

    def test_unrequested_version_is_penalised(self):
        c = Candidate("a", "Creep (Live at Glastonbury)", ("Radiohead",), 240, "MUSIC_VIDEO_TYPE_UGC")
        s = score("Creep", ["Radiohead"], 238, c)
        self.assertLess(s.total, ACCEPT_THRESHOLD)
        self.assertTrue(any(p.startswith("other_version") for p in s.problems))

    def test_requested_version_is_not_penalised(self):
        c = Candidate("a", "Sola (Remix)", ("Anuel AA", "Daddy Yankee"), 309, "MUSIC_VIDEO_TYPE_ATV")
        self.assertGreaterEqual(score("Sola - Remix", ["Anuel AA", "Daddy Yankee"], 309, c).total, ACCEPT_THRESHOLD)

    def test_a_stranger_is_never_accepted_even_on_a_perfect_title(self):
        c = Candidate("a", "Halo", ("Some Cover Band",), 225, "MUSIC_VIDEO_TYPE_UGC")
        s = score("Halo", ["Beyoncé"], 225, c)
        self.assertLess(s.total, REVIEW_THRESHOLD)
        self.assertIn("artist_mismatch", s.problems)

    def test_accents_and_channel_suffixes_do_not_break_the_artist_match(self):
        c = Candidate("a", "Beyonce - Halo", ("BeyoncéVEVO",), 225, "MUSIC_VIDEO_TYPE_OMV")
        self.assertGreaterEqual(score("Halo", ["Beyoncé"], 225, c).artist, 0.7)

    def test_featured_artists_raise_the_artist_score(self):
        both = Candidate("a", "Secreto", ("Anuel AA", "KAROL G"), 258, "MUSIC_VIDEO_TYPE_ATV")
        one = Candidate("b", "Secreto", ("Anuel AA",), 258, "MUSIC_VIDEO_TYPE_ATV")
        artists = ["Anuel AA", "KAROL G"]
        self.assertGreater(score("Secreto", artists, 258, both).artist, score("Secreto", artists, 258, one).artist)


if __name__ == "__main__":
    unittest.main()
