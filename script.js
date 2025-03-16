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
      icon: 'person',         // Icon representing the user
      iconColor: 'white',                // White for high visibility
      markerColor: 'rgba(70, 130, 180, 0.5)',  // Soft steel blue with transparency
      outlineColor: 'white',             // White outline for definition
      outlineWidth: 1,
      iconSize: [31, 42]                 // Standard size
    });
  
    const generatedLocationIcon = L.IconMaterial.icon({
      icon: 'not_listed_location',       // Icon for generated points
      iconColor: 'white',                // White for high visibility
      markerColor: 'rgba(255, 82, 82, 0.5)',   // Soft orange with transparency
      outlineColor: 'white',             // White outline for definition
      outlineWidth: 1,
      iconSize: [31, 42]                 // Standard size
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
    document.getElementById("use-address").addEventListener("click", vibrate);
    document.getElementById("radius-unit").addEventListener("change", vibrate);
    document.getElementById("distance-mode").addEventListener("change", vibrate);
    document.getElementById("map-type").addEventListener("change", vibrate);
    document.getElementById("count").addEventListener("input", vibrate);
    document.getElementById("radius").addEventListener("input", vibrate);
    document.getElementById("address").addEventListener("input", vibrate);
  
    // Function to detect if the user is on a mobile device
    function isMobileDevice() {
      return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
  
    // Function to generate random coordinates and handle map integration
    function generateCoordinates(lat, lon) {
      const radiusVal = parseFloat(document.getElementById("radius").value);
      const unit = document.getElementById("radius-unit").value;
      const count = parseInt(document.getElementById("count").value);
      const mode = document.getElementById("distance-mode").value;
      const exact = (mode === "exact");
  
      if (!radiusVal || count <= 0) {
        alert("Enter a valid radius and count, genius.");
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
  
      // Center map and add marker with custom icon, no popup
      map.setView([lat, lon], 13);
      L.marker([lat, lon], { icon: userLocationIcon }).addTo(map);
  
      // Add new circle
      addCircle(lat, lon);
  
      // Determine if on mobile device
      const isMobile = isMobileDevice();
  
      // Generate random points
      for (let i = 0; i < count; i++) {
        const randomCoords = randomPoint(lat, lon, radiusMeters, exact);
        // Use custom icon for random points with popup
        L.marker(randomCoords, { icon: generatedLocationIcon }).addTo(map)
          .bindPopup(`Location ${i + 1}<br>Lat: ${randomCoords[0].toFixed(5)}, Lon: ${randomCoords[1].toFixed(5)}`);
  
        // Format coordinates for URL with high precision
        const latStr = randomCoords[0].toFixed(10);
        const lonStr = randomCoords[1].toFixed(10);
        const mapsUrl = isMobile
          ? `geo:${latStr},${lonStr}`
          : `https://www.google.com/maps?q=${latStr},${lonStr}`;
  
        const openMapBtn = document.createElement("button");
        openMapBtn.className = "open-map-btn";
        openMapBtn.innerText = "Open in Maps";
        openMapBtn.addEventListener("click", () => {
          vibrate();
          window.open(mapsUrl, "_blank");
        });
  
        const coordDiv = document.createElement("div");
        coordDiv.className = "result-item";
        coordDiv.innerHTML = `<strong>Location ${i + 1}:</strong> Lat: ${randomCoords[0].toFixed(5)}, Lon: ${randomCoords[1].toFixed(5)} `;
        coordDiv.appendChild(openMapBtn);
  
        document.getElementById("results").appendChild(coordDiv);
      }
    }
  
    // Helper functions for coordinate calculations
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
  
    // "From My Location" button
    document.getElementById("use-location").addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          generateCoordinates(lat, lon);
        }, () => {
          alert("Failed to get your location. Maybe try looking outside?");
        }, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      } else {
        alert("Your browser sucks and doesn't support geolocation.");
      }
    });
  
    // "Use Address" button
    document.getElementById("use-address").addEventListener("click", () => {
      const address = document.getElementById("address").value;
      if (!address) {
        alert("Enter an address, genius.");
        return;
      }
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
          if (data.length === 0) {
            alert("Address not found. Try something else, dumbass.");
            return;
          }
          generateCoordinates(data[0].lat, data[0].lon);
        })
        .catch(() => alert("Error fetching address. You broke it."));
    });
  });