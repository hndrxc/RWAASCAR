"use client";

import { Fragment, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLiveFeed } from "../hooks/useLiveFeed";
import { useRaceSnapshots } from "../hooks/useRaceSnapshots";
import type { NascarVehicle, Standing } from "@/lib/live-feed";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(max-width: 1024px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function RaceDashboard() {
  const liveFeed = useLiveFeed();
  const snapshotState = useRaceSnapshots(liveFeed.data);
  const payload = snapshotState.currentSnapshot;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const explicitlySelected = payload?.standings.find((standing) => standing.id === selectedId);
  const selectedStanding = explicitlySelected ?? (isMobile ? undefined : payload?.standings[0]);
  const selectedVehicle =
    payload && selectedStanding
      ? payload.feed.vehicles?.find((vehicle) => String(vehicle.vehicle_number) === selectedStanding.vehicleNumber)
      : undefined;

  useEffect(() => {
    if (!isMobile || !selectedId) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest(".row-button") || target.closest(".detail-panel")) {
        return;
      }
      setSelectedId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isMobile, selectedId]);

  if (!payload) {
    return (
      <main className="app-shell">
        <RaceHeader
          flagState={0}
          lapsText="LOADING"
          runName="Race Name"
          statusLabel="CONNECTING"
          statusTone="neutral"
          trackName="Track"
        />
      </main>
    );
  }

  const status = getStatusState({
    completed: payload.race.completed,
    isFallback: liveFeed.isFallback,
    isPaused: liveFeed.isPaused,
    source: payload.source
  });

  const detailContent = selectedStanding ? (
    <DriverDetailPanel
      fetchedAt={payload.fetchedAt}
      onHide={isMobile ? () => setSelectedId(null) : undefined}
      previousSnapshotId={snapshotState.previousSnapshot?.snapshotId}
      raceCompleted={payload.race.completed}
      snapshotCount={snapshotState.snapshots.length}
      standing={selectedStanding}
      vehicle={selectedVehicle}
    />
  ) : null;

  return (
    <main className="app-shell">
      <RaceHeader
        flagState={payload.race.flagState}
        lapsText={payload.race.lapsLeftText}
        runName={payload.race.runName}
        statusLabel={status.label}
        statusTone={status.tone}
        trackName={payload.race.trackName}
      />

      <div className="viewport">
        <section className="leaderboard" id="leaderboard_cont" aria-label="Live race leaderboard">
          <Leaderboard
            completed={payload.race.completed}
            inlineDetail={isMobile ? detailContent : null}
            onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
            reducedMotion={Boolean(reducedMotion)}
            selectedId={selectedStanding?.id ?? null}
            standings={payload.standings}
          />
        </section>

        {!isMobile && (
          <AnimatePresence initial={false}>
            {selectedStanding && (
              <motion.aside
                aria-label="Driver details"
                className="detail-panel detail-panel--rail"
                initial={reducedMotion ? false : { opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
                transition={{ duration: reducedMotion ? 0 : 0.18 }}
              >
                {detailContent}
              </motion.aside>
            )}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}

type HeaderProps = {
  flagState: number;
  lapsText: string;
  runName: string;
  statusLabel: string;
  statusTone: "live" | "local" | "paused" | "neutral" | "complete";
  trackName: string;
};

function RaceHeader({ flagState, lapsText, runName, statusLabel, statusTone, trackName }: HeaderProps) {
  const flagClass = [1, 2, 3, 4, 5, 9].includes(flagState) ? `flag-${flagState}` : "";

  return (
    <header className={`header color ${flagClass}`}>
      <div id="headerc" className={`colorc ${flagClass}`}>
        <div id="runn">{runName}</div>
        <div className="track-name">{trackName}</div>
        <div id="laps">{lapsText}</div>
        <div id="status-ribbon" className={`status status--${statusTone}`}>
          {statusLabel}
        </div>
      </div>
    </header>
  );
}

type LeaderboardProps = {
  completed: boolean;
  inlineDetail?: React.ReactNode;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  selectedId: string | null;
  standings: Standing[];
};

export function Leaderboard({
  completed,
  inlineDetail,
  onSelect,
  reducedMotion,
  selectedId,
  standings
}: LeaderboardProps) {
  return (
    <ol>
      {standings.map((standing) => {
        const isSelected = selectedId === standing.id;
        const rowClassName = [
          "Leaderboard_spot",
          standing.inPlayoffs ? "playoff_spot" : "",
          standing.isWinner || (completed && standing.position === 1) ? "winner" : "",
          isSelected ? "selected" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Fragment key={standing.id}>
            <motion.li
              className={rowClassName}
              data-testid="leaderboard-row"
              layout={!reducedMotion}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              <button
                aria-label={`Show details for ${standing.driverName}`}
                className="row-button"
                onClick={() => onSelect(standing.id)}
                type="button"
              >
                <div className="position_tag">P{standing.position}</div>
                <div className="Driver_name">{standing.driverName}</div>
                <div className="car-number">#{standing.vehicleNumber}</div>
                <div className="info_cont">
                  <div className="delta">{standing.delta}</div>
                </div>
              </button>
            </motion.li>
            <AnimatePresence initial={false} mode="popLayout">
              {isSelected && inlineDetail && (
                <motion.li
                  aria-label="Driver details"
                  className="detail-panel detail-panel--inline"
                  data-testid="leaderboard-inline-detail"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15 }}
                >
                  {inlineDetail}
                </motion.li>
              )}
            </AnimatePresence>
          </Fragment>
        );
      })}
    </ol>
  );
}

type DetailPanelProps = {
  fetchedAt: string;
  onHide?: () => void;
  previousSnapshotId: string | undefined;
  raceCompleted: boolean;
  snapshotCount: number;
  standing: Standing;
  vehicle: NascarVehicle | undefined;
};

export function DriverDetailPanel({
  fetchedAt,
  onHide,
  previousSnapshotId,
  raceCompleted,
  snapshotCount,
  standing,
  vehicle
}: DetailPanelProps) {
  const latestPitStop = vehicle?.pit_stops?.at(-1);

  return (
    <div className="detail-content">
      <div className="detail-header">
        <div>
          <p className="detail-kicker">P{standing.position}</p>
          <h2>{standing.driverName}</h2>
        </div>
        <div className="detail-header-right">
          <span className="detail-number">#{standing.vehicleNumber}</span>
          {onHide && (
            <button
              aria-label="Hide driver details"
              className="detail-hide"
              onClick={onHide}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      </div>

      <dl className="detail-grid">
        <DetailItem label="Sponsor" value={standing.sponsor || "Unknown"} />
        <DetailItem label="Manufacturer" value={standing.manufacturer || "Unknown"} />
        <DetailItem label="Delta" value={standing.delta || "Leader"} />
        <DetailItem label="Status" value={formatStatus(standing.status, standing.isOnTrack)} />
        <DetailItem label="Laps Complete" value={standing.lapsCompleted ?? "Unknown"} />
        <DetailItem label="Start" value={standing.startingPosition ?? "Unknown"} />
        <DetailItem label="Average Position" value={formatNumber(vehicle?.average_running_position)} />
        <DetailItem label="Average Speed" value={formatSpeed(vehicle?.average_speed)} />
        <DetailItem label="Best Lap" value={vehicle?.best_lap ?? "Unknown"} />
        <DetailItem label="Best Lap Time" value={formatSeconds(vehicle?.best_lap_time)} />
        <DetailItem label="Last Lap Speed" value={formatSpeed(vehicle?.last_lap_speed)} />
        <DetailItem label="Fast Laps" value={vehicle?.fastest_laps_run ?? "Unknown"} />
        <DetailItem label="Passes Made" value={vehicle?.passes_made ?? "Unknown"} />
        <DetailItem label="Quality Passes" value={vehicle?.quality_passes ?? "Unknown"} />
        <DetailItem label="Pit Stops" value={vehicle?.pit_stops?.length ?? 0} />
        <DetailItem label="Last Pit Lap" value={latestPitStop?.pit_in_lap_count ?? "None"} />
      </dl>

      <div className="detail-footer">
        <span>{raceCompleted ? "Race complete" : "Live race"}</span>
        <span>{snapshotCount} snapshots</span>
        <span>{previousSnapshotId ? "Buffered" : "First snapshot"}</span>
        <time dateTime={fetchedAt}>{new Date(fetchedAt).toLocaleTimeString()}</time>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function getStatusState({
  completed,
  isFallback,
  isPaused,
  source
}: {
  completed: boolean;
  isFallback: boolean;
  isPaused: boolean;
  source: "live" | "fallback";
}) {
  if (isPaused) {
    return { label: "PAUSED", tone: "paused" as const };
  }

  if (completed) {
    return { label: isFallback || source === "fallback" ? "PREVIOUS LIVE RACE DATA" : "COMPLETE", tone: "complete" as const };
  }

  if (isFallback || source === "fallback") {
    return { label: "FALLBACK DATA", tone: "local" as const };
  }

  return { label: "LIVE", tone: "live" as const };
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "Unknown";
}

function formatSpeed(value: number | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)} mph` : "Unknown";
}

function formatSeconds(value: number | undefined) {
  return typeof value === "number" ? `${value.toFixed(3)}s` : "Unknown";
}

function formatStatus(status: string, isOnTrack: boolean | null) {
  const statusText = status === "1" ? "Running" : status || "Unknown";

  if (isOnTrack === null) {
    return statusText;
  }

  return `${statusText} - ${isOnTrack ? "On track" : "Off track"}`;
}
