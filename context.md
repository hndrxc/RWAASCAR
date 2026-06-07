# RWAASCAR Context

## Project Summary

RWAASCAR is a plain static website that recreates a NASCAR-style live race leaderboard. It has no build system, package manager, backend, framework, or configured tests. The browser loads `index.html`, applies `styles.css`, and runs `test.js` directly.

The site is intended for static hosting. `CNAME` points to `rwaascar.hndrxc.com`, which suggests GitHub Pages or another static host using a custom domain.

## Main Files

- `index.html`: Defines the page structure. It contains a fixed header with race name, laps/status text, and a 40-row leaderboard scaffold with IDs `P1` through `P40`.
- `styles.css`: Defines the visual design: dark background, fixed header, leaderboard rows, flag-state glow colors, playoff outlines, and checkered winner styling.
- `test.js`: Contains all runtime behavior. It polls NASCAR's live JSON feed, falls back to local sample data, updates race status, fills leaderboard rows, and pauses polling when the tab is hidden.
- `live-feed.json`: Checked-in fallback/sample NASCAR feed data. The current file represents completed race data for the Cook Out Southern 500 at Darlington Raceway.
- `trackicon.png`: Browser favicon.
- `check.svg`: Checkered background image used for winner styling.
- `fonts/Bold_web_0.ttf`: Local font used for position labels.

## Runtime Flow

1. The browser loads `index.html`.
2. `test.js` runs immediately and calls `startPolling()`.
3. `startFeedPolling()` fetches `https://cf.nascar.com/live/feeds/live-feed.json` every 5 seconds, with small random jitter.
4. `get_feed()` parses the live feed and calls:
   - `update_status(feed_obj)` to set the status ribbon and flag-state header glow.
   - `update_feed(feed_obj)` to populate race name, lap text, driver names, playoff styling, and deltas.
5. If live fetching fails, the code attempts to fetch local `live-feed.json`.
6. Polling stops when the page is hidden or unloaded. When the tab is hidden, the status ribbon changes to `Paused`; polling resumes when the tab becomes visible.

## Feed Shape Used By The App

The code expects these top-level fields from the NASCAR feed:

- `run_name`
- `flag_state`
- `laps_to_go`
- `laps_in_race`
- `stage.stage_num`
- `stage.finish_at_lap`
- `stage.laps_in_stage`
- `vehicles`

For each item in `vehicles`, the code currently uses:

- `driver.full_name`
- `delta`

Driver names are cleaned by `clean_name()`, which removes leading asterisks and trailing markers such as `(P)`, `(i)`, and `#`. The presence of `(P)` marks a driver as a playoff driver and applies the `playoff_spot` class.

## Flag States

`flag_state()` maps these flag values to header glow classes:

- `1`: Green
- `2`: Yellow
- `3`: Red
- `4`: White
- `9`: Completed/end-of-race gray

Other documented values are present in comments, but only the values above have CSS classes.

## Known Risks And Sharp Edges

- `get_feed()` has fallback-path reference errors:
  - `res.status` should reference `live_feed.status`.
  - `res2.status` should reference `old_feed.status`.
  - `update_status(track)` in the fallback block references `track` even when live fetch/parsing failed before `track` exists. It should likely use `old_track`.
- `update_feed()` removes leaderboard rows beyond the current vehicle count. If a later feed contains more vehicles, those removed rows will not be recreated.
- Status classes are added but not consistently removed. A row or ribbon can keep stale classes across feed changes.
- `winner` is added to `#P1` for completed race data and is not removed when returning to live data.
- There are many debug `console.log()` calls in normal runtime paths.
- `NBSP` and `showLIVERibbon()` are currently unused.
- There is no automated test suite. `node --check test.js` confirms JavaScript syntax only.

## Local Development

Because this is a static site, it can be opened directly in a browser from `index.html`. For fetch behavior involving local `live-feed.json`, a simple static server is safer than `file://` because browser fetch restrictions vary by browser.

Example:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Implementation Style

This project uses direct DOM manipulation and global functions rather than modules or a framework. Future changes should stay small and consistent with the static-site architecture unless there is a clear reason to introduce tooling.
