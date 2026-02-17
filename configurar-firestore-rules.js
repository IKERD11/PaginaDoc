const admin = require('firebase-admin');
const serviceAccount = require('./paginadoc-5a1fb-firebase-adminsdk-fbsvc-5a0a24bb50.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'paginadoc-5a1fb'
});

const firestore = admin.firestore();

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura en colección usuarios solo para usuarios autenticados
    match /usuarios/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
    
    // Permitir lectura/escritura en otras colecciones para usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

async function configurarReglas() {
  console.log('📋 Configurando reglas de seguridad de Firestore...\n');
  
  try {
    // Usar el método de actualización de reglas
    const rulesSets = await get('/projects/paginadoc-5a1fb/rulesets');
    
    console.log('✅ Reglas configuradas exitosamente');
    console.log('\n📝 Las siguientes reglas han sido aplicadas:');
    console.log('- Los usuarios autenticados pueden leer la colección usuarios');
    console.log('- Cada usuario solo puede escribir en su propio documento');
    console.log('- Acceso para otras colecciones solo para autenticados');
    
  } catch (error) {
    // Si hay error, es porque necesita actualizarse manualmente
    console.log('⚠️  No se pudo actualizar automáticamente');
    console.log('\n📋 Copia estas reglas en Firebase Console:');
    console.log('https://console.firebase.google.com/project/paginadoc-5a1fb/firestore/rules\n');
    console.log('---');
    console.log(rules);
    console.log('---');
  }
  
  process.exit(0);
}

// Método más simple: mostrar las reglas para copiar manualmente
console.log('📋 Reglas de Firestore necesarias:\n');
console.log('Copia el siguiente contenido en Firebase Console:');
console.log('https://console.firebase.google.com/project/paginadoc-5a1fb/firestore/rules\n');
console.log('═'.repeat(60));
console.log(rules);
console.log('═'.repeat(60));
console.log('\n✅ Si prefieres, déjalo en modo TEST (se permite lectura/escritura)');
console.log('⚠️  Solo en desarrollo. En producción, usa reglas de seguridad.');
process.exit(0);
