// register.js
/*
window.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerForm");

  if (!form) {
    console.error("registerForm element not found.");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const firstName = document.getElementById("first_name").value.trim();
    const lastName = document.getElementById("last_name").value.trim();
    const email = document.getElementById("reg_email").value.trim();
    const password = document.getElementById("reg_password").value;

    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const uid = userCredential.user.uid;

        // Save additional user details in Firestore
        return db.collection("users").doc(uid).set({
          uid,
          first_name: firstName,
          last_name: lastName,
          email,
          role: "user", // default role is user
          registered_at: new Date().toISOString()
        });
      })
      .then(() => {
        alert("Registration successful! Redirecting to login page...");
        window.location.href = "index.html";
      })
      .catch((error) => {
        alert("Registration failed: " + error.message);
      });
  });
});*/
// js/register.js
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("first_name").value.trim();
    const lastName = document.getElementById("last_name").value.trim();
    const email = document.getElementById("reg_email").value.trim();
    const password = document.getElementById("reg_password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        first_name: firstName,
        last_name: lastName,
        email: email,
        role: "user",
        registered_at: new Date().toISOString()
      });

      alert("Registration successful! Redirecting to login page...");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Registration failed: " + error.message);
    }
  });
});

