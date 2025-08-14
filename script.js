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

fetch(sheetURL)
  .then(res => {
    console.log("HTTP status:", res.status);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return res.text();
  })
  .then(csvText => {
    console.log("📄 Raw CSV from Google Sheets:");
    console.log(csvText);

    if (!csvText.trim()) {
      throw new Error("CSV is empty — check if your Google Sheet is published & public");
    }

    // Split rows and log them
    const rows = csvText.split("\n").map(r => r.trim()).filter(r => r.length > 0);
    console.log("🔍 Parsed rows:", rows);

    // Get headers and log them
    const headers = rows[0].split(",");
    console.log("📌 Headers detected:", headers);

    const points = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",");
      console.log(`Row ${i} columns:`, cols);

      if (cols.length < 5) {
        console.warn(`⚠️ Skipping row ${i} (not enough columns)`);
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
      } else {
        console.warn(`⚠️ Skipping row ${i} — invalid lat/lng`);
      }
    }

    if (points.length > 0) {
      L.polyline(points, { color: 'red' }).addTo(map);
      map.fitBounds(points);
    } else {
      console.warn("⚠️ No valid points found — check your data format");
    }
  })
  .catch(err => {
    console.error("❌ Error loading map data:", err);
    alert(`Failed to load map data: ${err.message}`);
  });
