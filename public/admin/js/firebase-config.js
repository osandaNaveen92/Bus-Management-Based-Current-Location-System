// js/firebase-config.js

// Import required Firebase SDK functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsHGo3oOFnl-0LfhUkvNPhxrJSuN3b7ao",
  authDomain: "goflow-7988f.firebaseapp.com",
  databaseURL: "https://goflow-7988f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "goflow-7988f",
  storageBucket: "goflow-7988f.appspot.com",
  messagingSenderId: "345174208721",
  appId: "1:345174208721:web:ca1a39fa201e5a5f7795f0",
  measurementId: "G-VVP6G4LREF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in register.js
export { auth, db };

