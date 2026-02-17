// Script de login simplificado con Supabase

console.log('login.js cargado');

let authUnsubscribe = null; // Guardar función para dejar de escuchar
let isRedirecting = false; // Evitar redirecciones múltiples

function iniciarLogin() {
    console.log('Verificando Supabase...');
    console.log('  - window.supabaseReady:', window.supabaseReady);
    console.log('  - window.supabaseClient:', typeof window.supabaseClient);

    if (!window.supabaseReady || typeof window.supabaseClient === 'undefined') {
        console.log('Esperando Supabase...');
        setTimeout(iniciarLogin, 500);
        return;
    }

    console.log('Supabase disponible, iniciando login...');

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
            const { data: authListener } = window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
                const usuarioAuth = session?.user;
                console.log('Verificando sesión activa...', usuarioAuth ? 'SÍ' : 'NO');

                if (usuarioAuth && !isRedirecting) {
                    console.log('Usuario autenticado, obteniendo datos...');
                    isRedirecting = true; // Evitar redirecciones múltiples

                    try {
                        const { data: usuario, error } = await window.supabaseClient
                            .from('usuarios')
                            .select('*')
                            .eq('id', usuarioAuth.id)
                            .single();

                        if (error) throw error;

                        if (usuario) {
                            const rol = usuario.rol || 'alumno';
                            console.log('Rol:', rol);

                            if (rol === 'admin') {
                                console.log('Redirigiendo a admin.html');
                                guardarUsuarioActual({
                                    uid: usuarioAuth.id,
                                    email: usuarioAuth.email,
                                    nombre: usuario.nombre,
                                    rol: rol,
                                    numeroControl: usuario.numero_control
                                });
                                window.location.href = 'admin.html';
                            } else {
                                console.log('Redirigiendo a alumno.html');
                                guardarUsuarioActual({
                                    uid: usuarioAuth.id,
                                    email: usuarioAuth.email,
                                    nombre: usuario.nombre,
                                    rol: rol,
                                    numeroControl: usuario.numero_control
                                });
                                window.location.href = 'alumno.html';
                            }
                        } else {
                            isRedirecting = false; // Reintentar
                        }
                    } catch (error) {
                        console.error('Error al obtener rol:', error.message);
                        isRedirecting = false; // Reintentar
                    }
                } else if (!usuarioAuth) {
                    isRedirecting = false; // Usuario no autenticado, permitir login
                }
            });

            authUnsubscribe = () => authListener.subscription.unsubscribe();
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
                // 1. Iniciar sesión en Supabase
                const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (authError) {
                    // El bloque catch manejará el error y mostrará el mensaje adecuado.
                    throw authError;
                }

                const user = authData.user;
                if (!user) {
                    throw new Error("No se pudo obtener la información del usuario después del login.");
                }
                
                console.log('Autenticación exitosa:', user.id);
                console.log('Obteniendo datos del usuario...');

                // 2. Obtener el perfil del usuario de la tabla 'usuarios'
                // Esta consulta ahora es segura y no causa recursión gracias a las RLS corregidas.
                const { data: profileData, error: profileError } = await window.supabaseClient
                    .from('usuarios')
                    .select('*') // Traemos todos los datos para guardarlos en sesión
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.error("Error al obtener el perfil del usuario:", profileError.message);
                    throw new Error(`No se pudo leer el perfil del usuario. Detalles: ${profileError.message}`);
                }

                if (!profileData) {
                    throw new Error("El perfil del usuario no fue encontrado en la base de datos.");
                }
                
                console.log('Usuario:', {
                    nombre: profileData.nombre,
                    rol: profileData.rol,
                    numeroControl: profileData.numero_control
                });

                // 3. Guardar datos en la sesión y redirigir
                guardarUsuarioActual({
                    uid: user.id,
                    email: user.email,
                    nombre: profileData.nombre,
                    rol: profileData.rol,
                    numeroControl: profileData.numero_control
                });
                
                console.log('Usuario guardado en sesión. Redirigiendo...');
                errorMessage.style.display = 'none';

                // Redirigir según el rol
                if (profileData.rol === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'alumno.html';
                }

            } catch (error) {
                console.error('Error de login:', error.message);

                let mensaje = 'Error al iniciar sesión';

                // Mensajes de error de Supabase
                if (error.message.includes('Invalid login credentials')) {
                    mensaje = 'Email o contraseña incorrectos';
                } else if (error.message.includes('Email not confirmed')) {
                    mensaje = 'Email no confirmado';
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