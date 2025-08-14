const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

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

// Map
const map = L.map("map").setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

let coordsArray = [];

async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
  const response = await fetch(url, { headers: { "User-Agent": "julien-map" }});
  const data = await response.json();
  if (data && data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}

async function fetchAndRender() {
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    const parsed = Papa.parse(csvText.trim(), { header: true });
    const rows = parsed.data.filter(r => r.lieu && r.titre);

    const stepList = document.getElementById("step-list");

    for (let i = 0; i < rows.length; i++) {
      const { lieu, titre, date, description } = rows[i];
      const coords = await geocode(lieu);

      if (coords) {
        coordsArray.push(coords);

        // Choose icon
        const icon = (i === rows.length - 1) ? currentIcon : julienIcon;

        const marker = L.marker(coords, { icon }).addTo(map);
        marker.bindPopup(`<b>${titre}</b><br>${lieu}<br>${date}<br>${description}`);

        // Add to step list
        const li = document.createElement("li");
        li.textContent = `${titre} (${lieu}) - ${date}`;
        li.addEventListener("click", () => {
          map.setView(coords, 8);
          marker.openPopup();
        });
        stepList.appendChild(li);
      }
    }

    // Draw animated line
    if (coordsArray.length > 1) {
      L.polyline.antPath(coordsArray, {
        color: "#ff0000",
        weight: 3,
        opacity: 0.6,
        dashArray: [10, 20],
        pulseColor: "#ffaaaa"
      }).addTo(map);
    }

    if (coordsArray.length) {
      map.fitBounds(coordsArray);
    }

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

fetchAndRender();
