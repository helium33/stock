import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCnR5SMrO8vhO1lEPRx1Ctg6gxyhYfVMp0",
  authDomain: "store-b8644.firebaseapp.com",
  projectId: "store-b8644",
  storageBucket: "store-b8644.appspot.com",
  messagingSenderId: "353628807781",
  appId: "1:353628807781:web:950616402c6e1157729c8c",
  measurementId: "G-YL7NLQBLG9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;