// Sistema de gestión de documentos - Versión Firebase

// Subir documento con Firebase Storage y Firestore
async function subirDocumento(archivo, tipoDocumento, numeroControl) {
    // Validar archivo
    const errores = validarArchivo(archivo);
    if (errores.length > 0) {
        return {
            exito: false,
            mensaje: errores.join(', ')
        };
    }
    
    try {
        mostrarToast('Subiendo documento...', 'info');
        
        // Verificar si ya existe un documento de este tipo
        const documentosExistentes = await obtenerDocumentos({ numeroControl, tipoDocumento });
        const existente = documentosExistentes.find(d => d.tipoDocumento === tipoDocumento);
        
        // Subir archivo a Firebase Storage
        const resultadoArchivo = await subirArchivo(archivo, 'documentos');
        
        if (!resultadoArchivo.exito) {
            return {
                exito: false,
                mensaje: 'Error al subir el archivo: ' + resultadoArchivo.mensaje
            };
        }
        
        const documento = {
            numeroControl: numeroControl,
            tipoDocumento: tipoDocumento,
            nombreArchivo: archivo.name,
            tamaño: archivo.size,
            tipo: archivo.type,
            urlArchivo: resultadoArchivo.url,
            rutaArchivo: resultadoArchivo.ruta,
            estado: 'pendiente',
            observaciones: '',
            revisadoPor: null,
            fechaRevision: null
        };
        
        let resultado;
        
        if (existente) {
            // Actualizar documento existente
            resultado = await actualizarDocumento(existente.id, documento);
            
            // Eliminar archivo anterior si existe
            if (existente.rutaArchivo) {
                await eliminarArchivo(existente.rutaArchivo);
            }
        } else {
            // Guardar nuevo documento
            resultado = await guardarDocumento(documento);
        }
        
        if (resultado.exito) {
            // Registrar en bitácora
            await registrarBitacora('documento', `Documento ${existente ? 'recargado' : 'subido'}: ${tipoDocumento}`);
            
            // Crear notificación para admin
            await guardarMensaje({
                remitente: numeroControl,
                destinatario: 'admin',
                asunto: existente ? 'Documento Recargado' : 'Nuevo Documento',
                mensaje: `El alumno ${numeroControl} ha ${existente ? 'recargado el' : 'subido un nuevo'} documento: ${tipoDocumento}`,
                tipo: 'sistema',
                relacionadoId: resultado.id
            });
            
            mostrarToast('Documento subido correctamente', 'success');
        }
        
        return resultado;
        
    } catch (error) {
        console.error('Error al subir documento:', error);
        return {
            exito: false,
            mensaje: 'Error al procesar el archivo: ' + error.message
        };
    }
}

// Revisar documento (aprobar/rechazar)
async function revisarDocumento(documentoId, estado, observaciones = '') {
    const documento = await obtenerDocumentoPorId(documentoId);
    
    if (!documento) {
        return {
            exito: false,
            mensaje: 'Documento no encontrado'
        };
    }
    
    if (!['aprobado', 'rechazado'].includes(estado)) {
        return {
            exito: false,
            mensaje: 'Estado inválido'
        };
    }
    
    const usuarioActual = obtenerUsuarioActual();
    
    // Actualizar documento
    const resultado = await actualizarDocumento(documentoId, {
        estado: estado,
        observaciones: observaciones,
        revisadoPor: usuarioActual.email,
        fechaRevision: new Date().toISOString()
    });
    
    if (resultado.exito) {
        // Registrar en bitácora
        await registrarBitacora('documento', `Documento ${estado}: ${documento.tipoDocumento} del alumno ${documento.numeroControl}`);
        
        // Crear notificación para el alumno
        const mensaje = estado === 'aprobado' 
            ? `Tu documento "${documento.tipoDocumento}" ha sido aprobado`
            : `Tu documento "${documento.tipoDocumento}" ha sido rechazado. Observaciones: ${observaciones}`;
        
        await guardarMensaje({
            remitente: 'admin',
            destinatario: documento.numeroControl,
            asunto: estado === 'aprobado' ? 'Documento Aprobado' : 'Documento Rechazado',
            mensaje: mensaje,
            tipo: 'sistema',
            relacionadoId: documentoId
        });
    }
    
    return resultado;
}

// Obtener documentos de un alumno con información detallada
async function obtenerDocumentosAlumno(numeroControl) {
    const documentosRequeridos = CONFIG.DOCUMENTOS_REQUERIDOS || [];
    const documentosSubidos = await obtenerDocumentos({ numeroControl });
    
    return documentosRequeridos.map(req => {
        const subido = documentosSubidos.find(d => d.tipoDocumento === req.id);
        
        return {
            ...req,
            subido: !!subido,
            documento: subido || null,
            estado: subido ? subido.estado : 'sin_subir'
        };
    });
}

// Descargar documento
async function descargarDocumento(documentoId) {
    const documento = await obtenerDocumentoPorId(documentoId);
    
    if (!documento) {
        mostrarToast('Documento no encontrado', 'error');
        return;
    }
    
    try {
        // Obtener URL del documento
        const resultado = await descargarArchivo(documento.rutaArchivo);
        
        if (resultado.exito) {
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.href = documento.urlArchivo;
            link.download = documento.nombreArchivo;
            link.click();
            
            // Registrar en bitácora
            await registrarBitacora('documento', `Documento descargado: ${documento.tipoDocumento} del alumno ${documento.numeroControl}`);
            
            mostrarToast('Documento descargado', 'success');
        } else {
            mostrarToast('Error al descargar el documento', 'error');
        }
    } catch (error) {
        console.error('Error al descargar documento:', error);
        mostrarToast('Error al descargar el documento', 'error');
    }
}

// Vista previa de documento PDF
async function verVistaPrevia(documentoId) {
    const documento = await obtenerDocumentoPorId(documentoId);
    
    if (!documento) {
        mostrarToast('Documento no encontrado', 'error');
        return;
    }
    
    const contenido = `
        <div style="width: 100%; height: 500px;">
            <embed src="${documento.urlArchivo}" type="application/pdf" width="100%" height="100%" />
        </div>
        <div style="margin-top: 15px;">
            <p><strong>Nombre:</strong> ${documento.nombreArchivo}</p>
            <p><strong>Tamaño:</strong> ${formatearTamano(documento.tamaño)}</p>
            <p><strong>Fecha de carga:</strong> ${formatearFechaHora(documento.fechaCreacion)}</p>
            <p><strong>Estado:</strong> ${obtenerBadgeEstado(documento.estado)}</p>
            ${documento.observaciones ? `<p><strong>Observaciones:</strong> ${documento.observaciones}</p>` : ''}
        </div>
    `;
    
    crearModal(
        '<i class="fas fa-file-pdf"></i> Vista Previa del Documento',
        contenido,
        [
            {
                texto: 'Descargar',
                tipo: 'primary',
                icono: 'download',
                onclick: `descargarDocumento('${documentoId}')`
            },
            {
                texto: 'Cerrar',
                tipo: 'secondary',
                onclick: 'cerrarModal()'
            }
        ]
    );
}

// Eliminar documento (también elimina el archivo de Storage)
async function eliminarDocumentoCompleto(documentoId) {
    const documento = await obtenerDocumentoPorId(documentoId);
    
    if (!documento) {
        mostrarToast('Documento no encontrado', 'error');
        return;
    }
    
    confirmar(
        'Confirmar eliminación',
        '¿Estás seguro de que deseas eliminar este documento?',
        async () => {
            try {
                // Eliminar archivo de Storage
                if (documento.rutaArchivo) {
                    await eliminarArchivo(documento.rutaArchivo);
                }
                
                // Eliminar documento de Firestore
                const resultado = await eliminarDocumento(documentoId);
                
                if (resultado.exito) {
                    await registrarBitacora('documento', `Documento eliminado: ${documento.tipoDocumento} del alumno ${documento.numeroControl}`);
                    
                    mostrarToast('Documento eliminado correctamente', 'success');
                    
                    // Recargar la vista actual
                    if (typeof cargarDocumentos === 'function') {
                        cargarDocumentos();
                    }
                    if (typeof cargarDocumentosAlumno === 'function') {
                        cargarDocumentosAlumno();
                    }
                }
            } catch (error) {
                console.error('Error al eliminar documento:', error);
                mostrarToast('Error al eliminar el documento', 'error');
            }
        }
    );
}

// Obtener documentos pendientes de revisión
async function obtenerDocumentosPendientes() {
    return await obtenerDocumentos({ estado: 'pendiente' });
}

// Obtener documentos por estado
async function obtenerDocumentosPorEstado() {
    const documentos = await obtenerDocumentos();
    
    return {
        pendientes: documentos.filter(d => d.estado === 'pendiente').length,
        aprobados: documentos.filter(d => d.estado === 'aprobado').length,
        rechazados: documentos.filter(d => d.estado === 'rechazado').length
    };
}

// Validar documentación completa del alumno
async function validarDocumentacionCompleta(numeroControl) {
    const documentos = await obtenerDocumentos({ numeroControl });
    const documentosRequeridos = CONFIG.DOCUMENTOS_REQUERIDOS || [];
    
    // Verificar que todos los documentos requeridos estén aprobados
    const documentosAprobados = documentos.filter(d => d.estado === 'aprobado');
    
    return documentosAprobados.length === documentosRequeridos.length;
}
