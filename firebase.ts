// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your own Firebase configuration from your project settings
const firebaseConfig = {
  apiKey: "AIzaSyCUgATR0vgKgxH2tsTbe6CpW6Fz1fU56Ww",
  authDomain: "trading-journel.firebaseapp.com",
  projectId: "trading-journel",
  storageBucket: "trading-journel.firebasestorage.app",
  messagingSenderId: "405673892258",
  appId: "1:405673892258:web:f70091544246f6a9a17afb",
  measurementId: "G-GQCN0ZLSJY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
