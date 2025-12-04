// Firebase v10 modular SDK initialization
// IMPORTANT: Replace the firebaseConfig object with your Firebase project credentials.
// You can find them in Firebase Console > Project Settings > General > Your apps (Web)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TODO: Fill these with your real config values
export const firebaseConfig = {
  apiKey: "AIzaSyDNK_JpLDIQCloCGJeuG5qMlrMc429HeYE",
  authDomain: "farmer-marketplace-nayan.firebaseapp.com",
  projectId: "farmer-marketplace-nayan",
  storageBucket: "farmer-marketplace-nayan.appspot.com", // ✅ FIXED
  messagingSenderId: "295871714775",
  appId: "1:295871714775:web:2bd588f4e3122e5604e792"
};

// firebaseConfig.js - Add this line
export const googleMapsApiKey = "AIzaSyCUGAx4Zue7PCjB1e3Qr5YGwGEV9xyCHjg";

// Initialize Firebase services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


//how will we verify it's a farmer and not the middle man logged in as farmer and selling his produce there.