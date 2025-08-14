const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

const map = L.map('map').setView([48.8566, 2.3522], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// ✅ Local images in same folder as index.html
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

const timelineList = document.getElementById('timeline-list');
let markers = [];
let currentMarker = null;

async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

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

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const lieu = row.lieu?.trim();
      const titre = row.titre?.trim();
      const date = row.date?.trim();
      const description = row.description?.trim();

      if (!lieu) continue;

      const coords = await geocode(lieu);
      if (coords) {
        const icon = (i === parsed.data.length - 1) ? currentIcon : julienIcon;
        const marker = L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(`<b>${titre}</b><br>${date}<br>${description}`);
        
        markers.push(marker);
        points.push(coords);

        const li = document.createElement('li');
        li.innerHTML = `<b>${date} — ${titre}</b><br>${lieu}<br>${description}`;
        li.addEventListener('click', () => {
          map.flyTo(coords, 8, { duration: 1.5 });
          setTimeout(() => marker.openPopup(), 1600);
        });
        timelineList.appendChild(li);
      }
    }

    if (points.length > 0) {
      L.polyline.antPath(points, {
        delay: 400,
        dashArray: [15, 15],
        weight: 5,
        color: "#FF7F00",
        pulseColor: "#FFFFFF",
        paused: false,
        reverse: false,
        hardwareAccelerated: true
      }).addTo(map);

      map.fitBounds(points);
    } else {
      console.warn("⚠️ No valid points found — check your CSV data");
    }

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}

fetchAndRenderCSV();
