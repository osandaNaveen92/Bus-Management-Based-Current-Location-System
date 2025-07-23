// js/login.js
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const selectedRoleElem = document.getElementById("selectedRole");

  // Get role from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const selectedRole = urlParams.get("role");

  if (selectedRoleElem && selectedRole) {
    selectedRoleElem.textContent = `Selected Role: ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`;
  }

  if (!loginForm) {
    console.error("Login form not found.");
    return;
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("login_email").value.trim();
    const password = document.getElementById("login_password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User record not found in Firestore.");
        return;
      }

      const userData = userSnap.data();
      const role = userData.role;

      // Redirect based on role
      if (role === "user") {
        window.location.href = "user.html";
      } else if (role === "admin") {
        window.location.href = "admin.html";
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