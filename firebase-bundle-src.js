// Firebase Bundle para navegador - versión CommonJS
const firebase = require('firebase/compat/app');
require('firebase/compat/auth');
require('firebase/compat/firestore');
require('firebase/compat/storage');

// Exponer Firebase globalmente
window.firebase = firebase;

// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCfd3VJ64beQb2vazBHWCXJQuaOhwIWZk8",
  authDomain: "paginadoc-5a1fb.firebaseapp.com",
  projectId: "paginadoc-5a1fb",
  storageBucket: "paginadoc-5a1fb.firebasestorage.app",
  messagingSenderId: "896573390284",
  appId: "1:896573390284:web:5bcb1cd3f20001c119f169"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.firebaseConfigured = true;
console.log('✅ Firebase bundle cargado correctamente');
