const admin = require('firebase-admin');
const serviceAccount = require('./paginadoc-5a1fb-firebase-adminsdk-fbsvc-5a0a24bb50.json');
const corsConfiguration = require('./storage-cors.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function diagnostic() {
    try {
        console.log('🔍 Iniciando diagnóstico de buckets...');
        // El objeto storage de google-cloud se obtiene así en firebase-admin:
        const storage = admin.storage().storageUsage ? admin.storage() : admin.storage();
        // En versiones recientes de firebase-admin, admin.storage() devuelve un objeto que tiene una propiedad 'storage' que es el cliente de @google-cloud/storage
        const gcs = admin.storage().bucket('test').storage;

        console.log('📡 Listando todos los buckets en el proyecto...');
        const [buckets] = await gcs.getBuckets();

        if (buckets.length === 0) {
            console.log('❌ No se encontraron buckets en este proyecto.');
            return;
        }

        console.log('✅ Buckets encontrados:');
        for (const b of buckets) {
            console.log(` - ${b.name}`);
            try {
                console.log(` ⏳ Aplicando CORS a ${b.name}...`);
                await b.setCorsConfiguration(corsConfiguration);
                console.log(` ✅ Éxito con ${b.name}`);
            } catch (err) {
                console.error(` ❌ Error con ${b.name}:`, err.message);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error de diagnóstico:', error);
        process.exit(1);
    }
}

diagnostic();
