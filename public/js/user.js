// user.js

document.getElementById("searchForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const source = document.getElementById("source").value.trim().toLowerCase();
  const destination = document.getElementById("destination").value.trim().toLowerCase();

  db.collection("buses")
    .where("route.source", "==", source)
    .where("route.destination", "==", destination)
    .get()
    .then((snapshot) => {
      const resultsDiv = document.getElementById("results");
      resultsDiv.innerHTML = "";

      if (snapshot.empty) {
        resultsDiv.innerHTML = "<p>No buses found for this route.</p>";
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = document.createElement("div");
        card.className = "bus-card";
        card.innerHTML = `
          <h3>Bus ID: ${data.bus_id}</h3>
          <p>Type: ${data.bus_type}</p>
          <p>Contact: ${data.contact_number}</p>
          <p>Current Location: ${data.current_location ? data.current_location.lat + ", " + data.current_location.lng : "Not Updated"}</p>
          <p>Last Updated: ${data.last_updated ? new Date(data.last_updated).toLocaleString() : "N/A"}</p>
        `;
        resultsDiv.appendChild(card);
      });
    })
    .catch((error) => {
      alert("Error fetching buses: " + error.message);
    });
});
