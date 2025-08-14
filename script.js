// ✅ Your published Google Sheet CSV URL
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

// Initialise the map
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

// Load and parse CSV
fetch(sheetURL)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return res.text();
  })
  .then(csvText => {
    if (!csvText.trim()) throw new Error("CSV is empty — check if your Google Sheet is published & public");

    const rows = csvText.split("\n").map(r => r.trim()).filter(r => r.length > 0);
    const headers = rows[0].split(",");

    const points = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",");
      if (cols.length < 5) {
        console.warn(`Skipping invalid row: ${rows[i]}`);
        continue;
      }
      const lat = parseFloat(cols[0]);
      const lng = parseFloat(cols[1]);
      const titre = cols[2];
      const date = cols[3];
      const description = cols[4];

      if (!isNaN(lat) && !isNaN(lng)) {
        L.marker([lat, lng], { icon: julienIcon })
          .addTo(map)
          .bindPopup(`<b>${titre}</b><br>${date}<br>${description}`);

        points.push([lat, lng]);
      }
    }

    if (points.length > 0) {
      L.polyline(points, { color: 'red' }).addTo(map);
      map.fitBounds(points);
    }
  })
  .catch(err => {
    console.error("❌ Error loading map data:", err);
    alert(`Failed to load map data: ${err.message}`);
  });
