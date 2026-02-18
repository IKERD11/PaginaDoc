// Sistema de mensajería

// Crear nuevo mensaje
async function crearMensaje(de, para, asunto, contenido, categoria = 'general') {
    const mensaje = {
        id: generarId(),
        de: de, // numeroControl del remitente
        para: para, // numeroControl del destinatario o 'ADMIN'
        asunto: asunto,
        contenido: contenido,
        categoria: categoria, // general, documento, cita
        fecha: new Date().toISOString(),
        leido: false,
        fechaLectura: null,
        respuestas: []
    };
    
    guardarMensaje(mensaje);
    
    // Crear notificación para el destinatario
    const remitente = await obtenerUsuarioPorNumeroControl(de);
    crearNotificacion({
        numeroControl: para,
        tipo: 'mensaje',
        titulo: 'Nuevo Mensaje',
        mensaje: `Tienes un nuevo mensaje de ${remitente ? remitente.nombre : 'Sistema'}: ${asunto}`,
        relacionadoId: mensaje.id
    });
    
    registrarBitacora('mensaje', `Mensaje enviado de ${de} a ${para}: ${asunto}`);
    
    return {
        exito: true,
        mensaje: 'Mensaje enviado correctamente',
        mensajeObj: mensaje
    };
}

// Responder mensaje
function responderMensaje(mensajeId, contenido) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    const indice = mensajes.findIndex(m => m.id === mensajeId);
    
    if (indice === -1) {
        return {
            exito: false,
            mensaje: 'Mensaje no encontrado'
        };
    }
    
    const mensajeOriginal = mensajes[indice];
    const usuarioActual = obtenerUsuarioActual();
    
    const respuesta = {
        id: generarId(),
        de: usuarioActual.numeroControl,
        nombreDe: usuarioActual.nombre,
        contenido: contenido,
        fecha: new Date().toISOString()
    };
    
    mensajes[indice].respuestas.push(respuesta);
    localStorage.setItem('mensajes', JSON.stringify(mensajes));
    
    // Notificar al otro participante
    const destinatario = usuarioActual.numeroControl === mensajeOriginal.de 
        ? mensajeOriginal.para 
        : mensajeOriginal.de;
    
    crearNotificacion({
        numeroControl: destinatario,
        tipo: 'mensaje',
        titulo: 'Nueva Respuesta',
        mensaje: `${usuarioActual.nombre} ha respondido tu mensaje: ${mensajeOriginal.asunto}`,
        relacionadoId: mensajeId
    });
    
    registrarBitacora('mensaje', `Respuesta al mensaje: ${mensajeOriginal.asunto}`);
    
    return {
        exito: true,
        mensaje: 'Respuesta enviada correctamente'
    };
}

// Obtener conversación (mensaje con todas sus respuestas)
function obtenerConversacion(mensajeId) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    return mensajes.find(m => m.id === mensajeId);
}

// Obtener mensajes entre dos usuarios
function obtenerConversacionEntreUsuarios(usuario1, usuario2) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    
    return mensajes.filter(m => 
        (m.de === usuario1 && m.para === usuario2) ||
        (m.de === usuario2 && m.para === usuario1)
    ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// Marcar todos los mensajes de un usuario como leídos
function marcarTodosMensajesLeidos(numeroControl) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    
    mensajes.forEach(m => {
        if (m.para === numeroControl && !m.leido) {
            m.leido = true;
            m.fechaLectura = new Date().toISOString();
        }
    });
    
    localStorage.setItem('mensajes', JSON.stringify(mensajes));
}

// Eliminar mensaje
function eliminarMensajeCompleto(mensajeId) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes')) || [];
    const mensajesFiltrados = mensajes.filter(m => m.id !== mensajeId);
    localStorage.setItem('mensajes', JSON.stringify(mensajesFiltrados));
    
    registrarBitacora('mensaje', `Mensaje eliminado: ${mensajeId}`);
    
    return {
        exito: true,
        mensaje: 'Mensaje eliminado correctamente'
    };
}

// Obtener conteo de mensajes no leídos
function contarMensajesNoLeidos(numeroControl) {
    const mensajes = obtenerMensajes({ numeroControl, leido: false });
    return mensajes.filter(m => m.para === numeroControl).length;
}

// Buscar mensajes
function buscarMensajes(numeroControl, busqueda) {
    const mensajes = obtenerMensajes({ numeroControl });
    const termino = busqueda.toLowerCase();
    
    return mensajes.filter(m => 
        m.asunto.toLowerCase().includes(termino) ||
        m.contenido.toLowerCase().includes(termino) ||
        (m.respuestas && m.respuestas.some(r => r.contenido.toLowerCase().includes(termino)))
    );
}

// Obtener mensajes por categoría
function obtenerMensajesPorCategoria(numeroControl, categoria) {
    const mensajes = obtenerMensajes({ numeroControl });
    
    return mensajes.filter(m => m.categoria === categoria);
}

// Crear mensaje automático del sistema
function crearMensajeSistema(para, asunto, contenido, categoria = 'general') {
    return crearMensaje('SISTEMA', para, asunto, contenido, categoria);
}

// Enviar mensaje masivo (solo admin)
async function enviarMensajeMasivo(asunto, contenido, destinatarios = 'todos') {
    const usuarioActual = obtenerUsuarioActual();
    
    if (usuarioActual.rol !== 'admin') {
        return {
            exito: false,
            mensaje: 'No tienes permisos para enviar mensajes masivos'
        };
    }
    
    let usuarios = [];
    
    if (destinatarios === 'todos') {
        usuarios = await obtenerUsuarios({ rol: 'alumno' });
    } else if (Array.isArray(destinatarios)) {
        // Obtener usuarios en paralelo
        const promesas = destinatarios.map(nc => obtenerUsuarioPorNumeroControl(nc));
        const resultados = await Promise.all(promesas);
        usuarios = resultados.filter(u => u);
    }
    
    let enviados = 0;
    
    // Enviar mensajes en paralelo
    await Promise.all(usuarios.map(async (usuario) => {
        const resultado = await crearMensaje(
            usuarioActual.numeroControl,
            usuario.numeroControl || usuario.numero_control,
            asunto,
            contenido,
            'general'
        );
        
        if (resultado.exito) {
            enviados++;
        }
    }));
    
    registrarBitacora('mensaje', `Mensaje masivo enviado a ${enviados} destinatarios: ${asunto}`);
    
    return {
        exito: true,
        mensaje: `Mensaje enviado a ${enviados} destinatarios`,
        enviados: enviados
    };
}
