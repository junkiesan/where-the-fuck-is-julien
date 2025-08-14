const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

const map = L.map('map').setView([48.8566, 2.3522], 3); // start centered on Paris
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

async function fetchAndRender() {
  try {
    const response = await fetch(sheetUrl);
    const csvText = await response.text();
    const parsed = Papa.parse(csvText, { header: true });

    const points = [];

    for (const row of parsed.data) {
      if (!row.lieu) continue;

      const geocode = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(row.lieu)}`);
      const geoData = await geocode.json();
      if (!geoData[0]) continue;

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      points.push([lat, lon]);

      // Add marker
      L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: row.current === "yes" ? "img/julien-current.png" : "img/julien.png",
          iconSize: [50, 50],
          className: "step-marker"
        })
      }).addTo(map).bindPopup(`<b>${row.titre}</b><br>${row.description}`);
      
      // Add step to list
      const li = document.createElement("li");
      li.innerHTML = `<img src="${row.current === "yes" ? "img/julien-current.png" : "img/julien.png"}" class="step-image">${row.titre} - ${row.date}`;
      li.onclick = () => map.setView([lat, lon], 6);
      document.getElementById("step-list").appendChild(li);
    }

    if (points.length > 1) {
      L.polyline.antPath(points, { color: "red", weight: 4, delay: 400, dashArray: [10,20], pulseColor: "#fff" }).addTo(map);
      map.fitBounds(points);
    }

  } catch (err) {
    console.error("❌ Error fetching or parsing CSV:", err);
  }
}

fetchAndRender();
