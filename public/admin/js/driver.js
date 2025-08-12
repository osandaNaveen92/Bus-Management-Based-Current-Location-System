import { db } from './firebase-config.js';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  collection, 
  where, 
  getDoc,
  addDoc 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Global variables
let currentDriverData = null;
let routeMap = null;
let trackingMap = null;
let directionsService = null;
let directionsRenderer = null;
let routeMarkers = [];
let busStops = [];
let autocomplete = null;
let selectedRouteData = null;
let activeJourneyId = null;
let watchId = null;
let driverMarker = null;

// DOM Elements
const profileNav = document.getElementById("profileNav");
const routeNav = document.getElementById("routeNav");
const journeyNav = document.getElementById("journeyNav");
const logoutNav = document.getElementById("logoutNav");

const profileSection = document.getElementById("profileSection");
const routeSection = document.getElementById("routeSection");
const journeySection = document.getElementById("journeySection");

// Navigation handlers
profileNav.addEventListener("click", (e) => {
  e.preventDefault();
  showSection("profile");
});

routeNav.addEventListener("click", (e) => {
  e.preventDefault();
  showSection("route");
});

journeyNav.addEventListener("click", (e) => {
  e.preventDefault();
  showSection("journey");
});

logoutNav.addEventListener("click", (e) => {
  e.preventDefault();
  logoutDriver();
});

function showSection(section) {
  // Remove active class from all nav items
  document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('nav-active'));
  
  // Hide all sections
  profileSection.style.display = "none";
  routeSection.style.display = "none";
  journeySection.style.display = "none";
  
  // Show selected section and activate nav
  switch(section) {
    case "profile":
      profileSection.style.display = "block";
      profileNav.classList.add('nav-active');
      loadDriverProfile();
      break;
    case "route":
      routeSection.style.display = "block";
      routeNav.classList.add('nav-active');
      initializeRouteMap();
      break;
    case "journey":
      journeySection.style.display = "block";
      journeyNav.classList.add('nav-active');
      loadSavedRoutes();
      break;
  }
}

// Load driver profile
async function loadDriverProfile() {
  try {
    const driverData = JSON.parse(sessionStorage.getItem('driverData'));
    if (!driverData || !driverData.uid) {
      window.location.href = "adminlogin.html";
      return;
    }

    currentDriverData = driverData;

    // Get fresh data from Firestore
    const driverDoc = await getDoc(doc(db, "drivers", driverData.uid));
    if (driverDoc.exists()) {
      const freshData = driverDoc.data();
      currentDriverData = { ...driverData, ...freshData };
    }

    // Update profile display
    updateProfileDisplay(currentDriverData);
    
  } catch (error) {
    console.error("Error loading driver profile:", error);
    showError("Error loading profile data.");
  }
}

function updateProfileDisplay(data) {
  const name = data.name || "Driver";
  const email = data.email || "";
  const phone = data.phone || data.Phone || "";

  // Update profile elements
  document.getElementById("profileDriverName").textContent = name;
  document.getElementById("profileDriverEmail").textContent = email;
  document.getElementById("driverName").textContent = name;
  document.getElementById("driverEmail").textContent = email;
  document.getElementById("driverPhone").textContent = phone;
  
  // Update initials
  const initials = name ? 
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
    "DR";
  document.getElementById("driverInitials").textContent = initials;
}

// Initialize route map
function initializeRouteMap() {
  if (!routeMap) {
    routeMap = new google.maps.Map(document.getElementById("routeMap"), {
      center: { lat: 22.2604, lng: 84.8536 }, // Rourkela coordinates
      zoom: 12,
      mapId: "dbbfb57bd015b3aa3f059773"
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      map: routeMap,
      draggable: true
    });

    // Initialize autocomplete for stop search
    const stopSearchInput = document.getElementById("stopSearch");
    autocomplete = new google.maps.places.Autocomplete(stopSearchInput);
    autocomplete.bindTo('bounds', routeMap);

    // Add stop button handler
    document.getElementById("addStopBtn").addEventListener("click", addBusStop);
    document.getElementById("clearStopsBtn").addEventListener("click", clearAllStops);
    
    // Map click handler to add stops
    routeMap.addListener("click", (event) => {
      addStopByCoordinates(event.latLng);
    });
  }
}

// Add bus stop by search
function addBusStop() {
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    showError("Please select a valid location from the dropdown.");
    return;
  }

  const stopData = {
    name: place.name || place.formatted_address,
    address: place.formatted_address,
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng()
  };

  busStops.push(stopData);
  addMarkerToMap(stopData);
  updateStopsList();
  updateRoute();
  
  // Clear search input
  document.getElementById("stopSearch").value = "";
}

// Add bus stop by clicking on map
async function addStopByCoordinates(latLng) {
  try {
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({ location: latLng });
    
    if (response.results[0]) {
      const result = response.results[0];
      const stopData = {
        name: result.formatted_address.split(',')[0],
        address: result.formatted_address,
        lat: latLng.lat(),
        lng: latLng.lng()
      };

      busStops.push(stopData);
      addMarkerToMap(stopData);
      updateStopsList();
      updateRoute();
    }
  } catch (error) {
    console.error("Error geocoding location:", error);
    showError("Error getting location details.");
  }
}

// Add marker to map
function addMarkerToMap(stopData) {
  const { AdvancedMarkerElement } = google.maps.marker;
  
  const marker = new AdvancedMarkerElement({
    map: routeMap,
    position: { lat: stopData.lat, lng: stopData.lng },
    title: stopData.name,
    content: createStopMarker(busStops.length)
  });

  routeMarkers.push(marker);
}

// Create custom stop marker
function createStopMarker(number) {
  const div = document.createElement("div");
  div.style.width = "30px";
  div.style.height = "30px";
  div.style.backgroundColor = "#007bff";
  div.style.borderRadius = "50%";
  div.style.border = "3px solid white";
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.justifyContent = "center";
  div.style.color = "white";
  div.style.fontWeight = "bold";
  div.style.fontSize = "12px";
  div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  div.textContent = number;
  return div;
}

// Update stops list display
function updateStopsList() {
  const stopsList = document.getElementById("stopsList");
  stopsList.innerHTML = "";

  busStops.forEach((stop, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${index + 1}. ${stop.name}</span>
      <button class="remove-stop" onclick="removeStop(${index})">Remove</button>
    `;
    stopsList.appendChild(li);
  });
}

// Remove stop
window.removeStop = function(index) {
  busStops.splice(index, 1);
  routeMarkers[index].map = null;
  routeMarkers.splice(index, 1);
  
  // Update remaining markers numbers
  routeMarkers.forEach((marker, i) => {
    marker.content = createStopMarker(i + 1);
  });
  
  updateStopsList();
  updateRoute();
};

// Clear all stops
function clearAllStops() {
  busStops = [];
  routeMarkers.forEach(marker => marker.map = null);
  routeMarkers = [];
  updateStopsList();
  directionsRenderer.setDirections({routes: []});
}

// Update route on map
function updateRoute() {
  if (busStops.length < 2) {
    directionsRenderer.setDirections({routes: []});
    return;
  }

  const waypoints = busStops.slice(1, -1).map(stop => ({
    location: { lat: stop.lat, lng: stop.lng },
    stopover: true
  }));

  const request = {
    origin: { lat: busStops[0].lat, lng: busStops[0].lng },
    destination: { lat: busStops[busStops.length - 1].lat, lng: busStops[busStops.length - 1].lng },
    waypoints: waypoints,
    travelMode: google.maps.TravelMode.DRIVING
  };

  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
    } else {
      console.error("Directions request failed:", status);
    }
  });
}

// Route form submission
document.getElementById("routeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const routeNumber = document.getElementById("route_number").value.trim();
  const busNumber = document.getElementById("bus_number").value.trim();
  const source = document.getElementById("route_source").value.trim();
  const destination = document.getElementById("route_destination").value.trim();
  const busType = document.getElementById("bus_type").value;
  const journeyTime = document.getElementById("journey_time").value;

  if (busStops.length < 2) {
    showError("Please add at least 2 bus stops to create a route.");
    return;
  }

  try {
    const routeData = {
      routeNumber,
      busNumber,
      source,
      destination,
      busType,
      journeyTime: parseFloat(journeyTime),
      busStops: busStops,
      driverId: currentDriverData.uid,
      driverName: currentDriverData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore
    await addDoc(collection(db, "routes"), routeData);
    
    showSuccess("Route saved successfully!");
    document.getElementById("routeForm").reset();
    clearAllStops();
    
  } catch (error) {
    console.error("Error saving route:", error);
    showError("Error saving route: " + error.message);
  }
});

// Load saved routes for journey section
async function loadSavedRoutes() {
  try {
    const routesList = document.getElementById("routesList");
    routesList.innerHTML = '<div class="loading">Loading routes...</div>';

    const q = query(
      collection(db, "routes"), 
      where("driverId", "==", currentDriverData.uid)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      routesList.innerHTML = '<div class="no-routes">No routes found. Please create a route first.</div>';
      return;
    }

    routesList.innerHTML = "";
    querySnapshot.forEach((doc) => {
      const routeData = doc.data();
      const routeCard = createRouteCard(doc.id, routeData);
      routesList.appendChild(routeCard);
    });

  } catch (error) {
    console.error("Error loading routes:", error);
    document.getElementById("routesList").innerHTML = '<div class="error">Error loading routes.</div>';
  }
}

// Create route card element
function createRouteCard(routeId, routeData) {
  const card = document.createElement("div");
  card.className = "route-card";
  card.dataset.routeId = routeId;
  
  card.innerHTML = `
    <h5>${routeData.routeNumber} - ${routeData.busNumber}</h5>
    <p><strong>From:</strong> ${routeData.source}</p>
    <p><strong>To:</strong> ${routeData.destination}</p>
    <p><strong>Type:</strong> ${routeData.busType}</p>
    <p><strong>Duration:</strong> ${routeData.journeyTime} hours</p>
    <p><strong>Stops:</strong> ${routeData.busStops.length}</p>
  `;

  card.addEventListener("click", () => selectRoute(routeId, routeData));
  return card;
}

// Select route for journey
function selectRoute(routeId, routeData) {
  // Remove previous selection
  document.querySelectorAll('.route-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Select current card
  document.querySelector(`[data-route-id="${routeId}"]`).classList.add('selected');
  
  selectedRouteData = { id: routeId, ...routeData };
  
  // Show selected route details
  document.getElementById("selectedRoute").style.display = "block";
  document.getElementById("selectedRouteNumber").textContent = routeData.routeNumber;
  document.getElementById("selectedBusNumber").textContent = routeData.busNumber;
  document.getElementById("selectedSource").textContent = routeData.source;
  document.getElementById("selectedDestination").textContent = routeData.destination;
  document.getElementById("selectedBusType").textContent = routeData.busType;
  document.getElementById("selectedJourneyTime").textContent = routeData.journeyTime;
}

// Start journey button handler
document.getElementById("startJourneyBtn").addEventListener("click", async () => {
  if (!selectedRouteData) {
    showError("Please select a route first.");
    return;
  }

  const startTime = document.getElementById("start_time").value;
  if (!startTime) {
    showError("Please select a start time.");
    return;
  }

  try {
    // Initialize tracking map
    await initializeTrackingMap();
    
    // Show tracking section
    document.getElementById("trackingSection").style.display = "block";
    
    // Start location tracking
    startLocationTracking();
    
    // Save journey start to database
    const journeyData = {
      routeId: selectedRouteData.id,
      routeNumber: selectedRouteData.routeNumber,
      busNumber: selectedRouteData.busNumber,
      driverId: currentDriverData.uid,
      driverName: currentDriverData.name,
      startTime: startTime,
      startedAt: new Date().toISOString(),
      status: "active",
      busStops: selectedRouteData.busStops,
      completedStops: []
    };

    const journeyDocRef = await addDoc(collection(db, "active_journeys"), journeyData);
    activeJourneyId = journeyDocRef.id; // Store the actual journey document ID
    
    showSuccess("Journey started successfully!");
    
  } catch (error) {
    console.error("Error starting journey:", error);
    showError("Error starting journey: " + error.message);
  }
});

// Initialize tracking map
async function initializeTrackingMap() {
  if (!trackingMap) {
    trackingMap = new google.maps.Map(document.getElementById("trackingMap"), {
      center: { lat: 22.2604, lng: 84.8536 },
      zoom: 14,
      mapId: "dbbfb57bd015b3aa3f059773"
    });

    const trackingDirectionsService = new google.maps.DirectionsService();
    const trackingDirectionsRenderer = new google.maps.DirectionsRenderer({
      map: trackingMap
    });

    // Show route on tracking map
    if (selectedRouteData && selectedRouteData.busStops.length >= 2) {
      const stops = selectedRouteData.busStops;
      const waypoints = stops.slice(1, -1).map(stop => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true
      }));

      const request = {
        origin: { lat: stops[0].lat, lng: stops[0].lng },
        destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING
      };

      trackingDirectionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          trackingDirectionsRenderer.setDirections(result);
        }
      });

      // Add stop markers
      stops.forEach((stop, index) => {
        const { AdvancedMarkerElement } = google.maps.marker;
        new AdvancedMarkerElement({
          map: trackingMap,
          position: { lat: stop.lat, lng: stop.lng },
          title: stop.name,
          content: createStopMarker(index + 1)
        });
      });
    }
  }
}

// Start location tracking
function startLocationTracking() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by this browser.");
    return;
  }

  document.getElementById("trackingStatus").textContent = "Live tracking active...";

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Update driver marker on map
      updateDriverMarker({ lat, lng });

      // Update location in database
      try {
        if (activeJourneyId) {
          await updateDoc(doc(db, "active_journeys", activeJourneyId), {
            currentLocation: { lat, lng },
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error updating location:", error);
      }

      // Check if near any bus stops
      checkNearbyStops(lat, lng);
    },
    (error) => {
      console.error("Geolocation error:", error);
      showError("Error getting location: " + error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Update driver marker on tracking map
function updateDriverMarker(position) {
  const { AdvancedMarkerElement } = google.maps.marker;

  if (!driverMarker) {
    driverMarker = new AdvancedMarkerElement({
      map: trackingMap,
      position: position,
      title: "Your Location",
      content: createDriverMarker()
    });
  } else {
    driverMarker.position = position;
  }

  // Center map on driver location
  trackingMap.setCenter(position);
}

// Create driver marker
function createDriverMarker() {
  const div = document.createElement("div");
  div.style.width = "20px";
  div.style.height = "20px";
  div.style.backgroundColor = "#28a745";
  div.style.borderRadius = "50%";
  div.style.border = "3px solid white";
  div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  return div;
}

// Check if driver is near any bus stops
function checkNearbyStops(lat, lng) {
  if (!selectedRouteData || !selectedRouteData.busStops) {
    return;
  }

  const threshold = 100; // 100 meters
  
  selectedRouteData.busStops.forEach((stop, index) => {
    const distance = calculateDistance(lat, lng, stop.lat, stop.lng);
    
    if (distance < threshold) {
      // Driver is near this stop
      console.log(`Near stop: ${stop.name}`);
      // You can add logic here to mark stop as completed
    }
  });
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Stop tracking button handler
document.getElementById("stopTrackingBtn").addEventListener("click", async () => {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  try {
    // Update journey status in database
    if (activeJourneyId) {
      await updateDoc(doc(db, "active_journeys", activeJourneyId), {
        status: "completed",
        completedAt: new Date().toISOString()
      });
    }

    document.getElementById("trackingStatus").textContent = "Tracking stopped";
    showSuccess("Journey completed successfully!");
    
    // Reset UI
    document.getElementById("trackingSection").style.display = "none";
    document.getElementById("selectedRoute").style.display = "none";
    selectedRouteData = null;
    activeJourneyId = null; // Reset the journey ID
    
    // Reload routes
    loadSavedRoutes();
    
  } catch (error) {
    console.error("Error stopping journey:", error);
    showError("Error stopping journey: " + error.message);
  }
});

// Logout function
function logoutDriver() {
  // Stop any active tracking
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
  
  // Clear session data
  sessionStorage.removeItem('driverData');
  
  // Redirect to login
  window.location.href = "adminlogin.html";
}

// Utility functions
function showError(message) {
  alert("Error: " + message);
}

function showSuccess(message) {
  alert("Success: " + message);
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  // Check if driver is logged in
  const driverData = sessionStorage.getItem('driverData');
  if (!driverData) {
    window.location.href = "adminlogin.html";
    return;
  }

  // Show profile section by default
  showSection("profile");
});