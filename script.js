document.addEventListener("DOMContentLoaded", () => {
  // Vibration feedback function
  function vibrate() {
    if (window.navigator.vibrate) {
      window.navigator.vibrate([5]);
    }
  }

  // Variables to store the current circle and location
  let currentCircle = null;

  // Define tile layers
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
  });
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });

  // Initialize map with default center
  const map = L.map('map', {
    center: [0, 0],
    zoom: 2,
    layers: [satelliteLayer]
  });

  // Define custom Material Icons
  const userLocationIcon = L.IconMaterial.icon({
    icon: 'person',
    iconColor: 'white',
    markerColor: 'rgba(70, 130, 180, 0.5)',
    outlineColor: 'white',
    outlineWidth: 1,
    iconSize: [31, 42]
  });

  const generatedLocationIcon = L.IconMaterial.icon({
    icon: 'not_listed_location',
    iconColor: 'white',
    markerColor: 'rgba(255, 82, 82, 0.5)',
    outlineColor: 'white',
    outlineWidth: 1,
    iconSize: [31, 42]
  });

  // Map type switcher
  document.getElementById("map-type").addEventListener("change", function() {
    const type = this.value;
    if (type === "satellite") {
      map.removeLayer(streetLayer);
      map.addLayer(satelliteLayer);
    } else {
      map.removeLayer(satelliteLayer);
      map.addLayer(streetLayer);
    }
  });

  // Function to add a circle to the map
  function addCircle(lat, lon) {
    const radiusVal = parseFloat(document.getElementById("radius").value);
    if (isNaN(radiusVal) || radiusVal <= 0) {
      console.log("Invalid radius value");
      return;
    }
    const unit = document.getElementById("radius-unit").value;
    const conversion = { meters: 1, kilometers: 1000, miles: 1609.34 };
    const radiusMeters = radiusVal * conversion[unit];
    currentCircle = L.circle([lat, lon], {
      color: 'blue',
      fillColor: '#30f',
      fillOpacity: 0.2,
      radius: radiusMeters
    }).addTo(map);
  }

  // Function to update the circle's radius
  function updateCircle() {
    if (currentCircle) {
      const radiusVal = parseFloat(document.getElementById("radius").value);
      if (isNaN(radiusVal) || radiusVal <= 0) {
        console.log("Invalid radius value");
        return;
      }
      const unit = document.getElementById("radius-unit").value;
      const conversion = { meters: 1, kilometers: 1000, miles: 1609.34 };
      const radiusMeters = radiusVal * conversion[unit];
      currentCircle.setRadius(radiusMeters);
    }
  }

  // Get user's location on page load
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      map.setView([lat, lon], 13);
      L.marker([lat, lon], { icon: userLocationIcon }).addTo(map);
      addCircle(lat, lon);
    }, () => {
      console.log("Geolocation failed or denied - using default map view");
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  } else {
    console.log("Geolocation not supported by this browser");
  }

  // Event listeners for radius and unit changes
  document.getElementById("radius").addEventListener("input", updateCircle);
  document.getElementById("radius-unit").addEventListener("change", updateCircle);

  // Vibration event listeners for interactive elements
  document.getElementById("use-location").addEventListener("click", vibrate);
  document.getElementById("radius-unit").addEventListener("change", vibrate);
  document.getElementById("distance-mode").addEventListener("change", vibrate);
  document.getElementById("map-type").addEventListener("change", vibrate);
  document.getElementById("count").addEventListener("input", vibrate);
  document.getElementById("radius").addEventListener("input", vibrate);
  document.getElementById("input-type").addEventListener("input", vibrate);
  document.getElementById("set-location").addEventListener("click", vibrate);

  // Update placeholder based on input type selection
  document.getElementById("input-type").addEventListener("change", function() {
    const inputField = document.getElementById("location-input");
    if (this.value === "pluscode") {
      inputField.placeholder = "Enter Plus Code (8FVC9G8F+8W or 9G8F+8W Zürich)";
    } else {
      inputField.placeholder = "Enter Address";
    }
  });

  // **Create an instance of OpenLocationCode**
  const olc = new OpenLocationCode();

  // Handle the "Set Location" button click
  document.getElementById("set-location").addEventListener("click", () => {
    const inputType = document.getElementById("input-type").value;
    const inputValue = document.getElementById("location-input").value.trim();

    if (!inputValue) {
      alert("Please enter a value.");
      return;
    }

    if (inputType === "address") {
      // Geocode the address using Nominatim
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}`)
        .then(response => response.json())
        .then(data => {
          if (data.length === 0) {
            alert("Address not found.");
            return;
          }
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          generateCoordinates(lat, lon);
        })
        .catch(() => alert("Error fetching address."));
    } else if (inputType === "pluscode") {
      // Handle plus code input
      const spaceIndex = inputValue.indexOf(" ");
      let code, locality;
      if (spaceIndex !== -1) {
        code = inputValue.substring(0, spaceIndex);
        locality = inputValue.substring(spaceIndex + 1);
      } else {
        code = inputValue;
        locality = null;
      }

      if (olc.isFull(code)) {
        // Full plus code, decode directly
        try {
          const codeArea = olc.decode(code);
          const lat = codeArea.latitudeCenter;
          const lon = codeArea.longitudeCenter;
          generateCoordinates(lat, lon);
        } catch (error) {
          alert("Invalid Plus Code.");
        }
      } else if (locality) {
        // Shortened plus code with locality, recover full code
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locality)}`)
          .then(response => response.json())
          .then(data => {
            if (data.length === 0) {
              alert("Locality not found.");
              return;
            }
            const refLat = parseFloat(data[0].lat);
            const refLon = parseFloat(data[0].lon);
            const fullCode = olc.recoverNearest(code, refLat, refLon);
            try {
              const codeArea = olc.decode(fullCode);
              const lat = codeArea.latitudeCenter;
              const lon = codeArea.longitudeCenter;
              generateCoordinates(lat, lon);
            } catch (error) {
              alert("Invalid Plus Code after recovery.");
            }
          })
          .catch(() => alert("Error fetching locality."));
      } else {
        alert("Please provide a locality for shortened Plus Codes.");
      }
    }
  });

  // "From My Location" button
  document.getElementById("use-location").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        generateCoordinates(lat, lon);
      }, () => {
        alert("Failed to get your location.");
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    } else {
      alert("Geolocation not supported by this browser.");
    }
  });

  // Generate coordinates function
  function generateCoordinates(lat, lon) {
    const radiusVal = parseFloat(document.getElementById("radius").value);
    const unit = document.getElementById("radius-unit").value;
    const count = parseInt(document.getElementById("count").value);
    const mode = document.getElementById("distance-mode").value;
    const exact = (mode === "exact");

    if (!radiusVal || count <= 0) {
      alert("Enter a valid radius and count.");
      return;
    }

    // Convert radius to meters
    const conversion = { meters: 1, kilometers: 1000, miles: 1609.34 };
    const radiusMeters = radiusVal * conversion[unit];

    // Clear previous markers, results, and circle
    document.getElementById("results").innerHTML = "";
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });
    currentCircle = null;

    // Center map and add marker with custom icon
    map.setView([lat, lon], 13);
    L.marker([lat, lon], { icon: userLocationIcon }).addTo(map);

    // Add new circle
    addCircle(lat, lon);

    // Generate random points
    for (let i = 0; i < count; i++) {
      const randomCoords = randomPoint(lat, lon, radiusMeters, exact);
      L.marker(randomCoords, { icon: generatedLocationIcon }).addTo(map)
        .bindPopup(`Location ${i + 1}<br>Lat: ${randomCoords[0].toFixed(5)}, Lon: ${randomCoords[1].toFixed(5)}`);

      const openMapBtn = document.createElement("button");
      openMapBtn.className = "open-map-btn";
      openMapBtn.innerText = "Open in Google Maps";
      openMapBtn.addEventListener("click", () => {
        vibrate();
        window.open(`https://www.google.com/maps?q=${randomCoords[0]},${randomCoords[1]}`, "_blank");
      });

      const coordDiv = document.createElement("div");
      coordDiv.className = "result-item";
      coordDiv.innerHTML = `<strong>Location ${i + 1}:</strong> Lat: ${randomCoords[0].toFixed(5)}, Lon: ${randomCoords[1].toFixed(5)} `;
      coordDiv.appendChild(openMapBtn);

      document.getElementById("results").appendChild(coordDiv);
    }
  }

  // Helper functions for random point generation
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function toDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  function randomPoint(lat, lon, distanceMeters, exact) {
    const earthRadius = 6371000; // meters
    const angularDistance = distanceMeters / earthRadius;
    const d = exact ? angularDistance : angularDistance * Math.sqrt(Math.random());
    const theta = 2 * Math.PI * Math.random();
    const lat1 = toRadians(lat);
    const lon1 = toRadians(lon);

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) +
                           Math.cos(lat1) * Math.sin(d) * Math.cos(theta));
    const lon2 = lon1 + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(lat1),
                                   Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return [toDegrees(lat2), toDegrees(lon2)];
  }
});
