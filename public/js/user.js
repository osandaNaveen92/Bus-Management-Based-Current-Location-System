// js/user.js

let map, directionsService, directionsRenderer, userMarker, nearestPathRenderer;
let markers = {}; // For real-time bus markers

window.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const source = document.getElementById("source").value.trim();
    const destination = document.getElementById("destination").value.trim();

    plotRoute(source, destination);
    trackLiveBuses(source, destination);
    showUserLocationAndNearestBus();
  });
});

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 22.2604, lng: 84.8536 }, // Default location
    zoom: 14,
    mapTypeControl: false,
    fullscreenControl: false,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: true,
  });
  directionsRenderer.setMap(map);

  // Orange path for user → nearest bus
  nearestPathRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#FF5722",
      strokeWeight: 5,
    }
  });
  nearestPathRenderer.setMap(map);
}

// ✅ Draw route from source → destination
function plotRoute(source, destination) {
  const request = {
    origin: source,
    destination: destination,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, function (result, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
    } else {
      alert("Could not plot route: " + status);
    }
  });
}

// ✅ Real-time tracking of buses
function trackLiveBuses(source, destination) {
  // Clear old markers
  for (let id in markers) {
    markers[id].setMap(null);
  }
  markers = {};

  const busesRef = db.collection("buses")
    .where("source", "==", source.toLowerCase())
    .where("destination", "==", destination.toLowerCase())
    .where("active", "==", true);

  busesRef.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(change => {
      const busData = change.doc.data();
      const busId = change.doc.id;

      if (busData.latitude && busData.longitude) {
        const position = { lat: parseFloat(busData.latitude), lng: parseFloat(busData.longitude) };

        if (change.type === "added" || change.type === "modified") {
          if (markers[busId]) {
            // Update position
            markers[busId].setPosition(position);
          } else {
            // Create new marker
            markers[busId] = new google.maps.Marker({
              position,
              map,
              title: `Bus: ${busData.bus_number}`,
              icon: "https://maps.google.com/mapfiles/kml/shapes/bus.png"
            });
          }
        }

        if (change.type === "removed") {
          if (markers[busId]) {
            markers[busId].setMap(null);
            delete markers[busId];
          }
        }
      }
    });
  });
}

// ✅ Show user location and path to nearest bus
async function showUserLocationAndNearestBus() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const userLatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    // Place or move user marker
    if (userMarker) {
      userMarker.setPosition(userLatLng);
    } else {
      userMarker = new google.maps.Marker({
        position: userLatLng,
        map,
        title: "Your Location",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        }
      });
    }

    // Calculate nearest bus
    let nearestBus = null;
    let minDist = Number.MAX_VALUE;
    let nearestLatLng = null;

    const snapshot = await db.collection("buses").get();
    snapshot.forEach(doc => {
      const bus = doc.data();
      if (bus.latitude && bus.longitude) {
        const busLatLng = {
          lat: parseFloat(bus.latitude),
          lng: parseFloat(bus.longitude)
        };
        const dist = getDistance(userLatLng, busLatLng);
        if (dist < minDist) {
          minDist = dist;
          nearestBus = bus;
          nearestLatLng = busLatLng;
        }
      }
    });

    if (nearestLatLng) {
      // Draw path from user to nearest bus
      const request = {
        origin: userLatLng,
        destination: nearestLatLng,
        travelMode: google.maps.TravelMode.WALKING,
      };

      nearestPathRenderer.set('directions', null); // Clear old path

      directionsService.route(request, function (result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
          nearestPathRenderer.setDirections(result);
        } else {
          alert("Could not plot path to nearest bus: " + status);
        }
      });
    }
  }, (error) => {
    alert("Unable to retrieve your location.");
  });
}

// ✅ Helper: Calculate distance between two coordinates
function getDistance(loc1, loc2) {
  const R = 6371e3; // meters
  const φ1 = loc1.lat * Math.PI/180;
  const φ2 = loc2.lat * Math.PI/180;
  const Δφ = (loc2.lat-loc1.lat) * Math.PI/180;
  const Δλ = (loc2.lng-loc1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function logoutUser() {
  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      alert("Logout failed: " + error.message);
    });
}
