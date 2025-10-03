const runName = document.getElementById("runn");
const url = 'https://cf.nascar.com/live/feeds/live-feed.json'
var get_count = Number(0);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function startFeedPolling(
  url,
  intervalMs = 5000,
  {
    runImmediately = true,
    jitterMs = 180,                      // e.g., 200 to add up to ±200ms jitter
    onTick = null,                     // (data, { durationMs }) => void
    onError = null,                    // (error) => void
  } = {}
) {
  let running = true;
  let controller = new AbortController();

  (async function loop() {
    if (!runImmediately) await sleep(intervalMs);

    while (running) {
      const t0 = performance.now();
      try {
        controller = new AbortController();
        const data = await get_feed(url, { signal: controller.signal });
        // optional callback (e.g., bump a counter, setStatus('live'), etc.)
        onTick?.(data, { durationMs: performance.now() - t0 });
      } catch (err) {
        // Swallow aborts quietly; surface real errors
        if (err.name !== 'AbortError') {
          onError?.(err);
          console.error('get_feed failed:', err);
        }
      }

      // Compute wait time, honoring work duration + jitter
      const elapsed = performance.now() - t0;
      const baseWait = Math.max(0, intervalMs - elapsed);
      const j = jitterMs ? (Math.random() * 2 * jitterMs - jitterMs) : 0; // [-jitter, +jitter]
      const wait = Math.max(0, baseWait + j);

      if (!running) break; // if stop() happened during get_feed
      await sleep(wait);
    }
  })();

  // Return a real stop() that also aborts the fetch
  return function stop() {
    running = false;
    try { controller.abort(); } catch {}
  };
}
async function get_feed(url, { signal } = {}) {

  try{
  const live_feed = await fetch(url, { cache: 'no-store', signal });
  if (!live_feed.ok) throw new Error(`HTTP ${res.status}`);
  var track = await live_feed.json()
  if (!track.vehicles?.length) throw new Error('No active race data.');
  var run = String(track.run_name)
  runName.textContent = run
  console.log('NETWORK GET SUCCESS')
  update_status(track)
  update_feed(track);
  }
  catch(e)
  {
    const old_feed = await fetch('live-feed.json');
    if (!old_feed.ok) throw new Error(`Fallback failed HTTP ${res2.status}`);
    const old_track = await old_feed.json();
    if (!old_track.vehicles?.length) throw new Error('Fallback has no vehicles.');
    console.log('LOCAL GET SUCCESS')
    update_status(track)
    update_feed(old_track);
  }
}
function update_status(feed_obj){
  if (feed_obj.flag_state != 9){
    document.querySelector('#status-ribbon').classList.add('status--live')
  }else{
    document.querySelector('#status-ribbon').classList.add('status--local')
    document.querySelector('#status-ribbon').textContent = "Previous Live Race Data"
  }
}

/*
Flag State Key (race-wide conditions):
1 = Green flag (race under way)
2 = Yellow flag (caution)
3 = Red flag (race stopped)
4 = White flag (final lap)
5 = Checkered flag (race finished)
6 = Yellow/Red striped (debris/track condition)
7 = Black flag (penalty for a car)
8 = Blue w/ yellow stripe (passing flag, yield to leaders)
9 = End of race / cool-down
*/

function update_feed(feed_obj){
  const { vehicles } = feed_obj;
  runName.textContent = String(feed_obj.run_name)
  console.log(feed_obj.vehicles.length)
  for (let i = 1; i <= feed_obj.vehicles.length; i++) {
    const place = document.querySelector(`#P${i}`)
    //const driver_name = (feed_obj.vehicles[i].driver.full_name).replace(/^\*\s*|\s*\(P\)$/g, "");
    const {cleaned : driver_name , in_playoffs}  = clean_name(feed_obj.vehicles[i-1].driver.full_name) 
    // place.textContent = driver_name
    if (in_playoffs){
      place.classList.add("playoff_spot"); // colors the outline yellow for playoffs 
    }
    if (i<=9){
      display_name(place,String("  "+driver_name))
    } else{
      display_name(place,driver_name)
    }
    display_info(place,feed_obj.vehicles[i-1])
  }
  const badge = document.getElementById('status-ribbon');
  badge.textContent = "LIVE"

  for (let i = vehicles.length + 1; i <= 40; i++) {
    const el = document.querySelector(`#P${i}`);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  lap_helper();

  function lap_helper() {
    console.log(feed_obj.stage.finish_at_lap);
    console.log(feed_obj.stage.laps_in_stage); // 137
    console.log(feed_obj.stage.stage_num); // 3
    console.log(feed_obj.stage);

    var laps_left = Number(feed_obj.laps_to_go);
    var finish = Number(feed_obj.stage.finish_at_lap);
    var laps_in_race = Number(feed_obj.laps_in_race);
    var current_lap = laps_in_race - laps_left;
    console.log(current_lap);
    var laps_left_in_stage = Math.max(0, finish - current_lap);
    // If final stage ends the race, show race laps left; otherwise show stage laps left
    if (feed_obj.flag_state != 9){
      if (feed_obj.stage.stage_num === 3 && finish === laps_in_race) {
        document.querySelector("#laps").textContent = laps_left + ' TO GO';
      } else {
        document.querySelector("#laps").textContent =
        laps_left_in_stage + ' TO GO IN STAGE ' + feed_obj.stage.stage_num;
      }
    } else {
      document.querySelector("#laps").textContent = 'RESULTS'
    }
  }
}
function clean_name(raw_name){
  const in_playoffs = /\(P\)$/.test(raw_name.trim());
  const cleaned = raw_name
    .replace(/^\*\s*/, "").trim()       // remove leading asterisk and space
    .replace(/\s*(\(P\)|\(i\)|#)$/, "").trim(); // remove (P), (i), or # at end
  
  return {cleaned, in_playoffs}
}
function display_name(place, name){
    const nameEl = place.querySelector('.Driver_name') || (() => {
    const d = document.createElement('div');
    d.className = 'Driver_name';
    place.appendChild(d);
    return d;
  })();
  nameEl.textContent = name
}
function display_info(place, vehicle){
    const info_contEl = place.querySelector('.info_cont') || (() => {
    const d = document.createElement('div');
    d.className = 'info_cont';
    place.appendChild(d);
    return d;
  })();
  const deltaEl = place.querySelector('.delta') || (() => {
    const d = document.createElement('div');
    d.className = 'delta';
    info_contEl.appendChild(d);
    return d;
  })();
  deltaEl.textContent = vehicle.delta
}
let pollStop = null;

function startPolling() {
  if (pollStop) return; // already running
  pollStop = startFeedPolling(
    url,
    5000,
    {
      runImmediately: true,
      jitterMs: 180,
      onTick: () => {
        countGets();
      },
      onError: () => {
      }
    }
  );
}

function stopPolling() {
  if (pollStop) { 
    try { pollStop(); } catch {}
    console.log("Paused")
    pollStop = null;
  }
}

// Update the ribbon to show "Paused" while hidden
function showPausedRibbon() {
  const badge = document.getElementById('status-ribbon');
  if (!badge) return;
  badge.textContent = 'Paused';
  // Remove any prior LIVE/LOCAL classes so the look is neutral while paused
  badge.classList.remove('status--live','status--local');
}
function showLIVERibbon() {
  const badge = document.getElementById('status-ribbon');
  if (!badge) return;
  badge.textContent = 'LIVE';
  // Remove any prior LIVE/LOCAL classes so the look is neutral while paused
  badge.classList.add('status--live');
}

// Kick off on load
startPolling();

// Pause when the tab is hidden, resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopPolling();
    showPausedRibbon();
  } else {
    startPolling();
  }
});
function countGets(){
  get_count++;
  console.log('GET COUNT: ' + get_count) 
  return;
}
// Be tidy: stop polling when the page is being unloaded (mobile bfcache safe)
addEventListener('pagehide', stopPolling);
addEventListener('beforeunload', stopPolling);



