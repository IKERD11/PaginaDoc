-- ============================================================================
-- SCRIPT DE CORRECCIÓN: STORAGE RLS Y NOMBRES DE COLUMNAS
-- ============================================================================
-- Este script soluciona:
-- 1. Las políticas RLS del bucket de storage 'documentos'
-- 2. Los nombres de columnas en la tabla 'documentos'
-- ============================================================================

-- PARTE 1: CONFIGURAR POLÍTICAS RLS PARA EL BUCKET DE STORAGE 'documentos'
-- ============================================================================

-- Primero, eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Los usuarios pueden subir a su carpeta" ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden leer su carpeta" ON storage.objects;
DROP POLICY IF EXISTS "Los admins pueden leer todos los archivos" ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus archivos" ON storage.objects;
DROP POLICY IF EXISTS "Los admins pueden eliminar cualquier archivo" ON storage.objects;

-- Política para permitir que cualquier usuario autenticado suba archivos al bucket documentos
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos'
);

-- Política para permitir que cualquier usuario autenticado lea archivos del bucket documentos
CREATE POLICY "Usuarios autenticados pueden leer documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos'
);

-- Política para permitir que cualquier usuario autenticado actualice archivos
CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos'
)
WITH CHECK (
  bucket_id = 'documentos'
);

-- Política para permitir que cualquier usuario autenticado elimine archivos
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos'
);

-- PARTE 2: VERIFICAR Y RENOMBRAR COLUMNAS DE LA TABLA 'documentos'
-- ============================================================================
-- PostgreSQL convierte nombres de columnas a minúsculas por defecto.
-- Vamos a renombrar las columnas para usar snake_case (buena práctica).

-- Renombrar columnas si están en minúsculas sin separadores
DO $$
BEGIN
  -- Verificar y renombrar tipoDocumento/tipodocumento -> tipo_documento
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('tipodocumento', 'tipoDocumento')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN tipodocumento TO tipo_documento;
    RAISE NOTICE 'Columna renombrada: tipodocumento -> tipo_documento';
  END IF;

  -- Verificar y renombrar numeroControl/numerocontrol -> numero_control
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('numerocontrol', 'numeroControl')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN numerocontrol TO numero_control;
    RAISE NOTICE 'Columna renombrada: numerocontrol -> numero_control';
  END IF;

  -- Verificar y renombrar nombreArchivo/nombrearchivo -> nombre_archivo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('nombrearchivo', 'nombreArchivo')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN nombrearchivo TO nombre_archivo;
    RAISE NOTICE 'Columna renombrada: nombrearchivo -> nombre_archivo';
  END IF;

  -- Verificar y renombrar urlArchivo/urlarchivo -> url_archivo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('urlarchivo', 'urlArchivo')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN urlarchivo TO url_archivo;
    RAISE NOTICE 'Columna renombrada: urlarchivo -> url_archivo';
  END IF;

  -- Verificar y renombrar rutaArchivo/rutaarchivo -> ruta_archivo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('rutaarchivo', 'rutaArchivo')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN rutaarchivo TO ruta_archivo;
    RAISE NOTICE 'Columna renombrada: rutaarchivo -> ruta_archivo';
  END IF;

  -- Verificar y renombrar revisadoPor/revisadopor -> revisado_por
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('revisadopor', 'revisadoPor')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN revisadopor TO revisado_por;
    RAISE NOTICE 'Columna renombrada: revisadopor -> revisado_por';
  END IF;

  -- Verificar y renombrar fechaRevision/fecharevision -> fecha_revision
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('fecharevision', 'fechaRevision')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN fecharevision TO fecha_revision;
    RAISE NOTICE 'Columna renombrada: fecharevision -> fecha_revision';
  END IF;

  -- Verificar y renombrar fechaCarga/fechacarga -> fecha_carga
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('fechacarga', 'fechaCarga')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN fechacarga TO fecha_carga;
    RAISE NOTICE 'Columna renombrada: fechacarga -> fecha_carga';
  END IF;

  -- Verificar y renombrar fechaCreacion/fechacreacion -> fecha_creacion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos' 
    AND column_name IN ('fechacreacion', 'fechaCreacion')
  ) THEN
    ALTER TABLE public.documentos 
    RENAME COLUMN fechacreacion TO fecha_creacion;
    RAISE NOTICE 'Columna renombrada: fechacreacion -> fecha_creacion';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error al renombrar columnas: %', SQLERRM;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Después de ejecutar este script:
-- 1. El storage tendrá políticas RLS configuradas
-- 2. Las columnas de la tabla documentos usarán snake_case
-- 3. Necesitarás actualizar el código JavaScript para usar los nuevos nombres
-- ============================================================================
