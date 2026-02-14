// Sistema de gestión de citas - Versión Firebase

// Crear nueva cita
async function crearCita(numeroControl, fecha, hora) {
    try {
        // Validar que el alumno tenga documentación completa
        const documentacionCompleta = await validarDocumentacionCompleta(numeroControl);
        if (!documentacionCompleta) {
            return {
                exito: false,
                mensaje: 'El alumno debe tener su documentación completa y aprobada para agendar una cita'
            };
        }
        
        // Validar que no tenga ya una cita activa
        const citasActivas = await obtenerCitas({ 
            numeroControl,
            estado: 'confirmada'
        });
        
        if (citasActivas.length > 0) {
            return {
                exito: false,
                mensaje: 'El alumno ya tiene una cita agendada'
            };
        }
        
        // Validar disponibilidad
        const disponible = await verificarDisponibilidad(fecha, hora);
        if (!disponible.disponible) {
            return {
                exito: false,
                mensaje: disponible.mensaje
            };
        }
        
        // Obtener datos del usuario
        const usuariosRef = db.collection('usuarios').where('numeroControl', '==', numeroControl).limit(1);
        const usuarioSnap = await usuariosRef.get();
        
        if (usuarioSnap.empty) {
            return {
                exito: false,
                mensaje: 'Usuario no encontrado'
            };
        }
        
        const usuarioData = usuarioSnap.docs[0].data();
        const usuarioActual = obtenerUsuarioActual();
        
        const cita = {
            numeroControl: numeroControl,
            nombreAlumno: usuarioData.nombre,
            fecha: fecha,
            hora: hora,
            estado: 'confirmada',
            confirmada: true,
            creadoPor: usuarioActual.email,
            observaciones: '',
            asistencia: null
        };
        
        const resultado = await guardarCita(cita);
        
        if (resultado.exito) {
            // Registrar en bitácora
            await registrarBitacora('cita', `Cita agendada para ${usuarioData.nombre} el ${formatearFecha(fecha)} a las ${hora}`);
            
            // Crear mensaje para el alumno
            await guardarMensaje({
                remitente: 'admin',
                destinatario: numeroControl,
                asunto: 'Cita Agendada',
                mensaje: `Tu cita presencial ha sido agendada para el ${formatearFecha(fecha)} a las ${hora}. Por favor, lleva tus documentos originales.`,
                tipo: 'sistema',
                relacionadoId: resultado.id
            });
            
            mostrarToast('Cita agendada correctamente', 'success');
        }
        
        return resultado;
    } catch (error) {
        console.error('Error al crear cita:', error);
        return {
            exito: false,
            mensaje: 'Error al agendar la cita: ' + error.message
        };
    }
}

// Verificar disponibilidad de horario
async function verificarDisponibilidad(fecha, hora) {
    try {
        const maxCitasPorDia = CONFIG.MAX_CITAS_POR_DIA || 10;
        
        // Verificar que la fecha no sea pasada
        const fechaCita = new Date(fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaCita < hoy) {
            return {
                disponible: false,
                mensaje: 'No se pueden agendar citas en fechas pasadas'
            };
        }
        
        // Verificar que no sea fin de semana
        const diaSemana = fechaCita.getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            return {
                disponible: false,
                mensaje: 'No se pueden agendar citas en fines de semana'
            };
        }
        
        // Obtener citas del día
        const citasDelDia = await obtenerCitas({ fecha });
        
        // Verificar límite de citas por día
        if (citasDelDia.length >= maxCitasPorDia) {
            return {
                disponible: false,
                mensaje: 'Se ha alcanzado el límite de citas para este día'
            };
        }
        
        // Verificar que no haya otra cita a la misma hora
        const citaMismaHora = citasDelDia.find(c => c.hora === hora && c.estado !== 'cancelada');
        if (citaMismaHora) {
            return {
                disponible: false,
                mensaje: 'Ya existe una cita agendada a esta hora'
            };
        }
        
        // Verificar horario laboral
        const horarioInicio = CONFIG.HORARIO_INICIO || '09:00';
        const horarioFin = CONFIG.HORARIO_FIN || '16:00';
        
        if (hora < horarioInicio || hora >= horarioFin) {
            return {
                disponible: false,
                mensaje: `El horario de atención es de ${horarioInicio} a ${horarioFin}`
            };
        }
        
        return {
            disponible: true,
            mensaje: 'Horario disponible'
        };
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        return {
            disponible: false,
            mensaje: 'Error al verificar disponibilidad'
        };
    }
}

// Confirmar asistencia a cita
async function confirmarAsistencia(citaId) {
    try {
        const cita = await obtenerDocumentoPorId(citaId);
        
        if (!cita) {
            return {
                exito: false,
                mensaje: 'Cita no encontrada'
            };
        }
        
        const resultado = await actualizarCita(citaId, {
            confirmada: true,
            estado: 'confirmada',
            fechaConfirmacion: new Date().toISOString()
        });
        
        if (resultado.exito) {
            await registrarBitacora('cita', `Asistencia confirmada para la cita del ${formatearFecha(cita.fecha)}`);
        }
        
        return resultado;
    } catch (error) {
        console.error('Error al confirmar asistencia:', error);
        return {
            exito: false,
            mensaje: 'Error al confirmar asistencia: ' + error.message
        };
    }
}

// Reprogramar cita
async function reprogramarCita(citaId, nuevaFecha, nuevaHora, motivo = '') {
    try {
        const cita = await obtenerDocumentoPorId(citaId);
        
        if (!cita) {
            return {
                exito: false,
                mensaje: 'Cita no encontrada'
            };
        }
        
        // Verificar disponibilidad del nuevo horario
        const disponible = await verificarDisponibilidad(nuevaFecha, nuevaHora);
        if (!disponible.disponible) {
            return {
                exito: false,
                mensaje: disponible.mensaje
            };
        }
        
        // Actualizar cita
        const resultado = await actualizarCita(citaId, {
            fecha: nuevaFecha,
            hora: nuevaHora,
            observaciones: motivo ? `Reprogramado: ${motivo}` : '',
            estadoAnterior: cita.estado
        });
        
        if (resultado.exito) {
            await registrarBitacora('cita', `Cita reprogramada para el ${formatearFecha(nuevaFecha)} a las ${nuevaHora}`);
        }
        
        return resultado;
    } catch (error) {
        console.error('Error al reprogramar cita:', error);
        return {
            exito: false,
            mensaje: 'Error al reprogramar la cita: ' + error.message
        };
    }
}

// Cancelar cita
function cancelarCitaCompleta(citaId, motivo = '') {
    const cita = obtenerCitas().find(c => c.id === citaId);
    
    if (!cita) {
        return {
            exito: false,
            mensaje: 'Cita no encontrada'
        };
    }
    
    actualizarCita(citaId, {
        estado: 'cancelada',
        fechaCancelacion: new Date().toISOString(),
        motivoCancelacion: motivo
    });
    
    registrarBitacora('cita', `Cita cancelada del ${formatearFecha(cita.fecha)} a las ${cita.hora}. Motivo: ${motivo}`);
    
    const usuarioActual = obtenerUsuarioActual();
    
    // Notificar según quien cancela
    if (usuarioActual.rol === 'admin') {
        crearNotificacion({
            numeroControl: cita.numeroControl,
            tipo: 'cita',
            titulo: 'Cita Cancelada',
            mensaje: `Tu cita del ${formatearFecha(cita.fecha)} a las ${cita.hora} ha sido cancelada. ${motivo ? 'Motivo: ' + motivo : ''}`,
            relacionadoId: citaId
        });
        
        enviarCorreo(cita.numeroControl,
            'Cita Cancelada',
            `Tu cita del ${formatearFecha(cita.fecha)} a las ${cita.hora} ha sido cancelada. ${motivo ? 'Motivo: ' + motivo : ''}`
        );
    } else {
        crearNotificacion({
            numeroControl: 'ADMIN',
            tipo: 'cita',
            titulo: 'Cita Cancelada por Alumno',
            mensaje: `${cita.nombreAlumno} ha cancelado su cita del ${formatearFecha(cita.fecha)} a las ${cita.hora}. ${motivo ? 'Motivo: ' + motivo : ''}`,
            relacionadoId: citaId
        });
    }
    
    return {
        exito: true,
        mensaje: 'Cita cancelada correctamente'
    };
}

// Registrar asistencia
function registrarAsistencia(citaId, asistio, observaciones = '') {
    const cita = obtenerCitas().find(c => c.id === citaId);
    
    if (!cita) {
        return {
            exito: false,
            mensaje: 'Cita no encontrada'
        };
    }
    
    actualizarCita(citaId, {
        estado: 'completada',
        asistencia: asistio ? 'asistio' : 'no_asistio',
        fechaCompletion: new Date().toISOString(),
        observacionesAsistencia: observaciones
    });
    
    registrarBitacora('cita', `Asistencia registrada: ${cita.nombreAlumno} - ${asistio ? 'Asistió' : 'No asistió'}`);
    
    // Notificar al alumno
    if (asistio) {
        crearNotificacion({
            numeroControl: cita.numeroControl,
            tipo: 'cita',
            titulo: 'Asistencia Registrada',
            mensaje: `Tu asistencia a la cita del ${formatearFecha(cita.fecha)} ha sido registrada correctamente. ${observaciones}`,
            relacionadoId: citaId
        });
    }
    
    return {
        exito: true,
        mensaje: 'Asistencia registrada correctamente'
    };
}

// Obtener citas de la semana
function obtenerCitasSemana(fechaInicio) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaInicio);
    fin.setDate(fin.getDate() + 7);
    
    const todasLasCitas = obtenerCitas();
    
    return todasLasCitas.filter(cita => {
        const fechaCita = new Date(cita.fecha);
        return fechaCita >= inicio && fechaCita < fin;
    });
}

// Obtener horarios disponibles para un día
function obtenerHorariosDisponibles(fecha) {
    const configuracion = JSON.parse(localStorage.getItem('configuracion')) || {};
    const horarioInicio = configuracion.horarioInicio || CONFIG.HORARIO_INICIO;
    const horarioFin = configuracion.horarioFin || CONFIG.HORARIO_FIN;
    const duracionCita = configuracion.duracionCita || CONFIG.DURACION_CITA;
    
    const horarios = [];
    let horaActual = horarioInicio;
    const citasDelDia = obtenerCitas({ fecha });
    
    while (horaActual < horarioFin) {
        const disponible = !citasDelDia.find(c => c.hora === horaActual && c.estado !== 'cancelada');
        
        horarios.push({
            hora: horaActual,
            disponible: disponible
        });
        
        // Incrementar hora
        const [horas, minutos] = horaActual.split(':').map(Number);
        const totalMinutos = horas * 60 + minutos + duracionCita;
        const nuevaHora = Math.floor(totalMinutos / 60);
        const nuevosMinutos = totalMinutos % 60;
        horaActual = `${nuevaHora.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`;
    }
    
    return horarios;
}

// Obtener próximas citas
function obtenerProximasCitas(limit = 5) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const todasLasCitas = obtenerCitas();
    
    return todasLasCitas
        .filter(cita => {
            const fechaCita = new Date(cita.fecha);
            return fechaCita >= hoy && cita.estado !== 'cancelada' && cita.estado !== 'completada';
        })
        .sort((a, b) => {
            const fechaA = new Date(a.fecha + ' ' + a.hora);
            const fechaB = new Date(b.fecha + ' ' + b.hora);
            return fechaA - fechaB;
        })
        .slice(0, limit);
}

// Enviar recordatorio de cita
function enviarRecordatorioCita(citaId) {
    const cita = obtenerCitas().find(c => c.id === citaId);
    
    if (!cita) return false;
    
    crearNotificacion({
        numeroControl: cita.numeroControl,
        tipo: 'cita',
        titulo: 'Recordatorio de Cita',
        mensaje: `Tienes una cita mañana a las ${cita.hora}. No olvides llevar tus documentos originales.`,
        relacionadoId: citaId
    });
    
    enviarCorreo(cita.numeroControl,
        'Recordatorio de Cita',
        `Tienes una cita mañana ${formatearFecha(cita.fecha)} a las ${cita.hora}. No olvides llevar tus documentos originales.`
    );
    
    return true;
}
