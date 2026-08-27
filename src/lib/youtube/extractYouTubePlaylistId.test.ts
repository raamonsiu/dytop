import { describe, expect, it } from "vitest";
import { extractYouTubePlaylistId } from "./extractYouTubePlaylistId";

const LIST_ID = "PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb";

describe("extractYouTubePlaylistId", () => {
  it.each([
    ["bare host", `https://youtube.com/playlist?list=${LIST_ID}`],
    ["www host", `https://www.youtube.com/playlist?list=${LIST_ID}`],
    ["no-cookie host", `https://www.youtube-nocookie.com/playlist?list=${LIST_ID}`],
    ["http", `http://www.youtube.com/playlist?list=${LIST_ID}`],
  ])("reads the id from a %s URL", (_label, url) => {
    expect(extractYouTubePlaylistId(url)).toBe(LIST_ID);
  });

  it("survives surrounding whitespace", () => {
    expect(extractYouTubePlaylistId(`  https://www.youtube.com/playlist?list=${LIST_ID}  `)).toBe(
      LIST_ID,
    );
  });

  it("ignores extra query parameters", () => {
    expect(
      extractYouTubePlaylistId(`https://www.youtube.com/playlist?list=${LIST_ID}&index=3`),
    ).toBe(LIST_ID);
  });

  it.each([
    ["not a URL", "just some text"],
    ["empty", ""],
    ["another host", "https://vimeo.com/12345678"],
    ["a lookalike host", `https://evil-youtube.com/playlist?list=${LIST_ID}`],
    // A video URL that also carries a list param stays a single-track add.
    ["a watch URL with a list param", `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${LIST_ID}`],
    ["a watch URL without a list param", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["a playlist page without a list param", "https://www.youtube.com/playlist"],
    ["an id with invalid characters", "https://www.youtube.com/playlist?list=abc!def"],
  ])("returns null for %s", (_label, url) => {
    expect(extractYouTubePlaylistId(url)).toBeNull();
  });
});
