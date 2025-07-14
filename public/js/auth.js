// auth.js

// Register New User
document.getElementById("registerForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("reg_email").value;
  const password = document.getElementById("reg_password").value;
  const role = document.querySelector('input[name="role"]:checked').value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;

      // Store user info in Firestore
      return db.collection("users").doc(uid).set({
        uid,
        email,
        role,
        registered_at: new Date().toISOString()
      });
    })
    .then(() => {
      alert("Registration successful!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Login User
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("login_email").value;
  const password = document.getElementById("login_password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;

      return db.collection("users").doc(uid).get();
    })
    .then((doc) => {
      if (doc.exists) {
        const role = doc.data().role;
        if (role === "admin") {
          window.location.href = "admin.html";
        } else if (role === "driver") {
          window.location.href = "driver.html";
        } else {
          window.location.href = "user.html";
        }
      } else {
        alert("No user data found");
      }
    })
    .catch((error) => {
      alert(error.message);
    });
});
