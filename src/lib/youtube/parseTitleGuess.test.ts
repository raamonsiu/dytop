import { describe, expect, it } from "vitest";
import { artistFromChannel, parseTitleGuess } from "./parseTitleGuess";

describe("parseTitleGuess", () => {
  it("splits on a spaced hyphen", () => {
    expect(parseTitleGuess("Boards of Canada - Roygbiv")).toEqual({
      artist: "Boards of Canada",
      title: "Roygbiv",
    });
  });

  it.each([
    ["en dash", "Aphex Twin – Xtal"],
    ["em dash", "Aphex Twin — Xtal"],
  ])("splits on %s too", (_label, raw) => {
    expect(parseTitleGuess(raw)).toEqual({ artist: "Aphex Twin", title: "Xtal" });
  });

  it("keeps everything after the first separator in the title", () => {
    expect(parseTitleGuess("Artist - Song - Remix")).toEqual({
      artist: "Artist",
      title: "Song - Remix",
    });
  });

  it("leaves the artist empty when there is no separator", () => {
    expect(parseTitleGuess("Untitled Track")).toEqual({
      artist: "",
      title: "Untitled Track",
    });
  });

  it.each([
    ["parenthesised", "Artist - Song (Official Video)"],
    ["bracketed", "Artist - Song [Official Audio]"],
    ["lyric video", "Artist - Song (Lyrics)"],
    ["resolution tag", "Artist - Song [4K]"],
  ])("strips %s upload noise", (_label, raw) => {
    expect(parseTitleGuess(raw)).toEqual({ artist: "Artist", title: "Song" });
  });

  it("keeps bracketed text that is part of the title", () => {
    // "(Live)" picks out a different recording, so dropping it would send the
    // lyrics lookup after the studio version instead.
    expect(parseTitleGuess("Artist - Song (Live)")).toEqual({
      artist: "Artist",
      title: "Song (Live)",
    });
  });

  it("does not split on an unspaced hyphen", () => {
    expect(parseTitleGuess("Jean-Michel Jarre")).toEqual({
      artist: "",
      title: "Jean-Michel Jarre",
    });
  });

  it("handles an empty title", () => {
    expect(parseTitleGuess("")).toEqual({ artist: "", title: "" });
  });

  it.each([
    ["album", "Mora - VOLANDO | PRIMER DIA DE CLASES", "VOLANDO"],
    ["playlist", "Sean Paul - She Doesn't Mind | Lyrics", "She Doesn't Mind"],
  ])("drops the %s trailer after the bar", (_label, raw, title) => {
    expect(parseTitleGuess(raw)).toEqual({ artist: raw.split(" - ")[0], title });
  });

  it("keeps a bar when there is no separator, since it may be the separator", () => {
    // Truncating here would leave title === artist and ask for the wrong song.
    expect(parseTitleGuess("Don Omar | Zumba")).toEqual({
      artist: "",
      title: "Don Omar | Zumba",
    });
  });

  it("collapses the gap that stripping noise leaves behind", () => {
    expect(parseTitleGuess("Artist - Song (Official Video) Live")).toEqual({
      artist: "Artist",
      title: "Song Live",
    });
  });
});

describe("parseTitleGuess with the uploading channel", () => {
  it("stands in as the artist when there is no separator to split", () => {
    expect(parseTitleGuess("Boig Per Tu", "Sau - Topic")).toEqual({
      artist: "Sau",
      title: "Boig Per Tu",
    });
  });

  it("flips a title the channel shows is the wrong way round", () => {
    // Lyric-video channels write "Song - Artist" as consistently as everyone
    // else writes "Artist - Song"; the channel is what settles which one.
    expect(parseTitleGuess("IGUALES - Quevedo (Visualizer) | BUENAS NOCHES", "Quevedo")).toEqual({
      artist: "Quevedo",
      title: "IGUALES",
    });
  });

  it("leaves the natural reading alone when the channel confirms it", () => {
    expect(parseTitleGuess("Els Catarres - Vull estar amb tu", "Els Catarres")).toEqual({
      artist: "Els Catarres",
      title: "Vull estar amb tu",
    });
  });

  it("keeps the natural reading when the channel names neither half", () => {
    // Nothing to go on, so the lookup's swapped retry gets to decide instead.
    expect(parseTitleGuess("Morat, Juanes - Besos En Guerra", "MoratVEVO")).toEqual({
      artist: "Morat, Juanes",
      title: "Besos En Guerra",
    });
  });

  it("matches the channel regardless of capitalisation", () => {
    expect(parseTitleGuess("Jenifer - ELS CATARRES", "Els Catarres")).toEqual({
      artist: "ELS CATARRES",
      title: "Jenifer",
    });
  });
});

describe("artistFromChannel", () => {
  it("drops YouTube's auto-generated Topic suffix", () => {
    expect(artistFromChannel("Zion & Lennox - Topic")).toBe("Zion & Lennox");
  });

  it("drops it whichever dash the channel used", () => {
    expect(artistFromChannel("Sau – Topic")).toBe("Sau");
  });

  it("leaves an ordinary channel name alone", () => {
    expect(artistFromChannel("Els Catarres")).toBe("Els Catarres");
  });

  it("only strips the suffix, not a hyphen inside the name", () => {
    expect(artistFromChannel("Topic - Topic Records")).toBe("Topic - Topic Records");
  });
});
