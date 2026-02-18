-- ============================================================================
-- SCRIPT PARA CREAR USUARIOS DE PRUEBA
-- ============================================================================
-- Este script te ayuda a registrar usuarios en la tabla 'usuarios'
-- después de haberlos creado en Auth > Users del dashboard de Supabase
--
-- INSTRUCCIONES:
-- 1. Primero crea los usuarios en: Authentication > Users > Add user
-- 2. Copia el UUID de cada usuario creado
-- 3. Reemplaza 'UUID-DEL-USUARIO' con el UUID real
-- 4. Ejecuta el INSERT correspondiente
-- ============================================================================

-- ============================================================================
-- EJEMPLO 1: CREAR USUARIO ADMINISTRADOR
-- ============================================================================

-- Paso previo: Crear usuario en Auth > Users con estos datos:
-- Email: admin@paginadoc.com
-- Password: [tu contraseña segura]
-- Auto Confirm User: ✅ SÍ

-- Luego ejecuta este INSERT (reemplaza el UUID):
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES (
    'UUID-DEL-USUARIO-ADMIN',  -- ⚠️ Reemplaza con el UUID real
    'admin@paginadoc.com',
    'Administrador del Sistema',
    'admin',
    NULL  -- Los admins no tienen número de control
);

-- ============================================================================
-- EJEMPLO 2: CREAR USUARIO ALUMNO
-- ============================================================================

-- Paso previo: Crear usuario en Auth > Users con estos datos:
-- Email: alumno01@paginadoc.com
-- Password: [tu contraseña segura]
-- Auto Confirm User: ✅ SÍ

-- Luego ejecuta este INSERT (reemplaza el UUID):
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES (
    'UUID-DEL-USUARIO-ALUMNO',  -- ⚠️ Reemplaza con el UUID real
    'alumno01@paginadoc.com',
    'Juan Pérez García',
    'alumno',
    '12345678'  -- Número de control del estudiante
);

-- ============================================================================
-- EJEMPLO 3: CREAR MÚLTIPLES ALUMNOS
-- ============================================================================

-- Alumno 2
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES (
    'UUID-DEL-USUARIO-2',
    'alumno02@paginadoc.com',
    'María López Hernández',
    'alumno',
    '12345679'
);

-- Alumno 3
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES (
    'UUID-DEL-USUARIO-3',
    'alumno03@paginadoc.com',
    'Carlos Ramírez Torres',
    'alumno',
    '12345680'
);

-- ============================================================================
-- VERIFICAR USUARIOS CREADOS
-- ============================================================================

-- Ver todos los usuarios
SELECT 
    id,
    email,
    nombre,
    rol,
    numero_control,
    created_at
FROM 
    public.usuarios
ORDER BY 
    created_at DESC;

-- Ver solo administradores
SELECT * FROM public.usuarios WHERE rol = 'admin';

-- Ver solo alumnos
SELECT * FROM public.usuarios WHERE rol = 'alumno';

-- Contar usuarios por rol
SELECT 
    rol,
    COUNT(*) as total
FROM 
    public.usuarios
GROUP BY 
    rol;

-- ============================================================================
-- ACTUALIZAR UN USUARIO EXISTENTE
-- ============================================================================

-- Cambiar el nombre de un usuario
UPDATE public.usuarios
SET nombre = 'Nuevo Nombre'
WHERE email = 'usuario@ejemplo.com';

-- Cambiar el número de control de un alumno
UPDATE public.usuarios
SET numero_control = '99999999'
WHERE email = 'alumno@ejemplo.com';

-- Promover un alumno a administrador (⚠️ usar con precaución)
-- UPDATE public.usuarios
-- SET rol = 'admin', numero_control = NULL
-- WHERE email = 'alumno@ejemplo.com';

-- ============================================================================
-- ELIMINAR UN USUARIO
-- ============================================================================

-- ⚠️ PRECAUCIÓN: Esto solo elimina el registro de la tabla 'usuarios'
-- El usuario seguirá existiendo en 'auth.users'
-- Para eliminarlo completamente, debes eliminarlo también desde Auth > Users

-- DELETE FROM public.usuarios WHERE email = 'usuario@ejemplo.com';

-- ============================================================================
-- SCRIPT DE PRUEBA COMPLETO (DATOS DE EJEMPLO)
-- ============================================================================

-- 🔥 DESCOMENTA ESTE BLOQUE SOLO SI QUIERES DATOS DE PRUEBA
-- ⚠️  Primero debes crear los usuarios en Auth > Users y obtener sus UUIDs

/*
-- Admin de prueba
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'Admin de Prueba', 'admin', NULL);

-- Alumnos de prueba
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'alumno1@test.com', 'Alumno 1', 'alumno', '10000001'),
    ('00000000-0000-0000-0000-000000000003', 'alumno2@test.com', 'Alumno 2', 'alumno', '10000002'),
    ('00000000-0000-0000-0000-000000000004', 'alumno3@test.com', 'Alumno 3', 'alumno', '10000003');
*/

-- ============================================================================
-- CONSULTAS ÚTILES PARA DEBUGGING
-- ============================================================================

-- Ver información completa de un usuario específico
SELECT 
    u.*,
    au.email as auth_email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
FROM 
    public.usuarios u
LEFT JOIN 
    auth.users au ON u.id = au.id
WHERE 
    u.email = 'admin@paginadoc.com';

-- Verificar que el rol esté sincronizado en el JWT
SELECT 
    id,
    email,
    raw_app_meta_data->>'rol' as rol_en_jwt
FROM 
    auth.users
WHERE 
    email = 'admin@paginadoc.com';

-- Ver usuarios que NO tienen sincronizado el rol
SELECT 
    u.id,
    u.email,
    u.rol as rol_en_tabla,
    au.raw_app_meta_data->>'rol' as rol_en_jwt
FROM 
    public.usuarios u
LEFT JOIN 
    auth.users au ON u.id = au.id
WHERE 
    COALESCE(au.raw_app_meta_data->>'rol', '') != u.rol;

-- ============================================================================
-- RESINCRONIZAR ROLES (si es necesario)
-- ============================================================================

-- Si por alguna razón los roles no están sincronizados en el JWT,
-- ejecuta este script para forzar la sincronización
UPDATE public.usuarios
SET updated_at = NOW()
WHERE true;

-- Esto activará el trigger que sincroniza los roles automáticamente

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
