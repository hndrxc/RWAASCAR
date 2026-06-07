import { NextResponse } from "next/server";
import fallbackFeed from "../../../live-feed.json";
import {
  createLiveFeedPayload,
  isValidLiveFeed,
  type LiveFeedPayload,
  type NascarLiveFeed
} from "@/lib/live-feed";

export const dynamic = "force-dynamic";

const LIVE_FEED_URL = "https://cf.nascar.com/live/feeds/live-feed.json";

function fallbackPayload(fetchedAt: string): LiveFeedPayload {
  return createLiveFeedPayload(fallbackFeed as NascarLiveFeed, "fallback", fetchedAt);
}

export async function GET() {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(LIVE_FEED_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Live feed HTTP ${response.status}`);
    }

    const feed = (await response.json()) as unknown;

    if (!isValidLiveFeed(feed)) {
      throw new Error("Live feed payload is missing vehicles.");
    }

    return NextResponse.json(createLiveFeedPayload(feed, "live", fetchedAt));
  } catch {
    return NextResponse.json(fallbackPayload(fetchedAt));
  }
}
