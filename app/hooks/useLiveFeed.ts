"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { LiveFeedPayload } from "@/lib/live-feed";

const fetcher = async (url: string): Promise<LiveFeedPayload> => {
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Live feed request failed with ${response.status}`);
  }

  return response.json() as Promise<LiveFeedPayload>;
};

export function useLiveFeed() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);

    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const swr = useSWR<LiveFeedPayload>("/api/live-feed", fetcher, {
    refreshInterval: isVisible ? 1000 : 0,
    dedupingInterval: 500,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    keepPreviousData: true,
    onSuccess: (payload) => setLastSuccessAt(payload.fetchedAt)
  });

  return useMemo(
    () => ({
      ...swr,
      isPaused: !isVisible,
      isFallback: swr.data?.source === "fallback",
      lastSuccessAt
    }),
    [isVisible, lastSuccessAt, swr]
  );
}
