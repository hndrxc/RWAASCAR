import fallbackFeed from "../live-feed.json";
import { GET } from "../app/api/live-feed/route";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("/api/live-feed", () => {
  it("returns live source when upstream succeeds", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(fallbackFeed), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    ) as typeof fetch;

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("live");
    expect(body.feed).toBeDefined();
    expect(body.race).toBeDefined();
    expect(body.standings.length).toBeGreaterThan(0);
    expect(body.snapshotId).toContain(String(fallbackFeed.race_id));
  });

  it("falls back when upstream fails", async () => {
    global.fetch = vi.fn(async () => new Response("nope", { status: 503 })) as typeof fetch;

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("fallback");
    expect(body.feed.race_id).toBe(fallbackFeed.race_id);
    expect(body.race).toBeDefined();
    expect(body.standings.length).toBe(fallbackFeed.vehicles.length);
  });

  it("falls back when upstream payload is invalid", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ vehicles: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    ) as typeof fetch;

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("fallback");
    expect(body.feed).toBeDefined();
    expect(body.race).toBeDefined();
    expect(body.standings.length).toBeGreaterThan(0);
  });
});
