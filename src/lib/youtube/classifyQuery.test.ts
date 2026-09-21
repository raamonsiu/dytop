import { describe, expect, it } from "vitest";
import { classifyQuery } from "./classifyQuery";

describe("classifyQuery", () => {
  it.each(["", "   ", "\n"])("treats %j as empty", (value) => {
    expect(classifyQuery(value)).toBe("empty");
  });

  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "http://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/playlist?list=PL123",
    "  https://example.com/whatever  ",
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "www.youtube.com/watch?v=dQw4w9WgXcQ",
    "m.youtube.com/watch?v=dQw4w9WgXcQ",
    "music.youtube.com/watch?v=dQw4w9WgXcQ",
    "youtu.be/dQw4w9WgXcQ",
    "HTTPS://YOUTUBE.COM/watch?v=dQw4w9WgXcQ",
  ])("treats %s as a URL", (value) => {
    expect(classifyQuery(value)).toBe("url");
  });

  it.each([
    "daft punk one more time",
    "ac/dc",
    "dQw4w9WgXcQ",
    "youtube.community song",
    "https",
    "youtubers react",
  ])("treats %s as a search", (value) => {
    expect(classifyQuery(value)).toBe("search");
  });
});
