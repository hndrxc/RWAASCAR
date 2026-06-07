"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveFeedPayload } from "@/lib/live-feed";

const MAX_SNAPSHOTS = 240;

export function useRaceSnapshots(payload: LiveFeedPayload | undefined) {
  const [snapshots, setSnapshots] = useState<LiveFeedPayload[]>([]);
  const [playbackMode, setPlaybackMode] = useState(false);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!payload) {
      return;
    }

    // The hook is intentionally building a bounded history from each successful SWR payload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshots((current) => {
      if (current.at(-1)?.snapshotId === payload.snapshotId) {
        return current;
      }

      return [...current, payload].slice(-MAX_SNAPSHOTS);
    });
  }, [payload]);

  const liveIndex = snapshots.length - 1;
  const activeIndex = playbackMode && selectedSnapshotIndex !== null ? selectedSnapshotIndex : liveIndex;

  return useMemo(() => {
    const boundedIndex = Math.min(Math.max(activeIndex, 0), Math.max(snapshots.length - 1, 0));

    return {
      snapshots,
      currentSnapshot: snapshots[boundedIndex] ?? payload,
      previousSnapshot: boundedIndex > 0 ? snapshots[boundedIndex - 1] : undefined,
      selectedSnapshotIndex: playbackMode ? boundedIndex : null,
      playbackMode,
      setPlaybackMode,
      selectSnapshotIndex: setSelectedSnapshotIndex
    };
  }, [activeIndex, payload, playbackMode, snapshots]);
}
