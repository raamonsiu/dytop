import { describe, expect, it } from "vitest";
import { extractYouTubeId } from "./extractYouTubeId";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it.each([
    ["watch", `https://www.youtube.com/watch?v=${ID}`],
    ["short host", `https://youtu.be/${ID}`],
    ["shorts", `https://www.youtube.com/shorts/${ID}`],
    ["embed", `https://www.youtube.com/embed/${ID}`],
    ["no-cookie embed", `https://www.youtube-nocookie.com/embed/${ID}`],
    ["bare host", `https://youtube.com/watch?v=${ID}`],
    ["http", `http://www.youtube.com/watch?v=${ID}`],
  ])("reads the id from a %s URL", (_label, url) => {
    expect(extractYouTubeId(url)).toBe(ID);
  });

  it("ignores extra query parameters", () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}&t=42s&list=PL1`)).toBe(ID);
  });

  it("survives surrounding whitespace", () => {
    expect(extractYouTubeId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it("keeps the id when the short URL carries a query string", () => {
    expect(extractYouTubeId(`https://youtu.be/${ID}?t=42`)).toBe(ID);
  });

  it.each([
    ["not a URL", "just some text"],
    ["empty", ""],
    ["another host", "https://vimeo.com/12345678"],
    ["a playlist page", "https://www.youtube.com/playlist?list=PL1"],
    ["a channel page", "https://www.youtube.com/@d1ito"],
    ["watch without v", "https://www.youtube.com/watch?list=PL1"],
    ["an id that is too short", "https://youtu.be/abc"],
    ["an id that is too long", `https://youtu.be/${ID}EXTRA`],
    ["an id with invalid characters", "https://youtu.be/abcdefg!hij"],
    ["a lookalike host", `https://evil-youtube.com/watch?v=${ID}`],
    ["a lookalike short host", `https://notyoutu.be/${ID}`],
  ])("returns null for %s", (_label, url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});
