-- ============================================================================
-- SCRIPT DE CORRECCIÓN PARA POLÍTICAS RLS DE SUPABASE
-- ============================================================================
-- Este script soluciona el problema de recursión infinita en las políticas
-- de seguridad de la tabla "usuarios".
-- 
-- INSTRUCCIONES:
-- 1. Abre tu panel de Supabase
-- 2. Ve a "SQL Editor"
-- 3. Copia y pega este script completo
-- 4. Haz clic en "Run" para ejecutarlo
-- ============================================================================

-- PASO 1: Crear función para sincronizar el rol del usuario en auth.users
-- Esta función se ejecutará cada vez que se inserte o actualice un usuario
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualiza el campo raw_app_meta_data del usuario en auth.users
  -- Esto guarda el rol en el JWT para que esté disponible sin consultar la tabla
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

-- PASO 2: Crear trigger para que la función se ejecute automáticamente
DROP TRIGGER IF EXISTS on_user_role_change ON public.usuarios;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_auth();

-- PASO 3: Crear función para obtener el rol desde el JWT (sin consultar la tabla)
-- Esta función lee el rol directamente del token de autenticación
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'rol', '')::text;
$$ LANGUAGE SQL STABLE;

-- PASO 4: Eliminar las políticas antiguas que causan recursión
DROP POLICY IF EXISTS "Los admins pueden ver todos los usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia info" ON public.usuarios;
DROP POLICY IF EXISTS "Los admins pueden insertar usuarios" ON public.usuarios;

-- PASO 5: Crear las políticas corregidas SIN recursión
-- Política 1: Los usuarios pueden ver su propia información
CREATE POLICY "Los usuarios pueden ver su propia info"
ON public.usuarios
FOR SELECT
USING (auth.uid() = id);

-- Política 2: Los admins pueden ver todos los usuarios (CORREGIDA - SIN RECURSIÓN)
-- Ahora usa get_my_role() que lee del JWT, no de la tabla usuarios
CREATE POLICY "Los admins pueden ver todos los usuarios"
ON public.usuarios
FOR SELECT
USING (get_my_role() = 'admin');

-- Política 3: Los admins pueden insertar nuevos usuarios (CORREGIDA - SIN RECURSIÓN)
CREATE POLICY "Los admins pueden insertar usuarios"
ON public.usuarios
FOR INSERT
WITH CHECK (get_my_role() = 'admin');

-- PASO 6: Sincronizar roles de usuarios existentes
-- Este paso actualiza el raw_app_meta_data de todos los usuarios actuales
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, rol FROM public.usuarios
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{rol}',
      to_jsonb(user_record.rol),
      true
    )
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Después de ejecutar este script:
-- 1. Las políticas RLS ya no causarán recursión infinita
-- 2. Los roles se sincronizarán automáticamente en el JWT
-- 3. Tu aplicación debería funcionar correctamente
-- ============================================================================
