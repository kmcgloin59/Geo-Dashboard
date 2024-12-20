// Initialize the map centered on Florida area
let map = L.map('map').setView([27.5, -81.8], 7);

// Add a base tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// Global variables
let bondMarkers = [];
let hurricaneLayer;

// Load bonds from bonds.json
fetch('bonds.json')
  .then(response => response.json())
  .then(bonds => {
    bonds.forEach(bond => {
      const marker = L.marker([bond.lat, bond.lng])
        .bindPopup(`<b>${bond.name}</b><br>Rating: ${bond.rating}<br>Maturity: ${bond.maturity}`)
        .addTo(map);
      bondMarkers.push({ ...bond, marker });
    });
  });

// Event listeners for buttons
document.getElementById('applyFilters').addEventListener('click', applyFilters);
document.getElementById('exportData').addEventListener('click', () => {
  alert('Data exported! (Placeholder)');
});
document.getElementById('runScenario').addEventListener('click', runHurricaneScenario);

function runHurricaneScenario() {
  // Fetch the hurricane zone GeoJSON
  fetch('hurricane_zone.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      // Remove existing hurricane layer if it exists
      if (hurricaneLayer) {
        map.removeLayer(hurricaneLayer);
      }

      // Add the hurricane polygon layer
      hurricaneLayer = L.geoJSON(geojsonData, {
        style: {
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.2
        }
      }).addTo(map);

      // Determine which bonds are inside the hurricane polygon
      let affected = getBondsInsidePolygon(geojsonData);
      displayAffectedBonds(affected);
    });
}

function getBondsInsidePolygon(geojsonData) {
  const coords = geojsonData.features[0].geometry.coordinates[0];

  function pointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i][0], yi = polygon[i][1];
      let xj = polygon[j][0], yj = polygon[j][1];

      // polygon coordinates are [lng, lat]
      let intersect = ((yi > lat) != (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  let affectedBonds = [];
  bondMarkers.forEach(bond => {
    if (pointInPolygon(bond.lat, bond.lng, coords)) {
      // Change icon to indicate it's affected
      bond.marker.setIcon(L.divIcon({
        className: 'affected-bond-icon',
        html: '💥',
        iconSize: [20, 20]
      }));
      affectedBonds.push(bond);
    }
  });

  return affectedBonds;
}

function displayAffectedBonds(affected) {
  const list = document.getElementById('affectedBonds');
  list.innerHTML = '';
  if (affected.length > 0) {
    affected.forEach(bond => {
      const li = document.createElement('li');
      li.textContent = `${bond.name} (Rating: ${bond.rating}, Maturity: ${bond.maturity})`;
      list.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No bonds affected.';
    list.appendChild(li);
  }
}

// Apply Filters based on sidebar inputs
function applyFilters() {
  const selectedAssetType = document.getElementById('assetType').value;
  const selectedMaturity = parseInt(document.getElementById('maturityRange').value, 10);
  const selectedRating = document.getElementById('creditRating').value;

  // Filter logic
  bondMarkers.forEach(bond => {
    // Assuming all loaded bonds are municipal for now
    let meetsAssetType = (selectedAssetType === 'Municipal Bonds');

    let meetsMaturity = (bond.maturity <= selectedMaturity);

    let meetsRating = (selectedRating === 'ALL' || bond.rating === selectedRating);

    if (meetsAssetType && meetsMaturity && meetsRating) {
      // Ensure bond marker is on the map
      if (!map.hasLayer(bond.marker)) {
        bond.marker.addTo(map);
      }
    } else {
      // Remove bond marker from the map
      if (map.hasLayer(bond.marker)) {
        map.removeLayer(bond.marker);
      }
    }
  });
}
