// ==================== CONFIG ====================
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv';
const map = L.map('map').setView([48.8566, 2.3522], 3); // initial view (Paris)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// ==================== HELPER FUNCTIONS ====================
function deg2rad(deg) { return deg * (Math.PI / 180); }
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== FETCH CSV ====================
fetch(csvUrl)
  .then(res => res.text())
  .then(csvText => {
    const rows = parseCSV(csvText);
    addMarkers(rows);
    drawTrajectory(rows);
    renderSteps(rows);
    calculateKPIs(rows);
  })
  .catch(err => console.error('❌ Error fetching or parsing CSV:', err));

// ==================== PARSE CSV ====================
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i].replace(/"/g, '').trim());
    // Live geocoding
    const latlng = getLatLng(obj.lieu);
    obj.lat = latlng.lat;
    obj.lng = latlng.lng;
    return obj;
  });
  return rows;
}

// ==================== GEOCODING ====================
function getLatLng(location) {
  const geocodeDB = { // quick offline mock
    "Paris, France": {lat:48.8566,lng:2.3522},
    "Vienne, Autriche": {lat:48.2082,lng:16.3738}
    // add your others here
  };
  return geocodeDB[location] || {lat:0,lng:0};
}

// ==================== ADD MARKERS ====================
function addMarkers(rows) {
  rows.forEach((row, index) => {
    const iconUrl = index === rows.length -1 ? 'img/julien-current.png' : 'img/julien.png';
    const icon = L.icon({
      iconUrl,
      iconSize: [40, 40],
      className: 'marker-icon-round'
    });
    const marker = L.marker([row.lat, row.lng], {icon}).addTo(map);
    marker.bindPopup(`<strong>${row.titre}</strong><br>${row.date}<br>${row.description}`);
  });
}

// ==================== DRAW TRAJECTORY ====================
function drawTrajectory(rows) {
  const latlngs = rows.map(r => [r.lat, r.lng]);
  const polyline = L.polyline(latlngs, {color:'#d35400', weight:4}).addTo(map);
  map.fitBounds(polyline.getBounds());
}

// ==================== RENDER STEPS ====================
function renderSteps(rows) {
  const container = document.getElementById('steps');
  container.innerHTML = '';
  rows.forEach((row, index) => {
    const step = document.createElement('div');
    step.className = 'step';
    step.innerHTML = `<strong>${row.titre}</strong><br>${row.date}<br>${row.description}`;
    step.addEventListener('click', () => {
      map.setView([row.lat, row.lng], 7, {animate:true});
    });
    container.appendChild(step);
  });
}

// ==================== CALCULATE KPIs ====================
function calculateKPIs(rows) {
  if (!rows.length) return;
  let totalDistance = 0;
  const countries = new Set();
  const firstDate = new Date(rows[0].date);
  const lastDate = new Date(rows[rows.length-1].date);

  for(let i=0;i<rows.length;i++){
    const country = rows[i].lieu.split(',').pop().trim();
    countries.add(country);
    if(i<rows.length-1){
      totalDistance += haversineDistance(rows[i].lat, rows[i].lng, rows[i+1].lat, rows[i+1].lng);
    }
  }

  const daysPassed = Math.ceil((lastDate-firstDate)/(1000*60*60*24));
  document.getElementById('kpi-distance').innerText = totalDistance.toFixed(0);
  document.getElementById('kpi-countries').innerText = countries.size;
  document.getElementById('kpi-days').innerText = daysPassed;
}
