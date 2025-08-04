import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signOut,
  updateEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Global variables
let allDrivers = [];
let filteredDrivers = [];
let currentAdminData = null;

// DOM Elements
const adminProfileMenu = document.getElementById("adminProfileMenu");
const registerDriverMenu = document.getElementById("registerDriverMenu");
const registeredDriversMenu = document.getElementById("registeredDriversMenu");
const adminProfileSection = document.getElementById("adminProfileSection");
const registerDriverSection = document.getElementById("registerDriverSection");
const registeredDriversSection = document.getElementById("registeredDriversSection");
const searchInput = document.getElementById("searchDriver");
const clearSearchBtn = document.getElementById("clearSearch");
const driversCount = document.getElementById("driversCount");
const driversList = document.getElementById("driversList");

// Menu Navigation
adminProfileMenu.addEventListener("click", function(e) {
  e.preventDefault();
  showAdminProfileSection();
});

registerDriverMenu.addEventListener("click", function(e) {
  e.preventDefault();
  showRegisterDriverSection();
});

registeredDriversMenu.addEventListener("click", function(e) {
  e.preventDefault();
  showRegisteredDriversSection();
});

function showAdminProfileSection() {
  // Update active menu
  adminProfileMenu.classList.add("menu-active");
  registerDriverMenu.classList.remove("menu-active");
  registeredDriversMenu.classList.remove("menu-active");
  
  // Show/hide sections
  adminProfileSection.style.display = "block";
  registerDriverSection.style.display = "none";
  registeredDriversSection.style.display = "none";
  
  // Load admin profile data
  loadAdminProfile();
}

function showRegisterDriverSection() {
  // Update active menu
  adminProfileMenu.classList.remove("menu-active");
  registerDriverMenu.classList.add("menu-active");
  registeredDriversMenu.classList.remove("menu-active");
  
  // Show/hide sections
  adminProfileSection.style.display = "none";
  registerDriverSection.style.display = "block";
  registeredDriversSection.style.display = "none";
}

function showRegisteredDriversSection() {
  // Update active menu
  adminProfileMenu.classList.remove("menu-active");
  registeredDriversMenu.classList.add("menu-active");
  registerDriverMenu.classList.remove("menu-active");
  
  // Show/hide sections
  adminProfileSection.style.display = "none";
  registerDriverSection.style.display = "none";
  registeredDriversSection.style.display = "block";
  
  // Load drivers when showing this section
  loadDrivers();
}

// Admin Profile Functions
async function loadAdminProfile() {
  try {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    if (!adminData) {
      window.location.href = "adminlogin.html";
      return;
    }

    currentAdminData = adminData;

    // Get fresh data from Firestore
    const adminDoc = await getDoc(doc(db, "admins", adminData.uid));
    if (adminDoc.exists()) {
      const freshData = adminDoc.data();
      currentAdminData = { ...adminData, ...freshData };
      
      // Update session storage with fresh data
      sessionStorage.setItem('adminData', JSON.stringify(currentAdminData));
    }

    // Update profile display
    updateProfileDisplay(currentAdminData);
    
  } catch (error) {
    console.error("Error loading admin profile:", error);
    alert("Error loading profile data.");
  }
}

function updateProfileDisplay(data) {
  // Update profile view
  document.getElementById("adminNameDisplay").textContent = data.name || "Admin";
  document.getElementById("adminEmailDisplay").textContent = data.email || "";
  document.getElementById("profileName").textContent = data.name || "-";
  document.getElementById("profileEmail").textContent = data.email || "-";
  document.getElementById("profilePhone").textContent = data.Phone || data.phone || "-";
  
  // Update initials
  const initials = data.name ? 
    data.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
    "AD";
  document.getElementById("adminInitials").textContent = initials;

  // Update edit form
  document.getElementById("update_name").value = data.name || "";
  document.getElementById("update_phone").value = data.Phone || data.phone || "";
  document.getElementById("update_email").value = data.email || "";
}

// Profile Edit Handlers
document.getElementById("editProfileBtn").addEventListener("click", function() {
  document.getElementById("profileView").style.display = "none";
  document.getElementById("profileEdit").style.display = "block";
});

document.getElementById("cancelEditBtn").addEventListener("click", function() {
  document.getElementById("profileEdit").style.display = "none";
  document.getElementById("profileView").style.display = "block";
  
  // Reset form to original values
  updateProfileDisplay(currentAdminData);
});

// Update Profile Form Handler
document.getElementById("updateProfileForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const newName = document.getElementById("update_name").value.trim();
  const newPhone = document.getElementById("update_phone").value.trim();
  const newEmail = document.getElementById("update_email").value.trim();
  
  if (!newName || !newPhone || !newEmail) {
    alert("Please fill in all fields.");
    return;
  }

  const saveBtn = document.querySelector(".save-btn");
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  try {
    const adminData = JSON.parse(sessionStorage.getItem('adminData'));
    const updates = {
      name: newName,
      phone: newPhone,
      email: newEmail,
      updated_at: new Date().toISOString()
    };

    // Update Firestore document
    await updateDoc(doc(db, "admins", adminData.uid), updates);

    // If email changed, update Firebase Auth (requires re-authentication in real apps)
    if (newEmail !== currentAdminData.email) {
      try {
        await updateEmail(auth.currentUser, newEmail);
      } catch (emailError) {
        console.log("Email update may require re-authentication:", emailError);
        // Continue with Firestore update even if email update fails
      }
    }

    // Update current data
    currentAdminData = { ...currentAdminData, ...updates };
    
    // Update session storage
    sessionStorage.setItem('adminData', JSON.stringify(currentAdminData));
    
    // Update display
    updateProfileDisplay(currentAdminData);
    
    // Switch back to view mode
    document.getElementById("profileEdit").style.display = "none";
    document.getElementById("profileView").style.display = "block";
    
    alert("Profile updated successfully!");
    
  } catch (error) {
    console.error("Error updating profile:", error);
    
    let errorMessage = "Error updating profile: ";
    switch (error.code) {
      case "auth/requires-recent-login":
        errorMessage += "Please log out and log in again to change your email.";
        break;
      default:
        errorMessage += error.message;
        break;
    }
    
    alert(errorMessage);
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
});

// Create Driver Form Handler
document.getElementById("createDriverForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("driver_name").value.trim();
  const email = document.getElementById("driver_email").value.trim();
  const phone = document.getElementById("driver_phone").value.trim();
  const password = document.getElementById("driver_password").value;

  // Validation
  if (!name || !email || !phone || !password) {
    alert("Please fill in all fields.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  // Disable submit button during processing
  const submitBtn = document.querySelector(".create-btn");
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Creating...";
  submitBtn.disabled = true;

  try {
    // Create Firebase Auth account for driver
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Save driver details in Firestore (drivers collection)
    await setDoc(doc(db, "drivers", uid), {
      name,
      email,
      phone,
      registered_at: new Date().toISOString(),
      status: "active"
    });

    alert("Driver account created successfully!");
    document.getElementById("createDriverForm").reset();
    
    // Refresh drivers list if it's currently shown
    if (registeredDriversSection.style.display !== "none") {
      loadDrivers();
    }

  } catch (error) {
    console.error("Driver creation error:", error);
    
    let errorMessage = "Error creating driver: ";
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage += "This email is already in use. Please use a different email.";
        break;
      case "auth/invalid-email":
        errorMessage += "Invalid email format.";
        break;
      case "auth/weak-password":
        errorMessage += "Password is too weak. Please use a stronger password.";
        break;
      default:
        errorMessage += error.message;
        break;
    }
    
    alert(errorMessage);
  } finally {
    // Re-enable submit button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Load Drivers Function
async function loadDrivers() {
  try {
    // Show loading state
    driversList.innerHTML = '<div class="no-drivers">Loading drivers...</div>';
    driversCount.textContent = "Loading...";

    // Get all drivers from Firestore
    const querySnapshot = await getDocs(collection(db, "drivers"));
    allDrivers = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allDrivers.push({
        id: doc.id,
        ...data
      });
    });

    // Sort drivers by registration date (newest first)
    allDrivers.sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));
    
    // Initially show all drivers
    filteredDrivers = [...allDrivers];
    displayDrivers(filteredDrivers);
    
  } catch (error) {
    console.error("Error loading drivers:", error);
    driversList.innerHTML = '<div class="no-drivers">Error loading drivers. Please try again.</div>';
    driversCount.textContent = "Error loading drivers";
  }
}

// Display Drivers Function
function displayDrivers(drivers) {
  driversCount.textContent = `Total Drivers: ${drivers.length}`;
  
  if (drivers.length === 0) {
    driversList.innerHTML = '<div class="no-drivers">No drivers found.</div>';
    return;
  }

  let driversHTML = "";
  drivers.forEach((driver) => {
    const registeredDate = new Date(driver.registered_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    driversHTML += `
      <div class="driver-card">
        <div class="driver-info">
          <h4>${driver.name}</h4>
          <p class="email">📧 ${driver.email}</p>
          <p class="phone">📱 ${driver.phone}</p>
          <p>📅 Registered: ${registeredDate}</p>
          <p>🟢 Status: ${driver.status || 'Active'}</p>
        </div>
      </div>
    `;
  });

  driversList.innerHTML = driversHTML;
}

// Search Functionality
searchInput.addEventListener("input", function() {
  const searchTerm = this.value.toLowerCase().trim();
  
  if (searchTerm === "") {
    filteredDrivers = [...allDrivers];
  } else {
    filteredDrivers = allDrivers.filter(driver => 
      driver.name.toLowerCase().includes(searchTerm) ||
      driver.email.toLowerCase().includes(searchTerm) ||
      driver.phone.includes(searchTerm)
    );
  }
  
  displayDrivers(filteredDrivers);
});

// Clear Search
clearSearchBtn.addEventListener("click", function() {
  searchInput.value = "";
  filteredDrivers = [...allDrivers];
  displayDrivers(filteredDrivers);
  searchInput.focus();
});

// Sign Out Handler
const signOutBtn = document.getElementById("signOutBtn");
if (signOutBtn) {
  signOutBtn.addEventListener("click", async function () {
    try {
      await signOut(auth);
      // Clear any stored session data
      sessionStorage.clear();
      window.location.href = "adminlogin.html";
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Error signing out. Please try again.");
    }
  });
}

// Initialize page
document.addEventListener("DOMContentLoaded", function() {
  // Check if admin is logged in
  const adminData = sessionStorage.getItem('adminData');
  if (!adminData) {
    window.location.href = "adminlogin.html";
    return;
  }

  // Show admin profile section by default
  showAdminProfileSection();
});