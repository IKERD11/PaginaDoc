const admin = require('firebase-admin');
const serviceAccount = require('./paginadoc-5a1fb-firebase-adminsdk-fbsvc-5a0a24bb50.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'paginadoc-5a1fb'
});

const db = admin.firestore();

async function verificarUsuarios() {
  console.log('Verificando usuarios en Firestore...\n');

  try {
    const snapshot = await db.collection('usuarios').get();
    
    console.log(`Total de documentos: ${snapshot.size}\n`);
    
    snapshot.forEach(doc => {
      console.log(`${doc.id}:`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('---');
    });

    // Intentar búsqueda por numeroControl
    console.log('\nBuscando por numeroControl = "ADMIN"...');
    const busqueda = await db.collection('usuarios')
      .where('numeroControl', '==', 'ADMIN')
      .get();
    
    console.log(`Resultados encontrados: ${busqueda.size}`);
    busqueda.forEach(doc => {
      console.log(doc.data());
    });

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

verificarUsuarios();
