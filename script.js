const map = L.map('map').setView([48.8566, 2.3522], 4);

// Base map layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

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

// Your CSV file from Google Sheets (published as CSV)
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

async function fetchAndRenderCSV() {
  try {
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    const data = Papa.parse(csvText, { header: true }).data;

    const points = [];
    const stepsList = document.getElementById('steps-list');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.lat || !row.lng) continue;

      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.lng);

      points.push([lat, lng]);

      const markerIcon = (i === data.length - 1) ? currentIcon : julienIcon;

      const marker = L.marker([lat, lng], { icon: markerIcon })
        .bindPopup(`<b>${row.titre}</b><br>${row.date}<br>${row.description}`)
        .addTo(map);

      // Add to steps list
      const li = document.createElement('li');
      li.textContent = `${row.titre} (${row.date})`;
      li.addEventListener('click', () => {
        map.flyTo([lat, lng], 8);
        marker.openPopup();
      });
      stepsList.appendChild(li);
    }

    // Draw Indiana Jones style animated path
    if (points.length > 1) {
      L.polyline.antPath(points, {
        "delay": 400,
        "dashArray": [15, 25],
        "weight": 4,
        "color": "#FF7F00",
        "pulseColor": "#FFFFFF"
      }).addTo(map);
    }

    if (points.length) {
      map.fitBounds(points);
    }

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}

fetchAndRenderCSV();
