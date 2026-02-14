// Firebase Utilities y funciones necesarias

// Obtener usuario actual de sessionStorage
const obtenerUsuarioActual = () => {
    const usuario = sessionStorage.getItem('usuarioActual');
    return usuario ? JSON.parse(usuario) : null;
};

// Guardar usuario en sessionStorage
const guardarUsuarioActual = (usuario) => {
    sessionStorage.setItem('usuarioActual', JSON.stringify(usuario));
};

// Limpiar sesión
const limpiarSesion = () => {
    sessionStorage.removeItem('usuarioActual');
};
