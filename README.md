# RWAASCAR

RWAASCAR is a Next.js live NASCAR leaderboard for the American Association of Stock Car Auto Racing. It renders a dark, sports-app-style race dashboard, polls NASCAR's public live feed through a local Route Handler, and falls back to checked-in race data whenever the upstream feed is unavailable or invalid.

Production domain:

```text
rwaascar.hndrxc.com
```

## Features

- Live leaderboard sorted by NASCAR running position.
- One-second SWR polling while the browser tab is visible.
- Backend proxy for the NASCAR live feed with `cache: "no-store"`.
- Checked-in fallback feed served through the API route when live data fails validation.
- Selected-driver detail panel with sponsor, manufacturer, lap, speed, pass, and pit-stop data where available.
- Mobile inline detail panel that opens under the selected driver row.
- Flag-aware race header and status ribbon for live, fallback, paused, and completed states.
- In-memory snapshot buffer for future playback work.
- Unit, route, and component tests with Vitest and Testing Library.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- SWR
- Motion
- Vitest
- Testing Library
- npm with `package-lock.json`

See `package.json` and `package-lock.json` for the current version constraints and resolved dependency versions.

## Project Structure

```text
app/
  api/live-feed/route.ts       Live-feed Route Handler with fallback behavior
  components/RaceDashboard.tsx Main race dashboard UI
  hooks/useLiveFeed.ts         SWR polling and tab-visibility state
  hooks/useRaceSnapshots.ts    Bounded in-memory snapshot buffer
  globals.css                  Application styling
  layout.tsx                   Metadata, favicon, and local font setup
  page.tsx                     App entry point
lib/
  live-feed.ts                 Feed types, validation, normalization, and labels
public/
  check.svg                    Runtime checkered asset
  trackicon.png                Runtime favicon/icon asset
  fonts/Bold_web_0.ttf         Local display font
__tests__/
  components.test.tsx          Dashboard/component coverage
  live-feed.test.ts            Feed normalization coverage
  route.test.ts                API route fallback coverage
live-feed.json                 Checked-in fallback NASCAR feed
context.md                     Project context and implementation notes
```

The original static implementation remains in `index.html`, `styles.css`, `test.js`, and root-level asset files for reference only. The active app entry point is `app/page.tsx`.

## Data Flow

1. The browser renders the Next.js app shell at `/`.
2. `RaceDashboard` calls `useLiveFeed()`.
3. `useLiveFeed()` polls `/api/live-feed` every 1000ms while the document is visible.
4. `/api/live-feed` fetches:

```text
https://cf.nascar.com/live/feeds/live-feed.json
```

5. The route validates the payload, normalizes the race and standings data, and returns:

```ts
{
  source: "live" | "fallback";
  fetchedAt: string;
  snapshotId: string;
  feed: NascarLiveFeed;
  race: RaceSummary;
  standings: Standing[];
}
```

If the upstream request fails, returns a non-OK response, produces invalid JSON, or does not include vehicles, the route returns normalized data from `live-feed.json` with `source: "fallback"`.

## Local Development

Install dependencies:

```sh
npm install
```

Run the development server:

```sh
npm run dev
```

Open the app:

```text
http://127.0.0.1:3000
```

Smoke-check the API route:

```sh
curl http://127.0.0.1:3000/api/live-feed
```

## Verification

Run the main checks before deploying:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The test suite covers feed normalization, fallback route behavior, dynamic leaderboard rendering, row selection, driver details, and status ribbon state mapping.

## Deployment

The app is deployed as a standard Next.js project on Vercel.

Recommended Vercel settings:

- Root Directory: repo root
- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave blank

Do not set the output directory to `.next`, `out`, or `/vercel/output`; Vercel handles Next.js output automatically.

If a generated Vercel URL works but `rwaascar.hndrxc.com` returns a 404, confirm that the custom domain is attached to the correct Vercel project and that DNS points to Vercel.

## Notes

- The snapshot buffer is client-side and in-memory only; there is no persistent race archive yet.
- E2E browser tests are not currently checked in.
- The legacy static files are retained for comparison and should not be treated as the active runtime path.
- `live-feed.json` is intentionally served through `/api/live-feed`; the browser does not fetch it directly during normal operation.
