// driver.js

document.getElementById("busForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const lat = parseFloat(document.getElementById("lat").value.trim());
  const lng = parseFloat(document.getElementById("lng").value.trim());

  if (isNaN(lat) || isNaN(lng)) {
    alert("Invalid latitude or longitude.");
    return;
  }

  const bus_id = document.getElementById("bus_id").value.trim();
  const bus_type = document.getElementById("bus_type").value.trim();
  const source = document.getElementById("source").value.trim().toLowerCase();
  const destination = document.getElementById("destination").value.trim().toLowerCase();
  const contact = document.getElementById("contact").value.trim();

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in as a driver.");
    return;
  }

  const busData = {
    bus_id,
    driver_id: user.uid,
    bus_type,
    route: {
      source,
      destination
    },
    contact_number: contact,
    current_location: {
      lat,
      lng,
      updated_at: new Date().toISOString()
    },
    last_updated: new Date().toISOString()
  };

  db.collection("buses").doc(bus_id).set(busData)
    .then(() => {
      alert("Bus information submitted successfully!");
      document.getElementById("busForm").reset();
    })
    .catch((error) => {
      alert("Error submitting bus info: " + error.message);
    });
});
