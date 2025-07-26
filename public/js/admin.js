import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// ✅ Create Driver
document.getElementById("createDriverForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("driver_name").value.trim();
  const email = document.getElementById("driver_email").value.trim();
  const phone = document.getElementById("driver_phone").value.trim();
  const password = document.getElementById("driver_password").value;

  try {
    // ✅ Create Firebase Auth account for driver
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // ✅ Save driver details in Firestore
    await setDoc(doc(db, "drivers", uid), {
      uid,
      name,
      email,
      phone,
      role: "driver",
      registered_at: new Date().toISOString()
    });

    alert("Driver account created successfully!");
    document.getElementById("createDriverForm").reset();
    loadDrivers();

  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      alert("This email is already in use. Please use a different email.");
    } else {
      alert("Error creating driver: " + error.message);
    }
    console.error("Driver creation error:", error);
  }
});

// ✅ Load Drivers
async function loadDrivers() {
  const driverList = document.getElementById("driverList");
  driverList.innerHTML = "";

  const q = query(collection(db, "drivers"), where("role", "==", "driver"));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    driverList.innerHTML = "<li>No drivers registered.</li>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.textContent = `${data.name} (${data.email}) - ${data.phone} - Registered: ${new Date(data.registered_at).toLocaleString()}`;
    driverList.appendChild(li);
  });
}

// Load drivers on page load
window.onload = loadDrivers;

// ✅ Sign Out logic
const signOutBtn = document.getElementById("signOutBtn");
if (signOutBtn) {
  signOutBtn.addEventListener("click", function () {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    });
  });
}

// ✅ Show/hide routes section
document.getElementById('routesMenu').addEventListener('click', function (e) {
  e.preventDefault();
  document.querySelector('.driver-section').style.display = 'none';
  document.getElementById('routesSection').style.display = 'block';
  loadRoutes();
});

// ✅ Load routes from Firestore
async function loadRoutes() {
  const tbody = document.querySelector('#routesTable tbody');
  tbody.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, "routes"));
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.bus_number}</td>
      <td>${data.source}</td>
      <td>${data.destination}</td>
      <td>${Array.isArray(data.bus_holts) ? data.bus_holts.join(', ') : data.bus_holts}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ✅ Add new route
document.getElementById('addRouteForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const bus_number = document.getElementById('route_bus_number').value.trim();
  const source = document.getElementById('route_source').value.trim();
  const destination = document.getElementById('route_destination').value.trim();
  const bus_holts = document.getElementById('route_holts').value.split(',').map(s => s.trim());

  try {
    await addDoc(collection(db, "routes"), {
      bus_number,
      source,
      destination,
      bus_holts
    });
    alert('Route added!');
    this.reset();
    loadRoutes();
  } catch (err) {
    alert('Error adding route: ' + err.message);
  }
});
