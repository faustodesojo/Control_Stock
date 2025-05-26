// firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1tLYzkdigsSq7P4Wvsb8jXF4OqOy7hYY",
  authDomain: "control-stock-b7662.firebaseapp.com",
  projectId: "control-stock-b7662",
  storageBucket: "control-stock-b7662.firebasestorage.app",
  messagingSenderId: "1018729894813",
  appId: "1:1018729894813:web:9b75f482e01baa58425574",
  measurementId: "G-CKH6004PWW"
};

// Initialize Firebase if no app is already initialized
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Get the default app if it exists
}

// Initialize Firestore
export const db = getFirestore(app);

// Export the app instance