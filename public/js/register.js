// register.js

document.getElementById("registerForm").addEventListener("submit", function (e) {
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
      alert("Registration successful!");
      window.location.href = "user.html";
    })
    .catch((error) => {
      alert("Registration failed: " + error.message);
    });
});
