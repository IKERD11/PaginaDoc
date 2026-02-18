// Sistema de gestión de almacenamiento local
// NOTA: Estas funciones usan el sufijo 'Local' para evitar conflictos con las funciones de Supabase en documentos.js
// Las funciones de Supabase tienen prioridad y estas sirven como fallback/legacy

// Obtener todos los documentos (localStorage)
function obtenerDocumentosLocal(filtros = {}) {
    let documentos = JSON.parse(localStorage.getItem('documentos')) || [];

    if (filtros.numeroControl) {
        documentos = documentos.filter(d => d.numeroControl === filtros.numeroControl);
    }

    if (filtros.estado) {
        documentos = documentos.filter(d => d.estado === filtros.estado);
    }

    if (filtros.tipoDocumento) {
        documentos = documentos.filter(d => d.tipoDocumento === filtros.tipoDocumento);
    }

    return documentos;
}

// Obtener documento por ID (localStorage)
function obtenerDocumentoPorIdLocal(id) {
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    return documentos.find(d => d.id === id);
}

// Guardar documento (localStorage) - ya existe guardarDocumentoLocal en documentos.js
// Esta función se mantiene para compatibilidad pero no debe usarse directamente
function guardarDocumentoLocalStorage(documento) {
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    documentos.push(documento);
    localStorage.setItem('documentos', JSON.stringify(documentos));
}

// Actualizar documento (localStorage)
function actualizarDocumentoLocal(id, datosActualizados) {
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    const indice = documentos.findIndex(d => d.id === id);

    if (indice !== -1) {
        documentos[indice] = {
            ...documentos[indice],
            ...datosActualizados,
            fechaActualizacion: new Date().toISOString()
        };
        localStorage.setItem('documentos', JSON.stringify(documentos));
        return true;
    }

    return false;
}

// Eliminar documento (localStorage)
function eliminarDocumentoLocal(id) {
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    const documentosFiltrados = documentos.filter(d => d.id !== id);
    localStorage.setItem('documentos', JSON.stringify(documentosFiltrados));
}

// Obtener todas las citas
function obtenerCitas(filtros = {}) {
    let citas = JSON.parse(localStorage.getItem('citas')) || [];

    if (filtros.numeroControl) {
        citas = citas.filter(c => c.numeroControl === filtros.numeroControl);
    }

    if (filtros.fecha) {
        citas = citas.filter(c => c.fecha === filtros.fecha);
    }

    if (filtros.estado) {
        citas = citas.filter(c => c.estado === filtros.estado);
    }

    return citas;
}

// Guardar cita
function guardarCita(cita) {
    const citas = JSON.parse(localStorage.getItem('citas')) || [];
    citas.push(cita);
    localStorage.setItem('citas', JSON.stringify(citas));
}

// Actualizar cita
function actualizarCita(id, datosActualizados) {
    const citas = JSON.parse(localStorage.getItem('citas')) || [];
    const indice = citas.findIndex(c => c.id === id);

    if (indice !== -1) {
        citas[indice] = {
            ...citas[indice],
            ...datosActualizados
        };
        localStorage.setItem('citas', JSON.stringify(citas));
        return true;
    }

    return false;
}

// Eliminar cita
function eliminarCita(id) {
    const citas = JSON.parse(localStorage.getItem('citas')) || [];
    const citasFiltradas = citas.filter(c => c.id !== id);
    localStorage.setItem('citas', JSON.stringify(citasFiltradas));
}

// Obtener todos los mensajes
function obtenerMensajes(filtros = {}) {
    let mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];

    if (filtros.numeroControl) {
        mensajes = mensajes.filter(m =>
            m.de === filtros.numeroControl || m.para === filtros.numeroControl
        );
    }

    if (filtros.leido !== undefined) {
        mensajes = mensajes.filter(m => m.leido === filtros.leido);
    }

    return mensajes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// Guardar mensaje
function guardarMensaje(mensaje) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    mensajes.push(mensaje);
    localStorage.setItem('mensajes', JSON.stringify(mensajes));
}

// Marcar mensaje como leído
function marcarMensajeLeido(id) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    const indice = mensajes.findIndex(m => m.id === id);

    if (indice !== -1) {
        mensajes[indice].leido = true;
        mensajes[indice].fechaLectura = new Date().toISOString();
        localStorage.setItem('mensajes', JSON.stringify(mensajes));
        return true;
    }

    return false;
}

// Obtener todas las notificaciones
function obtenerNotificaciones(filtros = {}) {
    let notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];

    if (filtros.numeroControl) {
        notificaciones = notificaciones.filter(n => n.numeroControl === filtros.numeroControl);
    }

    if (filtros.leida !== undefined) {
        notificaciones = notificaciones.filter(n => n.leida === filtros.leida);
    }

    return notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// Guardar notificación
function guardarNotificacion(notificacion) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];
    notificaciones.push(notificacion);
    localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
}

// Marcar notificación como leída
function marcarNotificacionLeida(id) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];
    const indice = notificaciones.findIndex(n => n.id === id);

    if (indice !== -1) {
        notificaciones[indice].leida = true;
        localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
        return true;
    }

    return false;
}

// Marcar todas las notificaciones como leídas
function marcarTodasNotificacionesLeidas(numeroControl) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];

    notificaciones.forEach(n => {
        if (n.numeroControl === numeroControl) {
            n.leida = true;
        }
    });

    localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
}

// Obtener bitácora
function obtenerBitacora(filtros = {}) {
    let bitacora = JSON.parse(localStorage.getItem('bitacora')) || [];

    if (filtros.tipo) {
        bitacora = bitacora.filter(b => b.tipo === filtros.tipo);
    }

    if (filtros.usuario) {
        bitacora = bitacora.filter(b => b.usuario === filtros.usuario);
    }

    if (filtros.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase();
        bitacora = bitacora.filter(b =>
            b.descripcion.toLowerCase().includes(busqueda) ||
            b.nombreUsuario.toLowerCase().includes(busqueda)
        );
    }

    return bitacora.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// Limpiar datos antiguos (opcional)
function limpiarDatosAntiguos(dias = 90) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);

    // Limpiar bitácora
    let bitacora = JSON.parse(localStorage.getItem('bitacora')) || [];
    bitacora = bitacora.filter(b => new Date(b.fecha) > fechaLimite);
    localStorage.setItem('bitacora', JSON.stringify(bitacora));

    // Limpiar notificaciones leídas
    let notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];
    notificaciones = notificaciones.filter(n =>
        !n.leida || new Date(n.fecha) > fechaLimite
    );
    localStorage.setItem('notificaciones', JSON.stringify(notificaciones));

    registrarBitacora('sistema', 'Limpieza automática de datos antiguos');
}

// Exportar datos (para respaldo)
function exportarDatos() {
    const datos = {
        usuarios: JSON.parse(localStorage.getItem('usuarios')) || [],
        documentos: JSON.parse(localStorage.getItem('documentos')) || [],
        citas: JSON.parse(localStorage.getItem('citas')) || [],
        mensajes: JSON.parse(localStorage.getItem('mensajes')) || [],
        notificaciones: JSON.parse(localStorage.getItem('notificaciones')) || [],
        bitacora: JSON.parse(localStorage.getItem('bitacora')) || [],
        documentosRequeridos: JSON.parse(localStorage.getItem('documentosRequeridos')) || [],
        periodo: JSON.parse(localStorage.getItem('periodo')) || {},
        configuracion: JSON.parse(localStorage.getItem('configuracion')) || {},
        fechaExportacion: new Date().toISOString()
    };

    return datos;
}

// Importar datos (para restauración)
function importarDatos(datos) {
    try {
        if (datos.usuarios) localStorage.setItem('usuarios', JSON.stringify(datos.usuarios));
        if (datos.documentos) localStorage.setItem('documentos', JSON.stringify(datos.documentos));
        if (datos.citas) localStorage.setItem('citas', JSON.stringify(datos.citas));
        if (datos.mensajes) localStorage.setItem('mensajes', JSON.stringify(datos.mensajes));
        if (datos.notificaciones) localStorage.setItem('notificaciones', JSON.stringify(datos.notificaciones));
        if (datos.bitacora) localStorage.setItem('bitacora', JSON.stringify(datos.bitacora));
        if (datos.documentosRequeridos) localStorage.setItem('documentosRequeridos', JSON.stringify(datos.documentosRequeridos));
        if (datos.periodo) localStorage.setItem('periodo', JSON.stringify(datos.periodo));
        if (datos.configuracion) localStorage.setItem('configuracion', JSON.stringify(datos.configuracion));

        registrarBitacora('sistema', 'Importación de datos completada');
        return { exito: true, mensaje: 'Datos importados correctamente' };
    } catch (error) {
        return { exito: false, mensaje: 'Error al importar datos: ' + error.message };
    }
}

// Obtener estadísticas generales (usa localStorage directamente)
async function obtenerEstadisticas() {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    const citas = JSON.parse(localStorage.getItem('citas')) || [];
    const mentajes = JSON.parse(localStorage.getItem('mensajes')) || [];

    const alumnos = usuarios.filter(u => u.rol === 'alumno');

    // Estadísticas de documentos
    const documentosPendientes = documentos.filter(d => d.estado === 'pendiente').length;
    const documentosAprobados = documentos.filter(d => d.estado === 'aprobado').length;
    const documentosRechazados = documentos.filter(d => d.estado === 'rechazado').length;

    // Estadísticas de alumnos
    const alumnosCompletos = await Promise.all(alumnos.map(async a => {
        const estado = await obtenerEstadoDocumentacion(a.numeroControl);
        return estado.completo;
    }));
    const alumnosCompletosCount = alumnosCompletos.filter(c => c).length;

    // Estadísticas de citas
    const citasPendientes = citas.filter(c => c.estado === 'pendiente').length;
    const citasConfirmadas = citas.filter(c => c.estado === 'confirmada').length;
    const citasCompletadas = citas.filter(c => c.estado === 'completada').length;

    return {
        totalAlumnos: alumnos.length,
        alumnosCompletos: alumnosCompletosCount,
        alumnosIncompletos: alumnos.length - alumnosCompletosCount,
        documentosPendientes,
        documentosAprobados,
        documentosRechazados,
        totalDocumentos: documentos.length,
        citasPendientes,
        citasConfirmadas,
        citasCompletadas,
        totalCitas: citas.length,
        mensajesNoLeidos: mentajes.filter(m => !m.leido).length
    };
}
