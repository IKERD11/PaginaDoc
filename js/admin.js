// Script principal del panel administrativo

let adminInitialized = false; // Evitar inicialización múltiple

document.addEventListener('DOMContentLoaded', async () => {
    // Evitar inicialización multiple
    if (adminInitialized) return;
    adminInitialized = true;

    // Verificar autenticación y rol
    const usuario = verificarAutenticacion();
    if (!usuario || usuario.rol !== 'admin') {
        console.log('Acceso denegado: usuario no es admin');
        await cerrarSesionFirebase();
        return;
    }

    const usuarioActual = obtenerUsuarioActual();
    document.getElementById('adminName').textContent = usuarioActual.nombre;

    // Inicializar componentes
    inicializarNavegacion();
    inicializarEventos();
    await cargarDashboard();
    await actualizarBadgeMensajes();

    // Actualizar datos periódicamente
    setInterval(async () => {
        await actualizarEstadisticas();
        await actualizarBadgeMensajes();
    }, 60000); // Cada minuto
});

// Inicializar navegación del sidebar
function inicializarNavegacion() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const seccion = item.getAttribute('data-section');
            navegarASeccion(seccion);
        });
    });
}

// Navegar entre secciones
async function navegarASeccion(seccion) {
    // Actualizar menú activo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${seccion}"]`).classList.add('active');

    // Mostrar sección correspondiente
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${seccion}-section`).classList.add('active');

    // Cargar datos de la sección
    switch (seccion) {
        case 'dashboard':
            await cargarDashboard();
            break;
        case 'alumnos':
            await cargarAlumnos();
            break;
        case 'documentos':
            await cargarDocumentosRevision();
            break;
        case 'citas':
            await cargarCitas();
            break;
        case 'mensajes':
            await cargarMensajesAdmin();
            break;
        case 'reportes':
            await cargarReportes();
            break;
        case 'configuracion':
            cargarConfiguracion();
            break;
    }
}

// Inicializar eventos globales
function inicializarEventos() {
    // Botón de cerrar sesión
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await cerrarSesionFirebase();
    });

    // Tabs de configuración
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');

            // Actualizar botones activos
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Mostrar contenido correspondiente
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
    document.getElementById('btnNuevoAlumno').addEventListener('click', mostrarModalNuevoAlumno);
    document.getElementById('btnNuevaCita').addEventListener('click', mostrarModalNuevaCita);
    document.getElementById('btnNuevoMensaje').addEventListener('click', mostrarModalNuevoMensaje);
    document.getElementById('btnAgregarDocumento').addEventListener('click', mostrarModalAgregarDocumento);
    document.getElementById('btnAgregarUsuario').addEventListener('click', mostrarModalNuevoAlumno);
    document.getElementById('guardarPeriodo').addEventListener('click', guardarConfiguracionPeriodo);
    document.getElementById('generarReporte').addEventListener('click', generarReporteSeleccionado);
    document.getElementById('exportPDF').addEventListener('click', exportarReportePDFActual);
    document.getElementById('exportExcel').addEventListener('click', exportarReporteExcelActual);
}

// ===== DASHBOARD =====
function cargarDashboard() {
    actualizarEstadisticas();
    cargarGraficasDashboard();
    cargarCitasProximas();
}

function actualizarEstadisticas() {
    const stats = obtenerEstadisticas();

    document.getElementById('totalAlumnos').textContent = stats.totalAlumnos;
    document.getElementById('alumnosCompletos').textContent = stats.alumnosCompletos;
    document.getElementById('documentosPendientes').textContent = stats.documentosPendientes;
    document.getElementById('documentosRechazados').textContent = stats.documentosRechazados;
}

function cargarGraficasDashboard() {
    const datos = obtenerDatosGraficas();
    generarGraficaBarras(datos.documentacion, 'chartDocumentacion');
}

function cargarCitasProximas() {
    const citas = obtenerProximasCitas(10);
    const container = document.getElementById('citasSemana');

    if (citas.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: #6b7280;">No hay citas programadas</p>';
        return;
    }

    container.innerHTML = citas.map(cita => `
        <div class="cita-item" style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <strong>${cita.nombreAlumno}</strong>
            <p style="font-size: 13px; color: #6b7280;">
                ${formatearFecha(cita.fecha)} - ${cita.hora}
                ${obtenerBadgeEstado(cita.estado)}
            </p>
        </div>
    `).join('');
}

// ===== ALUMNOS =====
function cargarAlumnos() {
    const alumnos = obtenerUsuarios({ rol: 'alumno' });
    const tbody = document.getElementById('alumnosTableBody');

    if (alumnos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay alumnos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = alumnos.map(alumno => {
        const estado = obtenerEstadoDocumentacion(alumno.numeroControl);
        return `
            <tr>
                <td>${alumno.numeroControl}</td>
                <td>${alumno.nombre}</td>
                <td>${alumno.email}</td>
                <td>
                    <div class="progress-bar" style="height: 20px; width: 100px;">
                        <div class="progress-fill" style="width: ${estado.progreso}%;"></div>
                    </div>
                    ${estado.progreso}%
                </td>
                <td>${estado.completo ? obtenerBadgeEstado('completo') : obtenerBadgeEstado('pendiente')}</td>
                <td>
                    <button class="btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="verDetalleAlumno('${alumno.numeroControl}')">
                        <i class="fas fa-eye"></i> Ver Detalle
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Filtros
    document.getElementById('searchAlumno').addEventListener('input', filtrarAlumnos);
    document.getElementById('filterEstado').addEventListener('change', filtrarAlumnos);
}

function filtrarAlumnos() {
    const busqueda = document.getElementById('searchAlumno').value.toLowerCase();
    const estado = document.getElementById('filterEstado').value;

    let alumnos = obtenerUsuarios({ rol: 'alumno' });

    if (busqueda) {
        alumnos = alumnos.filter(a =>
            a.nombre.toLowerCase().includes(busqueda) ||
            a.numeroControl.toLowerCase().includes(busqueda)
        );
    }

    if (estado) {
        alumnos = alumnos.filter(a => {
            const estadoDoc = obtenerEstadoDocumentacion(a.numeroControl);
            if (estado === 'completo') return estadoDoc.completo;
            if (estado === 'incompleto') return !estadoDoc.completo && estadoDoc.sinSubir < estadoDoc.total;
            if (estado === 'pendiente') return estadoDoc.sinSubir === estadoDoc.total;
            return true;
        });
    }

    const tbody = document.getElementById('alumnosTableBody');
    tbody.innerHTML = alumnos.map(alumno => {
        const estadoDoc = obtenerEstadoDocumentacion(alumno.numeroControl);
        return `
            <tr>
                <td>${alumno.numeroControl}</td>
                <td>${alumno.nombre}</td>
                <td>${alumno.email}</td>
                <td>
                    <div class="progress-bar" style="height: 20px; width: 100px;">
                        <div class="progress-fill" style="width: ${estadoDoc.progreso}%;"></div>
                    </div>
                    ${estadoDoc.progreso}%
                </td>
                <td>${estadoDoc.completo ? obtenerBadgeEstado('completo') : obtenerBadgeEstado('pendiente')}</td>
                <td>
                    <button class="btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="verDetalleAlumno('${alumno.numeroControl}')">
                        <i class="fas fa-eye"></i> Ver Detalle
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function verDetalleAlumno(numeroControl) {
    const alumno = obtenerUsuarioPorNumeroControl(numeroControl);
    const documentos = obtenerDocumentosAlumno(numeroControl);
    const citas = obtenerCitas({ numeroControl });

    const contenido = `
        <div style="padding: 20px;">
            <h4>${alumno.nombre}</h4>
            <p><strong>Número de Control:</strong> ${alumno.numeroControl}</p>
            <p><strong>Email:</strong> ${alumno.email}</p>
            
            <h5 style="margin-top: 20px;">Documentos:</h5>
            <div class="documentos-list">
                ${documentos.map(doc => `
                    <div style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                        <strong>${doc.nombre}</strong>
                        ${doc.subido ? obtenerBadgeEstado(doc.documento.estado) : '<span class="badge badge-pendiente">Sin subir</span>'}
                    </div>
                `).join('')}
            </div>
            
            ${citas.length > 0 ? `
                <h5 style="margin-top: 20px;">Citas:</h5>
                ${citas.map(c => `
                    <p>${formatearFecha(c.fecha)} - ${c.hora} - ${obtenerBadgeEstado(c.estado)}</p>
                `).join('')}
            ` : ''}
        </div>
    `;

    crearModal(`Detalle de ${alumno.nombre}`, contenido, [
        {
            texto: 'Cerrar',
            tipo: 'secondary',
            onclick: 'cerrarModal()'
        }
    ]);
}

function mostrarModalNuevoAlumno() {
    const contenido = `
        <form id="formNuevoAlumno">
            <div class="form-group">
                <label>Número de Control *</label>
                <input type="text" id="nuevoNumeroControl" required>
            </div>
            <div class="form-group">
                <label>Nombre Completo *</label>
                <input type="text" id="nuevoNombre" required>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="nuevoEmail" required>
            </div>
            <div class="form-group">
                <label>NIP (4-6 dígitos) *</label>
                <input type="password" id="nuevoNip" maxlength="6" required>
            </div>
        </form>
    `;

    crearModal('Nuevo Alumno', contenido, [
        {
            texto: 'Cancelar',
            tipo: 'secondary',
            onclick: 'cerrarModal()'
        },
        {
            texto: 'Crear',
            tipo: 'primary',
            icono: 'plus',
            onclick: 'crearNuevoAlumno()'
        }
    ]);
}

function crearNuevoAlumno() {
    const numeroControl = document.getElementById('nuevoNumeroControl').value;
    const nombre = document.getElementById('nuevoNombre').value;
    const email = document.getElementById('nuevoEmail').value;
    const nip = document.getElementById('nuevoNip').value;

    const resultado = crearUsuario({
        numeroControl,
        nombre,
        email,
        nip,
        rol: 'alumno'
    });

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        cerrarModal();
        cargarAlumnos();
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

// ===== DOCUMENTOS =====
function cargarDocumentosRevision() {
    // Poblar select de alumnos
    const alumnos = obtenerUsuarios({ rol: 'alumno' });
    const selectAlumno = document.getElementById('filterAlumnoDocumentos');

    selectAlumno.innerHTML = '<option value="">Todos los alumnos</option>' +
        alumnos.map(a => `<option value="${a.numeroControl}">${a.nombre} - ${a.numeroControl}</option>`).join('');

    // Eventos de filtros
    selectAlumno.addEventListener('change', filtrarDocumentosRevision);
    document.getElementById('filterEstadoDocumento').addEventListener('change', filtrarDocumentosRevision);

    // Evento de búsqueda por nombre o número de control
    const searchDocumento = document.getElementById('searchDocumento');
    if (searchDocumento) {
        searchDocumento.addEventListener('input', filtrarDocumentosRevision);
    }

    // Cargar todos los documentos
    mostrarDocumentosRevision();
}

async function filtrarDocumentosRevision() {
    await mostrarDocumentosRevision();
}

async function mostrarDocumentosRevision() {
    const numeroControlSelect = document.getElementById('filterAlumnoDocumentos').value;
    const estado = document.getElementById('filterEstadoDocumento').value;
    const busqueda = document.getElementById('searchDocumento').value.toLowerCase().trim();

    // Si hay una búsqueda exacta o un alumno seleccionado, mostrar el expediente
    if (busqueda && busqueda.length >= 4) {
        const alumno = buscarAlumnoPorCriterio(busqueda);
        if (alumno) {
            await mostrarExpedienteAlumno(alumno, estado);
            return;
        }
    }

    if (numeroControlSelect) {
        const alumno = obtenerUsuarioPorNumeroControl(numeroControlSelect);
        if (alumno) {
            await mostrarExpedienteAlumno(alumno, estado);
            return;
        }
    }

    let documentos = await obtenerDocumentos();

    // Filtrar documentos antes de agrupar
    if (numeroControlSelect) {
        documentos = documentos.filter(d => d.numeroControl === numeroControlSelect);
    }
    if (estado) {
        documentos = documentos.filter(d => d.estado === estado);
    }
    if (busqueda) {
        documentos = documentos.filter(d => {
            const alumno = obtenerUsuarioPorNumeroControl(d.numeroControl);
            const nombre = alumno ? alumno.nombre.toLowerCase() : '';
            const numControl = d.numeroControl.toLowerCase();
            const email = alumno ? alumno.email.toLowerCase() : '';
            return nombre.includes(busqueda) || numControl.includes(busqueda) || email.includes(busqueda);
        });
    }

    const container = document.getElementById('documentosContainer');

    if (documentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state fade-in">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>No se encontraron alumnos o documentos con esos criterios</p>
                ${busqueda ? `<button class="btn-secondary" style="margin-top: 15px;" onclick="limpiarBusquedaExpediente()">Limpiar búsqueda</button>` : ''}
            </div>
        `;
        return;
    }

    // AGRUPAR POR ALUMNO
    const grupos = {};
    documentos.forEach(doc => {
        if (!grupos[doc.numeroControl]) {
            grupos[doc.numeroControl] = [];
        }
        grupos[doc.numeroControl].push(doc);
    });

    container.innerHTML = Object.keys(grupos).map(numControl => {
        const docs = grupos[numControl];
        const alumno = obtenerUsuarioPorNumeroControl(numControl) || { nombre: 'Desconocido', numeroControl: numControl };

        const total = docs.length;
        const aprobados = docs.filter(d => d.estado === 'aprobado').length;
        const pendientes = docs.filter(d => d.estado === 'pendiente').length;
        // Calcular porcentaje basado en documentos aprobados vs el total requerido (asumimos 6 si no hay más info)
        const totalRequeridos = (typeof CONFIG !== 'undefined' && CONFIG.DOCUMENTOS_REQUERIDOS) ? CONFIG.DOCUMENTOS_REQUERIDOS.length : 6;
        const porcentaje = Math.round((aprobados / totalRequeridos) * 100);

        const tienePendientes = pendientes > 0;

        return `
            <div class="alumno-summary-card fade-in" onclick="mostrarExpedienteAlumno({numeroControl: '${numControl}', nombre: '${alumno.nombre}', email: '${alumno.email || ''}'}, '${estado}')">
                <div class="summary-header">
                    <div class="summary-user-node">
                        <div class="summary-avatar">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div class="summary-user-text">
                            <h3>${alumno.nombre}</h3>
                            <span>${numControl}</span>
                        </div>
                    </div>
                    <div class="summary-chevron">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-stats-grid">
                    <div class="summary-stat-item">
                        <span class="summary-stat-value">${total}</span>
                        <span class="summary-stat-label">Total</span>
                    </div>
                    <div class="summary-stat-item">
                        <span class="summary-stat-value" style="color: #34d399;">${aprobados}</span>
                        <span class="summary-stat-label">Aprobados</span>
                    </div>
                    <div class="summary-stat-item">
                        <span class="summary-stat-value" style="color: #f59e0b;">${pendientes}</span>
                        <span class="summary-stat-label">Pendientes</span>
                    </div>
                </div>

                <div class="summary-footer">
                    <div class="summary-progress-wrapper">
                        <div class="summary-progress-bar">
                            <div class="summary-progress-fill" style="width: ${porcentaje}%"></div>
                        </div>
                    </div>
                    <div class="summary-status-row">
                        <span class="progreso-text">Progreso: ${porcentaje}%</span>
                        ${tienePendientes ? `
                            <div class="badge-resumen-pendiente">
                                <i class="fas fa-clock"></i> REVISIÓN PENDIENTE
                            </div>
                        ` : `
                            <div class="badge-resumen-pendiente" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
                                <i class="fas fa-check-circle"></i> REVISADO
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function aprobarDocumento(documentoId) {
    confirmar(
        'Aprobar Documento',
        '¿Estás seguro de que deseas aprobar este documento?',
        async () => {
            const resultado = await revisarDocumento(documentoId, 'aprobado');
            if (resultado.exito) {
                mostrarToast('Documento aprobado con éxito', 'success');
                await mostrarDocumentosRevision();
                if (typeof actualizarEstadisticas === 'function') await actualizarEstadisticas();
            } else {
                mostrarToast(resultado.mensaje || 'Error al aprobar documento', 'error');
            }
        }
    );
}

function rechazarDocumento(documentoId) {
    mostrarSeccionRechazo(documentoId);
}

function mostrarSeccionRechazo(documentoId) {
    const container = document.getElementById(`rechazo-container-${documentoId}`);
    const buttons = document.getElementById(`buttons-${documentoId}`);

    if (container) {
        container.style.display = 'block';
        if (buttons) buttons.style.display = 'none';

        // Focus textarea
        const textarea = document.getElementById(`obs-${documentoId}`);
        if (textarea) textarea.focus();
    } else {
        // Fallback al modal si no estamos en la vista de expediente/lista agrupada
        const contenido = `
            <form id="formRechazarDoc">
                <div class="form-group">
                    <label>Observaciones (obligatorio) *</label>
                    <textarea id="observacionesRechazo" required placeholder="Explica el motivo del rechazo..."></textarea>
                </div>
            </form>
        `;

        crearModal('Rechazar Documento', contenido, [
            {
                texto: 'Cancelar',
                tipo: 'secondary',
                onclick: 'cerrarModal()'
            },
            {
                texto: 'Rechazar',
                tipo: 'danger',
                icono: 'times',
                onclick: `ejecutarRechazo('${documentoId}')`
            }
        ]);
    }
}

function cancelarRechazo(documentoId) {
    const container = document.getElementById(`rechazo-container-${documentoId}`);
    const buttons = document.getElementById(`buttons-${documentoId}`);

    if (container) {
        container.style.display = 'none';
        if (buttons) buttons.style.display = 'flex';

        // Limpiar textarea
        const textarea = document.getElementById(`obs-${documentoId}`);
        if (textarea) textarea.value = '';
    }
}

async function confirmarRechazo(documentoId) {
    const observaciones = document.getElementById(`obs-${documentoId}`).value;

    if (!observaciones.trim()) {
        mostrarToast('Las observaciones son obligatorias', 'error');
        return;
    }

    const resultado = await revisarDocumento(documentoId, 'rechazado', observaciones);
    if (resultado.exito) {
        mostrarToast('Documento rechazado con éxito', 'success');
        await mostrarDocumentosRevision();
        if (typeof actualizarEstadisticas === 'function') await actualizarEstadisticas();
    } else {
        mostrarToast(resultado.mensaje || 'Error al rechazar documento', 'error');
    }
}

async function ejecutarRechazo(documentoId) {
    const observaciones = document.getElementById('observacionesRechazo').value;

    if (!observaciones.trim()) {
        mostrarToast('Las observaciones son obligatorias', 'error');
        return;
    }

    const resultado = await revisarDocumento(documentoId, 'rechazado', observaciones);
    if (resultado.exito) {
        mostrarToast('Documento rechazado con éxito', 'success');
        cerrarModal();
        await mostrarDocumentosRevision();
        if (typeof actualizarEstadisticas === 'function') await actualizarEstadisticas();
    } else {
        mostrarToast(resultado.mensaje || 'Error al rechazar documento', 'error');
    }
}

// Continúa en el siguiente bloque...
// ===== CITAS =====
function cargarCitas() {
    cargarProximasCitasAdmin();
}

function cargarProximasCitasAdmin() {
    const citas = obtenerProximasCitas(20);
    const container = document.getElementById('citasList');

    if (citas.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No hay citas próximas</p></div>';
        return;
    }

    container.innerHTML = citas.map(cita => `
        <div class="cita-card" style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h4>${cita.nombreAlumno}</h4>
                    <p style="color: #6b7280; font-size: 13px;">${cita.numeroControl}</p>
                    <p style="margin-top: 10px;">
                        <i class="fas fa-calendar"></i> ${formatearFecha(cita.fecha)} - ${cita.hora}
                    </p>
                    ${cita.confirmada ? '<p style="color: #10b981;"><i class="fas fa-check"></i> Confirmada</p>' : '<p style="color: #f59e0b;"><i class="fas fa-clock"></i> Pendiente de confirmar</p>'}
                </div>
                ${obtenerBadgeEstado(cita.estado)}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn-primary" style="font-size: 12px;" onclick="verDetalleCita('${cita.id}')">
                    <i class="fas fa-eye"></i> Ver Detalle
                </button>
                ${cita.estado !== 'cancelada' && cita.estado !== 'completada' ? `
                    <button class="btn-secondary" style="font-size: 12px;" onclick="reprogramarCitaModal('${cita.id}')">
                        <i class="fas fa-calendar-alt"></i> Reprogramar
                    </button>
                    <button class="btn-danger" style="font-size: 12px;" onclick="cancelarCitaModal('${cita.id}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                ` : ''}
                ${cita.estado === 'confirmada' ? `
                    <button class="btn-success" style="font-size: 12px;" onclick="registrarAsistenciaModal('${cita.id}')">
                        <i class="fas fa-check"></i> Registrar Asistencia
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function mostrarModalNuevaCita() {
    const alumnos = obtenerUsuarios({ rol: 'alumno' }).filter(a => validarDocumentacionCompleta(a.numeroControl));

    if (alumnos.length === 0) {
        mostrarToast('No hay alumnos con documentación completa para agendar citas', 'warning');
        return;
    }

    const contenido = `
        <form id="formNuevaCita">
            <div class="form-group">
                <label>Alumno *</label>
                <select id="citaAlumno" required>
                    <option value="">Seleccionar...</option>
                    ${alumnos.map(a => `<option value="${a.numeroControl}">${a.nombre} - ${a.numeroControl}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Fecha *</label>
                <input type="date" id="citaFecha" required min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Hora *</label>
                <input type="time" id="citaHora" required>
            </div>
        </form>
    `;

    crearModal('Agendar Nueva Cita', contenido, [
        {
            texto: 'Cancelar',
            tipo: 'secondary',
            onclick: 'cerrarModal()'
        },
        {
            texto: 'Agendar',
            tipo: 'primary',
            icono: 'calendar-check',
            onclick: 'crearNuevaCitaAdmin()'
        }
    ]);
}

function crearNuevaCitaAdmin() {
    const numeroControl = document.getElementById('citaAlumno').value;
    const fecha = document.getElementById('citaFecha').value;
    const hora = document.getElementById('citaHora').value;

    const resultado = crearCita(numeroControl, fecha, hora);

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        cerrarModal();
        cargarProximasCitasAdmin();
        actualizarEstadisticas();
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

// ===== MENSAJES =====
function cargarMensajesAdmin() {
    const mensajes = obtenerMensajes({ numeroControl: 'ADMIN' });
    const container = document.getElementById('mensajesListContainer');

    if (mensajes.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open"></i><p>No tienes mensajes</p></div>';
        return;
    }

    const activeId = window.selectedMessageId;

    container.innerHTML = mensajes.map(m => {
        const remitente = obtenerUsuarioPorNumeroControl(m.de);
        const isActive = m.id === activeId ? 'active' : '';

        return `
            <div class="mensaje-item ${m.leido ? '' : 'no-leido'} ${isActive}" onclick="verMensajeDetalle('${m.id}')" data-id="${m.id}">
                <h4>${remitente ? remitente.nombre : 'Sistema'}</h4>
                <div class="asunto">${m.asunto}</div>
                <div class="meta">
                    <span>${formatearFechaHora(m.fecha)}</span>
                    <span class="badge badge-pendiente">${m.categoria || 'General'}</span>
                </div>
            </div>
        `;
    }).join('');
}

function verMensajeDetalle(mensajeId) {
    const mensaje = obtenerConversacion(mensajeId);
    marcarMensajeLeido(mensajeId);
    window.selectedMessageId = mensajeId;

    // Actualizar clase activa
    document.querySelectorAll('.mensaje-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-id') === mensajeId) {
            item.classList.add('active');
            item.classList.remove('no-leido');
        }
    });

    const remitente = obtenerUsuarioPorNumeroControl(mensaje.de);
    const usuarioActual = obtenerUsuarioActual();

    const container = document.getElementById('mensajeDetalleContainer');
    container.innerHTML = `
        <div class="mensaje-detalle-header">
            <div class="flex-between">
                <div>
                    <h3>${mensaje.asunto}</h3>
                    <p class="text-secondary mt-10">
                        <strong>De:</strong> ${remitente ? remitente.nombre : 'Sistema'} | ${formatearFechaHora(mensaje.fecha)}
                    </p>
                </div>
                <span class="badge badge-pendiente">${mensaje.categoria || 'General'}</span>
            </div>
        </div>
        
        <div class="chat-thread">
            <!-- Mensaje Original -->
            <div class="msg-bubble received">
                <div class="msg-meta">${remitente ? remitente.nombre : 'Sistema'}</div>
                <div class="msg-content">${sanitizarTexto(mensaje.contenido).replace(/\n/g, '<br>')}</div>
                <div class="msg-date">${formatearFechaHora(mensaje.fecha)}</div>
            </div>
            
            <!-- Respuestas -->
            ${(mensaje.respuestas || []).map(r => `
                <div class="msg-bubble ${r.de === usuarioActual.numeroControl ? 'sent' : 'received'}">
                    <div class="msg-meta">${r.nombreDe}</div>
                    <div class="msg-content">${sanitizarTexto(r.contenido).replace(/\n/g, '<br>')}</div>
                    <div class="msg-date">${formatearFechaHora(r.fecha)}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="reply-container">
            <h4>Escribir respuesta</h4>
            <textarea id="respuestaMensaje" class="reply-textarea" placeholder="Escribe tu respuesta aquí..."></textarea>
            <div class="mt-20 flex-right">
                <button class="btn-primary" onclick="enviarRespuestaMensaje('${mensajeId}')">
                    <i class="fas fa-paper-plane"></i> Enviar Respuesta
                </button>
            </div>
        </div>
    `;

    actualizarBadgeMensajes();
}

function enviarRespuestaMensaje(mensajeId) {
    const contenido = document.getElementById('respuestaMensaje').value;

    if (!contenido.trim()) {
        mostrarToast('Escribe un mensaje', 'error');
        return;
    }

    const resultado = responderMensaje(mensajeId, contenido);

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        verMensajeDetalle(mensajeId);
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

function mostrarModalNuevoMensaje() {
    const alumnos = obtenerUsuarios({ rol: 'alumno' });

    const contenido = `
        <form id="formNuevoMensaje">
            <div class="form-group">
                <label>Destinatario *</label>
                <select id="mensajeDestinatario" required>
                    <option value="">Seleccionar...</option>
                    <option value="TODOS">Todos los alumnos</option>
                    ${alumnos.map(a => `<option value="${a.numeroControl}">${a.nombre} - ${a.numeroControl}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Asunto *</label>
                <input type="text" id="mensajeAsunto" required>
            </div>
            <div class="form-group">
                <label>Mensaje *</label>
                <textarea id="mensajeContenido" required style="min-height: 150px;"></textarea>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="mensajeCategoria">
                    <option value="general">General</option>
                    <option value="documento">Documentos</option>
                    <option value="cita">Citas</option>
                </select>
            </div>
        </form>
    `;

    crearModal('Nuevo Mensaje', contenido, [
        {
            texto: 'Cancelar',
            tipo: 'secondary',
            onclick: 'cerrarModal()'
        },
        {
            texto: 'Enviar',
            tipo: 'primary',
            icono: 'paper-plane',
            onclick: 'enviarNuevoMensajeAdmin()'
        }
    ]);
}

function enviarNuevoMensajeAdmin() {
    const destinatario = document.getElementById('mensajeDestinatario').value;
    const asunto = document.getElementById('mensajeAsunto').value;
    const contenido = document.getElementById('mensajeContenido').value;
    const categoria = document.getElementById('mensajeCategoria').value;

    const usuarioActual = obtenerUsuarioActual();

    let resultado;

    if (destinatario === 'TODOS') {
        resultado = enviarMensajeMasivo(asunto, contenido);
    } else {
        resultado = crearMensaje(usuarioActual.numeroControl, destinatario, asunto, contenido, categoria);
    }

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        cerrarModal();
        cargarMensajesAdmin();
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

function actualizarBadgeMensajes() {
    const count = contarMensajesNoLeidos('ADMIN');
    const badge = document.getElementById('mensajesBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// ===== REPORTES =====
let reporteActual = null;

function cargarReportes() {
    // Establecer fecha de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    document.getElementById('fechaInicio').value = hace30Dias.toISOString().split('T')[0];
    document.getElementById('fechaFin').value = hoy;
}

function generarReporteSeleccionado() {
    const tipo = document.getElementById('tipoReporte').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    let reporte;

    switch (tipo) {
        case 'general':
            reporte = generarReporteGeneral(fechaInicio, fechaFin);
            break;
        case 'documentos':
            reporte = generarReporteDocumentos(fechaInicio, fechaFin);
            break;
        case 'citas':
            reporte = generarReporteCitas(fechaInicio, fechaFin);
            break;
        case 'alumnos':
            reporte = generarReporteAlumnos();
            break;
    }

    reporteActual = reporte;
    mostrarReporte(reporte);
}

function mostrarReporte(reporte) {
    const container = document.getElementById('reporteContainer');

    let html = `
        <div class="reporte-generado">
            <h3>Reporte ${reporte.tipo.toUpperCase()}</h3>
            <p>Generado: ${formatearFechaHora(reporte.fechaGeneracion)}</p>
    `;

    if (reporte.fechaInicio || reporte.fechaFin) {
        html += `<p>Periodo: ${formatearFecha(reporte.fechaInicio)} - ${formatearFecha(reporte.fechaFin)}</p>`;
    }

    // Agregar estadísticas
    html += '<div class="stats-grid">';

    switch (reporte.tipo) {
        case 'documentos':
            html += `
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file"></i></div><div class="stat-info"><h3>${reporte.total}</h3><p>Total</p></div></div>
                <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-info"><h3>${reporte.porEstado.aprobados}</h3><p>Aprobados</p></div></div>
                <div class="stat-card"><div class="stat-icon red"><i class="fas fa-times"></i></div><div class="stat-info"><h3>${reporte.porEstado.rechazados}</h3><p>Rechazados</p></div></div>
            `;
            break;
        case 'citas':
            html += `
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-calendar"></i></div><div class="stat-info"><h3>${reporte.total}</h3><p>Total</p></div></div>
                <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-info"><h3>${reporte.porEstado.completadas}</h3><p>Completadas</p></div></div>
                <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-user-check"></i></div><div class="stat-info"><h3>${reporte.porAsistencia.asistieron}</h3><p>Asistieron</p></div></div>
            `;
            break;
        case 'alumnos':
            html += `
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${reporte.total}</h3><p>Total</p></div></div>
                <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-double"></i></div><div class="stat-info"><h3>${reporte.porEstado.completos}</h3><p>Completos</p></div></div>
                <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-clock"></i></div><div class="stat-info"><h3>${reporte.porEstado.incompletos}</h3><p>Incompletos</p></div></div>
            `;
            break;
    }

    html += '</div></div>';
    container.innerHTML = html;
}

function exportarReportePDFActual() {
    if (!reporteActual) {
        mostrarToast('Genera un reporte primero', 'warning');
        return;
    }
    exportarReportePDF(reporteActual);
}

function exportarReporteExcelActual() {
    if (!reporteActual) {
        mostrarToast('Genera un reporte primero', 'warning');
        return;
    }
    exportarReporteExcel(reporteActual);
}

// ===== CONFIGURACIÓN =====
function cargarConfiguracion() {
    cargarDocumentosRequeridos();
    cargarUsuariosConfig();
    cargarPeriodoConfig();
    cargarBitacora();
}

function cargarDocumentosRequeridos() {
    const documentos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];
    const container = document.getElementById('documentosRequeridos');

    container.innerHTML = documentos.map(doc => `
        <div class="doc-req-card fade-in">
            <div class="doc-req-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="doc-req-content">
                <div class="doc-req-header">
                    <h4>${doc.nombre}</h4>
                    ${doc.obligatorio ? '<span class="badge badge-aprobado">OBLIGATORIO</span>' : '<span class="badge badge-pendiente">OPCIONAL</span>'}
                </div>
                <p>${doc.descripcion}</p>
                <div class="doc-req-meta">
                    <span class="meta-item"><i class="fas fa-fingerprint"></i> ID: ${doc.id}</span>
                </div>
            </div>
            <div class="doc-actions">
                <button class="btn-icon btn-delete" onclick="eliminarDocumentoRequerido('${doc.id}')" title="Eliminar documento">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function mostrarModalAgregarDocumento() {
    const contenido = `
        <form id="formNuevoDocRequerido">
            <div class="form-group">
                <label><i class="fas fa-id-badge"></i> ID del Documento *</label>
                <input type="text" id="docReqId" class="filtro-input" required placeholder="ej: acta_nacimiento">
            </div>
            <div class="form-group">
                <label><i class="fas fa-heading"></i> Nombre *</label>
                <input type="text" id="docReqNombre" class="filtro-input" required>
            </div>
            <div class="form-group">
                <label><i class="fas fa-align-left"></i> Descripción *</label>
                <textarea id="docReqDescripcion" class="filtro-input" style="min-height: 80px;" required></textarea>
            </div>
            <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                <input type="checkbox" id="docReqObligatorio" checked style="width: 20px; height: 20px; cursor: pointer;">
                <label for="docReqObligatorio" style="margin-bottom: 0; cursor: pointer;">Este documento es obligatorio</label>
            </div>
        </form>
    `;

    crearModal('Agregar Documento Requerido', contenido, [
        {
            texto: 'Cancelar',
            tipo: 'secondary',
            onclick: 'cerrarModal()'
        },
        {
            texto: 'Agregar',
            tipo: 'primary',
            icono: 'plus',
            onclick: 'agregarDocumentoRequerido()'
        }
    ]);
}

function agregarDocumentoRequerido() {
    const id = document.getElementById('docReqId').value;
    const nombre = document.getElementById('docReqNombre').value;
    const descripcion = document.getElementById('docReqDescripcion').value;
    const obligatorio = document.getElementById('docReqObligatorio').checked;

    const documentos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];

    // Verificar si ya existe
    if (documentos.find(d => d.id === id)) {
        mostrarToast('Ya existe un documento con este ID', 'error');
        return;
    }

    documentos.push({ id, nombre, descripcion, obligatorio });
    localStorage.setItem('documentosRequeridos', JSON.stringify(documentos));

    registrarBitacora('configuracion', `Documento requerido agregado: ${nombre}`);

    mostrarToast('Documento agregado correctamente', 'success');
    cerrarModal();
    cargarDocumentosRequeridos();
}

function eliminarDocumentoRequerido(id) {
    confirmar(
        'Eliminar Documento',
        '¿Estás seguro? Esta acción no se puede deshacer.',
        () => {
            let documentos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];
            documentos = documentos.filter(d => d.id !== id);
            localStorage.setItem('documentosRequeridos', JSON.stringify(documentos));

            registrarBitacora('configuracion', `Documento requerido eliminado: ${id}`);

            mostrarToast('Documento eliminado', 'success');
            cargarDocumentosRequeridos();
        }
    );
}

function cargarUsuariosConfig() {
    const usuarios = obtenerUsuarios();
    const container = document.getElementById('usuariosList');

    container.innerHTML = usuarios.map(u => `
        <div class="user-config-card fade-in">
            <div class="user-avatar ${u.rol === 'admin' ? 'admin' : 'alumno'}">
                <i class="fas ${u.rol === 'admin' ? 'fa-user-shield' : 'fa-user-graduate'}"></i>
            </div>
            
            <div class="user-info-content">
                <div class="user-header">
                    <h4>${u.nombre}</h4>
                    <span class="badge ${u.rol === 'admin' ? 'badge-aprobado' : 'badge-pendiente'}">${u.rol.toUpperCase()}</span>
                </div>
                
                <div class="user-details">
                    <span class="user-detail-item">
                        <i class="fas fa-id-card"></i> ${u.numeroControl}
                    </span>
                    <span class="user-detail-item">
                        <i class="fas fa-envelope"></i> ${u.email}
                    </span>
                </div>
            </div>
            
            <div class="user-actions">
                ${u.rol !== 'admin' ? `
                <button class="btn-icon btn-delete" onclick="eliminarUsuarioConfig('${u.numeroControl}')" title="Eliminar usuario">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ` : '<div style="width: 40px;"></div>'}
            </div>
        </div>
    `).join('');
}

function eliminarUsuarioConfig(numeroControl) {
    confirmar(
        'Eliminar Usuario',
        '¿Estás seguro? Se eliminarán todos sus datos.',
        () => {
            eliminarUsuario(numeroControl);
            mostrarToast('Usuario eliminado', 'success');
            cargarUsuariosConfig();
        }
    );
}

function cargarPeriodoConfig() {
    const periodo = JSON.parse(localStorage.getItem('periodo')) || {};
    const config = JSON.parse(localStorage.getItem('configuracion')) || {};

    if (periodo.fechaInicio) document.getElementById('fechaInicioPeriodo').value = periodo.fechaInicio;
    if (periodo.fechaFin) document.getElementById('fechaFinPeriodo').value = periodo.fechaFin;
    if (config.maxCitasPorDia) document.getElementById('limiteCitasDia').value = config.maxCitasPorDia;
}

function guardarConfiguracionPeriodo() {
    const fechaInicio = document.getElementById('fechaInicioPeriodo').value;
    const fechaFin = document.getElementById('fechaFinPeriodo').value;
    const limiteCitas = document.getElementById('limiteCitasDia').value;

    const periodo = JSON.parse(localStorage.getItem('periodo')) || {};
    const config = JSON.parse(localStorage.getItem('configuracion')) || {};

    periodo.fechaInicio = fechaInicio;
    periodo.fechaFin = fechaFin;
    config.maxCitasPorDia = parseInt(limiteCitas);

    localStorage.setItem('periodo', JSON.stringify(periodo));
    localStorage.setItem('configuracion', JSON.stringify(config));

    registrarBitacora('configuracion', 'Configuración de periodo actualizada');

    mostrarToast('Configuración guardada correctamente', 'success');
}

function cargarBitacora() {
    const bitacora = obtenerBitacora({}).slice(0, 100); // Solo las últimas 100
    const container = document.getElementById('bitacoraList');

    container.innerHTML = bitacora.map(b => `
        <div style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between;">
                <strong>${b.nombreUsuario}</strong>
                <span style="font-size: 12px; color: #9ca3af;">${formatearFechaHora(b.fecha)}</span>
            </div>
            <p style="font-size: 13px; color: #6b7280; margin-top: 5px;">${b.descripcion}</p>
            <span class="badge badge-pendiente">${b.tipo}</span>
        </div>
    `).join('');

    // Filtros
    document.getElementById('searchBitacora').addEventListener('input', filtrarBitacora);
    document.getElementById('filterTipoAccion').addEventListener('change', filtrarBitacora);
}


function filtrarBitacora() {
    const busqueda = document.getElementById('searchBitacora').value;
    const tipo = document.getElementById('filterTipoAccion').value;

    const bitacora = obtenerBitacora({ tipo, busqueda }).slice(0, 100);
    const container = document.getElementById('bitacoraList');

    container.innerHTML = bitacora.map(b => `
        <div style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between;">
                <strong>${b.nombreUsuario}</strong>
                <span style="font-size: 12px; color: #9ca3af;">${formatearFechaHora(b.fecha)}</span>
            </div>
            <p style="font-size: 13px; color: #6b7280; margin-top: 5px;">${b.descripcion}</p>
            <span class="badge badge-pendiente">${b.tipo}</span>
        </div>
    `).join('');
}

// ===== FUNCIONES DE APOYO EXPEDIENTE =====
// ===== FUNCIONES DE APOYO EXPEDIENTE (PREMIUM) =====
const getDocIcon = (nombre) => {
    const n = nombre.toLowerCase();
    if (n.includes('acta') || n.includes('nacimiento')) return 'fa-file-contract';
    if (n.includes('curp')) return 'fa-id-card';
    if (n.includes('certificado') || n.includes('estudios')) return 'fa-graduation-cap';
    if (n.includes('comprobante') || n.includes('domicilio')) return 'fa-home';
    if (n.includes('foto') || n.includes('fotografía')) return 'fa-camera';
    if (n.includes('médico') || n.includes('salud')) return 'fa-heartbeat';
    return 'fa-file-alt';
};

const estadoColors = {
    'aprobado': {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.4)',
        icon: 'fa-check-circle',
        iconColor: '#10b981'
    },
    'pendiente': {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        icon: 'fa-clock',
        iconColor: '#f59e0b'
    },
    'rechazado': {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
        icon: 'fa-times-circle',
        iconColor: '#ef4444'
    }
};

function buscarAlumnoPorCriterio(criterio) {
    const alumnos = obtenerUsuarios({ rol: 'alumno' });
    const criterioLower = criterio.toLowerCase().trim();

    // Buscar por número de control exacto
    let alumno = alumnos.find(a => a.numeroControl.toLowerCase() === criterioLower);
    if (alumno) return alumno;

    // Buscar por email exacto
    alumno = alumnos.find(a => a.email.toLowerCase() === criterioLower);
    if (alumno) return alumno;

    // Buscar por nombre exacto
    alumno = alumnos.find(a => a.nombre.toLowerCase() === criterioLower);

    return alumno || null;
}

function limpiarBusquedaExpediente() {
    const searchInput = document.getElementById('searchDocumento');
    if (searchInput) {
        searchInput.value = '';
    }
    const selectAlumno = document.getElementById('filterAlumnoDocumentos');
    if (selectAlumno) {
        selectAlumno.value = '';
    }
    mostrarDocumentosRevision();
}

async function mostrarExpedienteAlumno(alumno, filtroEstado = '') {
    const container = document.getElementById('documentosContainer');
    const docsAlumno = await obtenerDocumentosAlumno(alumno.numeroControl);

    // Calcular estadísticas
    const totalReq = docsAlumno.length;
    const aprobados = docsAlumno.filter(d => d.estado === 'aprobado').length;
    const pendientes = docsAlumno.filter(d => d.estado === 'pendiente').length;
    const rechazados = docsAlumno.filter(d => d.estado === 'rechazado').length;
    const porcentaje = Math.round((aprobados / totalReq) * 100);

    container.innerHTML = `
        <div class="expediente-container fade-in">
            <!-- Header del Expediente -->
            <div class="expediente-header-card">
                <div class="expediente-header-layout">
                    <!-- Columna Izquierda: Información del Alumno -->
                    <div class="expediente-header-left">
                        <div class="expediente-user-avatar">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div class="expediente-user-info">
                            <div class="expediente-name-row">
                                <h2>${alumno.nombre}</h2>
                                <span class="badge badge-completo">${porcentaje}% COMPLETADO</span>
                            </div>
                            <div class="expediente-meta">
                                <span><i class="fas fa-id-card"></i> ${alumno.numeroControl}</span>
                                <span><i class="fas fa-envelope"></i> ${alumno.email}</span>
                                <span><i class="fas fa-calendar-alt"></i> Registrado: ${formatearFecha(alumno.fechaRegistro || new Date())}</span>
                            </div>
                            <div class="expediente-header-actions">
                                <button class="btn-secondary" onclick="limpiarBusquedaExpediente()">
                                    <i class="fas fa-arrow-left"></i> Volver a la lista
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Columna Derecha: Progreso y Estadísticas -->
                    <div class="expediente-header-right">
                        <div class="expediente-progress-section">
                            <div class="progress-info-row">
                                <span>Progreso de Documentación</span>
                                <strong>${aprobados} de ${totalReq} aprobados</strong>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${porcentaje}%"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="expediente-stats-grid">
                            <div class="header-stat-item">
                                <span class="header-stat-value" style="color: #10b981;">${aprobados}</span>
                                <span class="header-stat-label">Aprobados</span>
                            </div>
                            <div class="header-stat-item">
                                <span class="header-stat-value" style="color: var(--accent-color);">${pendientes}</span>
                                <span class="header-stat-label">Pendientes</span>
                            </div>
                            <div class="header-stat-item">
                                <span class="header-stat-value" style="color: #ef4444;">${rechazados}</span>
                                <span class="header-stat-label">Rechazados</span>
                            </div>
                            <div class="header-stat-item">
                                <span class="header-stat-value" style="color: #9ca3af;">${totalReq - (aprobados + pendientes + rechazados)}</span>
                                <span class="header-stat-label">Sin subir</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin: 30px 0 20px 0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: white;"><i class="fas fa-folder-open"></i> Documentos del Alumno</h3>
            </div>

            <div class="documentos-grid">
                ${docsAlumno.map(doc => {
        const subido = doc.subido;
        const iconClass = getDocIcon(doc.nombre);

        if (!subido) {
            return `
                            <div class="documento-card doc-not-uploaded fade-in">
                                <div class="documento-card-header">
                                    <div class="doc-icon-circle">
                                        <i class="fas ${iconClass}"></i>
                                    </div>
                                    <div>
                                        <h4 style="color: rgba(255,255,255,0.8);">${doc.nombre}</h4>
                                        <span class="badge badge-pendiente">PENDIENTE DE SUBIR</span>
                                    </div>
                                </div>
                                <div class="doc-empty-state">
                                    <i class="fas fa-file-upload"></i>
                                    <p>El alumno aún no ha cargado este documento</p>
                                </div>
                            </div>
                        `;
        }

        // Documento subido
        const realDoc = doc.documento;
        const config = estadoColors[realDoc.estado || 'pendiente'];
        const urlArchivo = realDoc.contenido || realDoc.urlArchivo;
        const esPDF = realDoc.tipo && realDoc.tipo.includes('pdf');

        return `
                        <div class="expediente-doc-card fade-in" style="border-left: 5px solid ${config.iconColor}">
                            <div class="doc-header" style="background: ${config.bg}; border-bottom-color: ${config.border}">
                                <div class="doc-header-main">
                                    <div class="doc-type-icon" style="color: ${config.iconColor}">
                                        <i class="fas ${iconClass}"></i>
                                    </div>
                                    <div class="doc-title-info">
                                        <h4 style="margin: 0; color: white;">${doc.nombre}</h4>
                                        <p class="doc-filename"><i class="fas fa-file-pdf"></i> ${realDoc.nombreArchivo || 'documento.pdf'}</p>
                                    </div>
                                </div>
                                <div class="doc-status-badge">
                                    <span class="badge" style="background: ${config.bg}; color: ${config.iconColor}; border-color: ${config.border}">
                                        <i class="fas ${config.icon}"></i> ${realDoc.estado.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div class="doc-info-bar">
                                <span><i class="fas fa-calendar-alt"></i> Subido: ${formatearFechaHora(realDoc.fechaCarga)}</span>
                                ${realDoc.fechaRevision ? `<span><i class="fas fa-user-check"></i> Revisado: ${formatearFecha(realDoc.fechaRevision)}</span>` : ''}
                            </div>

                            <div class="doc-preview-area">
                                ${esPDF ? `
                                    <iframe src="${urlArchivo}" class="doc-preview-embed"></iframe>
                                ` : `
                                    <img src="${urlArchivo}" class="doc-preview-img">
                                `}
                            </div>

                            <div class="doc-actions-area">
                                ${realDoc.observaciones ? `
                                    <div class="doc-observations">
                                        <div class="obs-title"><i class="fas fa-exclamation-triangle"></i> Observaciones del Administrador</div>
                                        <div class="obs-text">${realDoc.observaciones}</div>
                                    </div>
                                ` : ''}

                                <div class="doc-buttons-row" id="buttons-${realDoc.id}">
                                    <button class="btn-expediente btn-aprobar" onclick="aprobarDocumento('${realDoc.id}')">
                                        <i class="fas fa-check"></i> Aprobar
                                    </button>
                                    <button class="btn-expediente btn-rechazar" onclick="mostrarSeccionRechazo('${realDoc.id}')">
                                        <i class="fas fa-times"></i> Rechazar
                                    </button>
                                </div>

                                <!-- Sección de Rechazo Inline (Oculta por defecto) -->
                                <div id="rechazo-container-${realDoc.id}" class="rechazo-inline-container" style="display: none;">
                                    <div class="rechazo-title">Retroalimentación / Observaciones:</div>
                                    <textarea id="obs-${realDoc.id}" class="rechazo-textarea" placeholder="Escribe aquí..."></textarea>
                                    <div class="rechazo-actions">
                                        <button class="btn-rechazo-confirm" onclick="confirmarRechazo('${realDoc.id}')">
                                            <i class="fas fa-check"></i> ACEPTAR
                                        </button>
                                        <button class="btn-rechazo-cancel" onclick="cancelarRechazo('${realDoc.id}')">
                                            <i class="fas fa-times"></i> RECHAZAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

