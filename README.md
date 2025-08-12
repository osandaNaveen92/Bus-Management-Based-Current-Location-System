# 🚍 Bus Management System Based on Current Location

A modern web-based platform for real-time bus tracking, management, and user interaction using **Firebase** and **Google Maps API**

---

## 🔧 Features

### 🧑‍💼 Admin Panel
- Create & manage **drivers** and **bus routes**
- View all registered drivers
- Add and list **bus routes with halts**
- Dashboard view with real-time system insights

### 🚐 Driver Panel
- Log in with Firebase credentials
- Add bus & journey details (bus number, source, destination, start time)
- Share **live GPS location**
- View Google Map with route and halts
- Halts marked green ➜ red when passed (auto-update using geolocation)
- Route ends with a **"Route Completed"** notification

### 👨‍💻 User Panel
- Search for available buses (source to destination)
- View Google Map route and buses live
- Track **nearest bus** from user location
- Path from user to nearest bus shown in real-time

---

## 🗂 Tech Stack

| Frontend    | Backend / Realtime         | API Services              |
|-------------|-----------------------------|----------------------------|
| HTML5, CSS3, JS | Firebase Firestore & Auth | Google Maps & Geolocation APIs |

---

## 🛠️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/osandaNaveen92/Bus-Management-Based-Current-Location-System.git
cd Bus-Management-Based-Current-Location-System
```

---

### 2️⃣ Setup Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new Firebase project
3. In the project dashboard:
   - Go to **Project Settings** → **General**
   - Scroll down to **Your apps** → Click `</>` (Web app) to register a new web app
   - Copy the **Firebase configuration** object

4. In your local project, open `js/firebase-config.js` and replace with your config:

```js
// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

### 3️⃣ Enable Firebase Services

In the Firebase Console:

- 🔐 Go to **Authentication** → Click **Get Started**
  - Enable **Email/Password** sign-in method

- 🗃 Go to **Firestore Database** → Click **Create Database**
  - Choose **Start in test mode** (for development)
  - Create required collections like `drivers`, `routes`, and `buses`

---

### 4️⃣ Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Directions API**
   - (Optional) **Places API**
4. Go to **Credentials** → Create **API key**

5. Replace the API key in your HTML files:

```html
<!-- Example: driver.html -->
<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,marker&callback=initMap"
  async defer>
</script>
```

---

### 5️⃣ Run the Project Locally

Use any local server (VS Code Live Server or static HTTP server):

#### Option A: Live Server (VS Code)

- Install [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- Right-click `index.html` or `adminlogin.html` → **Open with Live Server**

#### Option B: Serve via Terminal

```bash
npm install -g serve
serve .
```

---

### 6️⃣ Login Roles

| Login Page         | Description                                  |
|--------------------|----------------------------------------------|
| `adminlogin.html`  | Shared login for **admin** and **driver**    |
| `admin.html`       | Admin dashboard                              |
| `driver.html`      | Driver dashboard + live tracking             |
| `user.html`        | General user map panel with bus search       |

💡 Driver accounts are created by the admin (email + password). Drivers then log in using the same.

---

### 🔐 Optional Firebase Firestore Structure

```plaintext
drivers/
  {driverId}/
    name, email, phone, role

routes/
  {routeId}/
    bus_number, source, destination, bus_holts[]

buses/
  {busId}/
    bus_number, source, destination, halts[], latitude, longitude, active
```

---

### 🔒 Firebase Security Rules (basic)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drivers/{driverId} {
      allow read, write: if request.auth.uid == driverId;
    }
    match /buses/{busId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /routes/{routeId} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

### 🚀 Optional: Firebase Hosting

1. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init
```

2. Choose:
- **Hosting**
- Use existing project
- Set `public` folder as: `public`
- Configure as a single-page app: **Yes**

3. Deploy:

```bash
firebase deploy
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your improvements.

## Contact

For questions, suggestions, or support, please contact:

- **Author:** Unified Mentor
- **GitHub:** [osandaNaveen92](https://github.com/osandaNaveen92)

