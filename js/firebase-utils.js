/**
 * Firebase Utilities - Funciones para Storage y Gestión de Archivos
 */

/**
 * Sube un archivo a Firebase Storage.
 * @param {File} archivo - El archivo a subir.
 * @param {string} carpeta - La carpeta de destino (ej: 'documentos').
 * @returns {Promise<Object>} Resultado con éxito, url y ruta.
 */
async function subirArchivo(archivo, carpeta = 'documentos') {
    if (!archivo) return { exito: false, mensaje: 'No hay archivo seleccionado' };

    try {
        // Generar un nombre único para evitar colisiones
        const extension = archivo.name.split('.').pop();
        const nombreUnico = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
        const ruta = `${carpeta}/${nombreUnico}`;

        const storageRef = window.storage.ref(ruta);

        // Subir el archivo
        const snapshot = await storageRef.put(archivo);

        // Obtener la URL de descarga
        const url = await snapshot.ref.getDownloadURL();

        return {
            exito: true,
            url: url,
            ruta: ruta,
            mensaje: 'Archivo subido correctamente'
        };
    } catch (error) {
        console.error('Error en subirArchivo:', error);
        return {
            exito: false,
            mensaje: 'Error al subir el archivo: ' + error.message
        };
    }
}

/**
 * Elimina un archivo de Firebase Storage.
 * @param {string} ruta - La ruta completa del archivo en el storage.
 * @returns {Promise<Object>} Resultado de la operación.
 */
async function eliminarArchivo(ruta) {
    if (!ruta) return { exito: true }; // Nada que eliminar

    try {
        const storageRef = window.storage.ref(ruta);
        await storageRef.delete();
        return { exito: true, mensaje: 'Archivo eliminado correctamente' };
    } catch (error) {
        console.error('Error en eliminarArchivo:', error);
        // No bloqueamos el flujo si el archivo no existe
        return {
            exito: false,
            mensaje: 'Error al eliminar el archivo: ' + error.message
        };
    }
}

/**
 * Obtiene la URL de descarga de un archivo.
 * @param {string} ruta - La ruta del archivo.
 * @returns {Promise<Object>} Resultado con la URL.
 */
async function descargarArchivo(ruta) {
    if (!ruta) return { exito: false, mensaje: 'Ruta no válida' };

    try {
        const storageRef = window.storage.ref(ruta);
        const url = await storageRef.getDownloadURL();
        return { exito: true, url: url };
    } catch (error) {
        console.error('Error en descargarArchivo:', error);
        return {
            exito: false,
            mensaje: 'Error al obtener URL del archivo: ' + error.message
        };
    }
}
