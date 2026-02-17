const admin = require('firebase-admin');
const serviceAccount = require('./paginadoc-5a1fb-firebase-adminsdk-fbsvc-5a0a24bb50.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'paginadoc-5a1fb'
});

const auth = admin.auth();
const db = admin.firestore();

// Usuarios a crear
const usuarios = [
  {
    numeroControl: 'ADMIN',
    nombre: 'Administrador del Sistema',
    email: 'admin@escuela.edu.mx',
    password: '123456',
    rol: 'admin'
  },
  {
    numeroControl: '21001001',
    nombre: 'Juan Pérez García',
    email: 'juan.perez@alumno.edu.mx',
    password: '654321',
    rol: 'alumno'
  },
  {
    numeroControl: '21001002',
    nombre: 'María González López',
    email: 'maria.gonzalez@alumno.edu.mx',
    password: '111111',
    rol: 'alumno'
  },
  {
    numeroControl: '21001003',
    nombre: 'Carlos Ramírez Sánchez',
    email: 'carlos.ramirez@alumno.edu.mx',
    password: '222222',
    rol: 'alumno'
  }
];

async function crearUsuarios() {
  console.log('🔄 Iniciando creación de usuarios en Firebase...\n');

  for (const usuario of usuarios) {
    try {
      // Crear usuario en Authentication
      console.log(`📝 Creando usuario: ${usuario.email}`);
      
      const userRecord = await auth.createUser({
        email: usuario.email,
        password: usuario.password,
        displayName: usuario.nombre
      });

      console.log(`✅ Autenticación creada: ${userRecord.uid}`);

      // Crear documento en Firestore
      await db.collection('usuarios').doc(userRecord.uid).set({
        uid: userRecord.uid,
        numeroControl: usuario.numeroControl,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: 'activo',
        fechaCreacion: new Date(),
        telefono: '',
        carrera: usuario.rol === 'alumno' ? 'Ingeniería en Sistemas' : '',
        semestre: usuario.rol === 'alumno' ? 1 : null
      });

      console.log(`✅ Documento Firestore creado\n`);

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`⚠️  El email ${usuario.email} ya existe, omitiendo...\n`);
      } else {
        console.error(`❌ Error con ${usuario.email}:`, error.message, '\n');
      }
    }
  }

  console.log('✨ Proceso completado!');
  process.exit(0);
}

crearUsuarios().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
