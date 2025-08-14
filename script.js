// URL of your published CSV
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

// Icons
const julienIcon = L.icon({
  iconUrl: "img/julien.png",
  iconSize: [40, 40],
  className: 'round-icon'
});

const currentIcon = L.icon({
  iconUrl: "img/julien-current.png",
  iconSize: [50, 50],
  className: 'round-icon'
});

// Init map
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fetch CSV and render
async function fetchAndRenderCSV() {
  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const csvText = await response.text();
    const data = Papa.parse(csvText, { header: true }).data;

    const points = [];

    data.forEach((row, index) => {
      if (!row.lat || !row.lng) return;

      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.lng);

      points.push([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: index === data.length - 1 ? currentIcon : julienIcon
      }).addTo(map);

      marker.bindPopup(`<strong>${row.titre}</strong><br>${row.date}<br>${row.description}`);

      // Add to timeline
      const li = document.createElement('li');
      li.textContent = `${row.date} — ${row.titre}`;
      li.addEventListener('click', () => {
        map.setView([lat, lng], 6);
        marker.openPopup();
      });
      document.getElementById('timeline-list').appendChild(li);
    });

    // Draw animated path
    if (points.length > 1) {
      L.polyline.antPath(points, {
        "delay": 400,
        "dashArray": [10, 20],
        "weight": 4,
        "color": "#FF7F00",
        "pulseColor": "#FFFFFF"
      }).addTo(map);
    }

    if (points.length > 0) {
      map.fitBounds(points);
    }

  } catch (error) {
    console.error("❌ Error fetching or parsing CSV:", error);
  }
}

fetchAndRenderCSV();
