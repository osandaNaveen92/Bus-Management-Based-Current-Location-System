import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login_email").value.trim();
  const password = document.getElementById("login_password").value;
  const role = document.getElementById("login_role").value;
  const errorMessage = document.getElementById("error_message");

  // Clear previous error messages
  errorMessage.textContent = "";

  // Validation
  if (!email) {
    errorMessage.textContent = "Please enter your email.";
    return;
  }

  if (!password) {
    errorMessage.textContent = "Please enter your password.";
    return;
  }

  if (!role) {
    errorMessage.textContent = "Please select a role.";
    return;
  }

  // Show loading state
  const submitButton = document.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = "Logging in...";
  submitButton.disabled = true;

  try {
    console.log("Attempting to sign in with:", email, "as", role);
    
    // Attempt Firebase authentication first
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;
    
    console.log("Authentication successful, UID:", uid);

    // Determine collection based on selected role
    const collectionName = role === "admin" ? "admins" : "drivers";
    const userRef = doc(db, collectionName, uid);
    
    console.log("Checking user document in", collectionName, "collection");
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("User document not found in", collectionName, "collection");
      errorMessage.textContent = `Access denied. You are not registered as a ${role}.`;
      
      // Sign out the user since they don't have the right role
      await auth.signOut();
      return;
    }

    const userData = userSnap.data();
    console.log("User data retrieved from", collectionName, ":", userData);

    // Optional: Verify email matches (additional security check)
    if (userData.email && userData.email !== email) {
      console.error("Email mismatch between Auth and Firestore");
      errorMessage.textContent = "Account data inconsistency. Please contact administrator.";
      await auth.signOut();
      return;
    }

    // Store user data with role determined by collection
    const userDataToStore = { 
      uid: uid, 
      role: role, // Add role based on collection
      ...userData 
    };
    
    console.log("Storing user data:", userDataToStore);
    
    // Use sessionStorage for better security
    sessionStorage.setItem(`${role}Data`, JSON.stringify(userDataToStore));

    // Redirect based on role
    console.log("Login successful! Redirecting to", role, "dashboard");
    if (role === "admin") {
      window.location.href = "admin.html";
    } else if (role === "driver") {
      window.location.href = "driver.html";
    }

  } catch (error) {
    console.error("Login error:", error);
    
    // Handle specific Firebase errors
    let errorText = "Login failed. ";
    switch (error.code) {
      case 'auth/invalid-login-credentials':
      case 'auth/invalid-credential':
        errorText += "Invalid email or password.";
        break;
      case 'auth/user-not-found':
        errorText += "No account found with this email.";
        break;
      case 'auth/wrong-password':
        errorText += "Incorrect password.";
        break;
      case 'auth/invalid-email':
        errorText += "Invalid email format.";
        break;
      case 'auth/user-disabled':
        errorText += "This account has been disabled.";
        break;
      case 'auth/too-many-requests':
        errorText += "Too many failed attempts. Please try again later.";
        break;
      case 'auth/network-request-failed':
        errorText += "Network error. Please check your connection.";
        break;
      default:
        errorText += error.message || "Unknown error occurred.";
        break;
    }
    
    errorMessage.textContent = errorText;
  } finally {
    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
});