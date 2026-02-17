// ===========================================================================
// SCRIPT DE CORRECCIÓN PARA SESSIONSTORAGE
// ===========================================================================
// Ejecuta este script en la consola del navegador (F12) para corregir
// los datos del usuario almacenados en sessionStorage
// ===========================================================================

// Función para corregir datos del usuario en sessionStorage
async function corregirDatosUsuario() {
    console.log('🔧 Corrigiendo datos del usuario...');
    
    // Obtener sesión actual de Supabase
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session) {
        console.error('❌ No hay sesión activa');
        return;
    }
    
    const userId = session.user.id;
    console.log('👤 Usuario ID:', userId);
    
    // Obtener datos actualizados del usuario desde la base de datos
    const { data: userData, error } = await window.supabaseClient
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('❌ Error al obtener datos:', error);
        return;
    }
    
    console.log('📊 Datos obtenidos de la BD:', userData);
    
    // Guardar en sessionStorage con el formato correcto
    const datosCorregidos = {
        uid: userId,
        email: session.user.email,
        nombre: userData.nombre,
        rol: userData.rol,
        numeroControl: userData.numero_control  // ⭐ IMPORTANTE: Convertir de numero_control a numeroControl
    };
    
    console.log('✅ Datos corregidos:', datosCorregidos);
    
    // Guardar en sessionStorage
    sessionStorage.setItem('usuarioActual', JSON.stringify(datosCorregidos));
    
    console.log('✅ Datos guardados correctamente en sessionStorage');
    console.log('👉 Puedes verificar con: JSON.parse(sessionStorage.getItem("usuarioActual"))');
    
    return datosCorregidos;
}

// Ejecutar la corrección
corregirDatosUsuario();
