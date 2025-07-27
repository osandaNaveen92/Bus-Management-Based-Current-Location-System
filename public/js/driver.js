import { db } from './firebase-config.js';
import { doc, setDoc, updateDoc, getDocs, query, collection, where, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

let map, directionsService, directionsRenderer;
let haltMarkers = [];
let completedStops = new Set();
let halts = [];
let watchId = null;
let busId = null;
let driverMarker = null; // For live driver location

// ✅ Toggle profile menu
window.toggleProfileMenu = function () {
  document.getElementById("profileMenu").classList.toggle("show");
};

// ✅ Close dropdown when clicking outside
window.onclick = function (event) {
  if (!event.target.matches('.profile-btn')) {
    const dropdown = document.getElementById("profileMenu");
    if (dropdown && dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  }
};

// ✅ Load driver profile from Firestore
async function loadDriverProfile() {
  const driver = JSON.parse(localStorage.getItem('driverData'));
  if (driver && driver.uid) {
    try {
      const docRef = doc(db, "drivers", driver.uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        document.getElementById("driverEmail").innerText = data.email || "-";
        document.getElementById("driverName").innerText = data.name || "-";
        document.getElementById("driverPhone").innerText = data.phone || "-";
      } else {
        document.getElementById("driverEmail").innerText = "Not found";
        document.getElementById("driverName").innerText = "Not found";
        document.getElementById("driverPhone").innerText = "Not found";
      }
    } catch (err) {
      document.getElementById("driverEmail").innerText = "Error";
      document.getElementById("driverName").innerText = "Error";
      document.getElementById("driverPhone").innerText = "Error";
      console.error("Error loading driver profile:", err);
    }
  } else {
    document.getElementById("driverEmail").innerText = "Not logged in";
    document.getElementById("driverName").innerText = "Not logged in";
    document.getElementById("driverPhone").innerText = "Not logged in";
  }
}

document.addEventListener("DOMContentLoaded", loadDriverProfile);

// ✅ Form submission
document.getElementById("driverForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const busNumber = document.getElementById("bus_number").value.trim();
  const source = document.getElementById("source").value.trim();
  const destination = document.getElementById("destination").value.trim();
  const startTime = document.getElementById("start_time").value;

  try {
    halts = await getBusHalts(busNumber);
    if (halts.length === 0) {
      alert("No route found for this bus.");
      return;
    }

    const busRef = doc(db, "buses", busNumber);
    await setDoc(busRef, {
      bus_number: busNumber,
      source,
      destination,
      start_time: startTime,
      halts,
      active: true,
      last_updated: new Date().toISOString()
    }, { merge: true });

    busId = busNumber;
    await initializeMapAndMarkers(halts);
    startLocationUpdates(busId);
  } catch (error) {
    console.error("Error starting tracking:", error);
    alert("Failed to start tracking: " + error.message);
  }
});

// ✅ Fetch halts from Firestore
async function getBusHalts(busNumber) {
  const q = query(collection(db, "routes"), where("bus_number", "==", busNumber));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return snapshot.docs[0].data().bus_holts || [];
  return [];
}

// ✅ Initialize map & markers using AdvancedMarkerElement
async function initializeMapAndMarkers(halts) {
  if (!map) {
    map = new google.maps.Map(document.getElementById("map"), {
  center: { lat: 22.2604, lng: 84.8536 },
  zoom: 14,
  mapId: "dbbfb57bd015b3aa3f059773",
  mapTypeControl: false,
  fullscreenControl: false,
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map });
  }

  haltMarkers.forEach(marker => marker.map = null);
  haltMarkers = [];

  const haltCoords = await Promise.all(halts.map(halt => getCoordinates(halt)));
  
  const { AdvancedMarkerElement } = google.maps.marker;

  haltCoords.forEach((coords, idx) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: coords,
      content: createMarker("green"), // Initial color
      title: halts[idx]
    });
    haltMarkers.push(marker);
  });

  if (haltCoords.length >= 2) {
    const waypoints = haltCoords.slice(1, -1).map(coord => ({ location: coord, stopover: true }));
    directionsService.route({
      origin: haltCoords[0],
      destination: haltCoords[haltCoords.length - 1],
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) directionsRenderer.setDirections(result);
    });
  }
}

// ✅ Create custom marker dot
function createMarker(color) {
  const div = document.createElement("div");
  div.style.width = "16px";
  div.style.height = "16px";
  div.style.backgroundColor = color;
  div.style.borderRadius = "50%";
  div.style.border = "2px solid white";
  div.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
  return div;
}

// ✅ Track live location and update marker
function startLocationUpdates(busId) {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }
  document.getElementById("status").innerText = "Live location sharing started.";

  watchId = navigator.geolocation.watchPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // ✅ Update Firestore with new driver position
    await updateDoc(doc(db, "buses", busId), { latitude: lat, longitude: lng, last_updated: new Date().toISOString() });

    // ✅ Update live driver marker
    updateDriverMarker({ lat, lng });

    // ✅ Check stop completion
    updateStopColors(lat, lng);
  }, null, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
}

// ✅ Add or move live driver marker
function updateDriverMarker(position) {
  const { AdvancedMarkerElement } = google.maps.marker;

  if (!driverMarker) {
    driverMarker = new AdvancedMarkerElement({
      map,
      position,
      content: createDriverMarker(), // Blue dot for driver
      title: "Driver Location"
    });
  } else {
    driverMarker.position = position;
  }
}

// ✅ Create driver marker (blue)
function createDriverMarker() {
  const div = document.createElement("div");
  div.style.width = "18px";
  div.style.height = "18px";
  div.style.backgroundColor = "#007bff";
  div.style.borderRadius = "50%";
  div.style.border = "3px solid white";
  div.style.boxShadow = "0 0 6px rgba(0,0,0,0.5)";
  return div;
}

// ✅ Change marker color when passed
function updateStopColors(lat, lng) {
  const threshold = 100; // meters
  halts.forEach(async (halt, idx) => {
    if (!completedStops.has(halt)) {
      const coords = await getCoordinates(halt);
      const dist = getDistance(lat, lng, coords.lat, coords.lng);
      if (dist < threshold) {
        completedStops.add(halt);
        haltMarkers[idx].content = createMarker("red"); // Change color
        if (completedStops.size === halts.length) {
          alert("Route Completed!");
          navigator.geolocation.clearWatch(watchId);
        }
      }
    }
  });
}

// ✅ Geocode
async function getCoordinates(place) {
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=AIzaSyDOqiyWFnAWW7952NMEtJDhREv53ywrMJo`);
  const data = await response.json();
  return data.results[0]?.geometry.location || { lat: 0, lng: 0 };
}

// ✅ Calculate distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function logoutDriver() {
  navigator.geolocation.clearWatch(watchId);
  localStorage.removeItem('driverData');
  window.location.href = "index.html";
}
window.logoutDriver = logoutDriver;
