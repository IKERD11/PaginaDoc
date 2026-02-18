// Sistema de gestión de documentos - Versión Supabase

// ===== FUNCIONES DE DATOS (SUPABASE) =====

/**
 * Obtiene documentos de Supabase con filtros.
 * @param {Object} filtros - Filtros de búsqueda (numeroControl, estado, tipoDocumento).
 * @returns {Promise<Array>} Lista de documentos.
 */
async function obtenerDocumentos(filtros = {}) {
    try {
        let query = window.supabaseClient.from('documentos').select('*');

        if (filtros.numeroControl) {
            query = query.eq('numero_control', filtros.numeroControl);
        }

        if (filtros.estado) {
            query = query.eq('estado', filtros.estado);
        }

        if (filtros.tipoDocumento) {
            query = query.eq('tipo_documento', filtros.tipoDocumento);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Normalizar campos snake_case a camelCase
        const documentos = (data || []).map(doc => ({
            ...doc,
            numeroControl: doc.numero_control || doc.numeroControl,
            tipoDocumento: doc.tipo_documento || doc.tipoDocumento,
            nombreArchivo: doc.nombre_archivo || doc.nombreArchivo,
            urlArchivo: doc.url_archivo || doc.urlArchivo,
            rutaArchivo: doc.ruta_archivo || doc.rutaArchivo,
            fechaCarga: doc.fecha_carga || doc.fechaCarga,
            fechaRevision: doc.fecha_revision || doc.fechaRevision,
            revisadoPor: doc.revisado_por || doc.revisadoPor
        }));

        return documentos;
    } catch (error) {
        console.error('Error al obtener documentos:', error);
        return [];
    }
}

/**
 * Guarda un nuevo documento en Supabase.
 * @param {Object} documento - Datos del documento.
 */
async function guardarDocumento(documento) {
    try {
        const { data, error } = await window.supabaseClient
            .from('documentos')
            .insert(documento)
            .select()
            .single();

        if (error) throw error;

        return { exito: true, id: data.id };
    } catch (error) {
        console.error('Error al guardar documento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Actualiza un documento existente en Supabase.
 * @param {string} id - ID del documento.
 * @param {Object} datos - Datos a actualizar.
 */
async function actualizarDocumento(id, datos) {
    try {
        const { error } = await window.supabaseClient
            .from('documentos')
            .update(datos)
            .eq('id', id);

        if (error) throw error;

        return { exito: true };
    } catch (error) {
        console.error('Error al actualizar documento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Elimina un documento de Supabase.
 * @param {string} id - ID del documento.
 */
async function eliminarDocumento(id) {
    try {
        const { error } = await window.supabaseClient
            .from('documentos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { exito: true };
    } catch (error) {
        console.error('Error al eliminar documento:', error);
        return { exito: false, mensaje: error.message };
    }
}

/**
 * Obtiene un documento por su ID (Supabase con fallback a Local)
 */
async function obtenerDocumentoPorId(id) {
    try {
        // 1. Intentar Supabase
        const { data, error } = await window.supabaseClient
            .from('documentos')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no encontrado

        if (data) {
            // Normalizar campos
            return {
                ...data,
                numeroControl: data.numero_control || data.numeroControl,
                tipoDocumento: data.tipo_documento || data.tipoDocumento,
                nombreArchivo: data.nombre_archivo || data.nombreArchivo,
                urlArchivo: data.url_archivo || data.urlArchivo,
                rutaArchivo: data.ruta_archivo || data.rutaArchivo,
                fechaCarga: data.fecha_carga || data.fechaCarga,
                fechaRevision: data.fecha_revision || data.fechaRevision,
                revisadoPor: data.revisado_por || data.revisadoPor
            };
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
 * Sube un archivo a Supabase Storage y guarda sus metadatos en la base de datos.
 */
async function subirDocumento(archivo, tipoDocumento, numeroControl) {
    const errores = validarArchivo(archivo);
    if (errores.length > 0) {
        return { exito: false, mensaje: errores.join(', ') };
    }

    // Validar que numeroControl no sea undefined o null
    if (!numeroControl) {
        console.error('numeroControl es undefined o null:', numeroControl);
        console.error('Datos del usuario actual:', obtenerUsuarioActual());
        return { exito: false, mensaje: 'Error: No se pudo obtener el número de control del usuario. Por favor, cierra sesión e inicia sesión nuevamente.' };
    }

    try {
        console.log('Subiendo documento para:', numeroControl);
        mostrarToast('Subiendo documento...', 'info');

        // Verificar si ya existe
        const existentes = await obtenerDocumentos({ numeroControl, tipoDocumento });
        const existente = existentes[0];

        // Construir ruta para Supabase Storage
        const timestamp = Date.now();
        const extension = archivo.name.split('.').pop();
        const nombreLimpio = tipoDocumento.replace(/[^a-zA-Z0-9]/g, '_');
        const rutaArchivo = `${numeroControl}/${nombreLimpio}_${timestamp}.${extension}`;

        // Subir a Storage de Supabase
        const resultadoArchivo = await subirArchivoSupabase(archivo, rutaArchivo);
        if (!resultadoArchivo.exito) {
            return { exito: false, mensaje: 'Error al subir archivo: ' + resultadoArchivo.mensaje };
        }

        const datosDoc = {
            numero_control: numeroControl,
            tipo_documento: tipoDocumento,
            nombre_archivo: archivo.name,
            url_archivo: resultadoArchivo.url,
            ruta_archivo: rutaArchivo,
            estado: 'pendiente',
            observaciones: '',
            revisado_por: null
        };

        let resultado;
        if (existente) {
            resultado = await actualizarDocumento(existente.id, datosDoc);
            resultado.id = existente.id;
            // Intentar eliminar el archivo anterior del storage
            if (existente.url_archivo || existente.ruta_archivo) {
                // Usar ruta_archivo directo o extraer de url_archivo
                try {
                    const rutaAnterior = existente.ruta_archivo || existente.url_archivo.split('/documentos/')[1].split('?')[0];
                    if (rutaAnterior) {
                        await eliminarArchivoSupabase(rutaAnterior);
                    }
                } catch (e) {
                    console.warn('No se pudo eliminar el archivo anterior:', e);
                }
            }
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
                relacionado_id: resultado.id
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
        revisado_por: usuarioActual ? usuarioActual.email : 'admin'
    };

    const resultado = await actualizarDocumento(documentoId, updates);
    if (resultado.exito) {
        guardarDocumentoLocal({ id: documentoId, ...updates });
        await registrarBitacora('documento', `Documento ${estado}: ${documento.tipo_documento}`);

        await guardarMensaje({
            remitente: 'admin',
            destinatario: documento.numero_control,
            asunto: `Documento ${estado.charAt(0).toUpperCase() + estado.slice(1)}`,
            mensaje: `Tu documento "${documento.tipo_documento}" ha sido ${estado}. ${observaciones}`,
            tipo: 'sistema',
            relacionado_id: documentoId
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
        const doc = subidos.find(d => d.tipo_documento === req.id);
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
        let urlDescarga = doc.url_archivo || doc.url || doc.contenido;
        
        // Si es una URL pública de Supabase Storage (legacy), extraer la ruta
        if (urlDescarga && urlDescarga.includes('/storage/v1/object/public/documentos/')) {
            const match = urlDescarga.match(/\/documentos\/(.+?)(?:\?|$)/);
            if (match && match[1]) {
                urlDescarga = match[1];
            }
        }
        
        // Si es una ruta (no URL completa de datos/blob), generar URL firmada
        if (urlDescarga && !urlDescarga.startsWith('data:') && !urlDescarga.startsWith('blob:')) {
            if (!urlDescarga.startsWith('http') || urlDescarga.includes('/storage/v1/object/')) {
                const resultado = await obtenerURLDescargaSupabase(urlDescarga);
                if (resultado.exito) {
                    urlDescarga = resultado.url;
                } else {
                    throw new Error('No se pudo generar URL de descarga');
                }
            }
        }
        
        const link = document.createElement('a');
        link.href = urlDescarga;
        link.download = doc.tipo_documento.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
        link.click();
        await registrarBitacora('documento', `Descarga de ${doc.tipo_documento}`);
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
            // Intentar eliminar el archivo del storage
            if (doc.url_archivo || doc.ruta_archivo) {
                try {
                    const ruta = doc.ruta_archivo || doc.url_archivo.split('/documentos/')[1].split('?')[0];
                    if (ruta) {
                        await eliminarArchivoSupabase(ruta);
                    }
                } catch (e) {
                    console.warn('No se pudo eliminar el archivo del storage:', e);
                }
            }
            await eliminarDocumento(documentoId);

            // Sync local
            const locales = JSON.parse(localStorage.getItem('documentos')) || [];
            localStorage.setItem('documentos', JSON.stringify(locales.filter(d => d.id !== documentoId)));

            await registrarBitacora('documento', `Eliminación de ${doc.tipo_documento}`);
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
