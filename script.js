// ================================
// CONFIG
// ================================
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";
const refreshInterval = 5 * 60 * 1000; // 5 minutes

// ================================
// MAP SETUP
// ================================
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

const currentIcon = L.icon({
  iconUrl: 'img/julien-current.png', 
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50]
});

let currentMarker = null;
let markers = [];

// ================================
// HELPER FUNCTIONS
// ================================
async function geocode(place) {
  const cacheKey = `geo:${place}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'JulienMap/1.0' } });
  const data = await res.json();

  if (data.length > 0) {
    const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    localStorage.setItem(cacheKey, JSON.stringify(coords));
    return coords;
  }

  console.warn(`⚠️ No location found for: ${place}`);
  return null;
}

// ================================
// FETCH AND RENDER CSV
// ================================
const timelineList = document.getElementById('timeline-list');

async function fetchAndRenderCSV() {
  try {
    markers.forEach(m => map.removeLayer(m));
    if (currentMarker) map.removeLayer(currentMarker);
    markers = [];
    timelineList.innerHTML = '';

    const res = await fetch(sheetURL);
    const csvText = await res.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const points = [];

    for (const row of parsed.data) {
      const lieu = row.lieu?.trim();
      const titre = row.titre?.trim();
      const date = row.date?.trim();
      const description = row.description?.trim();

      if (!lieu) continue;

      const coords = await geocode(lieu);
      if (coords) {
        const marker = L.marker(coords, { icon: julienIcon })
          .addTo(map)
          .bindPopup(`<b>${titre}</b><br>${date}<br>${description}`);
        markers.push(marker);
        points.push(coords);

        if (currentMarker) map.removeLayer(currentMarker);
        currentMarker = L.marker(coords, { icon: currentIcon })
          .addTo(map)
          .bindPopup(`<b>${titre} (Current)</b><br>${date}<br>${description}`);

        const li = document.createElement('li');
        li.innerHTML = `<b>${date} — ${titre}</b><br>${lieu}<br>${description}`;
        li.addEventListener('click', () => {
          // Smooth fly-to
          map.flyTo(coords, 8, { duration: 1.5 });
          setTimeout(() => marker.openPopup(), 1600);
        });
        timelineList.appendChild(li);
      }
    }

    if (points.length > 0) {
      L.polyline(points, { color: 'red' }).addTo(map);
      map.fitBounds(points);
    } else {
      console.warn("⚠️ No valid points found — check your CSV data");
    }

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}

fetchAndRenderCSV();
setInterval(fetchAndRenderCSV, refreshInterval);
