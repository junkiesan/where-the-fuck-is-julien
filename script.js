const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

const map = L.map('map').setView([48.8566, 2.3522], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

async function geocode(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

async function fetchAndRender() {
  try {
    const res = await fetch(sheetUrl);
    const csvText = await res.text();
    const parsed = Papa.parse(csvText, { header: true });

    const points = [];
    const markers = [];
    const stepsContainer = document.getElementById('steps');

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const latlng = await geocode(row.lieu);
      if (!latlng) continue;

      points.push(latlng);

      const icon = L.icon({
        iconUrl: i === parsed.data.length-1 ? 'img/julien-current.png' : 'img/julien.png',
        iconSize: [40, 40],
        className: 'rounded-icon' // CSS will make it round
      });

      const marker = L.marker(latlng, { icon }).addTo(map).bindPopup(`<b>${row.titre}</b><br>${row.date}<br>${row.description}`);
      markers.push(marker);

      // Step list (no images)
      const stepDiv = document.createElement('div');
      stepDiv.className = 'step';
      stepDiv.innerHTML = `<h3>${row.titre}</h3><p>${row.date}</p><p>${row.description}</p>`;
      stepDiv.onclick = () => {
        map.flyTo(latlng, 8, { animate: true }); // zoom level 8 smoothly
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        stepDiv.classList.add('active');
        marker.openPopup();
      };
      stepsContainer.appendChild(stepDiv);
    }

    if (points.length > 1) {
      const curvedPoints = [];
      for (let i = 0; i < points.length - 1; i++) {
        const [lat1, lon1] = points[i];
        const [lat2, lon2] = points[i+1];
        const midLat = (lat1 + lat2)/2 + (Math.random()-0.5)*0.5;
        const midLon = (lon1 + lon2)/2 + (Math.random()-0.5)*0.5;
        curvedPoints.push([lat1, lon1], [midLat, midLon]);
      }
      curvedPoints.push(points[points.length-1]);

      L.polyline.antPath(curvedPoints, {
        color: "#c0392b",
        weight: 4,
        delay: 400,
        dashArray: [15, 20],
        pulseColor: "#f1c40f",
        paused: false,
        reverse: false,
        hardwareAccelerated: true
      }).addTo(map);

      map.fitBounds(points);
    }

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}
function calculateKPIs(rows) {
  if (rows.length < 2) return;

  let totalDistance = 0;
  let countries = new Set();
  let firstDate = new Date(rows[0].date);
  let lastDate = new Date(rows[rows.length - 1].date);

  for (let i = 0; i < rows.length; i++) {
    // Add country
    const country = rows[i].lieu.split(',').pop().trim();
    countries.add(country);

    // Calculate distance to next step
    if (i < rows.length - 1) {
      const lat1 = parseFloat(rows[i].lat);
      const lon1 = parseFloat(rows[i].lng);
      const lat2 = parseFloat(rows[i + 1].lat);
      const lon2 = parseFloat(rows[i + 1].lng);
      totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
    }
  }

  const daysPassed = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

  // Update HTML
  document.getElementById('kpi-distance').innerText = totalDistance.toFixed(0);
  document.getElementById('kpi-countries').innerText = countries.size;
  document.getElementById('kpi-days').innerText = daysPassed;
}

// Haversine formula to calculate distance in KM
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in KM
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}
fetchAndParseCSV().then(rows => {
  addMarkers(rows);
  drawTrajectory(rows);
  calculateKPIs(rows); // ✅ Add this line
});
fetchAndRender();