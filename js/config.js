// Configuración general del sistema
const CONFIG = {
    // Configuración de documentos
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
    ALLOWED_FILE_TYPES: ['application/pdf'],
    
    // Configuración de citas
    MAX_CITAS_POR_DIA: 10,
    HORARIO_INICIO: '09:00',
    HORARIO_FIN: '16:00',
    DURACION_CITA: 30, // minutos
    
    // Documentos requeridos por defecto
    DOCUMENTOS_REQUERIDOS: [
        {
            id: 'acta_nacimiento',
            nombre: 'Acta de Nacimiento',
            descripcion: 'Copia certificada del acta de nacimiento',
            obligatorio: true
        },
        {
            id: 'curp',
            nombre: 'CURP',
            descripcion: 'Clave Única de Registro de Población',
            obligatorio: true
        },
        {
            id: 'comprobante_domicilio',
            nombre: 'Comprobante de Domicilio',
            descripcion: 'Recibo de luz, agua o teléfono (no mayor a 3 meses)',
            obligatorio: true
        },
        {
            id: 'certificado_secundaria',
            nombre: 'Certificado de Secundaria',
            descripcion: 'Certificado oficial de estudios de secundaria',
            obligatorio: true
        },
        {
            id: 'fotografias',
            nombre: 'Fotografías',
            descripcion: '4 fotografías tamaño infantil a color',
            obligatorio: true
        },
        {
            id: 'certificado_medico',
            nombre: 'Certificado Médico',
            descripcion: 'Certificado médico reciente (no mayor a 6 meses)',
            obligatorio: true
        }
    ],
    
    // Usuarios por defecto
    USUARIOS_DEFAULT: [
        {
            numeroControl: 'ADMIN',
            nip: '123456',
            rol: 'admin',
            nombre: 'Administrador del Sistema',
            email: 'admin@escuela.edu.mx'
        },
        {
            numeroControl: '21001001',
            nip: '654321',
            rol: 'alumno',
            nombre: 'Juan Pérez García',
            email: 'juan.perez@alumno.edu.mx'
        },
        {
            numeroControl: '21001002',
            nip: '111111',
            rol: 'alumno',
            nombre: 'María González López',
            email: 'maria.gonzalez@alumno.edu.mx'
        },
        {
            numeroControl: '21001003',
            nip: '222222',
            rol: 'alumno',
            nombre: 'Carlos Ramírez Sánchez',
            email: 'carlos.ramirez@alumno.edu.mx'
        }
    ],
    
    // Configuración de periodo
    PERIODO_ACTUAL: {
        nombre: 'Inscripción 2026-A',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-03-31'
    },
    
    // Configuración de notificaciones
    NOTIFICACIONES: {
        DOCUMENTO_APROBADO: 'Tu documento "{documento}" ha sido aprobado',
        DOCUMENTO_RECHAZADO: 'Tu documento "{documento}" ha sido rechazado. Revisa las observaciones.',
        CITA_AGENDADA: 'Tu cita ha sido agendada para el {fecha} a las {hora}',
        CITA_MODIFICADA: 'Tu cita ha sido reprogramada para el {fecha} a las {hora}',
        RECORDATORIO_CITA: 'Tienes una cita mañana a las {hora}. No olvides llevar tus documentos originales.'
    }
};

// Inicializar datos por defecto
function inicializarDatos() {
    if (!localStorage.getItem('usuarios')) {
        localStorage.setItem('usuarios', JSON.stringify(CONFIG.USUARIOS_DEFAULT));
    }
    
    if (!localStorage.getItem('documentosRequeridos')) {
        localStorage.setItem('documentosRequeridos', JSON.stringify(CONFIG.DOCUMENTOS_REQUERIDOS));
    }
    
    if (!localStorage.getItem('periodo')) {
        localStorage.setItem('periodo', JSON.stringify(CONFIG.PERIODO_ACTUAL));
    }
    
    if (!localStorage.getItem('configuracion')) {
        localStorage.setItem('configuracion', JSON.stringify({
            maxCitasPorDia: CONFIG.MAX_CITAS_POR_DIA,
            horarioInicio: CONFIG.HORARIO_INICIO,
            horarioFin: CONFIG.HORARIO_FIN,
            duracionCita: CONFIG.DURACION_CITA
        }));
    }
    
    // Inicializar estructura de datos si no existe
    if (!localStorage.getItem('documentos')) {
        // Crear documentos de prueba para demostración
        const documentosPrueba = [
            {
                id: 'doc_001',
                numeroControl: '21001001',
                tipoDocumento: 'Comprobante de Domicilio',
                estado: 'pendiente',
                contenido: 'base64PDF',
                fechaCarga: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                fechaActualizacion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                observaciones: ''
            },
            {
                id: 'doc_002',
                numeroControl: '21001002',
                tipoDocumento: 'Identificación Oficial',
                estado: 'pendiente',
                contenido: 'base64PDF',
                fechaCarga: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                fechaActualizacion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                observaciones: ''
            },
            {
                id: 'doc_003',
                numeroControl: '21001003',
                tipoDocumento: 'Constancia de Calificaciones',
                estado: 'pendiente',
                contenido: 'base64PDF',
                fechaCarga: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                fechaActualizacion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                observaciones: ''
            }
        ];
        localStorage.setItem('documentos', JSON.stringify(documentosPrueba));
    }
    
    if (!localStorage.getItem('citas')) {
        localStorage.setItem('citas', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('mensajes')) {
        localStorage.setItem('mensajes', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('notificaciones')) {
        localStorage.setItem('notificaciones', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('bitacora')) {
        localStorage.setItem('bitacora', JSON.stringify([]));
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    inicializarDatos();
});
