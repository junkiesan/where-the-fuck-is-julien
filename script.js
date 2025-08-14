const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const julienIcon = L.icon({
  iconUrl: 'img/julien.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Function to geocode a place name
async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'JulienMap/1.0' } });
  const data = await res.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  console.warn(`⚠️ No location found for: ${place}`);
  return null;
}

fetch(sheetURL)
  .then(res => res.text())
  .then(async csvText => {
    const rows = csvText.split("\n").map(r => r.trim()).filter(r => r.length > 0);
    const headers = rows[0].split(",");
    const points = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",");
      const lieu = cols[0].replace(/^"|"$/g, ""); // remove quotes
      const titre = cols[1];
      const date = cols[2];
      const description = cols[3];

      const coords = await geocode(lieu);
      if (coords) {
        L.marker(coords, { icon: julienIcon })
          .addTo(map)
          .bindPopup(`<b>${titre}</b><br>${date}<br>${description}`);
        points.push(coords);
      }
    }

    if (points.length > 0) {
      L.polyline(points, { color: 'red' }).addTo(map);
      map.fitBounds(points);
    }
  })
  .catch(err => console.error("❌ Error:", err));
