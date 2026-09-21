import { afterEach, describe, expect, it, vi } from "vitest";
import { YT_SEARCH_PROXY_PATH, YT_SEARCH_VIDEOS_ONLY } from "@/constants/youtube";
import { parseSearchResponse, searchVideos, searchVideosMore } from "./search";

// Trimmed from real InnerTube responses (September 2026), keeping only the
// fields the parser reads plus enough structure around them to be faithful.

const video = {
  videoRenderer: {
    videoId: "FGBhQbmPwH8",
    title: { runs: [{ text: "Daft Punk - One More Time (Official Video)" }] },
    ownerText: { runs: [{ text: "Daft Punk" }] },
    lengthText: { simpleText: "5:22" },
    shortViewCountText: { simpleText: "618M views" },
    navigationEndpoint: { watchEndpoint: { videoId: "FGBhQbmPwH8" } },
  },
};

const secondVideo = {
  videoRenderer: {
    videoId: "A2VpR8HahKc",
    title: { runs: [{ text: "Daft Punk - One More Time " }, { text: "(Official Audio)" }] },
    longBylineText: { runs: [{ text: "Daft Punk" }] },
    lengthText: { simpleText: "5:21" },
    navigationEndpoint: { watchEndpoint: { videoId: "A2VpR8HahKc" } },
  },
};

const liveStream = {
  videoRenderer: {
    videoId: "rFZHOHl-L8A",
    title: { runs: [{ text: "lofi hip hop radio 📚 beats to relax/study to" }] },
    ownerText: { runs: [{ text: "Lofi Girl" }] },
    shortViewCountText: {},
    navigationEndpoint: { watchEndpoint: { videoId: "rFZHOHl-L8A" } },
  },
};

const short = {
  videoRenderer: {
    videoId: "abcdefghijk",
    title: { runs: [{ text: "cat #shorts" }] },
    ownerText: { runs: [{ text: "Cats" }] },
    lengthText: { simpleText: "0:15" },
    navigationEndpoint: { reelWatchEndpoint: { videoId: "abcdefghijk" } },
  },
};

const continuationItem = (token: string) => ({
  continuationItemRenderer: {
    trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN",
    continuationEndpoint: { continuationCommand: { token, request: "CONTINUATION_REQUEST_TYPE_SEARCH" } },
  },
});

function firstPage(items: unknown[], token?: string) {
  return {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [
              { itemSectionRenderer: { contents: items } },
              ...(token ? [continuationItem(token)] : []),
            ],
          },
        },
      },
    },
  };
}

function continuationPage(items: unknown[], token?: string) {
  return {
    onResponseReceivedCommands: [
      {
        appendContinuationItemsAction: {
          continuationItems: [
            { itemSectionRenderer: { contents: items } },
            ...(token ? [continuationItem(token)] : []),
          ],
        },
      },
    ],
  };
}

describe("parseSearchResponse", () => {
  it("reads rows and the next-page token from a first page", () => {
    expect(parseSearchResponse(firstPage([video, secondVideo], "TOKEN_1"))).toEqual({
      results: [
        {
          videoId: "FGBhQbmPwH8",
          title: "Daft Punk - One More Time (Official Video)",
          author: "Daft Punk",
          duration: "5:22",
          views: "618M views",
        },
        {
          videoId: "A2VpR8HahKc",
          title: "Daft Punk - One More Time (Official Audio)",
          author: "Daft Punk",
          duration: "5:21",
          views: "",
        },
      ],
      continuation: "TOKEN_1",
    });
  });

  it("reads a continuation page the same way", () => {
    const page = parseSearchResponse(continuationPage([video], "TOKEN_2"));
    expect(page.results.map((result) => result.videoId)).toEqual(["FGBhQbmPwH8"]);
    expect(page.continuation).toBe("TOKEN_2");
  });

  it("reports no continuation on the last page", () => {
    expect(parseSearchResponse(continuationPage([video])).continuation).toBeNull();
  });

  it("drops live streams, shorts and non-video renderers", () => {
    const page = parseSearchResponse(
      firstPage([liveStream, short, { shelfRenderer: { title: {} } }, { adSlotRenderer: {} }, video]),
    );
    expect(page.results.map((result) => result.videoId)).toEqual(["FGBhQbmPwH8"]);
  });

  it("drops a renderer whose id is not a video id", () => {
    const broken = { videoRenderer: { ...video.videoRenderer, videoId: "nope" } };
    expect(parseSearchResponse(firstPage([broken])).results).toEqual([]);
  });

  it.each([null, undefined, 42, "html", [], {}, { contents: { twoColumnSearchResultsRenderer: 7 } }])(
    "survives an unexpected shape (%j)",
    (data) => {
      expect(parseSearchResponse(data)).toEqual({ results: [], continuation: null });
    },
  );
});

describe("searchVideos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(response: Response) {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("posts the query with the video-only filter to the proxy", async () => {
    const fetchMock = stubFetch(Response.json(firstPage([video], "TOKEN_1")));

    const page = await searchVideos("daft punk", "es");

    expect(page.results).toHaveLength(1);
    expect(page.continuation).toBe("TOKEN_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(YT_SEARCH_PROXY_PATH);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("daft punk");
    expect(body.params).toBe(YT_SEARCH_VIDEOS_ONLY);
    expect(body.context.client.hl).toBe("es");
    expect(body.context.client.clientName).toBe("WEB");
  });

  it("posts only the token when asking for the next page", async () => {
    const fetchMock = stubFetch(Response.json(continuationPage([video])));

    await searchVideosMore("TOKEN_1", "en");

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.continuation).toBe("TOKEN_1");
    expect(body.query).toBeUndefined();
  });

  it("rejects on an HTTP error, so the caller can say search is down", async () => {
    stubFetch(new Response("nope", { status: 502 }));
    await expect(searchVideos("daft punk", "en")).rejects.toThrow("502");
  });
});
