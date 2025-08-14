fetch('data.json')
  .then(res => res.json())
  .then(data => {
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

    const points = [];

    data.forEach(item => {
      L.marker([item.lat, item.lng], { icon: julienIcon })
        .addTo(map)
        .bindPopup(`<b>${item.titre}</b><br>${item.date}<br>${item.description}`);
      points.push([item.lat, item.lng]);
    });

    if (points.length > 0) {
      L.polyline(points, { color: 'red' }).addTo(map);
      map.fitBounds(points);
    }
  });
