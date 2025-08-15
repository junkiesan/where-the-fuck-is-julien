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

    let rows = parsed.data.filter(r => r.lieu && r.date);
    rows.forEach(r => r._dateObj = parseCustomDate(r.date));
    rows.sort((a, b) => a._dateObj - b._dateObj);

    const points = [];
    const markers = [];
    const stepsContainer = document.getElementById('steps');
    stepsContainer.innerHTML = "";

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const latlng = await geocode(row.lieu);
      if (!latlng) continue;

      points.push(latlng);
      row.lat = latlng[0];
      row.lng = latlng[1];

      const icon = L.icon({
        iconUrl: i === rows.length - 1 ? 'img/julien-current.png' : 'img/julien.png',
        iconSize: [40, 40],
        className: 'rounded-icon' // only markers have border
      });

      const marker = L.marker(latlng, { icon }).addTo(map);
      if (i === rows.length - 1) {
        marker.bindPopup(`<b>I'm here bitch</b>`);
        marker.openPopup(); // autofocus
      } else {
        marker.bindPopup(`<b>${row.titre}</b><br>${row.date}<br>${row.description}`);
      }

      // Hover effect
      marker.on('mouseover', function () {
        this.setIcon(L.icon({
          iconUrl: i === rows.length - 1 ? 'img/julien-current.png' : 'img/julien.png',
          iconSize: [50, 50],
          className: 'rounded-icon'
        }));
      });

      marker.on('mouseout', function () {
        this.setIcon(L.icon({
          iconUrl: i === rows.length - 1 ? 'img/julien-current.png' : 'img/julien.png',
          iconSize: [40, 40],
          className: 'rounded-icon'
        }));
      });

      markers.push(marker);

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

    // Draw transport lines and icons
    for (let i = 0; i < rows.length - 1; i++) {
      if (!rows[i].lat || !rows[i + 1].lat) continue; // skip invalid points

      const start = [rows[i].lat, rows[i].lng];
      const end = [rows[i + 1].lat, rows[i + 1].lng];
      const transport = rows[i].transport?.toLowerCase();

      let color = "#7f8c8d"; // fallback gray
      let dashArray = null;
      let iconUrl = null;

      switch (transport) {
        case "bus":
          color = "#f39c12";
          dashArray = [5, 10];
          iconUrl = "img/bus.svg";
          break;
        case "car":
          color = "#e74c3c";
          dashArray = null;
          iconUrl = "img/car.svg";
          break;
        case "train":
          color = "#27ae60";
          dashArray = [10, 5];
          iconUrl = "img/train.svg";
          break;
        case "boat":
          color = "#2980b9";
          dashArray = [15, 10];
          iconUrl = "img/boat.svg";
          break;
      }

      // Draw line
      L.polyline.antPath([start, end], {
        color: color,
        weight: 4,
        delay: 400,
        dashArray: dashArray,
        pulseColor: "#f1c40f"
      }).addTo(map);

      // Draw transport icon
      if (iconUrl) {
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;
        L.marker([midLat, midLng], {
          icon: L.icon({
            iconUrl: iconUrl,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
            // no className → no white border
          }),
          interactive: false // so it doesn’t block marker clicks
        }).addTo(map);
      }
    }

    // Fit map bounds after everything
    if (points.length > 1) map.fitBounds(points);

    if (markers.length > 0) {
      const lastMarker = markers[markers.length - 1];
      lastMarker.openPopup();
      map.flyTo([lastMarker.getLatLng().lat, lastMarker.getLatLng().lng], 8, { animate: true });
    }

    calculateKPIs(rows);

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}

function calculateKPIs(rows) {
  if (rows.length < 2) return;
  let totalDistance = 0;
  let countries = new Set();
  const firstDate = rows[0]._dateObj;
  const lastDate = rows[rows.length - 1]._dateObj;

  for (let i = 0; i < rows.length; i++) {
    const country = rows[i].lieu.split(',').pop().trim();
    countries.add(country);
    if (i < rows.length - 1) {
      totalDistance += haversineDistance(rows[i].lat, rows[i].lng, rows[i + 1].lat, rows[i + 1].lng);
    }
  }
  const daysPassed = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
  document.getElementById('kpi-distance').innerText = totalDistance.toFixed(0);
  document.getElementById('kpi-countries').innerText = countries.size;
  document.getElementById('kpi-days').innerText = daysPassed;
}

function parseCustomDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

fetchAndRender();
