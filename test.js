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
function update_feed(feed_obj){
  para.textContent = String(feed_obj.run_name)
  for (let i = 0; i < feed_obj.vehicles.length; i++) {
    const driver_name = feed_obj.vehicles[i].driver.full_name;
    document.querySelector(`#P${i}`).textContent = driver_name
  }
}





