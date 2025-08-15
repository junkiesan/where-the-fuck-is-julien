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
        className: 'rounded-icon'
      });

      const marker = L.marker(latlng, { icon }).addTo(map)
        .bindPopup(i === parsed.data.length-1 ? "I'm here bitch" : `<b>${row.titre}</b><br>${row.date}<br>${row.description}`);
      markers.push(marker);

      // Step list
      const stepDiv = document.createElement('div');
      stepDiv.className = 'step';
      stepDiv.innerHTML = `<h3>${row.titre}</h3><p>${row.date}</p><p>${row.description}</p>`;
      stepDiv.onclick = () => {
        map.flyTo(latlng, 8, { animate: true });
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        stepDiv.classList.add('active');
        marker.openPopup();
      };
      stepsContainer.appendChild(stepDiv);
    }

    // Focus on last step
    if (markers.length > 0) {
      const lastMarker = markers[markers.length - 1];
      const lastStepDiv = stepsContainer.lastChild;
      map.flyTo(points[points.length - 1], 8, { animate: true });
      lastStepDiv.classList.add('active');
      lastMarker.openPopup();
      // Scroll sidebar to show last step
      lastStepDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (points.length > 1) {
      L.polyline(points, { color: "#c0392b", weight: 4 }).addTo(map);
      map.fitBounds(points);
    }

    calculateKPIs(parsed.data);

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}

function calculateKPIs(rows) {
  if (rows.length < 2) return;

  let totalDistance = 0;
  let countries = new Set();
  const firstDate = parseDate(rows[0].date);
  const lastDate = parseDate(rows[rows.length - 1].date);

  for (let i = 0; i < rows.length; i++) {
    // Add country
    const country = rows[i].lieu.split(',').pop().trim();
    countries.add(country);

    // Calculate distance to next step if lat/lng exists
    if (i < rows.length - 1 && rows[i].lat && rows[i].lng && rows[i+1].lat && rows[i+1].lng) {
      const lat1 = parseFloat(rows[i].lat);
      const lon1 = parseFloat(rows[i].lng);
      const lat2 = parseFloat(rows[i + 1].lat);
      const lon2 = parseFloat(rows[i + 1].lng);
      totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
    }
  }

  const daysPassed = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

  document.getElementById('kpi-distance').innerText = totalDistance.toFixed(0);
  document.getElementById('kpi-countries').innerText = countries.size;
  document.getElementById('kpi-days').innerText = daysPassed;
}

function parseDate(str) {
  const [day, month, year] = str.split('/').map(Number);
  return new Date(year, month - 1, day);
}

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

fetchAndRender();
