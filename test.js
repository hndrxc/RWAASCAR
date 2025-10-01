const para = document.getElementById("runn");
const url = 'https://cf.nascar.com/live/feeds/live-feed.json'

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function startFeedPolling(url, intervalMs = 5000, { runImmediately = true } = {}) {
  let running = true;

  (async function loop() {
    if (!runImmediately) await sleep(intervalMs);

    while (running) {
      const t0 = Date.now();
      try {
        await get_feed(url);     // gets feed
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
   var live_feed = fetch(url)
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); 
  })
  .then(data => {
    console.log(data);
    if (data.vehicles.length == 0){
        throw new Error('The live race no longer exist, boooo nasacar')
    }
    var track = Object.create(data)
    console.log(typeof(track))
    console.log(track.track_name)
    var run = String(track.run_name)
    para.textContent = run
    update_feed(track)
  })
  .catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  });
  var old_feed = fetch('live-feed.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); 
  })
  .then(data => {
    console.log(data);
    if (data.vehicles.length == 0){
        throw new Error('The old race might have existed but fucked up, boooo me')
    }
    var track = Object.create(data)
    console.log(typeof(track))
    console.log(track.track_name)
    var run = String(track.run_name)
    para.textContent = run
    update_feed(track)
  })
  .catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  });
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
  const disfeed_obj = Object.create(feed_obj)
  para.textContent = String(feed_obj.run_name)
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
  for (let i = feed_obj.vehicles.length + 2; i < 41; i++) {
    const place = document.querySelector(`#P${i}`)
    console.log(i)
    console.log(`#P${i}`)
    place.parentNode.removeChild(place)
  }
  console.log(feed_obj.stage.finish_at_lap);
  console.log(feed_obj.stage.laps_in_stage); // 137
  console.log(feed_obj.stage.stage_num); // 3
  console.log(feed_obj.stage);

  var laps_left = Number(feed_obj.laps_to_go);
  var finish = Number(feed_obj.stage.finish_at_lap);
  var laps_in_race = Number(feed_obj.laps_in_race);
  var current_lap = laps_in_race - laps_left;
  var laps_left_in_stage = Math.max(0, finish - current_lap);
  // If final stage ends the race, show race laps left; otherwise show stage laps left
  if (feed_obj.stage.stage_num === 3 && finish === laps_in_race) {
    document.querySelector("#laps").textContent = laps_left + ' TO GO';
  } else {
    document.querySelector("#laps").textContent =
      laps_left_in_stage + ' TO GO IN STAGE ' + feed_obj.stage.stage_num;
  }
  
}
function clean_name(raw_name){
  const in_playoffs = /\(P\)$/.test(raw_name.trim());
  const cleaned = raw_name
    .replace(/^\*\s*/, "").trim()       // remove leading asterisk and space
    .replace(/\s*(\(P\)|\(i\)|#)$/, "").trim(); // remove (P), (i), or # at end
  
  return {cleaned, in_playoffs}
}




