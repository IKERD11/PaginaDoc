// Script principal del panel del alumno

let alumnoInitialized = false; // Evitar inicialización múltiple

document.addEventListener('DOMContentLoaded', async () => {
    // Evitar inicialización multiple
    if (alumnoInitialized) return;
    alumnoInitialized = true;

    // Verificar autenticación y rol
    const usuario = verificarAutenticacion();
    if (!usuario || usuario.rol !== 'alumno') {
        console.log('❌ Acceso denegado: usuario no es alumno');
        await cerrarSesionFirebase();
        return;
    }

    const usuarioActual = obtenerUsuarioActual();
    document.getElementById('alumnoName').textContent = usuarioActual.nombre;

    // Inicializar componentes
    inicializarNavegacionAlumno();
    inicializarEventosAlumno();
    inicializarNotificaciones();
    await cargarDashboardAlumno();

    // Actualizar periódicamente
    setInterval(async () => {
        await actualizarBadgeNotificaciones();
        await actualizarBadgeMensajesAlumno();
    }, 30000); // Cada 30 segundos
});

// Inicializar navegación
function inicializarNavegacionAlumno() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const seccion = item.getAttribute('data-section');
            navegarASeccionAlumno(seccion);
        });
    });
}

// Navegar entre secciones
async function navegarASeccionAlumno(seccion) {
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
            await cargarDashboardAlumno();
            break;
        case 'documentos':
            await cargarDocumentosAlumno();
            break;
        case 'cita':
            await cargarMiCita();
            break;
        case 'mensajes':
            await cargarMensajesAlumno();
            break;
        case 'ayuda':
            cargarAyuda();
            break;
    }
}

// Inicializar eventos
function inicializarEventosAlumno() {
    // Botón de cerrar sesión
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await cerrarSesionFirebase();
    });

    // Botón de nuevo mensaje
    const btnNuevoMensaje = document.getElementById('btnNuevoMensaje');
    if (btnNuevoMensaje) {
        btnNuevoMensaje.addEventListener('click', mostrarModalNuevoMensajeAlumno);
    }

    // FAQ - preguntas frecuentes
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            faqItem.classList.toggle('active');
        });
    });
}

// ===== DASHBOARD =====
async function cargarDashboardAlumno() {
    const usuarioActual = obtenerUsuarioActual();
    const estadoDoc = await obtenerEstadoDocumentacion(usuarioActual.numeroControl);

    // Actualizar barra de progreso
    document.getElementById('progressFill').style.width = estadoDoc.progreso + '%';
    document.getElementById('progressText').textContent = estadoDoc.progreso + '%';

    // Mensaje de progreso
    const progressMessage = document.getElementById('progressMessage');
    if (estadoDoc.completo) {
        progressMessage.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> ¡Felicidades! Tu documentación está completa.';
    } else if (estadoDoc.progreso > 50) {
        progressMessage.innerHTML = `<i class="fas fa-info-circle" style="color: #3b82f6;"></i> Vas por buen camino. Te faltan ${estadoDoc.total - estadoDoc.aprobados} documentos.`;
    } else {
        progressMessage.innerHTML = `<i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i> Comienza subiendo tus documentos.`;
    }

    // Actualizar estadísticas
    document.getElementById('totalDocumentos').textContent = estadoDoc.total;
    document.getElementById('documentosAprobados').textContent = estadoDoc.aprobados;
    document.getElementById('documentosPendientes').textContent = estadoDoc.pendientes;
    document.getElementById('documentosRechazados').textContent = estadoDoc.rechazados;

    // Cargar alertas
    cargarAlertas();

    // Cargar cita
    cargarCitaDashboard();
}

function cargarAlertas() {
    const usuarioActual = obtenerUsuarioActual();
    const container = document.getElementById('alertasContainer');
    const alertas = [];

    // Verificar documentos rechazados
    const documentos = obtenerDocumentos({
        numeroControl: usuarioActual.numeroControl,
        estado: 'rechazado'
    });

    if (documentos.length > 0) {
        alertas.push({
            tipo: 'danger',
            titulo: 'Documentos Rechazados',
            mensaje: `Tienes ${documentos.length} documento(s) rechazado(s). Revisa las observaciones y vuelve a subirlos.`,
            accion: 'navegarASeccionAlumno("documentos")',
            textoAccion: 'Ver Documentos'
        });
    }

    // Verificar si tiene documentos pendientes por subir
    const estadoDoc = obtenerEstadoDocumentacion(usuarioActual.numeroControl);
    if (estadoDoc.sinSubir > 0) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Documentos Pendientes',
            mensaje: `Te faltan ${estadoDoc.sinSubir} documento(s) por subir.`,
            accion: 'navegarASeccionAlumno("documentos")',
            textoAccion: 'Subir Documentos'
        });
    }

    // Verificar cita próxima
    const citas = obtenerCitas({
        numeroControl: usuarioActual.numeroControl,
        estado: 'pendiente'
    });

    if (citas.length > 0 && !citas[0].confirmada) {
        alertas.push({
            tipo: 'info',
            titulo: 'Confirma tu Cita',
            mensaje: 'Tienes una cita pendiente de confirmación.',
            accion: 'navegarASeccionAlumno("cita")',
            textoAccion: 'Ver Cita'
        });
    }

    // Verificar periodo activo
    if (!validarPeriodoActivo()) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Periodo No Activo',
            mensaje: 'El periodo de recepción de documentos no está activo actualmente.',
            accion: null,
            textoAccion: null
        });
    }

    if (alertas.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = alertas.map(alerta => `
        <div class="alert alert-${alerta.tipo}">
            <div style="flex: 1;">
                <strong>${alerta.titulo}</strong>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${alerta.mensaje}</p>
            </div>
            ${alerta.accion ? `
                <button class="btn-primary" style="margin-left: 15px;" onclick="${alerta.accion}">
                    ${alerta.textoAccion}
                </button>
            ` : ''}
        </div>
    `).join('');
}

function cargarCitaDashboard() {
    const usuarioActual = obtenerUsuarioActual();
    const citas = obtenerCitas({ numeroControl: usuarioActual.numeroControl })
        .filter(c => c.estado !== 'cancelada' && c.estado !== 'completada')
        .sort((a, b) => new Date(a.fecha + ' ' + a.hora) - new Date(b.fecha + ' ' + b.hora));

    const citaInfo = document.getElementById('citaInfo');

    if (citas.length === 0) {
        const estadoDoc = obtenerEstadoDocumentacion(usuarioActual.numeroControl);

        if (estadoDoc.completo) {
            citaInfo.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <p>Tu documentación está completa. Pronto recibirás tu cita presencial.</p>
                </div>
            `;
        } else {
            citaInfo.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Completa tu documentación para recibir una cita presencial</p>
                </div>
            `;
        }
        return;
    }

    const cita = citas[0];
    citaInfo.innerHTML = `
        <div class="cita-info-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <div>
                    <h4 style="margin-bottom: 10px;">
                        <i class="fas fa-calendar-alt"></i>
                        ${formatearFecha(cita.fecha)}
                    </h4>
                    <p style="font-size: 24px; font-weight: 600; color: #2563eb;">
                        <i class="fas fa-clock"></i>
                        ${cita.hora}
                    </p>
                </div>
                ${obtenerBadgeEstado(cita.estado)}
            </div>
            
            ${cita.confirmada ? `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    Has confirmado tu asistencia
                </div>
            ` : `
                <button class="btn-success" style="width: 100%;" onclick="confirmarAsistenciaDashboard('${cita.id}')">
                    <i class="fas fa-check"></i>
                    Confirmar Asistencia
                </button>
            `}
            
            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <h5 style="margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Información Importante:</h5>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Llega 10 minutos antes</li>
                    <li>Trae tus documentos originales</li>
                    <li>Trae identificación oficial</li>
                </ul>
            </div>
        </div>
    `;
}

function confirmarAsistenciaDashboard(citaId) {
    const resultado = confirmarAsistencia(citaId);

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        cargarCitaDashboard();
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

// ===== DOCUMENTOS =====
async function cargarDocumentosAlumno() {
    const usuarioActual = obtenerUsuarioActual();
    const documentos = await obtenerDocumentosAlumno(usuarioActual.numeroControl);
    const container = document.getElementById('documentosContainer');

    container.innerHTML = documentos.map(doc => {
        const estado = doc.estado || 'sin_subir';
        let estadoHTML = '';
        let accionesHTML = '';

        switch (estado) {
            case 'sin_subir':
                estadoHTML = '<span class="badge badge-pendiente"><i class="fas fa-upload"></i> Sin subir</span>';
                accionesHTML = `
                    <div class="upload-area" onclick="abrirSelectorArchivo('${doc.id}')">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Haz clic para subir tu documento</p>
                        <small>Solo archivos PDF (máximo 5MB)</small>
                    </div>
                    <input type="file" id="file-${doc.id}" style="display: none;" accept="application/pdf" onchange="manejarSeleccionArchivo('${doc.id}', this.files[0])">
                `;
                break;

            case 'pendiente':
                estadoHTML = '<span class="badge badge-pendiente"><i class="fas fa-clock"></i> En revisión</span>';
                accionesHTML = `
                    <div style="padding: 20px; text-align: center; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px; backdrop-filter: blur(4px);">
                        <i class="fas fa-hourglass-half" style="font-size: 40px; color: #f59e0b;"></i>
                        <p style="margin-top: 10px; color: rgba(255, 255, 255, 0.9);">Tu documento está siendo revisado</p>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn-secondary" style="flex: 1;" onclick="verVistaPrevia('${doc.documento.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-secondary" style="flex: 1;" onclick="descargarDocumento('${doc.documento.id}')">
                                <i class="fas fa-download"></i> Descargar
                            </button>
                        </div>
                    </div>
                `;
                break;

            case 'aprobado':
                estadoHTML = '<span class="badge badge-aprobado"><i class="fas fa-check-circle"></i> Aprobado</span>';
                accionesHTML = `
                    <div style="padding: 20px; text-align: center; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; backdrop-filter: blur(4px);">
                        <i class="fas fa-check-circle" style="font-size: 40px; color: #10b981;"></i>
                        <p style="margin-top: 10px; color: rgba(255, 255, 255, 0.9);"><strong>¡Documento aprobado!</strong></p>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn-secondary" style="flex: 1;" onclick="verVistaPrevia('${doc.documento.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-secondary" style="flex: 1;" onclick="descargarDocumento('${doc.documento.id}')">
                                <i class="fas fa-download"></i> Descargar
                            </button>
                        </div>
                    </div>
                `;
                break;

            case 'rechazado':
                estadoHTML = '<span class="badge badge-rechazado"><i class="fas fa-times-circle"></i> Rechazado</span>';
                accionesHTML = `
                    <div style="padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; backdrop-filter: blur(4px);">
                        <i class="fas fa-times-circle" style="font-size: 40px; color: #ef4444; text-align: center; display: block;"></i>
                        <p style="margin-top: 10px; color: rgba(255, 255, 255, 0.9); text-align: center;"><strong>Documento rechazado</strong></p>
                        <div class="alert alert-danger" style="margin: 15px 0; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: white; padding: 12px; border-radius: 8px;">
                            <strong style="color: #fecaca;"><i class="fas fa-exclamation-circle"></i> Observaciones:</strong>
                            <p style="margin-top: 5px; opacity: 0.9;">${doc.documento.observaciones}</p>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn-secondary" style="flex: 1;" onclick="verVistaPrevia('${doc.documento.id}')">
                                <i class="fas fa-eye"></i> Ver lo que subí
                            </button>
                            <button class="btn-primary" style="flex: 1;" onclick="abrirSelectorArchivo('${doc.id}')">
                                <i class="fas fa-upload"></i> Corregir
                            </button>
                        </div>
                        <input type="file" id="file-${doc.id}" style="display: none;" accept="application/pdf" onchange="manejarSeleccionArchivo('${doc.id}', this.files[0])">
                    </div>
                `;
                break;
        }

        return `
            <div class="documento-card ${estado === 'rechazado' ? 'rechazado-highlight' : ''}">
                <div class="documento-card-header">
                    <div>
                        <h4>${doc.nombre}</h4>
                        <p style="font-size: 13px; color: #6b7280;">${doc.descripcion}</p>
                        ${doc.obligatorio ? '<span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; border-color: rgba(59, 130, 246, 0.3); margin-top: 5px;">Obligatorio</span>' : ''}
                    </div>
                    ${estadoHTML}
                </div>
                <div style="margin-top: 15px;">
                    ${accionesHTML}
                </div>
            </div>
        `;
    }).join('');

    // Filtros de documentos
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            filtrarDocumentosAlumno(filter);
        });
    });
}

// Helpers para carga de archivos
function abrirSelectorArchivo(docId) {
    const input = document.getElementById(`file-${docId}`);
    if (input) {
        input.click();
    }
}

async function manejarSeleccionArchivo(docId, archivo) {
    if (!archivo) return;

    // Validar archivo antes de subir
    const errores = validarArchivo(archivo);
    if (errores.length > 0) {
        mostrarToast(errores.join(', '), 'error');
        return;
    }

    await subirDocumentoAlumno(docId, archivo);
}

async function subirDocumentoAlumno(tipoDocumento, archivo) {
    if (!archivo) {
        mostrarToast('No se seleccionó ningún archivo', 'error');
        return;
    }

    // Verificar periodo activo
    if (!validarPeriodoActivo()) {
        mostrarToast('El periodo de recepción de documentos no está activo', 'warning');
        return;
    }

    const usuarioActual = obtenerUsuarioActual();

    // Mostrar indicador de carga
    mostrarToast('Subiendo documento...', 'info');

    const resultado = await subirDocumento(archivo, tipoDocumento, usuarioActual.numeroControl);

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        await cargarDocumentosAlumno();
        await cargarDashboardAlumno(); // Actualizar dashboard
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

function filtrarDocumentosAlumno(filtro) {
    const cards = document.querySelectorAll('.documento-card');

    cards.forEach(card => {
        const badge = card.querySelector('.badge');
        const estado = badge ? badge.textContent.toLowerCase() : '';

        if (filtro === 'todos') {
            card.style.display = 'block';
        } else if (filtro === 'pendiente' && (estado.includes('revisión') || estado.includes('sin subir'))) {
            card.style.display = 'block';
        } else if (filtro === 'aprobado' && estado.includes('aprobado')) {
            card.style.display = 'block';
        } else if (filtro === 'rechazado' && estado.includes('rechazado')) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== MI CITA =====
function cargarMiCita() {
    const usuarioActual = obtenerUsuarioActual();
    const citas = obtenerCitas({ numeroControl: usuarioActual.numeroControl })
        .sort((a, b) => new Date(b.fecha + ' ' + b.hora) - new Date(a.fecha + ' ' + a.hora));

    const container = document.getElementById('citaDetalleContainer');

    if (citas.length === 0) {
        const estadoDoc = obtenerEstadoDocumentacion(usuarioActual.numeroControl);

        if (estadoDoc.completo) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>Tu documentación está completa</p>
                    <p style="margin-top: 10px;">Pronto el área administrativa te asignará una cita presencial.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No tienes citas programadas</p>
                    <p style="margin-top: 10px;">Completa tu documentación para recibir una cita.</p>
                    <button class="btn-primary" style="margin-top: 20px;" onclick="navegarASeccionAlumno('documentos')">
                        <i class="fas fa-upload"></i> Ir a Documentos
                    </button>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = citas.map(cita => {
        const esFutura = new Date(cita.fecha) >= new Date();
        const esActiva = cita.estado !== 'cancelada' && cita.estado !== 'completada';

        return `
            <div class="cita-card" style="background: white; padding: 25px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${esActiva ? '#2563eb' : '#9ca3af'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <div>
                        <h3 style="margin-bottom: 10px; color: #111827;">
                            <i class="fas fa-calendar-alt"></i>
                            ${formatearFecha(cita.fecha)}
                        </h3>
                        <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin-bottom: 10px;">
                            <i class="fas fa-clock"></i>
                            ${cita.hora}
                        </p>
                    </div>
                    ${obtenerBadgeEstado(cita.estado)}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div style="padding: 15px; background: #f3f4f6; border-radius: 8px;">
                        <p style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Estado</p>
                        <p style="font-weight: 600;">${cita.estado === 'pendiente' ? 'Pendiente' : cita.estado === 'confirmada' ? 'Confirmada' : cita.estado === 'completada' ? 'Completada' : 'Cancelada'}</p>
                    </div>
                    <div style="padding: 15px; background: #f3f4f6; border-radius: 8px;">
                        <p style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Confirmación</p>
                        <p style="font-weight: 600; color: ${cita.confirmada ? '#10b981' : '#f59e0b'};">
                            ${cita.confirmada ? '✓ Confirmada' : 'Pendiente'}
                        </p>
                    </div>
                </div>
                
                ${esActiva && !cita.confirmada ? `
                    <div class="alert alert-warning" style="margin: 20px 0;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>¡Importante!</strong> Confirma tu asistencia lo antes posible.
                    </div>
                    <button class="btn-success" style="width: 100%; padding: 12px;" onclick="confirmarAsistenciaModal('${cita.id}')">
                        <i class="fas fa-check"></i>
                        Confirmar Asistencia
                    </button>
                ` : cita.confirmada ? `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        Has confirmado tu asistencia correctamente
                    </div>
                ` : ''}
                
                ${cita.observaciones ? `
                    <div class="alert alert-info" style="margin-top: 15px;">
                        <strong>Observaciones:</strong>
                        <p style="margin-top: 5px;">${cita.observaciones}</p>
                    </div>
                ` : ''}
                
                ${cita.estado === 'completada' && cita.asistencia === 'asistio' ? `
                    <div class="alert alert-success">
                        <i class="fas fa-user-check"></i>
                        <strong>Asistencia registrada</strong> - Proceso completado
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function confirmarAsistenciaModal(citaId) {
    confirmar(
        'Confirmar Asistencia',
        '¿Confirmas que asistirás a la cita en la fecha y hora programada?',
        () => {
            const resultado = confirmarAsistencia(citaId);

            if (resultado.exito) {
                mostrarToast(resultado.mensaje, 'success');
                cargarMiCita();
                cargarDashboardAlumno();
            } else {
                mostrarToast(resultado.mensaje, 'error');
            }
        }
    );
}

// ===== MENSAJES =====
function cargarMensajesAlumno() {
    const usuarioActual = obtenerUsuarioActual();
    const mensajes = obtenerMensajes({ numeroControl: usuarioActual.numeroControl });
    const container = document.getElementById('mensajesListContainer');

    if (mensajes.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open"></i><p>No tienes mensajes</p></div>';
        return;
    }

    // Guardar el ID del mensaje seleccionado actualmente si existe
    const activeId = window.selectedMessageId;

    container.innerHTML = mensajes.map(m => {
        const remitente = m.de === 'ADMIN' || m.de === 'SISTEMA' ? m.de : obtenerUsuarioPorNumeroControl(m.de)?.nombre || 'Desconocido';
        const isActive = m.id === activeId ? 'active' : '';

        return `
            <div class="mensaje-item ${m.leido ? '' : 'no-leido'} ${isActive}" onclick="verMensajeDetalleAlumno('${m.id}')" data-id="${m.id}">
                <h4>${remitente}</h4>
                <div class="asunto">${m.asunto}</div>
                <div class="meta">
                    <span>${formatearFechaHora(m.fecha)}</span>
                    <span class="badge badge-pendiente">${m.categoria}</span>
                </div>
            </div>
        `;
    }).join('');

    actualizarBadgeMensajesAlumno();
}

function verMensajeDetalleAlumno(mensajeId) {
    const mensaje = obtenerConversacion(mensajeId);
    marcarMensajeLeido(mensajeId);
    window.selectedMessageId = mensajeId;

    // Actualizar clase activa en la lista
    document.querySelectorAll('.mensaje-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-id') === mensajeId) {
            item.classList.add('active');
            item.classList.remove('no-leido');
        }
    });

    const remitente = mensaje.de === 'ADMIN' || mensaje.de === 'SISTEMA' ? mensaje.de : obtenerUsuarioPorNumeroControl(mensaje.de)?.nombre || 'Desconocido';
    const usuarioActual = obtenerUsuarioActual();

    const container = document.getElementById('mensajeDetalleContainer');
    container.innerHTML = `
        <div class="mensaje-detalle-header">
            <div class="flex-between">
                <div>
                    <h3>${mensaje.asunto}</h3>
                    <p class="text-secondary mt-10">
                        <strong>De:</strong> ${remitente} | ${formatearFechaHora(mensaje.fecha)}
                    </p>
                </div>
                <span class="badge badge-pendiente">${mensaje.categoria}</span>
            </div>
        </div>
        
        <div class="chat-thread">
            <!-- Mensaje Original -->
            <div class="msg-bubble received">
                <div class="msg-meta">${remitente}</div>
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
            <textarea id="respuestaMensajeAlumno" class="reply-textarea" placeholder="Escribe tu respuesta aquí..."></textarea>
            <div class="mt-20 flex-right">
                <button class="btn-primary" onclick="enviarRespuestaMensajeAlumno('${mensajeId}')">
                    <i class="fas fa-paper-plane"></i> Enviar Respuesta
                </button>
            </div>
        </div>
    `;

    actualizarBadgeMensajesAlumno();
}

function enviarRespuestaMensajeAlumno(mensajeId) {
    const contenido = document.getElementById('respuestaMensajeAlumno').value;

    if (!contenido.trim()) {
        mostrarToast('Escribe un mensaje', 'error');
        return;
    }

    const resultado = responderMensaje(mensajeId, contenido);

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        verMensajeDetalleAlumno(mensajeId);
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

function mostrarModalNuevoMensajeAlumno() {
    const contenido = `
        <form id="formNuevoMensajeAlumno">
            <div class="form-group">
                <label>Para:</label>
                <input type="text" value="Área Administrativa" disabled style="background: #f3f4f6;">
            </div>
            <div class="form-group">
                <label>Asunto *</label>
                <input type="text" id="mensajeAsuntoAlumno" required placeholder="Escribe el asunto del mensaje...">
            </div>
            <div class="form-group">
                <label>Mensaje *</label>
                <textarea id="mensajeContenidoAlumno" required style="min-height: 150px;" placeholder="Escribe tu mensaje..."></textarea>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="mensajeCategoriaAlumno">
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
            onclick: 'enviarNuevoMensajeAlumnoForm()'
        }
    ]);
}

function enviarNuevoMensajeAlumnoForm() {
    const asunto = document.getElementById('mensajeAsuntoAlumno').value;
    const contenido = document.getElementById('mensajeContenidoAlumno').value;
    const categoria = document.getElementById('mensajeCategoriaAlumno').value;

    const usuarioActual = obtenerUsuarioActual();
    const resultado = crearMensaje(usuarioActual.numeroControl, 'ADMIN', asunto, contenido, categoria);

    if (resultado.exito) {
        mostrarToast(resultado.mensaje, 'success');
        cerrarModal();
        cargarMensajesAlumno();
    } else {
        mostrarToast(resultado.mensaje, 'error');
    }
}

function actualizarBadgeMensajesAlumno() {
    const usuarioActual = obtenerUsuarioActual();
    const count = contarMensajesNoLeidos(usuarioActual.numeroControl);
    const badge = document.getElementById('mensajesBadge');

    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// ===== AYUDA =====
function cargarAyuda() {
    // Ya está definido en el HTML, solo agregar interactividad adicional si es necesario
    console.log('Sección de ayuda cargada');
}

// Estilos adicionales
const alumnoStyles = document.createElement('style');
alumnoStyles.textContent = `
    .rechazado-highlight {
        border: 2px solid #ef4444;
        box-shadow: 0 4px 6px rgba(239, 68, 68, 0.1);
    }
    
    .cita-info-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    }
    
    .cita-info-card h4 {
        color: white;
    }
    
    .document-upload-progress {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
        z-index: 10000;
    }
`;
document.head.appendChild(alumnoStyles);
