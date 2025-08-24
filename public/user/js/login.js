import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

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
      const { uid } = userCredential.user;

      // Check in users collection only
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User account not found. Please register first.");
        return;
      }

      const userData = userSnap.data();
      const { role } = userData;

      if (role !== "user") {
        alert("This login is for users only.");
        return;
      }

      // Redirect to user dashboard
      window.location.href = "./user.html";

    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed: " + error.message);
    }
  });
});