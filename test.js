const para = document.getElementById("runn");
const url = 'https://cf.nascar.com/live/feeds/live-feed.json'
async function get_feed(url) {
   var live_feed = fetch(url)
  .then(response => {
    // Handle the response, e.g., check if it's OK
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Or .text(), .blob(), etc., depending on the expected content type
  })
  .then(data => {
    console.log(data);
    var track = Object.create(data)
    info = track
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
get_feed(url);
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
  para.textContent = String(feed_obj.run_name)
  console.log(feed_obj.vehicles.length)
  for (let i = 1; i < feed_obj.vehicles.length; i++) {
    const place = document.querySelector(`#P${i}`)
    //const driver_name = (feed_obj.vehicles[i].driver.full_name).replace(/^\*\s*|\s*\(P\)$/g, "");
    const {cleaned : driver_name , in_playoffs}  = clean_name(feed_obj.vehicles[i].driver.full_name) 
    place.textContent = driver_name
    if (in_playoffs){
      place.classList.add("playoff_spot"); // colors the outline yellow for playoffs 
    }
  }
  for (let i = feed_obj.vehicles.length; i <= 40; i++) {
    console.log(i)
    const empty= document.querySelector(`#P${i}`)
    console.log(`#P${i}`)
    empty.parentNode.removeChild(empty)
  }
  document.querySelector("#laps").textContent = String(feed_obj.laps_to_go) + ' / ' + String(feed_obj.laps_in_race)
}
function clean_name(raw_name){
  const in_playoffs = /\(P\)$/.test(raw_name.trim());
  const cleaned = raw_name
    .replace(/^\*\s*/, "").trim()       // remove leading asterisk and space
    .replace(/\s*(\(P\)|\(i\)|#)$/, "").trim(); // remove (P), (i), or # at end
  
  return {cleaned, in_playoffs}
}




