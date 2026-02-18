-- ============================================================================
-- SCRIPT DE VERIFICACIÓN COMPLETA DEL PROYECTO
-- ============================================================================
-- Este script verifica que todas las tablas, políticas, funciones y
-- configuraciones estén correctamente implementadas en el nuevo proyecto.
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script completo en SQL Editor
-- 2. Revisa los resultados de cada consulta
-- 3. Todos los contadores deben ser > 0
-- ============================================================================

-- ============================================================================
-- PARTE 1: VERIFICAR TABLAS
-- ============================================================================

SELECT '=== VERIFICACIÓN DE TABLAS ===' as verificacion;

-- Ver todas las tablas del proyecto
SELECT 
    table_name as tabla,
    table_type as tipo
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name IN ('usuarios', 'documentos')
ORDER BY 
    table_name;

-- Resultado esperado: 2 filas (usuarios, documentos)

-- ============================================================================
-- PARTE 2: VERIFICAR COLUMNAS DE LA TABLA USUARIOS
-- ============================================================================

SELECT '=== COLUMNAS DE LA TABLA USUARIOS ===' as verificacion;

SELECT 
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_nulo,
    column_default as valor_por_defecto
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'usuarios'
ORDER BY 
    ordinal_position;

-- Resultado esperado: 7 columnas
-- id, email, nombre, rol, numero_control, created_at, updated_at

-- ============================================================================
-- PARTE 3: VERIFICAR COLUMNAS DE LA TABLA DOCUMENTOS
-- ============================================================================

SELECT '=== COLUMNAS DE LA TABLA DOCUMENTOS ===' as verificacion;

SELECT 
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_nulo
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'documentos'
ORDER BY 
    ordinal_position;

-- Resultado esperado: 12 columnas (todas en snake_case)
-- id, numero_control, tipo_documento, nombre_archivo, url_archivo,
-- ruta_archivo, estado, observaciones, revisado_por, fecha_carga,
-- fecha_revision, fecha_creacion, fecha_actualizacion

-- ✅ Si ves nombres como "numeroControl" o "tipoDocumento", 
--    las columnas NO están en snake_case y debes ejecutar fix-storage-y-columnas.sql

-- ============================================================================
-- PARTE 4: VERIFICAR FUNCIONES PERSONALIZADAS
-- ============================================================================

SELECT '=== FUNCIONES PERSONALIZADAS ===' as verificacion;

SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo
FROM 
    information_schema.routines
WHERE 
    routine_schema = 'public'
    AND routine_name IN (
        'get_my_role',
        'sync_user_role_to_auth',
        'update_updated_at_column',
        'update_fecha_actualizacion_column'
    )
ORDER BY 
    routine_name;

-- Resultado esperado: 4 funciones

-- ============================================================================
-- PARTE 5: VERIFICAR TRIGGERS
-- ============================================================================

SELECT '=== TRIGGERS CONFIGURADOS ===' as verificacion;

SELECT 
    event_object_table as tabla,
    trigger_name as trigger,
    action_timing as cuando,
    event_manipulation as evento
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'public'
    AND event_object_table IN ('usuarios', 'documentos')
ORDER BY 
    event_object_table, trigger_name;

-- Resultado esperado: 3 triggers
-- - on_user_role_change (usuarios)
-- - update_usuarios_updated_at (usuarios)
-- - update_documentos_fecha_actualizacion (documentos)

-- ============================================================================
-- PARTE 6: VERIFICAR POLÍTICAS RLS DE LA TABLA USUARIOS
-- ============================================================================

SELECT '=== POLÍTICAS RLS DE USUARIOS ===' as verificacion;

SELECT 
    policyname as politica,
    cmd as operacion,
    permissive as tipo,
    roles as roles
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
    AND tablename = 'usuarios'
ORDER BY 
    policyname;

-- Resultado esperado: 5 políticas
-- 1. Los admins pueden insertar usuarios (INSERT)
-- 2. Los admins pueden actualizar usuarios (UPDATE)
-- 3. Los admins pueden ver todos los usuarios (SELECT)
-- 4. Los usuarios pueden actualizar su propia info (UPDATE)
-- 5. Los usuarios pueden ver su propia info (SELECT)

-- ============================================================================
-- PARTE 7: VERIFICAR POLÍTICAS RLS DE LA TABLA DOCUMENTOS
-- ============================================================================

SELECT '=== POLÍTICAS RLS DE DOCUMENTOS ===' as verificacion;

SELECT 
    policyname as politica,
    cmd as operacion,
    permissive as tipo,
    roles as roles
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
    AND tablename = 'documentos'
ORDER BY 
    policyname;

-- Resultado esperado: 4 políticas (todas para usuarios autenticados)
-- 1. Usuarios autenticados pueden eliminar documentos (DELETE)
-- 2. Usuarios autenticados pueden actualizar documentos (UPDATE)
-- 3. Usuarios autenticados pueden ver documentos (SELECT)
-- 4. Usuarios autenticados pueden insertar documentos (INSERT)

-- ============================================================================
-- PARTE 8: VERIFICAR POLÍTICAS RLS DEL STORAGE
-- ============================================================================

SELECT '=== POLÍTICAS RLS DEL STORAGE ===' as verificacion;

SELECT 
    policyname as politica,
    cmd as operacion,
    permissive as tipo,
    roles as roles
FROM 
    pg_policies
WHERE 
    tablename = 'objects'
    AND policyname LIKE '%documentos%'
ORDER BY 
    policyname;

-- Resultado esperado: 4 políticas para el bucket 'documentos'
-- 1. Usuarios autenticados pueden eliminar documentos (DELETE)
-- 2. Usuarios autenticados pueden actualizar documentos (UPDATE)
-- 3. Usuarios autenticados pueden leer documentos (SELECT)
-- 4. Usuarios autenticados pueden subir documentos (INSERT)

-- ============================================================================
-- PARTE 9: VERIFICAR ÍNDICES
-- ============================================================================

SELECT '=== ÍNDICES CREADOS ===' as verificacion;

SELECT 
    tablename as tabla,
    indexname as indice,
    indexdef as definicion
FROM 
    pg_indexes
WHERE 
    schemaname = 'public'
    AND tablename IN ('usuarios', 'documentos')
ORDER BY 
    tablename, indexname;

-- Resultado esperado: Varios índices para mejorar el rendimiento

-- ============================================================================
-- PARTE 10: VERIFICAR USUARIOS REGISTRADOS
-- ============================================================================

SELECT '=== USUARIOS REGISTRADOS ===' as verificacion;

SELECT 
    COUNT(*) as total_usuarios,
    rol,
    string_agg(email, ', ') as emails
FROM 
    public.usuarios
GROUP BY 
    rol
ORDER BY 
    rol;

-- Resultado esperado: Al menos 1 usuario admin
-- Si no hay usuarios, debes crear uno siguiendo las instrucciones

-- ============================================================================
-- PARTE 11: VERIFICAR DOCUMENTOS (si existen)
-- ============================================================================

SELECT '=== DOCUMENTOS REGISTRADOS ===' as verificacion;

SELECT 
    COUNT(*) as total_documentos,
    estado,
    tipo_documento
FROM 
    public.documentos
GROUP BY 
    estado, tipo_documento
ORDER BY 
    estado, tipo_documento;

-- Resultado: Puede estar vacío si no se han subido documentos aún

-- ============================================================================
-- PARTE 12: VERIFICAR SINCRONIZACIÓN DE ROLES EN JWT
-- ============================================================================

SELECT '=== VERIFICAR ROLES SINCRONIZADOS EN JWT ===' as verificacion;

SELECT 
    u.email,
    u.rol as rol_en_tabla_usuarios,
    au.raw_app_meta_data->>'rol' as rol_en_jwt,
    CASE 
        WHEN u.rol = au.raw_app_meta_data->>'rol' THEN '✅ Sincronizado'
        ELSE '❌ NO sincronizado'
    END as estado_sincronizacion
FROM 
    public.usuarios u
LEFT JOIN 
    auth.users au ON u.id = au.id;

-- Resultado esperado: Todos los usuarios deben tener '✅ Sincronizado'
-- Si hay usuarios con '❌ NO sincronizado', ejecuta:
-- UPDATE public.usuarios SET updated_at = NOW();

-- ============================================================================
-- PARTE 13: VERIFICAR RLS ESTÁ HABILITADO
-- ============================================================================

SELECT '=== VERIFICAR RLS HABILITADO ===' as verificacion;

SELECT 
    schemaname as esquema,
    tablename as tabla,
    rowsecurity as rls_habilitado
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
    AND tablename IN ('usuarios', 'documentos')
ORDER BY 
    tablename;

-- Resultado esperado: rls_habilitado = true para ambas tablas

-- ============================================================================
-- PARTE 14: VERIFICAR STORAGE BUCKETS
-- ============================================================================

SELECT '=== BUCKETS DE STORAGE ===' as verificacion;

SELECT 
    id as bucket_id,
    name as nombre,
    public as es_publico,
    created_at as fecha_creacion
FROM 
    storage.buckets
WHERE 
    name = 'documentos';

-- Resultado esperado: 1 bucket llamado 'documentos' con es_publico = false
-- ⚠️ Si no existe, debes crearlo desde Storage > Create bucket

-- ============================================================================
-- PARTE 15: RESUMEN FINAL
-- ============================================================================

SELECT '=== RESUMEN FINAL DE CONFIGURACIÓN ===' as verificacion;

SELECT 
    'Tablas principales' as componente,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name IN ('usuarios', 'documentos')) as cantidad,
    '2' as esperado,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name IN ('usuarios', 'documentos')) = 2 
        THEN '✅ OK' 
        ELSE '❌ FALTA' 
    END as estado

UNION ALL

SELECT 
    'Funciones personalizadas',
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_schema = 'public' AND routine_name IN ('get_my_role', 'sync_user_role_to_auth', 'update_updated_at_column', 'update_fecha_actualizacion_column')),
    '4',
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.routines 
              WHERE routine_schema = 'public' AND routine_name IN ('get_my_role', 'sync_user_role_to_auth', 'update_updated_at_column', 'update_fecha_actualizacion_column')) = 4 
        THEN '✅ OK' 
        ELSE '❌ FALTA' 
    END

UNION ALL

SELECT 
    'Triggers configurados',
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE event_object_schema = 'public' AND event_object_table IN ('usuarios', 'documentos')),
    '3',
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers 
              WHERE event_object_schema = 'public' AND event_object_table IN ('usuarios', 'documentos')) = 3 
        THEN '✅ OK' 
        ELSE '❌ FALTA' 
    END

UNION ALL

SELECT 
    'Políticas RLS usuarios',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usuarios'),
    '5',
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usuarios') = 5 
        THEN '✅ OK' 
        ELSE '⚠️ VERIFICAR' 
    END

UNION ALL

SELECT 
    'Políticas RLS documentos',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documentos'),
    '4',
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documentos') = 4 
        THEN '✅ OK' 
        ELSE '⚠️ VERIFICAR' 
    END

UNION ALL

SELECT 
    'Políticas Storage',
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%documentos%'),
    '4',
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%documentos%') = 4 
        THEN '✅ OK' 
        ELSE '⚠️ VERIFICAR' 
    END

UNION ALL

SELECT 
    'Usuarios registrados',
    (SELECT COUNT(*) FROM public.usuarios),
    '>0',
    CASE 
        WHEN (SELECT COUNT(*) FROM public.usuarios) > 0 
        THEN '✅ OK' 
        ELSE '⚠️ CREAR USUARIOS' 
    END

UNION ALL

SELECT 
    'Bucket documentos',
    (SELECT COUNT(*) FROM storage.buckets WHERE name = 'documentos'),
    '1',
    CASE 
        WHEN (SELECT COUNT(*) FROM storage.buckets WHERE name = 'documentos') = 1 
        THEN '✅ OK' 
        ELSE '❌ CREAR BUCKET' 
    END;

-- ============================================================================
-- INTERPRETACIÓN DE RESULTADOS
-- ============================================================================

-- ✅ OK              = Componente configurado correctamente
-- ⚠️ VERIFICAR       = Existe pero puede tener problemas
-- ❌ FALTA           = Componente no existe, ejecuta el script de configuración
-- ⚠️ CREAR USUARIOS  = Debes crear usuarios desde Auth > Users
-- ❌ CREAR BUCKET    = Debes crear el bucket desde Storage > Create bucket

-- ============================================================================
-- FIN DE LA VERIFICACIÓN
-- ============================================================================

SELECT '=== ✅ VERIFICACIÓN COMPLETADA ===' as resultado;

-- Si todos los componentes muestran ✅ OK, tu proyecto está correctamente configurado
-- Si hay componentes con ❌ o ⚠️, sigue las instrucciones del resultado
