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
    cargarGraficasChboard();
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

function filtrarDocumentosRevision() {
    mostrarDocumentosRevision();
}

function mostrarDocumentosRevision() {
    const numeroControl = document.getElementById('filterAlumnoDocumentos').value;
    const estado = document.getElementById('filterEstadoDocumento').value;
    const busqueda = document.getElementById('searchDocumento').value.toLowerCase().trim();
    
    let documentos = obtenerDocumentos();
    
    if (numeroControl) {
        documentos = documentos.filter(d => d.numeroControl === numeroControl);
    }
    
    if (estado) {
        documentos = documentos.filter(d => d.estado === estado);
    }
    
    // Filtro de búsqueda por nombre o número de control
    if (busqueda) {
        documentos = documentos.filter(d => {
            const alumno = obtenerUsuarioPorNumeroControl(d.numeroControl);
            const nombre = alumno ? alumno.nombre.toLowerCase() : '';
            const numControl = d.numeroControl.toLowerCase();
            return nombre.includes(busqueda) || numControl.includes(busqueda);
        });
    }
    
    const container = document.getElementById('documentosContainer');
    
    if (documentos.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No hay documentos que mostrar</p></div>';
        return;
    }
    
    container.innerHTML = documentos.map(doc => {
        const alumno = obtenerUsuarioPorNumeroControl(doc.numeroControl);
        return `
            <div class="documento-card">
                <div class="documento-card-header">
                    <div>
                        <h4>${doc.tipoDocumento}</h4>
                        <p style="font-size: 13px; color: rgba(255, 255, 255, 0.75);">${alumno ? alumno.nombre : doc.numeroControl}</p>
                    </div>
                    ${obtenerBadgeEstado(doc.estado)}
                </div>
                <p style="font-size: 13px; color: rgba(255, 255, 255, 0.75); margin: 10px 0;">
                    <i class="fas fa-calendar"></i> ${formatearFechaHora(doc.fechaCarga)}
                </p>
                ${doc.observaciones ? `<p style="font-size: 13px;"><strong>Observaciones:</strong> ${doc.observaciones}</p>` : ''}
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-primary" style="flex: 1; font-size: 12px;" onclick="verVistaPrevia('${doc.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-secondary" style="flex: 1; font-size: 12px;" onclick="descargarDocumento('${doc.id}')">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                    ${doc.estado === 'pendiente' ? `
                        <button class="btn-success" style="flex: 1; font-size: 12px;" onclick="aprobarDocumento('${doc.id}')">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn-danger" style="flex: 1; font-size: 12px;" onclick="rechazarDocumento('${doc.id}')">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function aprobarDocumento(documentoId) {
    confirmar(
        'Aprobar Documento',
        '¿Estás seguro de que deseas aprobar este documento?',
        () => {
            const resultado = revisarDocumento(documentoId, 'aprobado');
            if (resultado.exito) {
                mostrarToast(resultado.mensaje, 'success');
                mostrarDocumentosRevision();
                actualizarEstadisticas();
            } else {
                mostrarToast(resultado.mensaje, 'error');
            }
        }
    );
}

function rechazarDocumento(documentoId) {
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

function ejecutarRechazo(documentoId) {
    const observaciones = document.getElementById('observacionesRechazo').value;
    
    if (!observaciones.trim()) {
        mostrarToast('Las observaciones son obligatorias', 'error');
        return;
    }
    
    const resultado = revisarDocumento(documentoId, 'rechazado', observaciones);
    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        cerrarModal();
        mostrarDocumentosRevision();
        actualizarEstadisticas();
    } else {
        mostrarToast(resultado.mensaje, 'error');
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
    
    container.innerHTML = mensajes.map(m => {
        const remitente = obtenerUsuarioPorNumeroControl(m.de);
        return `
            <div class="mensaje-item ${m.leido ? '' : 'no-leido'}" onclick="verMensajeDetalle('${m.id}')">
                <strong>${remitente ? remitente.nombre : 'Sistema'}</strong>
                <p>${m.asunto}</p>
                <span style="font-size: 12px; color: #9ca3af;">${formatearFechaHora(m.fecha)}</span>
            </div>
        `;
    }).join('');
}

function verMensajeDetalle(mensajeId) {
    const mensaje = obtenerConversacion(mensajeId);
    marcarMensajeLeido(mensajeId);
    
    const remitente = obtenerUsuarioPorNumeroControl(mensaje.de);
    
    const container = document.getElementById('mensajeDetalleContainer');
    container.innerHTML = `
        <div>
            <h3>${mensaje.asunto}</h3>
            <p style="color: #6b7280; margin: 10px 0;">
                De: ${remitente ? remitente.nombre : 'Sistema'} - ${formatearFechaHora(mensaje.fecha)}
            </p>
            <div style="padding: 20px; background: #f3f4f6; border-radius: 8px;">
                ${sanitizarTexto(mensaje.contenido)}
            </div>
            
            ${mensaje.respuestas && mensaje.respuestas.length > 0 ? `
                <h4 style="margin-top: 20px;">Conversación:</h4>
                ${mensaje.respuestas.map(r => `
                    <div style="padding: 15px; margin: 10px 0; background: #e5e7eb; border-radius: 8px;">
                        <strong>${r.nombreDe}</strong>
                        <span style="font-size: 12px; color: #6b7280;"> - ${formatearFechaHora(r.fecha)}</span>
                        <p style="margin-top: 10px;">${sanitizarTexto(r.contenido)}</p>
                    </div>
                `).join('')}
            ` : ''}
            
            <div style="margin-top: 20px;">
                <h4>Responder:</h4>
                <textarea id="respuestaMensaje" style="width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; min-height: 100px;"></textarea>
                <button class="btn-primary" style="margin-top: 10px;" onclick="enviarRespuestaMensaje('${mensajeId}')">
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
        <div style="padding: 15px; background: #f3f4f6; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${doc.nombre}</strong>
                <p style="font-size: 13px; color: #6b7280;">${doc.descripcion}</p>
                ${doc.obligatorio ? '<span class="badge badge-aprobado">Obligatorio</span>' : ''}
            </div>
            <button class="btn-danger" style="font-size: 12px;" onclick="eliminarDocumentoRequerido('${doc.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function mostrarModalAgregarDocumento() {
    const contenido = `
        <form id="formNuevoDocRequerido">
            <div class="form-group">
                <label>ID del Documento *</label>
                <input type="text" id="docReqId" required placeholder="ej: acta_nacimiento">
            </div>
            <div class="form-group">
                <label>Nombre *</label>
                <input type="text" id="docReqNombre" required>
            </div>
            <div class="form-group">
                <label>Descripción *</label>
                <textarea id="docReqDescripcion" required></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="docReqObligatorio" checked> Obligatorio
                </label>
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
        <div style="padding: 15px; background: #f3f4f6; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${u.nombre}</strong>
                <p style="font-size: 13px; color: #6b7280;">${u.numeroControl} - ${u.email}</p>
                <span class="badge ${u.rol === 'admin' ? 'badge-aprobado' : 'badge-pendiente'}">${u.rol}</span>
            </div>
            ${u.rol !== 'admin' ? `
                <button class="btn-danger" style="font-size: 12px;" onclick="eliminarUsuarioConfig('${u.numeroControl}')">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
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
