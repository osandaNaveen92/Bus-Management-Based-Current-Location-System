// js/login.js
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const roleSelect = document.getElementById("roleSelect");

  if (!loginForm) {
    console.error("Login form not found.");
    return;
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("login_email").value.trim();
    const password = document.getElementById("login_password").value;
    const selectedRole = roleSelect.value;

    if (!selectedRole) {
      alert("Please select a role.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Choose collection based on role
      let collectionName = selectedRole === "driver" ? "drivers" : "users";
      const userRef = doc(db, collectionName, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User record not found in Firestore.");
        return;
      }

      const userData = userSnap.data();
      const role = userData.role;

      if (role !== selectedRole) {
        alert(`You are not registered as a ${selectedRole}.`);
        return;
      }

      // Redirect based on role
      if (role === "user") {
        window.location.href = "user.html";
      } else if (role === "driver") {
        window.location.href = "driver.html";
      } else {
        alert("Unknown role. Please contact support.");
      }

    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed: " + error.message);
    }
  });
});