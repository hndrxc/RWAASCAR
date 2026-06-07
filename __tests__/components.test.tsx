import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DriverDetailPanel, Leaderboard, getStatusState } from "../app/components/RaceDashboard";
import { createLiveFeedPayload, type NascarLiveFeed } from "../lib/live-feed";

vi.mock("motion/react", async () => {
  const React = await import("react");

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <aside {...props}>{children}</aside>,
      li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => <li {...props}>{children}</li>
    },
    useReducedMotion: () => true
  };
});

const feed: NascarLiveFeed = {
  flag_state: 1,
  run_name: "Component Race",
  laps_in_race: 200,
  laps_to_go: 20,
  vehicles: [
    {
      running_position: 1,
      vehicle_number: "11",
      delta: "0",
      sponsor_name: "Sponsor A",
      vehicle_manufacturer: "Tyt",
      driver: { full_name: "Leader Driver (P)", is_in_chase: true },
      laps_completed: 180,
      status: 1,
      is_on_track: true
    },
    {
      running_position: 2,
      vehicle_number: "24",
      delta: "1.244",
      sponsor_name: "Sponsor B",
      vehicle_manufacturer: "Chv",
      driver: { full_name: "Second Driver" },
      laps_completed: 180,
      status: 1,
      is_on_track: true
    },
    {
      running_position: 3,
      vehicle_number: "5",
      delta: "2.500",
      sponsor_name: "Sponsor C",
      vehicle_manufacturer: "Chv",
      driver: { full_name: "Third Driver" },
      laps_completed: 180,
      status: 1,
      is_on_track: false
    }
  ]
};

describe("leaderboard components", () => {
  it("renders vehicles dynamically instead of hardcoded 40 rows", () => {
    const payload = createLiveFeedPayload(feed, "live", "2026-06-07T20:00:00.000Z");

    render(
      <Leaderboard
        completed={false}
        onSelect={() => undefined}
        reducedMotion
        selectedId={null}
        standings={payload.standings}
      />
    );

    expect(screen.getAllByTestId("leaderboard-row")).toHaveLength(3);
    expect(screen.getByText("Leader Driver")).toBeInTheDocument();
    expect(screen.queryByText("P40")).not.toBeInTheDocument();
  });

  it("supports row selection for opening detail data", async () => {
    const user = userEvent.setup();
    const payload = createLiveFeedPayload(feed, "live", "2026-06-07T20:00:00.000Z");
    const onSelect = vi.fn();

    render(
      <Leaderboard
        completed={false}
        onSelect={onSelect}
        reducedMotion
        selectedId={null}
        standings={payload.standings}
      />
    );

    await user.click(screen.getByRole("button", { name: /show details for second driver/i }));

    expect(onSelect).toHaveBeenCalledWith("24");
  });

  it("renders detail panel fields from raw vehicle data", () => {
    const payload = createLiveFeedPayload(feed, "live", "2026-06-07T20:00:00.000Z");
    const standing = payload.standings[0];
    const vehicle = payload.feed.vehicles?.[0];

    render(
      <DriverDetailPanel
        fetchedAt={payload.fetchedAt}
        previousSnapshotId={undefined}
        raceCompleted={false}
        snapshotCount={1}
        standing={standing}
        vehicle={vehicle}
      />
    );

    expect(screen.getByRole("heading", { name: "Leader Driver" })).toBeInTheDocument();
    expect(screen.getByText("Sponsor A")).toBeInTheDocument();
    expect(screen.getByText("Running - On track")).toBeInTheDocument();
    expect(screen.getByText("1 snapshots")).toBeInTheDocument();
  });

  it("maps status ribbon states for live, fallback, paused, and completed data", () => {
    expect(
      getStatusState({
        completed: false,
        isFallback: false,
        isPaused: false,
        source: "live"
      })
    ).toEqual({ label: "LIVE", tone: "live" });

    expect(
      getStatusState({
        completed: false,
        isFallback: true,
        isPaused: false,
        source: "fallback"
      })
    ).toEqual({ label: "FALLBACK DATA", tone: "local" });

    expect(
      getStatusState({
        completed: false,
        isFallback: false,
        isPaused: true,
        source: "live"
      })
    ).toEqual({ label: "PAUSED", tone: "paused" });

    expect(
      getStatusState({
        completed: true,
        isFallback: true,
        isPaused: false,
        source: "fallback"
      })
    ).toEqual({ label: "PREVIOUS LIVE RACE DATA", tone: "complete" });
  });
});
