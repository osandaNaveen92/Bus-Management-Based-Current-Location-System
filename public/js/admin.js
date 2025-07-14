// admin.js

document.getElementById("createDriverForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("driver_email").value;
  const password = document.getElementById("driver_password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      return db.collection("users").doc(uid).set({
        uid,
        email,
        role: "driver",
        registered_at: new Date().toISOString()
      });
    })
    .then(() => {
      alert("Driver created successfully!");
      document.getElementById("createDriverForm").reset();
      loadDrivers();
    })
    .catch((error) => {
      alert(error.message);
    });
});

function loadDrivers() {
  const driverList = document.getElementById("driverList");
  driverList.innerHTML = "";

  db.collection("users").where("role", "==", "driver").get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.email} - Registered on: ${new Date(data.registered_at).toLocaleString()}`;
        driverList.appendChild(li);
      });
    });
}

// Load drivers on page load
window.onload = loadDrivers;
