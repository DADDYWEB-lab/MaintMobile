import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {

  apiKey: "AIzaSyDJQZ0u3J-60cUmdzyLBXr12EXn-QhNRrE",
  authDomain: "hotelnet-8659f.firebaseapp.com",
  projectId: "hotelnet-8659f",
  storageBucket: "hotelnet-8659f.firebasestorage.app",
  messagingSenderId: "439844671836",
  appId: "1:439844671836:web:6a5d85dca664715dbb3199"

};


const app = initializeApp(firebaseConfig);

// Initialiser les services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default {app,storage};