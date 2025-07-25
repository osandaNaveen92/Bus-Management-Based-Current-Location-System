// admin.js


import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { collection, doc, setDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";


document.getElementById("createDriverForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("driver_name").value.trim();
  const email = document.getElementById("driver_email").value.trim();
  const phone = document.getElementById("driver_phone").value.trim();
  const password = document.getElementById("driver_password").value;

createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    const uid = userCredential.user.uid;
    return setDoc(doc(db, "drivers", uid), {
      uid,
      name,
      email,
      phone,
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
      alert("Error creating driver: " + error.message);
    });
});

function loadDrivers() {
  const driverList = document.getElementById("driverList");
  driverList.innerHTML = "";

  db.collection("drivers").where("role", "==", "driver").get()
    .then((snapshot) => {
      if (snapshot.empty) {
        driverList.innerHTML = "<li>No drivers registered.</li>";
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.name} (${data.email}) - ${data.phone} - Registered: ${new Date(data.registered_at).toLocaleString()}`;
        driverList.appendChild(li);
      });
    })
    .catch((error) => {
      alert("Error loading drivers: " + error.message);
    });
}

// Load drivers on page load
window.onload = loadDrivers;

// Sign out logic
const signOutBtn = document.getElementById("signOutBtn");
if (signOutBtn) {
  signOutBtn.addEventListener("click", function () {
    if (typeof firebase !== "undefined" && firebase.auth) {
      firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
      });
    }
  });
}
