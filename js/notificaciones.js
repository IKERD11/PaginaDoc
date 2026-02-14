// Sistema de notificaciones

// Crear notificación
function crearNotificacion(datos) {
    const notificacion = {
        id: generarId(),
        numeroControl: datos.numeroControl,
        tipo: datos.tipo, // documento, cita, mensaje, general
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        fecha: new Date().toISOString(),
        leida: false,
        relacionadoId: datos.relacionadoId || null,
        icono: obtenerIconoNotificacion(datos.tipo)
    };
    
    guardarNotificacion(notificacion);
    
    return notificacion;
}

// Obtener icono según tipo de notificación
function obtenerIconoNotificacion(tipo) {
    const iconos = {
        documento: 'fa-file-alt',
        cita: 'fa-calendar-alt',
        mensaje: 'fa-envelope',
        general: 'fa-info-circle',
        alerta: 'fa-exclamation-triangle',
        exito: 'fa-check-circle'
    };
    
    return iconos[tipo] || iconos.general;
}

// Obtener notificaciones del usuario
function obtenerNotificacionesUsuario(numeroControl, opciones = {}) {
    const filtros = {
        numeroControl: numeroControl,
        ...opciones
    };
    
    return obtenerNotificaciones(filtros);
}

// Contar notificaciones no leídas
function contarNotificacionesNoLeidas(numeroControl) {
    const notificaciones = obtenerNotificaciones({
        numeroControl: numeroControl,
        leida: false
    });
    
    return notificaciones.length;
}

// Mostrar panel de notificaciones
function mostrarPanelNotificaciones() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.add('active');
        cargarNotificaciones();
    }
}

// Ocultar panel de notificaciones
function ocultarPanelNotificaciones() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// Cargar notificaciones en el panel
function cargarNotificaciones() {
    const usuarioActual = obtenerUsuarioActual();
    if (!usuarioActual) return;
    
    const notificaciones = obtenerNotificacionesUsuario(usuarioActual.numeroControl);
    const container = document.getElementById('notificacionesContainer');
    
    if (!container) return;
    
    if (notificaciones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No tienes notificaciones</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notificaciones.map(n => `
        <div class="notificacion-item ${n.leida ? '' : 'no-leida'}" onclick="verNotificacion('${n.id}')">
            <div class="notificacion-icon ${n.tipo}">
                <i class="fas ${n.icono}"></i>
            </div>
            <div class="notificacion-contenido">
                <h4>${sanitizarTexto(n.titulo)}</h4>
                <p>${sanitizarTexto(n.mensaje)}</p>
                <span class="notificacion-fecha">${formatearFechaHora(n.fecha)}</span>
            </div>
            ${!n.leida ? '<span class="notif-badge"></span>' : ''}
        </div>
    `).join('');
    
    actualizarBadgeNotificaciones();
}

// Ver detalle de notificación
function verNotificacion(notificacionId) {
    marcarNotificacionLeida(notificacionId);
    
    const notificacion = obtenerNotificaciones().find(n => n.id === notificacionId);
    
    if (!notificacion) return;
    
    // Redirigir según el tipo y el relacionadoId
    if (notificacion.relacionadoId) {
        switch (notificacion.tipo) {
            case 'documento':
                // Ir a la sección de documentos
                if (typeof navegarASeccion === 'function') {
                    navegarASeccion('documentos');
                }
                break;
            case 'cita':
                // Ir a la sección de citas
                if (typeof navegarASeccion === 'function') {
                    navegarASeccion('cita');
                }
                break;
            case 'mensaje':
                // Ir a la sección de mensajes
                if (typeof navegarASeccion === 'function') {
                    navegarASeccion('mensajes');
                }
                break;
        }
    }
    
    cargarNotificaciones();
    ocultarPanelNotificaciones();
}

// Actualizar badge de notificaciones
function actualizarBadgeNotificaciones() {
    const usuarioActual = obtenerUsuarioActual();
    if (!usuarioActual) return;
    
    const count = contarNotificacionesNoLeidas(usuarioActual.numeroControl);
    const badge = document.getElementById('notificationBadge');
    
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// Crear notificación de documento aprobado
function notificarDocumentoAprobado(numeroControl, nombreDocumento) {
    crearNotificacion({
        numeroControl: numeroControl,
        tipo: 'documento',
        titulo: 'Documento Aprobado',
        mensaje: CONFIG.NOTIFICACIONES.DOCUMENTO_APROBADO.replace('{documento}', nombreDocumento)
    });
}

// Crear notificación de documento rechazado
function notificarDocumentoRechazado(numeroControl, nombreDocumento) {
    crearNotificacion({
        numeroControl: numeroControl,
        tipo: 'documento',
        titulo: 'Documento Rechazado',
        mensaje: CONFIG.NOTIFICACIONES.DOCUMENTO_RECHAZADO.replace('{documento}', nombreDocumento)
    });
}

// Crear notificación de cita agendada
function notificarCitaAgendada(numeroControl, fecha, hora) {
    crearNotificacion({
        numeroControl: numeroControl,
        tipo: 'cita',
        titulo: 'Cita Agendada',
        mensaje: CONFIG.NOTIFICACIONES.CITA_AGENDADA
            .replace('{fecha}', formatearFecha(fecha))
            .replace('{hora}', hora)
    });
}

// Crear notificación de recordatorio de cita
function notificarRecordatorioCita(numeroControl, hora) {
    crearNotificacion({
        numeroControl: numeroControl,
        tipo: 'cita',
        titulo: 'Recordatorio de Cita',
        mensaje: CONFIG.NOTIFICACIONES.RECORDATORIO_CITA.replace('{hora}', hora)
    });
}

// Eliminar notificación
function eliminarNotificacionCompleta(notificacionId) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];
    const notificacionesFiltradas = notificaciones.filter(n => n.id !== notificacionId);
    localStorage.setItem('notificaciones', JSON.stringify(notificacionesFiltradas));
    
    cargarNotificaciones();
}

// Limpiar notificaciones antiguas
function limpiarNotificacionesAntiguas(dias = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones')) || [];
    const notificacionesFiltradas = notificaciones.filter(n => 
        !n.leida || new Date(n.fecha) > fechaLimite
    );
    
    localStorage.setItem('notificaciones', JSON.stringify(notificacionesFiltradas));
}

// Inicializar sistema de notificaciones
function inicializarNotificaciones() {
    const notificationBtn = document.getElementById('notificationBtn');
    const closeNotifications = document.getElementById('closeNotifications');
    
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarPanelNotificaciones();
        });
    }
    
    if (closeNotifications) {
        closeNotifications.addEventListener('click', ocultarPanelNotificaciones);
    }
    
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notificationPanel');
        if (panel && panel.classList.contains('active')) {
            if (!panel.contains(e.target) && e.target.id !== 'notificationBtn') {
                ocultarPanelNotificaciones();
            }
        }
    });
    
    // Actualizar badge periódicamente
    actualizarBadgeNotificaciones();
    setInterval(actualizarBadgeNotificaciones, 30000); // Cada 30 segundos
}

// Estilos adicionales para notificaciones
const notifStyles = document.createElement('style');
notifStyles.textContent = `
    .notificacion-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    .notificacion-icon.documento {
        background-color: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
    }
    
    .notificacion-icon.cita {
        background-color: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }
    
    .notificacion-icon.mensaje {
        background-color: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
    }
    
    .notificacion-icon.general {
        background-color: rgba(107, 114, 128, 0.1);
        color: #6b7280;
    }
    
    .notificacion-item {
        display: flex;
        gap: 15px;
        padding: 15px 20px;
        border-bottom: 1px solid #e5e7eb;
        position: relative;
    }
    
    .notificacion-contenido {
        flex: 1;
    }
    
    .notificacion-contenido h4 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 5px;
        color: #111827;
    }
    
    .notificacion-contenido p {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 5px;
    }
    
    .notificacion-fecha {
        font-size: 12px;
        color: #9ca3af;
    }
    
    .notif-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        width: 8px;
        height: 8px;
        background-color: #ef4444;
        border-radius: 50%;
    }
`;
document.head.appendChild(notifStyles);
