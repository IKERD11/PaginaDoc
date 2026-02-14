// Configuración de Firebase (versión compat)
// Esperar a que Firebase esté disponible
(function initFirebase() {
  if (typeof firebase === 'undefined') {
    // Si Firebase aún no está listo, esperar
    console.log('Esperando Firebase...');
    setTimeout(initFirebase, 100);
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyCfd3VJ64beQb2vazBHWCXJQuaOhwIWZk8",
    authDomain: "paginadoc-5a1fb.firebaseapp.com",
    projectId: "paginadoc-5a1fb",
    storageBucket: "paginadoc-5a1fb.firebasestorage.app",
    messagingSenderId: "896573390284",
    appId: "1:896573390284:web:5bcb1cd3f20001c119f169"
  };

  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);

  // Obtener referencias globales (versión compat)
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.storage = firebase.storage();

  console.log('✓ Firebase inicializado correctamente');
})();


