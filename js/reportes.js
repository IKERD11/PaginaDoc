// Sistema de reportes y estadísticas

// Generar reporte general
async function generarReporteGeneral(fechaInicio, fechaFin) {
    const estadisticas = await obtenerEstadisticas();
    const usuarios = await obtenerUsuarios({ rol: 'alumno' });

    // Process usuarios with await for estado
    const usuariosConEstado = await Promise.all(usuarios.map(async (u) => {
        const estado = await obtenerEstadoDocumentacion(u.numeroControl);
        return {
            numeroControl: u.numeroControl,
            nombre: u.nombre,
            email: u.email,
            estado: estado
        };
    }));

    const reporte = {
        tipo: 'general',
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaGeneracion: new Date().toISOString(),
        estadisticas: estadisticas,
        detalles: {
            alumnos: usuariosConEstado
        }
    };

    registrarBitacora('reporte', 'Reporte general generado');

    return reporte;
}

// Generar reporte de documentos
function generarReporteDocumentos(fechaInicio, fechaFin) {
    let documentos = obtenerDocumentos();

    // Filtrar por fechas si se proporcionan
    if (fechaInicio || fechaFin) {
        documentos = documentos.filter(d => {
            const fechaDoc = new Date(d.fecha_carga || d.fechaCarga);
            const inicio = fechaInicio ? new Date(fechaInicio) : new Date('1900-01-01');
            const fin = fechaFin ? new Date(fechaFin) : new Date('2100-12-31');
            return fechaDoc >= inicio && fechaDoc <= fin;
        });
    }

    const porEstado = {
        pendientes: documentos.filter(d => d.estado === 'pendiente').length,
        aprobados: documentos.filter(d => d.estado === 'aprobado').length,
        rechazados: documentos.filter(d => d.estado === 'rechazado').length
    };

    const porTipo = {};
    documentos.forEach(d => {
        if (!porTipo[d.tipoDocumento]) {
            porTipo[d.tipoDocumento] = {
                total: 0,
                aprobados: 0,
                rechazados: 0,
                pendientes: 0
            };
        }
        porTipo[d.tipoDocumento].total++;
        porTipo[d.tipoDocumento][d.estado + 's']++;
    });

    const reporte = {
        tipo: 'documentos',
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaGeneracion: new Date().toISOString(),
        total: documentos.length,
        porEstado: porEstado,
        porTipo: porTipo,
        documentos: documentos
    };

    registrarBitacora('reporte', 'Reporte de documentos generado');

    return reporte;
}

// Generar reporte de citas
function generarReporteCitas(fechaInicio, fechaFin) {
    let citas = obtenerCitas();

    // Filtrar por fechas
    if (fechaInicio || fechaFin) {
        citas = citas.filter(c => {
            const fechaCita = new Date(c.fecha);
            const inicio = fechaInicio ? new Date(fechaInicio) : new Date('1900-01-01');
            const fin = fechaFin ? new Date(fechaFin) : new Date('2100-12-31');
            return fechaCita >= inicio && fechaCita <= fin;
        });
    }

    const porEstado = {
        pendientes: citas.filter(c => c.estado === 'pendiente').length,
        confirmadas: citas.filter(c => c.estado === 'confirmada').length,
        completadas: citas.filter(c => c.estado === 'completada').length,
        canceladas: citas.filter(c => c.estado === 'cancelada').length
    };

    const porAsistencia = {
        asistieron: citas.filter(c => c.asistencia === 'asistio').length,
        noAsistieron: citas.filter(c => c.asistencia === 'no_asistio').length,
        sinRegistrar: citas.filter(c => !c.asistencia).length
    };

    const reporte = {
        tipo: 'citas',
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaGeneracion: new Date().toISOString(),
        total: citas.length,
        porEstado: porEstado,
        porAsistencia: porAsistencia,
        citas: citas
    };

    registrarBitacora('reporte', 'Reporte de citas generado');

    return reporte;
}

// Generar reporte de alumnos
async function generarReporteAlumnos() {
    const alumnos = await obtenerUsuarios({ rol: 'alumno' });

    // Process alumnos with await for estado
    const alumnosConEstado = await Promise.all(alumnos.map(async (alumno) => {
        const estado = await obtenerEstadoDocumentacion(alumno.numeroControl);
        const citas = obtenerCitas({ numeroControl: alumno.numeroControl });

        return {
            ...alumno,
            documentacion: estado,
            citas: citas.length,
            ultimaCita: citas.length > 0 ? citas[citas.length - 1] : null
        };
    }));

    const porEstado = {
        completos: alumnosConEstado.filter(a => a.documentacion.completo).length,
        incompletos: alumnosConEstado.filter(a => !a.documentacion.completo).length,
        sinDocumentos: alumnosConEstado.filter(a => a.documentacion.sinSubir === a.documentacion.total).length
    };

    const reporte = {
        tipo: 'alumnos',
        fechaGeneracion: new Date().toISOString(),
        total: alumnos.length,
        porEstado: porEstado,
        alumnos: alumnosConEstado
    };

    registrarBitacora('reporte', 'Reporte de alumnos generado');

    return reporte;
}

// Exportar reporte a PDF (simulado)
function exportarReportePDF(reporte) {
    // En un sistema real, aquí se usaría una librería como jsPDF
    const contenidoHTML = generarHTMLReporte(reporte);

    // Crear un blob y descargarlo
    const blob = new Blob([contenidoHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${reporte.tipo}_${new Date().getTime()}.html`;
    link.click();

    URL.revokeObjectURL(url);

    mostrarToast('Reporte exportado correctamente', 'success');
    registrarBitacora('reporte', `Reporte ${reporte.tipo} exportado a PDF`);
}

// Exportar reporte a Excel (simulado)
function exportarReporteExcel(reporte) {
    let csv = '';

    switch (reporte.tipo) {
        case 'documentos':
            csv = 'Número de Control,Nombre Alumno,Tipo Documento,Estado,Fecha Carga,Observaciones\n';
            reporte.documentos.forEach(d => {
                const usuario = obtenerUsuarioPorNumeroControl(d.numero_control || d.numeroControl);
                const tipoDoc = d.tipo_documento || d.tipoDocumento;
                const fechaCarga = d.fecha_carga || d.fechaCarga;
                csv += `${d.numero_control || d.numeroControl},${usuario ? usuario.nombre : 'Desconocido'},${tipoDoc},${d.estado},${formatearFechaHora(fechaCarga)},"${d.observaciones}"\n`;
            });
            break;

        case 'citas':
            csv = 'Número de Control,Nombre Alumno,Fecha,Hora,Estado,Confirmada,Asistencia\n';
            reporte.citas.forEach(c => {
                csv += `${c.numeroControl},${c.nombreAlumno},${formatearFecha(c.fecha)},${c.hora},${c.estado},${c.confirmada ? 'Sí' : 'No'},${c.asistencia || 'Sin registro'}\n`;
            });
            break;

        case 'alumnos':
            csv = 'Número de Control,Nombre,Email,Progreso,Documentos Aprobados,Documentos Pendientes,Documentos Rechazados,Estado\n';
            reporte.alumnos.forEach(a => {
                csv += `${a.numeroControl},${a.nombre},${a.email},${a.documentacion.progreso}%,${a.documentacion.aprobados},${a.documentacion.pendientes},${a.documentacion.rechazados},${a.documentacion.completo ? 'Completo' : 'Incompleto'}\n`;
            });
            break;

        default:
            csv = 'Reporte General\n';
    }

    // Descargar CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${reporte.tipo}_${new Date().getTime()}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    mostrarToast('Reporte exportado a Excel correctamente', 'success');
    registrarBitacora('reporte', `Reporte ${reporte.tipo} exportado a Excel`);
}

// Generar HTML del reporte
function generarHTMLReporte(reporte) {
    let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte ${reporte.tipo.toUpperCase()}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #2563eb; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #2563eb; color: white; }
                .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
                .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .stat-value { font-size: 32px; font-weight: bold; color: #2563eb; }
            </style>
        </head>
        <body>
            <h1>Reporte ${reporte.tipo.toUpperCase()}</h1>
            <p><strong>Fecha de generación:</strong> ${formatearFechaHora(reporte.fechaGeneracion)}</p>
    `;

    if (reporte.fechaInicio || reporte.fechaFin) {
        html += `<p><strong>Periodo:</strong> ${formatearFecha(reporte.fechaInicio)} - ${formatearFecha(reporte.fechaFin)}</p>`;
    }

    // Agregar estadísticas según el tipo
    switch (reporte.tipo) {
        case 'documentos':
            html += `
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value">${reporte.total}</div>
                        <div>Total Documentos</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reporte.porEstado.aprobados}</div>
                        <div>Aprobados</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reporte.porEstado.rechazados}</div>
                        <div>Rechazados</div>
                    </div>
                </div>
            `;
            break;

        case 'citas':
            html += `
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value">${reporte.total}</div>
                        <div>Total Citas</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reporte.porEstado.completadas}</div>
                        <div>Completadas</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reporte.porAsistencia.asistieron}</div>
                        <div>Asistieron</div>
                    </div>
                </div>
            `;
            break;

        case 'alumnos':
            html += `
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value">${reporte.total}</div>
                        <div>Total Alumnos</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reporte.porEstado.completos}</div>
                        <div>Documentación Completa</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reporte.porEstado.incompletos}</div>
                        <div>Documentación Incompleta</div>
                    </div>
                </div>
            `;
            break;
    }

    html += `
        </body>
        </html>
    `;

    return html;
}

// Obtener datos para gráficas
function obtenerDatosGraficas() {
    const estadisticas = obtenerEstadisticas();

    return {
        documentacion: [
            { label: 'Completos', value: estadisticas.alumnosCompletos, color: '#10b981' },
            { label: 'Incompletos', value: estadisticas.alumnosIncompletos, color: '#f59e0b' }
        ],
        documentos: [
            { label: 'Aprobados', value: estadisticas.documentosAprobados, color: '#10b981' },
            { label: 'Pendientes', value: estadisticas.documentosPendientes, color: '#f59e0b' },
            { label: 'Rechazados', value: estadisticas.documentosRechazados, color: '#ef4444' }
        ],
        citas: [
            { label: 'Confirmadas', value: estadisticas.citasConfirmadas, color: '#10b981' },
            { label: 'Pendientes', value: estadisticas.citasPendientes, color: '#f59e0b' },
            { label: 'Completadas', value: estadisticas.citasCompletadas, color: '#3b82f6' }
        ]
    };
}

// Generar gráfica simple en HTML/CSS (sin librerías externas)
function generarGraficaBarras(datos, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = datos.reduce((sum, item) => sum + item.value, 0);

    let html = '<div style="width: 100%;">';

    datos.forEach(item => {
        const porcentaje = total > 0 ? (item.value / total * 100) : 0;
        html += `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${item.label}</span>
                    <span><strong>${item.value}</strong></span>
                </div>
                <div style="width: 100%; height: 30px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${porcentaje}%; height: 100%; background-color: ${item.color}; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}
