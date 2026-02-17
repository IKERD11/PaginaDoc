// Utilidades generales del sistema

// Formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-MX', opciones);
}

// Formatear fecha y hora
function formatearFechaHora(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    const opciones = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('es-MX', opciones);
}

// Formatear hora
function formatearHora(hora) {
    if (!hora) return '';
    return hora.substring(0, 5);
}

// Validar formato de archivo
function validarArchivo(file) {
    const errores = [];

    if (!file) {
        errores.push('No se ha seleccionado ningún archivo');
        return errores;
    }

    // Validar tipo
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        errores.push('El archivo debe ser formato PDF');
    }

    // Validar tamaño
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        errores.push(`El archivo no debe superar ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)} MB`);
    }

    return errores;
}

// Convertir archivo a Base64
function archivoABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Generar ID único
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Mostrar notificación toast
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;

    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${iconos[tipo]}"></i>
        <span>${mensaje}</span>
    `;

    // Estilos del toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: '#fff',
        backgroundColor: tipo === 'success' ? '#10b981' :
            tipo === 'error' ? '#ef4444' :
                tipo === 'warning' ? '#f59e0b' : '#3b82f6',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: '10000',
        animation: 'slideIn 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '300px'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Crear modal
function crearModal(titulo, contenido, botones = []) {
    const modalContainer = document.getElementById('modalContainer');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${titulo}</h3>
                <button class="modal-close" onclick="cerrarModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${contenido}
            </div>
            <div class="modal-footer">
                ${botones.map(btn => `
                    <button class="btn-${btn.tipo || 'secondary'}" onclick="${btn.onclick}">
                        ${btn.icono ? `<i class="fas fa-${btn.icono}"></i>` : ''}
                        ${btn.texto}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    modalContainer.innerHTML = '';
    modalContainer.appendChild(modal);

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

// Cerrar modal
function cerrarModal() {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = '';
}

// Confirmar acción
function confirmar(titulo, mensaje, callback) {
    const callbackId = 'cb_' + Math.random().toString(36).substr(2, 9);
    window._pendingCallbacks = window._pendingCallbacks || {};
    window._pendingCallbacks[callbackId] = callback;

    const contenido = `<p>${mensaje}</p>`;
    const botones = [
        {
            texto: 'Cancelar',
            tipo: 'secondary',
            onclick: `delete window._pendingCallbacks['${callbackId}']; cerrarModal();`
        },
        {
            texto: 'Confirmar',
            tipo: 'primary',
            onclick: `const cb = window._pendingCallbacks['${callbackId}']; delete window._pendingCallbacks['${callbackId}']; cerrarModal(); if(cb) cb();`
        }
    ];

    crearModal(titulo, contenido, botones);
}

// Calcular progreso de documentos
function calcularProgreso(documentos) {
    if (!documentos || documentos.length === 0) return 0;

    const documentosRequeridos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];
    const totalRequeridos = documentosRequeridos.filter(d => d.obligatorio).length;

    if (totalRequeridos === 0) return 0;

    const aprobados = documentos.filter(d => d.estado === 'aprobado').length;
    return Math.round((aprobados / totalRequeridos) * 100);
}

// Obtener estado de documentación del alumno
function obtenerEstadoDocumentacion(numeroControl) {
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    const docsAlumno = documentos.filter(d => d.numeroControl === numeroControl);
    const documentosRequeridos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];

    const total = documentosRequeridos.length;
    const aprobados = docsAlumno.filter(d => d.estado === 'aprobado').length;
    const pendientes = docsAlumno.filter(d => d.estado === 'pendiente').length;
    const rechazados = docsAlumno.filter(d => d.estado === 'rechazado').length;
    const sinSubir = total - docsAlumno.length;

    return {
        total,
        aprobados,
        pendientes,
        rechazados,
        sinSubir,
        progreso: calcularProgreso(docsAlumno),
        completo: aprobados === total
    };
}

// Obtener badge de estado
function obtenerBadgeEstado(estado) {
    const badges = {
        pendiente: '<span class="badge badge-pendiente"><i class="fas fa-clock"></i> Pendiente</span>',
        aprobado: '<span class="badge badge-aprobado"><i class="fas fa-check-circle"></i> Aprobado</span>',
        rechazado: '<span class="badge badge-rechazado"><i class="fas fa-times-circle"></i> Rechazado</span>',
        completo: '<span class="badge badge-completo"><i class="fas fa-check-double"></i> Completo</span>'
    };

    return badges[estado] || estado;
}

// Validar periodo activo
function validarPeriodoActivo() {
    const periodo = JSON.parse(localStorage.getItem('periodo'));
    if (!periodo) return true;

    const hoy = new Date();
    const inicio = new Date(periodo.fechaInicio);
    const fin = new Date(periodo.fechaFin);

    return hoy >= inicio && hoy <= fin;
}

// Agregar animaciones CSS necesarias
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .toast {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
`;
document.head.appendChild(style);

// Formatear tamaño de archivo
function formatearTamano(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Obtener días entre dos fechas
function diasEntre(fecha1, fecha2) {
    const unDia = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((fecha1 - fecha2) / unDia));
}

// Validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Sanitizar texto para prevenir XSS
function sanitizarTexto(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}
