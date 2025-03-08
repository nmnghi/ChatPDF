import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD4lA8OOeJsvMQvPoUxd2HLd5c487IU36g",
    authDomain: "chatpdf-9a5cf.firebaseapp.com",
    projectId: "chatpdf-9a5cf",
    storageBucket: "chatpdf-9a5cf.firebasestorage.app",
    messagingSenderId: "769327761061",
    appId: "1:769327761061:web:f96f39b5b0e333c27baf4c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };