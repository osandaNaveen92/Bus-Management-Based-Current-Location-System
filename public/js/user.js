// js/user.js

let map, directionsService, directionsRenderer;

window.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const source = document.getElementById("source").value.trim();
    const destination = document.getElementById("destination").value.trim();
    await showAvailableBuses(source, destination);
  });
});

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat:22.2604 , lng:84.8536 },
    zoom: 14,
    mapTypeControl: false,      // Removes map type (satellite) control
    fullscreenControl: false,   // Removes fullscreen control
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: true,
  });
  directionsRenderer.setMap(map);
}

async function showAvailableBuses(source, destination) {
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

  // Optionally still show available bus markers (like earlier)
  try {
    const snapshot = await db.collection("buses").get();
    snapshot.forEach(doc => {
      const bus = doc.data();
      if (
        bus.source.toLowerCase() === source.toLowerCase() &&
        bus.destination.toLowerCase() === destination.toLowerCase()
      ) {
        new google.maps.Marker({
          position: {
            lat: parseFloat(bus.latitude),
            lng: parseFloat(bus.longitude)
          },
          map,
          title: `Bus No: ${bus.bus_number}`,
        });
      }
    });
  } catch (error) {
    console.error("Error fetching bus data:", error);
    alert("Failed to fetch bus data.");
  }
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
