// Sistema de gestión de documentos - Versión Firebase

// ===== FUNCIONES DE DATOS (FIRESTORE) =====

/**
 * Obtiene documentos de Firestore con filtros.
 * @param {Object} filtros - Filtros de búsqueda (numeroControl, estado, tipoDocumento).
 * @returns {Promise<Array>} Lista de documentos.
 */
async function obtenerDocumentos(filtros = {}) {
    try {
        let query = db.collection('documentos');

        if (filtros.numeroControl) {
            query = query.where('numeroControl', '==', filtros.numeroControl);
        }

        if (filtros.estado) {
            query = query.where('estado', '==', filtros.estado);
        }

        if (filtros.tipoDocumento) {
            query = query.where('tipoDocumento', '==', filtros.tipoDocumento);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error al obtener documentos:', error);
        return [];
    }
}

/**
 * Guarda un nuevo documento en Firestore.
 * @param {Object} documento - Datos del documento.
 */
async function guardarDocumento(documento) {
    try {
        const docRef = await db.collection('documentos').add({
            ...documento,
            fechaCreacion: new Date().toISOString()
        });
        return { exito: true, id: docRef.id };
    } catch (error) {
        console.error('Error al guardar documento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Actualiza un documento existente en Firestore.
 * @param {string} id - ID del documento.
 * @param {Object} datos - Datos a actualizar.
 */
async function actualizarDocumento(id, datos) {
    try {
        await db.collection('documentos').doc(id).update({
            ...datos,
            fechaActualizacion: new Date().toISOString()
        });
        return { exito: true };
    } catch (error) {
        console.error('Error al actualizar documento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Elimina un documento de Firestore.
 * @param {string} id - ID del documento.
 */
async function eliminarDocumento(id) {
    try {
        await db.collection('documentos').doc(id).delete();
        return { exito: true };
    } catch (error) {
        console.error('Error al eliminar documento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Obtiene un documento por su ID (Firestore con fallback a Local)
 */
async function obtenerDocumentoPorId(id) {
    try {
        // 1. Intentar Firestore
        const doc = await db.collection('documentos').doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }

        // 2. Fallback a LocalStorage (legacy)
        const documentosLocales = JSON.parse(localStorage.getItem('documentos')) || [];
        const docLocal = documentosLocales.find(d => d.id === id);
        if (docLocal) return docLocal;

        return null;
    } catch (error) {
        console.error('Error al obtener documento por ID:', error);
        return null;
    }
}

/**
 * Sincroniza metadatos con localStorage para compatibilidad legacy.
 */
function guardarDocumentoLocal(documento) {
    try {
        const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
        const index = documentos.findIndex(d => d.id === documento.id || (d.numeroControl === documento.numeroControl && d.tipoDocumento === documento.tipoDocumento));

        if (index !== -1) {
            documentos[index] = { ...documentos[index], ...documento };
        } else {
            documentos.push(documento);
        }

        localStorage.setItem('documentos', JSON.stringify(documentos));
    } catch (e) {
        console.error('Error al sincronizar localStorage:', e);
    }
}

// ===== FUNCIONES DE NEGOCIO =====

/**
 * Sube un archivo a Firebase Storage y guarda sus metadatos en Firestore.
 */
async function subirDocumento(archivo, tipoDocumento, numeroControl) {
    const errores = validarArchivo(archivo);
    if (errores.length > 0) {
        return { exito: false, mensaje: errores.join(', ') };
    }

    try {
        mostrarToast('Subiendo documento...', 'info');

        // Verificar si ya existe
        const existentes = await obtenerDocumentos({ numeroControl, tipoDocumento });
        const existente = existentes[0];

        // Subir a Storage
        const resultadoArchivo = await subirArchivo(archivo, 'documentos');
        if (!resultadoArchivo.exito) {
            return { exito: false, mensaje: 'Error al subir archivo: ' + resultadoArchivo.mensaje };
        }

        const datosDoc = {
            numeroControl,
            tipoDocumento,
            nombreArchivo: archivo.name,
            tamaño: archivo.size,
            tipo: archivo.type,
            urlArchivo: resultadoArchivo.url,
            rutaArchivo: resultadoArchivo.ruta,
            estado: 'pendiente',
            observaciones: '',
            revisadoPor: null,
            fechaRevision: null,
            fechaCarga: new Date().toISOString()
        };

        let resultado;
        if (existente) {
            resultado = await actualizarDocumento(existente.id, datosDoc);
            resultado.id = existente.id;
            if (existente.rutaArchivo) await eliminarArchivo(existente.rutaArchivo);
        } else {
            resultado = await guardarDocumento(datosDoc);
        }

        if (resultado.exito) {
            guardarDocumentoLocal({ id: resultado.id, ...datosDoc });
            await registrarBitacora('documento', `${existente ? 'Recarga' : 'Subida'} de ${tipoDocumento}`);

            await guardarMensaje({
                remitente: numeroControl,
                destinatario: 'admin',
                asunto: existente ? 'Documento Recargado' : 'Nuevo Documento',
                mensaje: `El alumno ${numeroControl} ha subido: ${tipoDocumento}`,
                tipo: 'sistema',
                relacionadoId: resultado.id
            });

            mostrarToast('Documento subido con éxito', 'success');
        }
        return resultado;
    } catch (error) {
        console.error('Error en subirDocumento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Revisa (aprueba o rechaza) un documento.
 */
async function revisarDocumento(documentoId, estado, observaciones = '') {
    const documento = await obtenerDocumentoPorId(documentoId);
    if (!documento) return { exito: false, mensaje: 'Documento no encontrado' };

    const usuarioActual = obtenerUsuarioActual();
    const updates = {
        estado,
        observaciones,
        revisadoPor: usuarioActual ? usuarioActual.email : 'admin',
        fechaRevision: new Date().toISOString()
    };

    const resultado = await actualizarDocumento(documentoId, updates);
    if (resultado.exito) {
        guardarDocumentoLocal({ id: documentoId, ...updates });
        await registrarBitacora('documento', `Documento ${estado}: ${documento.tipoDocumento}`);

        await guardarMensaje({
            remitente: 'admin',
            destinatario: documento.numeroControl,
            asunto: `Documento ${estado.charAt(0).toUpperCase() + estado.slice(1)}`,
            mensaje: `Tu documento "${documento.tipoDocumento}" ha sido ${estado}. ${observaciones}`,
            tipo: 'sistema',
            relacionadoId: documentoId
        });
    }
    return resultado;
}

/**
 * Obtiene el resumen de documentos de un alumno para la vista de checklist.
 */
async function obtenerDocumentosAlumno(numeroControl) {
    const requeridos = CONFIG.DOCUMENTOS_REQUERIDOS || [];
    const subidos = await obtenerDocumentos({ numeroControl });

    return requeridos.map(req => {
        const doc = subidos.find(d => d.tipoDocumento === req.id);
        return {
            ...req,
            subido: !!doc,
            documento: doc || null,
            estado: doc ? doc.estado : 'sin_subir'
        };
    });
}

/**
 * Descarga un documento.
 */
async function descargarDocumento(documentoId) {
    const doc = await obtenerDocumentoPorId(documentoId);
    if (!doc) return mostrarToast('Documento no encontrado', 'error');

    try {
        const link = document.createElement('a');
        link.href = doc.urlArchivo || doc.contenido;
        link.download = doc.nombreArchivo || `documento-${documentoId}.pdf`;
        link.click();
        await registrarBitacora('documento', `Descarga de ${doc.tipoDocumento}`);
        mostrarToast('Descargando...', 'success');
    } catch (error) {
        console.error('Error al descargar:', error);
        mostrarToast('Error al descargar', 'error');
    }
}

/**
 * Elimina totalmente un documento y su archivo físico.
 */
async function eliminarDocumentoCompleto(documentoId) {
    const doc = await obtenerDocumentoPorId(documentoId);
    if (!doc) return mostrarToast('No se encontró el documento', 'error');

    confirmar('Eliminar Documento', '¿Estás seguro?', async () => {
        try {
            if (doc.rutaArchivo) await eliminarArchivo(doc.rutaArchivo);
            await eliminarDocumento(documentoId);

            // Sync local
            const locales = JSON.parse(localStorage.getItem('documentos')) || [];
            localStorage.setItem('documentos', JSON.stringify(locales.filter(d => d.id !== documentoId)));

            await registrarBitacora('documento', `Eliminación de ${doc.tipoDocumento}`);
            mostrarToast('Eliminado', 'success');

            if (typeof cargarDocumentos === 'function') cargarDocumentos();
            if (typeof cargarDocumentosAlumno === 'function') cargarDocumentosAlumno();
        } catch (error) {
            console.error('Error al eliminar:', error);
            mostrarToast('Error al eliminar', 'error');
        }
    });
}

// ===== UTILIDADES DE CONSULTA =====

async function obtenerDocumentosPendientes() {
    return await obtenerDocumentos({ estado: 'pendiente' });
}

async function obtenerDocumentosPorEstado() {
    const todos = await obtenerDocumentos();
    return {
        pendientes: todos.filter(d => d.estado === 'pendiente').length,
        aprobados: todos.filter(d => d.estado === 'aprobado').length,
        rechazados: todos.filter(d => d.estado === 'rechazado').length
    };
}

async function validarDocumentacionCompleta(numeroControl) {
    const subidos = await obtenerDocumentos({ numeroControl });
    const requeridos = CONFIG.DOCUMENTOS_REQUERIDOS || [];
    return subidos.filter(d => d.estado === 'aprobado').length === requeridos.length;
}
