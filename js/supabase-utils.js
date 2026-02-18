/**
 * Supabase Utilities - Funciones para Storage y Gestión de Archivos
 */

/**
 * Sube un archivo a Supabase Storage.
 * @param {File} archivo - El archivo a subir.
 * @param {string} ruta - La ruta en el storage (ej: 'documentos/usuario123/archivo.pdf').
 * @param {function} onProgress - Callback para actualizar progreso (0-100).
 * @returns {Promise<{exito: boolean, url?: string, mensaje?: string}>}
 */
async function subirArchivoSupabase(archivo, ruta, onProgress = null) {
    try {
        if (!archivo) {
            throw new Error('No se proporcionó un archivo');
        }

        // Subir archivo a Supabase Storage (bucket 'documentos')
        const { data, error } = await window.supabaseClient.storage
            .from('documentos')
            .upload(ruta, archivo, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        // NOTA: Para bucket privado, no usamos getPublicUrl.
        // La URL se generará con createSignedUrl cuando se necesite ver/descargar.
        // Aquí solo devolvemos la ruta para guardarla en la BD.

        // Simular progreso completo
        if (onProgress) {
            onProgress(100);
        }

        return {
            exito: true,
            url: ruta,  // Devolver la ruta, no una URL pública
            ruta: ruta
        };
    } catch (error) {
        console.error('Error al subir archivo:', error);
        return {
            exito: false,
            mensaje: error.message || 'Error desconocido al subir archivo'
        };
    }
}

/**
 * Elimina un archivo de Supabase Storage.
 * @param {string} ruta - La ruta del archivo en storage.
 * @returns {Promise<{exito: boolean, mensaje?: string}>}
 */
async function eliminarArchivoSupabase(ruta) {
    try {
        const { error } = await window.supabaseClient.storage
            .from('documentos')
            .remove([ruta]);

        if (error) {
            throw error;
        }

        return { exito: true };
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return {
            exito: false,
            mensaje: error.message || 'Error desconocido al eliminar archivo'
        };
    }
}

/**
 * Obtiene la URL de descarga de un archivo.
 * @param {string} ruta - La ruta del archivo en storage.
 * @returns {Promise<{exito: boolean, url?: string, mensaje?: string}>}
 */
async function obtenerURLDescargaSupabase(ruta) {
    try {
        // Crear URL de descarga con tiempo de expiración (1 hora)
        const { data, error } = await window.supabaseClient.storage
            .from('documentos')
            .createSignedUrl(ruta, 3600);

        if (error) {
            throw error;
        }

        return {
            exito: true,
            url: data.signedUrl
        };
    } catch (error) {
        console.error('Error al obtener URL de descarga:', error);
        return {
            exito: false,
            mensaje: error.message || 'Error desconocido al obtener URL'
        };
    }
}

/**
 * Valida un archivo antes de subirlo.
 * @param {File} archivo - El archivo a validar.
 * @returns {Array<string>} Array de errores (vacío si es válido).
 */
function validarArchivo(archivo) {
    const errores = [];

    if (!archivo) {
        errores.push('No se seleccionó ningún archivo');
        return errores;
    }

    // Validar tamaño (máximo 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (archivo.size > MAX_SIZE) {
        errores.push(`El archivo es demasiado grande. Máximo: ${formatearTamano(MAX_SIZE)}`);
    }

    // Validar tipo (solo PDF)
    if (archivo.type !== 'application/pdf') {
        errores.push('Solo se permiten archivos PDF');
    }

    return errores;
}

/**
 * Formatea el tamaño de un archivo en bytes a un formato legible.
 * @param {number} bytes - Tamaño en bytes.
 * @returns {string} Tamaño formateado (ej: "1.5 MB").
 */
function formatearTamano(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
