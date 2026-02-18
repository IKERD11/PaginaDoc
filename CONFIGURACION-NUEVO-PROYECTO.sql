-- ============================================================================
-- CONFIGURACIÓN COMPLETA DEL NUEVO PROYECTO SUPABASE
-- ============================================================================
-- Este script configura completamente el nuevo proyecto de Supabase
-- con todas las correcciones necesarias para evitar problemas con:
-- 1. Políticas RLS (sin recursión infinita)
-- 2. Tablas con nombres de columnas correctos (snake_case)
-- 3. Storage con políticas RLS funcionales
-- 4. Funciones auxiliares para gestión de roles
--
-- INSTRUCCIONES:
-- 1. Abre tu panel de Supabase: https://whemlpmqoqgwwgdjqyed.supabase.co
-- 2. Ve a "SQL Editor"
-- 3. Copia y pega este script completo
-- 4. Haz clic en "Run" para ejecutarlo
-- ============================================================================

-- ============================================================================
-- PARTE 1: CREAR TABLA DE USUARIOS
-- ============================================================================

-- Eliminar tabla si existe (para instalación limpia)
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- Crear tabla usuarios
CREATE TABLE public.usuarios (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'alumno')),
    numero_control TEXT UNIQUE, -- snake_case
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas más rápidas
CREATE INDEX idx_usuarios_email ON public.usuarios(email);
CREATE INDEX idx_usuarios_numero_control ON public.usuarios(numero_control);
CREATE INDEX idx_usuarios_rol ON public.usuarios(rol);

-- Habilitar Row Level Security
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.usuarios IS 'Tabla de usuarios del sistema con información de perfil';
COMMENT ON COLUMN public.usuarios.rol IS 'Rol del usuario: admin o alumno';
COMMENT ON COLUMN public.usuarios.numero_control IS 'Número de control del estudiante (solo para alumnos)';

-- ============================================================================
-- PARTE 2: FUNCIONES AUXILIARES PARA GESTIÓN DE ROLES
-- ============================================================================

-- Función para sincronizar el rol del usuario en auth.users
-- Esta función actualiza el JWT con el rol del usuario
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rol}',
    to_jsonb(NEW.rol),
    true
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para sincronizar roles automáticamente
DROP TRIGGER IF EXISTS on_user_role_change ON public.usuarios;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_auth();

-- Función para obtener el rol desde el JWT (sin consultar la tabla)
-- Esto evita la recursión infinita en las políticas RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'rol', '')::text;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION public.get_my_role() IS 'Obtiene el rol del usuario actual desde el JWT sin consultar la tabla usuarios';
COMMENT ON FUNCTION public.sync_user_role_to_auth() IS 'Sincroniza el rol del usuario al JWT automáticamente';

-- ============================================================================
-- PARTE 3: POLÍTICAS RLS PARA TABLA USUARIOS (SIN RECURSIÓN)
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Los admins pueden ver todos los usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia info" ON public.usuarios;
DROP POLICY IF EXISTS "Los admins pueden insertar usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Los admins pueden actualizar usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propia info" ON public.usuarios;

-- Política 1: Los usuarios pueden ver su propia información
CREATE POLICY "Los usuarios pueden ver su propia info"
ON public.usuarios
FOR SELECT
USING (auth.uid() = id);

-- Política 2: Los admins pueden ver todos los usuarios (SIN RECURSIÓN)
CREATE POLICY "Los admins pueden ver todos los usuarios"
ON public.usuarios
FOR SELECT
USING (get_my_role() = 'admin');

-- Política 3: Los admins pueden insertar nuevos usuarios
CREATE POLICY "Los admins pueden insertar usuarios"
ON public.usuarios
FOR INSERT
WITH CHECK (get_my_role() = 'admin');

-- Política 4: Los admins pueden actualizar cualquier usuario
CREATE POLICY "Los admins pueden actualizar usuarios"
ON public.usuarios
FOR UPDATE
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- Política 5: Los usuarios pueden actualizar su propia información
CREATE POLICY "Los usuarios pueden actualizar su propia info"
ON public.usuarios
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND rol = (SELECT rol FROM public.usuarios WHERE id = auth.uid()));

-- ============================================================================
-- PARTE 4: CREAR TABLA DE DOCUMENTOS
-- ============================================================================

-- Eliminar tabla si existe (para instalación limpia)
DROP TABLE IF EXISTS public.documentos CASCADE;

-- Crear tabla documentos con nombres de columnas en snake_case
CREATE TABLE public.documentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_control TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    nombre_archivo TEXT,
    url_archivo TEXT,
    ruta_archivo TEXT,
    estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
    observaciones TEXT,
    revisado_por TEXT,
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_revision TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_documentos_numero_control ON public.documentos(numero_control);
CREATE INDEX idx_documentos_estado ON public.documentos(estado);
CREATE INDEX idx_documentos_tipo_documento ON public.documentos(tipo_documento);
CREATE INDEX idx_documentos_fecha_carga ON public.documentos(fecha_carga);

-- Habilitar Row Level Security
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Agregar comentarios descriptivos
COMMENT ON TABLE public.documentos IS 'Tabla de documentos subidos por los estudiantes';
COMMENT ON COLUMN public.documentos.tipo_documento IS 'Tipo de documento: acta_nacimiento, curp, comprobante_domicilio, etc.';
COMMENT ON COLUMN public.documentos.estado IS 'Estado de revisión: pendiente, aprobado, rechazado';
COMMENT ON COLUMN public.documentos.numero_control IS 'Número de control del estudiante que subió el documento';

-- ============================================================================
-- PARTE 5: POLÍTICAS RLS PARA TABLA DOCUMENTOS
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar documentos" ON public.documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON public.documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON public.documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON public.documentos;

-- Política 1: Los usuarios autenticados pueden insertar documentos
CREATE POLICY "Usuarios autenticados pueden insertar documentos"
ON public.documentos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política 2: Los usuarios autenticados pueden ver documentos
CREATE POLICY "Usuarios autenticados pueden ver documentos"
ON public.documentos
FOR SELECT
TO authenticated
USING (true);

-- Política 3: Los usuarios autenticados pueden actualizar documentos
CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
ON public.documentos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política 4: Los usuarios autenticados pueden eliminar documentos
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
ON public.documentos
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- PARTE 6: CREAR FUNCIÓN PARA ACTUALIZAR TIMESTAMP
-- ============================================================================

-- Función para actualizar automáticamente el campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para usuarios
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Función diferente para documentos (usa fecha_actualizacion)
CREATE OR REPLACE FUNCTION public.update_fecha_actualizacion_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para documentos
DROP TRIGGER IF EXISTS update_documentos_fecha_actualizacion ON public.documentos;
CREATE TRIGGER update_documentos_fecha_actualizacion
    BEFORE UPDATE ON public.documentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_fecha_actualizacion_column();

-- ============================================================================
-- PARTE 7: CONFIGURAR STORAGE BUCKET
-- ============================================================================

-- Nota: El bucket 'documentos' debe ser creado manualmente desde la interfaz de Supabase
-- Ve a Storage > Create a new bucket > Nombre: 'documentos' > Public: No

-- Eliminar políticas antiguas del storage
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON storage.objects;

-- Política para permitir que cualquier usuario autenticado suba archivos
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Política para permitir que cualquier usuario autenticado lea archivos
CREATE POLICY "Usuarios autenticados pueden leer documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');

-- Política para permitir que cualquier usuario autenticado actualice archivos
CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos')
WITH CHECK (bucket_id = 'documentos');

-- Política para permitir que cualquier usuario autenticado elimine archivos
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');

-- ============================================================================
-- PARTE 8: CREAR USUARIOS DE PRUEBA (OPCIONAL)
-- ============================================================================

-- IMPORTANTE: Primero debes crear los usuarios en Auth > Users desde el dashboard
-- Luego, ejecuta este script para crear los registros en la tabla usuarios

-- Ejemplo para crear un usuario admin:
-- INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
-- VALUES (
--     'uuid-del-usuario-creado-en-auth',
--     'admin@ejemplo.com',
--     'Administrador del Sistema',
--     'admin',
--     NULL
-- );

-- Ejemplo para crear un usuario alumno:
-- INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
-- VALUES (
--     'uuid-del-usuario-creado-en-auth',
--     'alumno@ejemplo.com',
--     'Alumno de Prueba',
--     'alumno',
--     '12345678'
-- );

-- ============================================================================
-- PARTE 9: VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name IN ('usuarios', 'documentos')
ORDER BY 
    table_name;

-- Verificar columnas de la tabla usuarios
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'usuarios'
ORDER BY 
    ordinal_position;

-- Verificar columnas de la tabla documentos
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'documentos'
ORDER BY 
    ordinal_position;

-- Verificar políticas RLS de usuarios
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
    AND tablename = 'usuarios'
ORDER BY 
    policyname;

-- Verificar políticas RLS de documentos
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
    AND tablename = 'documentos'
ORDER BY 
    policyname;

-- Verificar políticas de storage
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    tablename = 'objects'
    AND policyname LIKE '%documentos%'
ORDER BY 
    policyname;

-- ============================================================================
-- FIN DE LA CONFIGURACIÓN
-- ============================================================================
-- ✅ Si todos los pasos se ejecutaron correctamente, tu proyecto está listo
-- 
-- SIGUIENTES PASOS:
-- 1. Crear el bucket 'documentos' desde Storage > Create bucket
-- 2. Crear usuarios de prueba desde Auth > Users
-- 3. Insertar registros en la tabla usuarios para los usuarios creados
-- 4. Actualizar el código JavaScript si es necesario
-- 5. Probar la aplicación
-- ============================================================================
