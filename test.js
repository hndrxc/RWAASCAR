const runName = document.getElementById("runn");
const url = 'https://cf.nascar.com/live/feeds/live-feed.json'
var get_count = Number(0);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function startFeedPolling(url, intervalMs = 5000, { runImmediately = true } = {}) {
  let running = true;

  (async function loop() {
    if (!runImmediately) await sleep(intervalMs);

    while (running) {
      const t0 = Date.now();
      try {
        await get_feed(url);    // gets feed
        ++get_count;
        console.log('GET COUNT: ' + get_count)
      } catch (err) {
        console.error('get_feed failed:', err);
      }
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, intervalMs - elapsed);
      if (!running) break;       // in case stop() was called during get_feed
      await sleep(wait);
    }
  })();
  return () => { running = false; };
}

async function get_feed(url) {
  try{
  const live_feed = await fetch(url);
  if (!live_feed.ok) throw new Error(`HTTP ${res.status}`);
  var track = await live_feed.json()
  if (!track.vehicles?.length) throw new Error('No active race data.');
  var run = String(track.run_name)
  runName.textContent = run
  console.log('NETWORK GET SUCCESS')
  update_feed(track);
  }
  catch(e)
  {
    const old_feed = await fetch('live-feed.json');
    if (!old_feed.ok) throw new Error(`Fallback failed HTTP ${res2.status}`);
    const old_track = await old_feed.json();
    if (!old_track.vehicles?.length) throw new Error('Fallback has no vehicles.');
    console.log('LOCAL GET SUCCESS')
    update_feed(old_track);
  }
}
const stop = startFeedPolling(url, 5000, { runImmediately: true });


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
    place.textContent = driver_name
    if (in_playoffs){
      place.classList.add("playoff_spot"); // colors the outline yellow for playoffs 
    }
  }
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




