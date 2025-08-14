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
        map.setView(latlng, 6, { animate: true });
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

fetchAndRender();
