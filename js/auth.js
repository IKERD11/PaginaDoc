// Sistema de autenticación

// Registrar acción en bitácora
function registrarBitacora(tipo, descripcion, usuario = null) {
    const bitacora = JSON.parse(localStorage.getItem('bitacora')) || [];
    const usuarioActual = usuario || JSON.parse(sessionStorage.getItem('usuarioActual'));
    
    bitacora.push({
        id: generarId(),
        fecha: new Date().toISOString(),
        tipo: tipo,
        descripcion: descripcion,
        usuario: usuarioActual ? usuarioActual.numeroControl : 'Sistema',
        nombreUsuario: usuarioActual ? usuarioActual.nombre : 'Sistema'
    });
    
    localStorage.setItem('bitacora', JSON.stringify(bitacora));
}

// Iniciar sesión
function iniciarSesion(numeroControl, nip) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    const usuario = usuarios.find(u => 
        u.numeroControl === numeroControl && u.nip === nip
    );
    
    if (usuario) {
        // Guardar usuario en sesión
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuario));
        
        // Registrar en bitácora
        registrarBitacora('login', `Inicio de sesión exitoso`, usuario);
        
        return {
            exito: true,
            usuario: usuario
        };
    }
    
    return {
        exito: false,
        mensaje: 'Número de control o NIP incorrectos'
    };
}

// Cerrar sesión
function cerrarSesion() {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioActual'));
    
    if (usuario) {
        registrarBitacora('logout', `Cierre de sesión`);
    }
    
    sessionStorage.removeItem('usuarioActual');
}

// Cerrar sesión de Firebase (async)
async function cerrarSesionFirebase() {
    try {
        // Primero limpiar sesión local
        cerrarSesion();
        
        // Luego hacer signOut de Firebase y ESPERAR a que termine
        if (typeof window.auth !== 'undefined') {
            await window.auth.signOut();
            console.log('Sesión de Firebase cerrada');
        }
        
        // DESPUÉS de que signOut termine, redirigir
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Redirigir aunque haya error
        window.location.href = 'index.html';
    }
}

// Verificar autenticación
function verificarAutenticacion() {
    const usuario = sessionStorage.getItem('usuarioActual');
    
    if (!usuario) {
        window.location.href = 'index.html';
        return null;
    }
    
    return JSON.parse(usuario);
}

// Verificar rol
function verificarRol(rolRequerido) {
    const usuario = verificarAutenticacion();
    
    if (!usuario) return false;
    
    if (usuario.rol !== rolRequerido) {
        mostrarToast('No tienes permisos para acceder a esta página', 'error');
        cerrarSesion();
        return false;
    }
    
    return true;
}

// Obtener usuario actual
function obtenerUsuarioActual() {
    const usuario = sessionStorage.getItem('usuarioActual');
    return usuario ? JSON.parse(usuario) : null;
}

// Cambiar NIP
function cambiarNIP(numeroControl, nipActual, nipNuevo) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const indice = usuarios.findIndex(u => 
        u.numeroControl === numeroControl && u.nip === nipActual
    );
    
    if (indice === -1) {
        return {
            exito: false,
            mensaje: 'NIP actual incorrecto'
        };
    }
    
    // Validar nuevo NIP
    if (nipNuevo.length < 4 || nipNuevo.length > 6) {
        return {
            exito: false,
            mensaje: 'El NIP debe tener entre 4 y 6 dígitos'
        };
    }
    
    usuarios[indice].nip = nipNuevo;
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    
    registrarBitacora('cambio_nip', `Cambio de NIP realizado`);
    
    return {
        exito: true,
        mensaje: 'NIP actualizado correctamente'
    };
}

// Crear nuevo usuario
function crearUsuario(datosUsuario) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    // Verificar si ya existe
    const existe = usuarios.find(u => u.numeroControl === datosUsuario.numeroControl);
    if (existe) {
        return {
            exito: false,
            mensaje: 'El número de control ya está registrado'
        };
    }
    
    // Validaciones
    if (!datosUsuario.numeroControl || !datosUsuario.nip || !datosUsuario.nombre) {
        return {
            exito: false,
            mensaje: 'Todos los campos son obligatorios'
        };
    }
    
    if (datosUsuario.email && !validarEmail(datosUsuario.email)) {
        return {
            exito: false,
            mensaje: 'Email inválido'
        };
    }
    
    const nuevoUsuario = {
        numeroControl: datosUsuario.numeroControl,
        nip: datosUsuario.nip,
        rol: datosUsuario.rol || 'alumno',
        nombre: datosUsuario.nombre,
        email: datosUsuario.email || '',
        fechaRegistro: new Date().toISOString(),
        activo: true
    };
    
    usuarios.push(nuevoUsuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    
    registrarBitacora('crear_usuario', `Usuario creado: ${nuevoUsuario.nombre} (${nuevoUsuario.numeroControl})`);
    
    return {
        exito: true,
        mensaje: 'Usuario creado correctamente',
        usuario: nuevoUsuario
    };
}

// Actualizar usuario
function actualizarUsuario(numeroControl, datosActualizados) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const indice = usuarios.findIndex(u => u.numeroControl === numeroControl);
    
    if (indice === -1) {
        return {
            exito: false,
            mensaje: 'Usuario no encontrado'
        };
    }
    
    if (datosActualizados.email && !validarEmail(datosActualizados.email)) {
        return {
            exito: false,
            mensaje: 'Email inválido'
        };
    }
    
    usuarios[indice] = {
        ...usuarios[indice],
        ...datosActualizados,
        numeroControl: numeroControl // Mantener el número de control original
    };
    
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    
    // Actualizar sesión si es el usuario actual
    const usuarioActual = obtenerUsuarioActual();
    if (usuarioActual && usuarioActual.numeroControl === numeroControl) {
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarios[indice]));
    }
    
    registrarBitacora('actualizar_usuario', `Usuario actualizado: ${numeroControl}`);
    
    return {
        exito: true,
        mensaje: 'Usuario actualizado correctamente',
        usuario: usuarios[indice]
    };
}

// Eliminar usuario
function eliminarUsuario(numeroControl) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const usuariosFiltrados = usuarios.filter(u => u.numeroControl !== numeroControl);
    
    if (usuarios.length === usuariosFiltrados.length) {
        return {
            exito: false,
            mensaje: 'Usuario no encontrado'
        };
    }
    
    localStorage.setItem('usuarios', JSON.stringify(usuariosFiltrados));
    
    registrarBitacora('eliminar_usuario', `Usuario eliminado: ${numeroControl}`);
    
    return {
        exito: true,
        mensaje: 'Usuario eliminado correctamente'
    };
}

// Obtener todos los usuarios
function obtenerUsuarios(filtros = {}) {
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    if (filtros.rol) {
        usuarios = usuarios.filter(u => u.rol === filtros.rol);
    }
    
    if (filtros.activo !== undefined) {
        usuarios = usuarios.filter(u => u.activo === filtros.activo);
    }
    
    if (filtros.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase();
        usuarios = usuarios.filter(u => 
            u.nombre.toLowerCase().includes(busqueda) ||
            u.numeroControl.toLowerCase().includes(busqueda) ||
            (u.email && u.email.toLowerCase().includes(busqueda))
        );
    }
    
    return usuarios;
}

// Obtener usuario por número de control
function obtenerUsuarioPorNumeroControl(numeroControl) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    return usuarios.find(u => u.numeroControl === numeroControl);
}
