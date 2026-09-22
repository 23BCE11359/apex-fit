// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "apex-fit0.firebaseapp.com",
  projectId: "apex-fit0",
  storageBucket: "apex-fit0.firebasestorage.app",
  messagingSenderId: "95366513912",
  appId: "1:95366513912:web:b64cd12f5f91142f42270d",
  measurementId: "G-KDGD712L89"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const db = getFirestore(app);
