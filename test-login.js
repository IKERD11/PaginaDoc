const admin = require('firebase-admin');
const serviceAccount = require('./paginadoc-5a1fb-firebase-adminsdk-fbsvc-5a0a24bb50.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'paginadoc-5a1fb'
});

const db = admin.firestore();

async function testLogin() {
  console.log('Simulando login con Número de Control: ADMIN\n');

  try {
    // Búsqueda exacta como lo hace el login.js
    console.log('Buscando usuario con numeroControl = "ADMIN"...');
    
    const snapshot = await db.collection('usuarios')
      .where('numeroControl', '==', 'ADMIN')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('No se encontró usuario con numeroControl = ADMIN');
      console.log('\nUsuarios disponibles:');
      
      const todos = await db.collection('usuarios').get();
      todos.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.numeroControl}: ${data.nombre} (${data.email})`);
      });
      
      return;
    }

    const usuarioData = snapshot.docs[0].data();
    console.log('Usuario encontrado:');
    console.log(`  Nombre: ${usuarioData.nombre}`);
    console.log(`  Email: ${usuarioData.email}`);
    console.log(`  Rol: ${usuarioData.rol}`);
    console.log(`  Número Control: ${usuarioData.numeroControl}`);
    
    console.log('\nPara login Firebase, usa:');
    console.log(`  Email: ${usuarioData.email}`);
    console.log(`  Contraseña: 123456`);

  } catch (error) {
    console.error('Error en la búsqueda:', error.message);
  }

  process.exit(0);
}

testLogin();
