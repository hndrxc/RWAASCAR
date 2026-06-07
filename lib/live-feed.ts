export type LiveFeedSource = "live" | "fallback";

export type DriverInfo = {
  driver_id?: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  is_in_chase?: boolean;
};

export type PitStop = {
  positions_gained_lossed?: number;
  pit_in_elapsed_time?: number;
  pit_in_lap_count?: number;
  pit_in_leader_lap?: number;
  pit_out_elapsed_time?: number;
  pit_in_rank?: number;
  pit_out_rank?: number;
};

export type NascarVehicle = {
  average_restart_speed?: number;
  average_running_position?: number;
  average_speed?: number;
  best_lap?: number;
  best_lap_speed?: number;
  best_lap_time?: number;
  vehicle_manufacturer?: string;
  vehicle_number?: string;
  driver?: DriverInfo;
  vehicle_elapsed_time?: number;
  fastest_laps_run?: number;
  laps_position_improved?: number;
  laps_completed?: number;
  laps_led?: Array<{ start_lap?: number; end_lap?: number }>;
  last_lap_speed?: number;
  last_lap_time?: number;
  passes_made?: number;
  passing_differential?: number;
  position_differential_last_10_percent?: number;
  pit_stops?: PitStop[];
  qualifying_status?: number;
  running_position?: number;
  status?: number | string;
  delta?: number | string;
  sponsor_name?: string;
  starting_position?: number;
  times_passed?: number;
  quality_passes?: number;
  is_on_track?: boolean;
  is_on_dvp?: boolean;
};

export type NascarLiveFeed = {
  lap_number?: number;
  elapsed_time?: number;
  flag_state?: number;
  race_id?: number;
  laps_in_race?: number;
  laps_to_go?: number;
  vehicles?: NascarVehicle[];
  run_id?: number;
  run_name?: string;
  series_id?: number;
  time_of_day?: number | string;
  time_of_day_os?: string;
  track_id?: number;
  track_length?: number;
  track_name?: string;
  run_type?: number;
  number_of_caution_segments?: number;
  number_of_caution_laps?: number;
  number_of_lead_changes?: number;
  number_of_leaders?: number;
  avg_diff_1to3?: number;
  stage?: {
    stage_num?: number;
    finish_at_lap?: number;
    laps_in_stage?: number;
  };
};

export type RaceSummary = {
  raceId: number | null;
  runName: string;
  trackName: string;
  lapNumber: number;
  lapsInRace: number;
  lapsToGo: number;
  currentLap: number;
  stageNumber: number | null;
  stageFinishLap: number | null;
  lapsLeftText: string;
  flagState: number;
  flagLabel: string;
  completed: boolean;
  winnerName: string | null;
  winnerVehicleNumber: string | null;
};

export type Standing = {
  id: string;
  position: number;
  vehicleNumber: string;
  driverName: string;
  rawDriverName: string;
  inPlayoffs: boolean;
  delta: string;
  manufacturer: string;
  sponsor: string;
  status: string;
  lapsCompleted: number | null;
  startingPosition: number | null;
  isOnTrack: boolean | null;
  isWinner: boolean;
};

export type LiveFeedPayload = {
  source: LiveFeedSource;
  fetchedAt: string;
  snapshotId: string;
  feed: NascarLiveFeed;
  race: RaceSummary;
  standings: Standing[];
};

const FLAG_LABELS: Record<number, string> = {
  1: "Green",
  2: "Yellow",
  3: "Red",
  4: "White",
  5: "Checkered",
  6: "Debris",
  7: "Black",
  8: "Passing",
  9: "Complete"
};

export function isValidLiveFeed(value: unknown): value is NascarLiveFeed {
  if (!value || typeof value !== "object") {
    return false;
  }

  const vehicles = (value as { vehicles?: unknown }).vehicles;
  return Array.isArray(vehicles) && vehicles.length > 0;
}

export function cleanDriverName(rawName: string | undefined) {
  const safeName = rawName ?? "Unknown Driver";
  const inPlayoffs = /\(P\)/.test(safeName);
  const cleaned = safeName
    .replace(/^\*\s*/, "")
    .replace(/\s*(?:\((?:P|i)\)|#)+\s*$/g, "")
    .trim();

  return {
    cleaned: cleaned || "Unknown Driver",
    inPlayoffs
  };
}

export function getFlagLabel(flagState: number | undefined): string {
  return FLAG_LABELS[Number(flagState)] ?? "Unknown";
}

export function normalizeRace(feed: NascarLiveFeed): RaceSummary {
  const flagState = Number(feed.flag_state ?? 0);
  const completed = flagState === 5 || flagState === 9 || Number(feed.laps_to_go ?? 0) === 0;
  const lapsInRace = Number(feed.laps_in_race ?? 0);
  const lapsToGo = Number(feed.laps_to_go ?? 0);
  const lapNumber = Number(feed.lap_number ?? Math.max(0, lapsInRace - lapsToGo));
  const currentLap = lapsInRace > 0 ? Math.max(0, lapsInRace - lapsToGo) : lapNumber;
  const stageNumber = feed.stage?.stage_num ?? null;
  const stageFinishLap = feed.stage?.finish_at_lap ?? null;
  const leader = getSortedVehicles(feed)[0];
  const leaderName = cleanDriverName(leader?.driver?.full_name).cleaned;

  let lapsLeftText = "WAITING";
  if (completed) {
    lapsLeftText = "RESULTS";
  } else if (stageNumber && stageFinishLap && !(stageNumber === 3 && stageFinishLap === lapsInRace)) {
    lapsLeftText = `${Math.max(0, stageFinishLap - currentLap)} TO GO IN STAGE ${stageNumber}`;
  } else {
    lapsLeftText = `${lapsToGo} TO GO`;
  }

  return {
    raceId: feed.race_id ?? null,
    runName: feed.run_name ?? "Race Name",
    trackName: feed.track_name ?? "Track",
    lapNumber,
    lapsInRace,
    lapsToGo,
    currentLap,
    stageNumber,
    stageFinishLap,
    lapsLeftText,
    flagState,
    flagLabel: getFlagLabel(flagState),
    completed,
    winnerName: completed ? leaderName : null,
    winnerVehicleNumber: completed ? leader?.vehicle_number ?? null : null
  };
}

export function normalizeStandings(feed: NascarLiveFeed): Standing[] {
  const race = normalizeRace(feed);

  return getSortedVehicles(feed).map((vehicle, index) => {
    const rawDriverName = vehicle.driver?.full_name ?? "Unknown Driver";
    const cleaned = cleanDriverName(rawDriverName);
    const inPlayoffs = Boolean(cleaned.inPlayoffs || vehicle.driver?.is_in_chase);
    const position = Number(vehicle.running_position ?? index + 1);
    const vehicleNumber = String(vehicle.vehicle_number ?? index + 1);

    return {
      id: vehicleNumber,
      position,
      vehicleNumber,
      driverName: cleaned.cleaned,
      rawDriverName,
      inPlayoffs,
      delta: String(vehicle.delta ?? ""),
      manufacturer: vehicle.vehicle_manufacturer ?? "",
      sponsor: vehicle.sponsor_name ?? "",
      status: String(vehicle.status ?? ""),
      lapsCompleted: numberOrNull(vehicle.laps_completed),
      startingPosition: numberOrNull(vehicle.starting_position),
      isOnTrack: typeof vehicle.is_on_track === "boolean" ? vehicle.is_on_track : null,
      isWinner: race.completed && index === 0
    };
  });
}

export function createSnapshotId(feed: NascarLiveFeed, fetchedAt: string): string {
  return [
    feed.race_id ?? "race",
    feed.lap_number ?? "lap",
    feed.elapsed_time ?? "elapsed",
    Date.parse(fetchedAt)
  ].join("-");
}

export function createLiveFeedPayload(
  feed: NascarLiveFeed,
  source: LiveFeedSource,
  fetchedAt = new Date().toISOString()
): LiveFeedPayload {
  return {
    source,
    fetchedAt,
    snapshotId: createSnapshotId(feed, fetchedAt),
    feed,
    race: normalizeRace(feed),
    standings: normalizeStandings(feed)
  };
}

function getSortedVehicles(feed: NascarLiveFeed): NascarVehicle[] {
  return [...(feed.vehicles ?? [])].sort((a, b) => {
    const aPosition = Number(a.running_position ?? Number.MAX_SAFE_INTEGER);
    const bPosition = Number(b.running_position ?? Number.MAX_SAFE_INTEGER);
    return aPosition - bPosition;
  });
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
