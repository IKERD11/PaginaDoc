// Utilidad de migración de datos de localStorage a Supabase
console.log('🔄 Módulo de migración cargado');

/**
 * Migra usuarios de localStorage a Supabase
 * @returns {Promise<Object>} Resultado de la migración
 */
async function migrarUsuarios() {
    try {
        console.log('👥 Iniciando migración de usuarios...');

        // Obtener usuarios de localStorage
        const usuariosLocal = JSON.parse(localStorage.getItem('usuarios')) || [];

        if (usuariosLocal.length === 0) {
            return {
                exito: true,
                mensaje: 'No hay usuarios en localStorage para migrar',
                migrados: 0,
                errores: 0
            };
        }

        console.log(`📊 Encontrados ${usuariosLocal.length} usuarios en localStorage`);
        console.log(`📤 Migrando usuarios usando upsert...`);

        // Transformar todos los usuarios al formato de Supabase
        const usuariosSupabase = usuariosLocal.map(usuario => ({
            numero_control: usuario.numeroControl,
            nip: usuario.nip,
            rol: usuario.rol || 'alumno',
            nombre: usuario.nombre,
            email: usuario.email || '',
            fecha_registro: usuario.fechaRegistro || new Date().toISOString(),
            activo: usuario.activo !== undefined ? usuario.activo : true
        }));

        // Usar upsert para insertar o actualizar (evita el problema de lock)
        // onConflict especifica que si numero_control ya existe, se ignora
        const { data, error } = await window.supabaseClient
            .from('usuarios')
            .upsert(usuariosSupabase, {
                onConflict: 'numero_control',
                ignoreDuplicates: true
            })
            .select();

        if (error) {
            console.error('❌ Error en upsert:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });

            return {
                exito: false,
                mensaje: `Error: ${error.message}`,
                migrados: 0,
                errores: usuariosLocal.length,
                erroresDetalle: [{
                    error: error.message,
                    code: error.code,
                    details: error.details
                }]
            };
        }

        const migrados = data?.length || 0;
        console.log(`✅ ${migrados} usuarios procesados exitosamente`);

        return {
            exito: true,
            mensaje: `Migración completada: ${migrados} usuarios procesados`,
            migrados,
            errores: 0,
            erroresDetalle: []
        };

    } catch (error) {
        console.error('❌ Error en migración de usuarios:', error);
        return {
            exito: false,
            mensaje: `Error: ${error.message}`,
            migrados: 0,
            errores: 1
        };
    }
}

/**
 * Migra documentos de localStorage a Supabase
 * @returns {Promise<Object>} Resultado de la migración
 */
async function migrarDocumentos() {
    try {
        console.log('📄 Iniciando migración de documentos...');

        // Obtener documentos de localStorage
        const documentosLocal = JSON.parse(localStorage.getItem('documentos')) || [];

        if (documentosLocal.length === 0) {
            return {
                exito: true,
                mensaje: 'No hay documentos en localStorage para migrar',
                migrados: 0,
                errores: 0
            };
        }

        console.log(`📊 Encontrados ${documentosLocal.length} documentos en localStorage`);
        console.log(`📤 Migrando documentos usando upsert...`);

        // Transformar todos los documentos al formato de Supabase
        const documentosSupabase = documentosLocal.map(doc => ({
            id: doc.id,
            numero_control: doc.numeroControl,
            tipo: doc.tipo,
            nombre: doc.nombre,
            ruta_archivo: doc.rutaArchivo || doc.ruta_archivo,
            fecha_subida: doc.fechaSubida || doc.fecha_subida || new Date().toISOString(),
            estado: doc.estado || 'pendiente',
            comentarios: doc.comentarios || '',
            fecha_revision: doc.fechaRevision || doc.fecha_revision || null,
            revisado_por: doc.revisadoPor || doc.revisado_por || null
        }));

        // Usar upsert para insertar o actualizar (evita el problema de lock)
        const { data, error } = await window.supabaseClient
            .from('documentos')
            .upsert(documentosSupabase, {
                onConflict: 'id',
                ignoreDuplicates: true
            })
            .select();

        if (error) {
            console.error('❌ Error en upsert:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });

            return {
                exito: false,
                mensaje: `Error: ${error.message}`,
                migrados: 0,
                errores: documentosLocal.length,
                erroresDetalle: [{
                    error: error.message,
                    code: error.code,
                    details: error.details
                }]
            };
        }

        const migrados = data?.length || 0;
        console.log(`✅ ${migrados} documentos procesados exitosamente`);

        return {
            exito: true,
            mensaje: `Migración completada: ${migrados} documentos procesados`,
            migrados,
            errores: 0,
            erroresDetalle: []
        };

    } catch (error) {
        console.error('❌ Error en migración de documentos:', error);
        return {
            exito: false,
            mensaje: `Error: ${error.message}`,
            migrados: 0,
            errores: 1
        };
    }
}

/**
 * Verifica la integridad de los datos migrados
 * @returns {Promise<Object>} Resultado de la verificación
 */
async function verificarMigracion() {
    try {
        console.log('🔍 Verificando migración...');

        // Contar usuarios
        const usuariosLocal = JSON.parse(localStorage.getItem('usuarios')) || [];
        const { count: usuariosSupabase } = await window.supabaseClient
            .from('usuarios')
            .select('*', { count: 'exact', head: true });

        // Contar documentos
        const documentosLocal = JSON.parse(localStorage.getItem('documentos')) || [];
        const { count: documentosSupabase } = await window.supabaseClient
            .from('documentos')
            .select('*', { count: 'exact', head: true });

        const resultado = {
            usuarios: {
                localStorage: usuariosLocal.length,
                supabase: usuariosSupabase || 0,
                diferencia: usuariosLocal.length - (usuariosSupabase || 0)
            },
            documentos: {
                localStorage: documentosLocal.length,
                supabase: documentosSupabase || 0,
                diferencia: documentosLocal.length - (documentosSupabase || 0)
            }
        };

        console.log('📊 Resultado de verificación:', resultado);
        return resultado;

    } catch (error) {
        console.error('❌ Error en verificación:', error);
        return null;
    }
}

/**
 * Ejecuta la migración completa de todos los datos
 * @returns {Promise<Object>} Resultado de la migración completa
 */
async function ejecutarMigracionCompleta() {
    console.log('🚀 Iniciando migración completa...');

    const resultados = {
        usuarios: null,
        documentos: null,
        verificacion: null,
        exito: false
    };

    try {
        // Migrar usuarios primero (los documentos dependen de ellos)
        resultados.usuarios = await migrarUsuarios();

        // Migrar documentos
        resultados.documentos = await migrarDocumentos();

        // Verificar migración
        resultados.verificacion = await verificarMigracion();

        // Determinar éxito general
        resultados.exito = resultados.usuarios.exito && resultados.documentos.exito;

        console.log('✅ Migración completa finalizada:', resultados);
        return resultados;

    } catch (error) {
        console.error('❌ Error en migración completa:', error);
        resultados.error = error.message;
        return resultados;
    }
}
