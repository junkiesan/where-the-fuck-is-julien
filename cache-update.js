// cache-update.js
import fs from 'fs';
import fetch from 'node-fetch';

// URL CSV public de ton Google Sheet
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiSiZP3r783Jcfoi6vPq03yNaGD30a6PdTK4mh06WpCb0wxIuhufWWtw82TdwU1iKoGYzElY0t1JfW/pub?gid=0&single=true&output=csv";

// Fonction géocodage
async function geocode(lieu) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(lieu)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'where-is-julien/1.0' } });
  const data = await res.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}

async function main() {
  const res = await fetch(sheetURL);
  const csvText = await res.text();
  const rows = csvText.split('\n').slice(1);
  const results = [];

  for (const row of rows) {
    const [lieu, titre, date, description] = row.split(',');
    if (!lieu) continue;

    const coords = await geocode(lieu.trim());
    if (!coords) continue;

    results.push({
      lieu: lieu.trim(),
      titre: titre || '',
      date: date || '',
      description: description || '',
      lat: coords[0],
      lng: coords[1]
    });

    console.log(`OK: ${lieu} → ${coords}`);
    await new Promise(r => setTimeout(r, 1100)); // respect Nominatim
  }

  fs.writeFileSync('data.json', JSON.stringify(results, null, 2));
  console.log("✅ data.json mis à jour !");
}

main();
