// Script de login simplificado con Firebase

console.log('login.js cargado');

let authUnsubscribe = null; // Guardar función para dejar de escuchar
let isRedirecting = false; // Evitar redirecciones múltiples

function iniciarLogin() {
    console.log('Verificando Firebase...');
    console.log('  - window.firebaseReady:', window.firebaseReady);
    console.log('  - window.auth:', typeof window.auth);
    console.log('  - window.db:', typeof window.db);
    
    if (!window.firebaseReady || typeof window.auth === 'undefined' || typeof window.db === 'undefined') {
        console.log('Esperando Firebase...');
        setTimeout(iniciarLogin, 500);
        return;
    }

    console.log('Firebase disponible, iniciando login...');

    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM cargado');
        
        const loginForm = document.getElementById('loginForm');
        
        if (!loginForm) {
            console.error('No se encontró formulario de login');
            return;
        }
        
        const errorMessage = document.getElementById('errorMessage');
        const btnSubmit = loginForm.querySelector('button[type="submit"]');
        
        console.log('Elementos del formulario encontrados');
        
        // Verificar si hay sesión activa (solo registrar listener una vez)
        if (!authUnsubscribe) {
            authUnsubscribe = window.auth.onAuthStateChanged((usuarioAuth) => {
                console.log('Verificando sesión activa...', usuarioAuth ? 'SÍ' : 'NO');
                
                if (usuarioAuth && !isRedirecting) {
                    console.log('Usuario autenticado, obteniendo datos...');
                    isRedirecting = true; // Evitar redirecciones múltiples
                    
                    window.db.collection('usuarios').doc(usuarioAuth.uid)
                        .get()
                        .then(doc => {
                            if (doc.exists) {
                                const rol = doc.data().rol || 'alumno';
                                console.log('Rol:', rol);
                                
                                if (rol === 'admin') {
                                    console.log('Redirigiendo a admin.html');
                                    window.location.href = 'admin.html';
                                } else {
                                    console.log('Redirigiendo a alumno.html');
                                    window.location.href = 'alumno.html';
                                }
                            } else {
                                isRedirecting = false; // Reintentar
                            }
                        })
                        .catch(error => {
                            console.error('Error al obtener rol:', error.message);
                            isRedirecting = false; // Reintentar
                        });
                } else if (!usuarioAuth) {
                    isRedirecting = false; // Usuario no autenticado, permitir login
                }
            });
        }
        
        // Manejar envío del formulario
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            
            console.log('Intento de login con:', { email });
            
            if (!email || !password) {
                console.warn('Campos vacíos');
                mostrarError('Por favor, completa todos los campos');
                return;
            }
            
            // Mostrar loading
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
            
            try {
                console.log('Autenticando con Firebase...');
                
                const resultado = await window.auth.signInWithEmailAndPassword(email, password);
                
                console.log('Autenticación exitosa:', resultado.user.uid);
                console.log('Obteniendo datos del usuario...');
                
                const doc = await window.db.collection('usuarios').doc(resultado.user.uid).get();
                
                if (doc.exists) {
                    const usuarioData = doc.data();
                    console.log('Usuario:', {
                        nombre: usuarioData.nombre,
                        rol: usuarioData.rol,
                        numeroControl: usuarioData.numeroControl
                    });
                    
                    guardarUsuarioActual({
                        uid: resultado.user.uid,
                        email: email,
                        nombre: usuarioData.nombre,
                        rol: usuarioData.rol,
                        numeroControl: usuarioData.numeroControl
                    });
                    
                    console.log('Usuario guardado en sesión');
                    console.log('Redirigiendo a:', usuarioData.rol === 'admin' ? 'admin.html' : 'alumno.html');
                    
                    errorMessage.style.display = 'none';
                    
                    setTimeout(() => {
                        if (usuarioData.rol === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'alumno.html';
                        }
                    }, 500);
                } else {
                    console.error('Usuario autenticado pero sin documento en Firestore');
                    mostrarError('Error: Usuario incompleto en el sistema');
                    restaurarBoton();
                }
                
            } catch (error) {
                console.error('Error de login:', error.code, error.message);
                
                let mensaje = 'Error al iniciar sesión';
                
                if (error.code === 'auth/user-not-found') {
                    mensaje = 'El email no está registrado';
                } else if (error.code === 'auth/wrong-password') {
                    mensaje = 'Contraseña incorrecta';
                } else if (error.code === 'auth/invalid-email') {
                    mensaje = 'Email inválido';
                } else if (error.code === 'auth/invalid-login-credentials') {
                    mensaje = 'Email o contraseña incorrectos';
                } else if (error.code === 'auth/too-many-requests') {
                    mensaje = 'Demasiados intentos, intenta más tarde';
                } else {
                    mensaje = error.message;
                }
                
                console.error('Mensaje:', mensaje);
                mostrarError(mensaje);
                restaurarBoton();
            }
        });
        
        function mostrarError(mensaje) {
            console.log('Error mostrado:', mensaje);
            errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
        
        function restaurarBoton() {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<span>Iniciar Sesión</span><i class="fas fa-arrow-right"></i>';
        }
    });
}

iniciarLogin();