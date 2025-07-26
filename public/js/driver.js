// js/driver.js

let watchId = null;
let busId = null;

document.getElementById("driverForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const busNumber = document.getElementById("bus_number").value.trim();
  const source = document.getElementById("source").value.trim().toLowerCase();
  const destination = document.getElementById("destination").value.trim().toLowerCase();

  // Create or get bus document
  const busRef = db.collection("buses").doc(busNumber);
  await busRef.set({
    bus_number: busNumber,
    source: source,
    destination: destination,
    active: true,
    last_updated: new Date().toISOString()
  }, { merge: true });

  busId = busNumber;
  startLocationUpdates(busId);
});

function startLocationUpdates(busId) {
  if (!navigator.geolocation) {
    alert("Geolocation not supported by this browser.");
    return;
  }

  document.getElementById("status").innerText = "Live location sharing started.";

  watchId = navigator.geolocation.watchPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    await db.collection("buses").doc(busId).update({
      latitude: lat,
      longitude: lng,
      last_updated: new Date().toISOString()
    });

  }, (error) => {
    console.error("Error fetching location:", error);
  }, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
  });
}

function logoutDriver() {
  // If using Firebase Auth, you may want to sign out first:
  if (typeof auth !== "undefined" && auth.signOut) {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    }).catch(() => {
      window.location.href = "index.html";
    });
  } else {
    window.location.href = "index.html";
  }
}
