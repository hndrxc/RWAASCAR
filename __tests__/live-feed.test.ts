import fallbackFeed from "../live-feed.json";
import {
  cleanDriverName,
  createLiveFeedPayload,
  getFlagLabel,
  normalizeRace,
  normalizeStandings,
  type NascarLiveFeed
} from "../lib/live-feed";

describe("live feed normalization", () => {
  it("cleans driver names and detects playoff markers", () => {
    expect(cleanDriverName("* Chase Briscoe (P)")).toEqual({
      cleaned: "Chase Briscoe",
      inPlayoffs: true
    });

    expect(cleanDriverName("John Doe (i)#")).toEqual({
      cleaned: "John Doe",
      inPlayoffs: false
    });
  });

  it("maps flag states", () => {
    expect(getFlagLabel(1)).toBe("Green");
    expect(getFlagLabel(9)).toBe("Complete");
    expect(getFlagLabel(42)).toBe("Unknown");
  });

  it("normalizes completed race and winner state from fallback JSON", () => {
    const payload = createLiveFeedPayload(fallbackFeed as NascarLiveFeed, "fallback", "2026-06-07T20:00:00.000Z");

    expect(payload.source).toBe("fallback");
    expect(payload.feed).toBeDefined();
    expect(payload.race.completed).toBe(true);
    expect(payload.race.lapsLeftText).toBe("RESULTS");
    expect(payload.race.winnerName).toBe(payload.standings[0].driverName);
    expect(payload.standings[0].isWinner).toBe(true);
  });

  it("handles missing optional fields without dropping vehicles", () => {
    const feed: NascarLiveFeed = {
      flag_state: 1,
      run_name: "Partial Race",
      laps_in_race: 100,
      laps_to_go: 40,
      vehicles: [
        {
          running_position: 2,
          vehicle_number: "12",
          driver: { full_name: "Second Driver" }
        },
        {
          running_position: 1,
          vehicle_number: "1",
          driver: { full_name: "Leader Driver (P)", is_in_chase: true }
        }
      ]
    };

    const race = normalizeRace(feed);
    const standings = normalizeStandings(feed);

    expect(race.completed).toBe(false);
    expect(race.lapsLeftText).toBe("40 TO GO");
    expect(standings).toHaveLength(2);
    expect(standings[0]).toMatchObject({
      driverName: "Leader Driver",
      inPlayoffs: true,
      position: 1
    });
    expect(standings[1].sponsor).toBe("");
  });
});
