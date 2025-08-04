// js/user.js

import { db, auth } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  updateDoc,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

// Global variables
let map, directionsService, directionsRenderer, userLocationRenderer, selectedBusRenderer;
let userMarker, selectedStopMarker, selectedBusMarker;
let busMarkers = [];
let userLocation = null;
let selectedDestination = null;
let nearestBusStops = [];
let currentUser = null;
let selectedBus = null;
let availableBuses = [];

// DOM Elements
const busFinderNav = document.getElementById("busFinderNav");
const profileNav = document.getElementById("profileNav");
const busFinderSection = document.getElementById("busFinderSection");
const profileSection = document.getElementById("profileSection");

// Initialize page
window.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  initializeNavigation();
  initializeMap();
  getUserLocation();
  
  // Event listeners
  document.getElementById("refreshLocationBtn").addEventListener("click", getUserLocation);
  document.getElementById("findBusBtn").addEventListener("click", handleDestinationSearch);
  document.getElementById("profileForm").addEventListener("submit", handleProfileUpdate);
  
  // Initialize destination search with Google Places
  initializeDestinationSearch();
});

// Authentication
function initializeAuth() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadUserProfile();
    } else {
      window.location.href = "index.html";
    }
  });
}

// Navigation
function initializeNavigation() {
  busFinderNav.addEventListener("click", (e) => {
    e.preventDefault();
    showSection("busFinderSection");
  });

  profileNav.addEventListener("click", (e) => {
    e.preventDefault();
    showSection("profileSection");
  });
}

function showSection(sectionId) {
  // Remove active class from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section and activate nav
  document.getElementById(sectionId).classList.add('active');
  
  if (sectionId === "busFinderSection") {
    busFinderNav.classList.add('active');
  } else if (sectionId === "profileSection") {
    profileNav.classList.add('active');
  }
}

// Map initialization
function initializeMap() {
  map = new google.maps.Map(document.getElementById("busFinderMap"), {
    center: { lat: 22.2604, lng: 84.8536 }, // Rourkela coordinates
    zoom: 14,
    mapTypeControl: false,
    fullscreenControl: false,
  });

  directionsService = new google.maps.DirectionsService();
  
  // Renderer for user location to bus stop (black route)
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#000000",
      strokeWeight: 4,
    }
  });
  directionsRenderer.setMap(map);
  
  // Renderer for bus stop to destination (blue route)
  userLocationRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#007bff",
      strokeWeight: 4,
    }
  });
  userLocationRenderer.setMap(map);
  
  // Renderer for selected bus route (green route)
  selectedBusRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#28a745",
      strokeWeight: 5,
      strokeOpacity: 0.8
    }
  });
  selectedBusRenderer.setMap(map);
}

// Initialize Google Places Autocomplete for destination search
function initializeDestinationSearch() {
  const destinationInput = document.getElementById("destinationSearch");
  const autocomplete = new google.maps.places.Autocomplete(destinationInput);
  autocomplete.bindTo('bounds', map);
  
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      selectedDestination = {
        name: place.name || place.formatted_address,
        address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
    }
  });
}

// Get user's current location
function getUserLocation() {
  const locationText = document.getElementById("currentLocationText");
  locationText.textContent = "Getting your location...";
  
  if (!navigator.geolocation) {
    locationText.textContent = "Geolocation is not supported by this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Update user marker
      updateUserMarker();
      
      // Get address for display
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ location: userLocation });
        
        if (response.results[0]) {
          locationText.textContent = response.results[0].formatted_address;
        } else {
          locationText.textContent = `Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`;
        }
      } catch (error) {
        locationText.textContent = `Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`;
      }
      
      // Find nearest bus stops
      await findNearestBusStops();
    },
    (error) => {
      locationText.textContent = "Unable to get your location. Please enable location services.";
      console.error("Geolocation error:", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  );
}

// Update user marker on map
function updateUserMarker() {
  if (!userLocation) return;
  
  if (userMarker) {
    userMarker.setPosition(userLocation);
  } else {
    userMarker = new google.maps.Marker({
      position: userLocation,
      map: map,
      title: "Your Location",
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      }
    });
  }
  
  // Center map on user location
  map.setCenter(userLocation);
}

// Find nearest bus stops from routes collection
async function findNearestBusStops() {
  if (!userLocation) return;
  
  const nearestStopsList = document.getElementById("nearestStopsList");
  nearestStopsList.innerHTML = '<div class="loading">Finding nearby stops...</div>';
  
  try {
    // Get all routes from Firestore
    const routesSnapshot = await getDocs(collection(db, "routes"));
    let allBusStops = [];
    
    routesSnapshot.forEach((doc) => {
      const routeData = doc.data();
      if (routeData.busStops && Array.isArray(routeData.busStops)) {
        routeData.busStops.forEach(stop => {
          allBusStops.push({
            ...stop,
            routeId: doc.id,
            routeNumber: routeData.routeNumber,
            busNumber: routeData.busNumber,
            source: routeData.source,
            destination: routeData.destination
          });
        });
      }
    });
    
    // Calculate distances and sort
    nearestBusStops = allBusStops.map(stop => ({
      ...stop,
      distance: calculateDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng)
    })).sort((a, b) => a.distance - b.distance).slice(0, 5); // Get 5 nearest stops
    
    // Display nearest stops
    displayNearestStops();
    
  } catch (error) {
    console.error("Error finding nearest bus stops:", error);
    nearestStopsList.innerHTML = '<div class="error">Error finding nearby stops.</div>';
  }
}

// Display nearest bus stops
function displayNearestStops() {
  const nearestStopsList = document.getElementById("nearestStopsList");
  
  if (nearestBusStops.length === 0) {
    nearestStopsList.innerHTML = '<div class="no-data">No bus stops found nearby.</div>';
    return;
  }
  
  nearestStopsList.innerHTML = '';
  
  nearestBusStops.forEach((stop, index) => {
    const stopElement = document.createElement('div');
    stopElement.className = 'stop-item';
    stopElement.innerHTML = `
      <div class="stop-name">${stop.name}</div>
      <div class="stop-distance">${(stop.distance / 1000).toFixed(2)} km away</div>
      <div class="stop-route">Route: ${stop.routeNumber} (${stop.source} → ${stop.destination})</div>
    `;
    
    stopElement.addEventListener('click', () => selectBusStop(stop, index));
    nearestStopsList.appendChild(stopElement);
  });
}

// Select a bus stop
function selectBusStop(stop, index) {
  // Remove previous selection
  document.querySelectorAll('.stop-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Select current stop
  document.querySelectorAll('.stop-item')[index].classList.add('selected');
  
  // Update map
  showRouteToStop(stop);
  
  // Get bus information for this stop
  getBusInformation(stop);
}

// Show route from user location to selected bus stop
function showRouteToStop(stop) {
  if (!userLocation) return;
  
  const request = {
    origin: userLocation,
    destination: { lat: stop.lat, lng: stop.lng },
    travelMode: google.maps.TravelMode.WALKING,
  };
  
  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
    } else {
      console.error("Directions request failed:", status);
    }
  });
  
  // Add marker for selected bus stop
  if (selectedStopMarker) {
    selectedStopMarker.setMap(null);
  }
  
  selectedStopMarker = new google.maps.Marker({
    position: { lat: stop.lat, lng: stop.lng },
    map: map,
    title: stop.name,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
    }
  });
}

// Handle destination search
async function handleDestinationSearch() {
  if (!selectedDestination) {
    alert("Please select a destination from the dropdown.");
    return;
  }
  
  if (!userLocation) {
    alert("Please allow location access first.");
    return;
  }
  
  // Show route from nearest bus stop to destination
  if (nearestBusStops.length > 0) {
    const nearestStop = nearestBusStops[0];
    showBusStopToDestinationRoute(nearestStop);
  }
  
  // Get bus information
  await getAllBusInformation();
}

// Show route from bus stop to destination
function showBusStopToDestinationRoute(stop) {
  const request = {
    origin: { lat: stop.lat, lng: stop.lng },
    destination: { lat: selectedDestination.lat, lng: selectedDestination.lng },
    travelMode: google.maps.TravelMode.DRIVING,
  };
  
  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      userLocationRenderer.setDirections(result);
    } else {
      console.error("Bus route directions request failed:", status);
    }
  });
}

// Get bus information from active_journeys collection
async function getBusInformation(selectedStop) {
  try {
    const busInfoContainer = document.getElementById("busInfoContainer");
    busInfoContainer.style.display = "block";
    
    // Query active journeys
    const activeJourneysSnapshot = await getDocs(
      query(collection(db, "active_journeys"), where("status", "==", "active"))
    );
    
    let relevantBuses = [];
    
    activeJourneysSnapshot.forEach((doc) => {
      const journeyData = doc.data();
      
      // Check if this journey passes through the selected stop area
      if (journeyData.busStops && Array.isArray(journeyData.busStops)) {
        const passesThrough = journeyData.busStops.some(stop => 
          calculateDistance(stop.lat, stop.lng, selectedStop.lat, selectedStop.lng) < 500 // Within 500m
        );
        
        if (passesThrough) {
          relevantBuses.push({
            ...journeyData,
            id: doc.id,
            estimatedArrival: calculateEstimatedArrival(journeyData, selectedStop)
          });
        }
      }
    });
    
    // Sort by estimated arrival time
    relevantBuses.sort((a, b) => a.estimatedArrival.minutes - b.estimatedArrival.minutes);
    
    displayBusInformation(relevantBuses);
    
  } catch (error) {
    console.error("Error getting bus information:", error);
  }
}

// Get all bus information for destination search
async function getAllBusInformation() {
  try {
    const busInfoContainer = document.getElementById("busInfoContainer");
    busInfoContainer.style.display = "block";
    
    // Query active journeys
    const activeJourneysSnapshot = await getDocs(
      query(collection(db, "active_journeys"), where("status", "==", "active"))
    );
    
    availableBuses = [];
    
    // Get route data for each active journey
    for (const journeyDoc of activeJourneysSnapshot.docs) {
      const journeyData = journeyDoc.data();
      
      try {
        // Get the route data to check if it serves the destination
        const routeDoc = await getDoc(doc(db, "routes", journeyData.routeId));
        
        if (routeDoc.exists()) {
          const routeData = routeDoc.data();
          
          // Check if destination is along the route or within reasonable distance
          if (routeData.busStops && Array.isArray(routeData.busStops)) {
            const servesDestination = routeData.busStops.some(stop => 
              calculateDistance(stop.lat, stop.lng, selectedDestination.lat, selectedDestination.lng) < 2000 // Within 2km
            );
            
            if (servesDestination && nearestBusStops.length > 0) {
              // Find the best pickup stop for user
              const pickupStop = findBestPickupStop(routeData.busStops, nearestBusStops);
              const dropoffStop = findBestDropoffStop(routeData.busStops, selectedDestination);
              
              if (pickupStop && dropoffStop) {
                const estimatedArrival = calculateEstimatedArrival(journeyData, pickupStop);
                
                availableBuses.push({
                  ...journeyData,
                  id: journeyDoc.id,
                  routeData: routeData,
                  pickupStop: pickupStop,
                  dropoffStop: dropoffStop,
                  estimatedArrival
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error getting route data for journey:", journeyDoc.id, error);
      }
    }
    
    // Sort by estimated arrival time
    availableBuses.sort((a, b) => a.estimatedArrival.minutes - b.estimatedArrival.minutes);
    
    displayBusInformationWithSelection(availableBuses);
    
  } catch (error) {
    console.error("Error getting all bus information:", error);
  }
}

// Find the best pickup stop for user (closest to user's nearest stops)
function findBestPickupStop(routeBusStops, userNearestStops) {
  let bestStop = null;
  let minDistance = Infinity;
  
  for (const routeStop of routeBusStops) {
    for (const userStop of userNearestStops) {
      const distance = calculateDistance(routeStop.lat, routeStop.lng, userStop.lat, userStop.lng);
      if (distance < minDistance) {
        minDistance = distance;
        bestStop = routeStop;
      }
    }
  }
  
  return minDistance < 1000 ? bestStop : null; // Only if within 1km
}

// Find the best dropoff stop for destination
function findBestDropoffStop(routeBusStops, destination) {
  let bestStop = null;
  let minDistance = Infinity;
  
  for (const routeStop of routeBusStops) {
    const distance = calculateDistance(routeStop.lat, routeStop.lng, destination.lat, destination.lng);
    if (distance < minDistance) {
      minDistance = distance;
      bestStop = routeStop;
    }
  }
  
  return minDistance < 2000 ? bestStop : null; // Only if within 2km
}

// Display bus information with selection capability
function displayBusInformationWithSelection(buses) {
  const nextBusDetails = document.getElementById("nextBusDetails");
  const otherBusesDetails = document.getElementById("otherBusesDetails");
  
  if (buses.length === 0) {
    nextBusDetails.innerHTML = '<div class="no-data">No active buses found for this route.</div>';
    otherBusesDetails.innerHTML = '';
    return;
  }
  
  // Display next arriving bus
  const nextBus = buses[0];
  nextBusDetails.innerHTML = createBusSelectionCard(nextBus, 0, true);
  
  // Display other buses
  if (buses.length > 1) {
    otherBusesDetails.innerHTML = '';
    buses.slice(1).forEach((bus, index) => {
      const busElement = document.createElement('div');
      busElement.innerHTML = createBusSelectionCard(bus, index + 1, false);
      otherBusesDetails.appendChild(busElement);
    });
  } else {
    otherBusesDetails.innerHTML = '<div class="no-data">No other buses available.</div>';
  }
}

// Create bus selection card
function createBusSelectionCard(bus, index, isNext) {
  const walkingDistanceToPickup = userLocation && bus.pickupStop ? 
    (calculateDistance(userLocation.lat, userLocation.lng, bus.pickupStop.lat, bus.pickupStop.lng) / 1000).toFixed(2) : 'N/A';
  
  const walkingDistanceFromDropoff = bus.dropoffStop && selectedDestination ?
    (calculateDistance(bus.dropoffStop.lat, bus.dropoffStop.lng, selectedDestination.lat, selectedDestination.lng) / 1000).toFixed(2) : 'N/A';

  return `
    <div class="bus-item ${selectedBus && selectedBus.id === bus.id ? 'selected-bus' : ''}" onclick="selectBus(${index})">
      <div class="bus-header">
        <div class="bus-number">${bus.busNumber}</div>
        <button class="select-bus-btn ${selectedBus && selectedBus.id === bus.id ? 'selected' : ''}" onclick="event.stopPropagation(); selectBus(${index})">
          ${selectedBus && selectedBus.id === bus.id ? 'Selected' : 'Select Bus'}
        </button>
      </div>
      <div class="bus-details">
        <strong>Route:</strong> ${bus.routeNumber} (${bus.routeData.source} → ${bus.routeData.destination})<br>
        <strong>Driver:</strong> ${bus.driverName}<br>
        <strong>Pickup:</strong> ${bus.pickupStop.name} (${walkingDistanceToPickup} km walk)<br>
        <strong>Dropoff:</strong> ${bus.dropoffStop.name} (${walkingDistanceFromDropoff} km walk to destination)<br>
        <span class="arrival-time">Estimated arrival at pickup: ${bus.estimatedArrival.time} (in ${bus.estimatedArrival.minutes} min)</span>
      </div>
    </div>
  `;
}

// Select a bus and show its route
window.selectBus = function(busIndex) {
  if (busIndex >= availableBuses.length) return;
  
  selectedBus = availableBuses[busIndex];
  
  // Update UI to show selection
  displayBusInformationWithSelection(availableBuses);
  
  // Show the complete route on map
  showSelectedBusRoute();
  
  // Show selected bus marker if it has current location
  showSelectedBusMarker();
};

// Show selected bus route on map
function showSelectedBusRoute() {
  if (!selectedBus || !selectedBus.routeData || !selectedBus.routeData.busStops) return;
  
  const busStops = selectedBus.routeData.busStops;
  
  if (busStops.length < 2) return;
  
  // Create waypoints from bus stops (excluding first and last)
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
      selectedBusRenderer.setDirections(result);
      
      // Clear other routes to focus on selected bus route
      directionsRenderer.setDirections({routes: []});
      userLocationRenderer.setDirections({routes: []});
      
      // Show routes from user to pickup and from dropoff to destination
      showUserToPickupRoute();
      showDropoffToDestinationRoute();
      
    } else {
      console.error("Selected bus route directions request failed:", status);
    }
  });
}

// Show route from user location to pickup stop
function showUserToPickupRoute() {
  if (!userLocation || !selectedBus || !selectedBus.pickupStop) return;
  
  const request = {
    origin: userLocation,
    destination: { lat: selectedBus.pickupStop.lat, lng: selectedBus.pickupStop.lng },
    travelMode: google.maps.TravelMode.WALKING,
  };
  
  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
    }
  });
}

// Show route from dropoff stop to destination
function showDropoffToDestinationRoute() {
  if (!selectedDestination || !selectedBus || !selectedBus.dropoffStop) return;
  
  const request = {
    origin: { lat: selectedBus.dropoffStop.lat, lng: selectedBus.dropoffStop.lng },
    destination: { lat: selectedDestination.lat, lng: selectedDestination.lng },
    travelMode: google.maps.TravelMode.WALKING,
  };
  
  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      userLocationRenderer.setDirections(result);
    }
  });
}

// Show selected bus marker on map
function showSelectedBusMarker() {
  // Remove previous bus marker
  if (selectedBusMarker) {
    selectedBusMarker.setMap(null);
  }
  
  if (!selectedBus || !selectedBus.currentLocation) return;
  
  selectedBusMarker = new google.maps.Marker({
    position: { 
      lat: selectedBus.currentLocation.lat, 
      lng: selectedBus.currentLocation.lng 
    },
    map: map,
    title: `Bus ${selectedBus.busNumber} - ${selectedBus.routeNumber}`,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      scaledSize: new google.maps.Size(32, 32)
    }
  });
  
  // Add info window to bus marker
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="padding: 10px;">
        <h4 style="margin: 0 0 5px 0; color: #28a745;">🚌 ${selectedBus.busNumber}</h4>
        <p style="margin: 0; font-size: 14px;">
          <strong>Route:</strong> ${selectedBus.routeNumber}<br>
          <strong>Driver:</strong> ${selectedBus.driverName}<br>
          <strong>Status:</strong> Active
        </p>
      </div>
    `
  });
  
  selectedBusMarker.addListener('click', () => {
    infoWindow.open(map, selectedBusMarker);
  });
}

// Calculate estimated arrival time
function calculateEstimatedArrival(journeyData, targetStop) {
  const now = new Date();
  const startTime = new Date(journeyData.startedAt);
  const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
  
  // Simple estimation: assume 30 km/h average speed
  const averageSpeed = 30; // km/h
  let estimatedMinutes = 15; // Default estimate
  
  if (journeyData.currentLocation && targetStop) {
    const distance = calculateDistance(
      journeyData.currentLocation.lat,
      journeyData.currentLocation.lng,
      targetStop.lat,
      targetStop.lng
    );
    
    // Convert distance to travel time
    estimatedMinutes = Math.ceil((distance / 1000) / averageSpeed * 60);
  }
  
  const arrivalTime = new Date(now.getTime() + estimatedMinutes * 60000);
  
  return {
    minutes: estimatedMinutes,
    time: arrivalTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
}

// Display bus information
function displayBusInformation(buses) {
  const nextBusDetails = document.getElementById("nextBusDetails");
  const otherBusesDetails = document.getElementById("otherBusesDetails");
  
  if (buses.length === 0) {
    nextBusDetails.innerHTML = '<div class="no-data">No active buses found for this route.</div>';
    otherBusesDetails.innerHTML = '';
    return;
  }
  
  // Display next arriving bus
  const nextBus = buses[0];
  nextBusDetails.innerHTML = `
    <div class="bus-item">
      <div class="bus-number">${nextBus.busNumber}</div>
      <div class="bus-details">
        Route: ${nextBus.routeNumber}<br>
        Driver: ${nextBus.driverName}<br>
        <span class="arrival-time">Estimated arrival: ${nextBus.estimatedArrival.time} (in ${nextBus.estimatedArrival.minutes} min)</span>
      </div>
    </div>
  `;
  
  // Display other buses
  if (buses.length > 1) {
    otherBusesDetails.innerHTML = '';
    buses.slice(1).forEach(bus => {
      const busElement = document.createElement('div');
      busElement.className = 'bus-item';
      busElement.innerHTML = `
        <div class="bus-number">${bus.busNumber}</div>
        <div class="bus-details">
          Route: ${bus.routeNumber}<br>
          Driver: ${bus.driverName}<br>
          <span class="arrival-time">Estimated arrival: ${bus.estimatedArrival.time} (in ${bus.estimatedArrival.minutes} min)</span>
        </div>
      `;
      otherBusesDetails.appendChild(busElement);
    });
  } else {
    otherBusesDetails.innerHTML = '<div class="no-data">No other buses available.</div>';
  }
}

// Load user profile
async function loadUserProfile() {
  if (!currentUser) return;
  
  try {
    // Update header with user name
    const userName = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById("userName").textContent = userName;
    
    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    let userData = {
      name: currentUser.displayName || "",
      email: currentUser.email || "",
      phone: "",
      address: ""
    };
    
    if (userDoc.exists()) {
      userData = { ...userData, ...userDoc.data() };
    }
    
    // Update profile display
    updateProfileDisplay(userData);
    
  } catch (error) {
    console.error("Error loading user profile:", error);
  }
}

// Update profile display
function updateProfileDisplay(userData) {
  // Update profile card
  document.getElementById("profileUserName").textContent = userData.name || "User";
  document.getElementById("profileUserEmail").textContent = userData.email || "";
  
  // Update initials
  const name = userData.name || userData.email || "User";
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById("userInitials").textContent = initials;
  
  // Update form fields
  document.getElementById("updateName").value = userData.name || "";
  document.getElementById("updateEmail").value = userData.email || "";
  document.getElementById("updatePhone").value = userData.phone || "";
  document.getElementById("updateAddress").value = userData.address || "";
}

// Handle profile update
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  if (!currentUser) return;
  
  const formData = {
    name: document.getElementById("updateName").value.trim(),
    email: document.getElementById("updateEmail").value.trim(),
    phone: document.getElementById("updatePhone").value.trim(),
    address: document.getElementById("updateAddress").value.trim(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    // Update user document in Firestore
    await updateDoc(doc(db, "users", currentUser.uid), formData);
    
    // Update display
    updateProfileDisplay(formData);
    
    // Update header
    document.getElementById("userName").textContent = formData.name || formData.email.split('@')[0];
    
    alert("Profile updated successfully!");
    
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Error updating profile: " + error.message);
  }
}

// Calculate distance between two coordinates (Haversine formula)
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

// Logout function
function logoutUser() {
  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Logout error:", error);
      alert("Logout failed: " + error.message);
    });
}

// Make logoutUser available globally
window.logoutUser = logoutUser;