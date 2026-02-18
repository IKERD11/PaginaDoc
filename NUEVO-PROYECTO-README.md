# 🚀 Configuración del Nuevo Proyecto Supabase

## 📋 Información del Proyecto

**Proyecto:** PaginaDoc - Sistema de Gestión de Documentos Escolares  
**Fecha de Configuración:** 17 de febrero de 2026  
**Versión:** 2.0

### 🔐 Credenciales del Proyecto

```
Project URL:      https://whemlpmqoqgwwgdjqyed.supabase.co
Publishable Key:  sb_publishable_BcxHbxuzyoIVL-O82DNpqQ_RnNBAerz
Password:         MRFnvCeYazdADuyH
```

⚠️ **IMPORTANTE:** Estas credenciales son sensibles. No las compartas públicamente.

---

## 🎯 Objetivo de Este Proyecto

Este es un **nuevo proyecto de Supabase** creado para corregir los siguientes problemas del proyecto anterior:

1. ✅ **Recursión infinita en políticas RLS** - Corregido usando funciones que leen del JWT
2. ✅ **Nombres de columnas inconsistentes** - Ahora usan snake_case estándar
3. ✅ **Políticas de Storage mal configuradas** - Configuración simplificada y funcional
4. ✅ **Sincronización de roles** - Roles automáticamente actualizados en el JWT

---

## 📝 Pasos de Configuración

### Paso 1: Acceder al Panel de Supabase

1. Abre tu navegador y ve a: [https://whemlpmqoqgwwgdjqyed.supabase.co](https://whemlpmqoqgwwgdjqyed.supabase.co)
2. Inicia sesión con tus credenciales
3. Deberías ver el dashboard del proyecto

### Paso 2: Ejecutar el Script SQL de Configuración

1. En el panel de Supabase, ve a **SQL Editor** (en el menú lateral izquierdo)
2. Haz clic en el botón **"+ New query"**
3. Abre el archivo `CONFIGURACION-NUEVO-PROYECTO.sql` de este proyecto
4. Copia **TODO** el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Haz clic en el botón **"Run"** (o presiona `Ctrl+Enter`)
7. Espera a que el script se ejecute completamente

**Resultado esperado:**
- ✅ Tabla `usuarios` creada con todas sus políticas RLS
- ✅ Tabla `documentos` creada con todas sus políticas RLS
- ✅ Funciones auxiliares creadas (`get_my_role`, `sync_user_role_to_auth`)
- ✅ Triggers configurados para sincronización automática
- ✅ Políticas de Storage configuradas

### Paso 3: Crear el Bucket de Storage

1. Ve a **Storage** en el menú lateral
2. Haz clic en **"Create a new bucket"**
3. Configura el bucket:
   - **Name:** `documentos`
   - **Public bucket:** ❌ NO (desmarcado)
   - **File size limit:** 5 MB (opcional)
   - **Allowed MIME types:** `application/pdf` (opcional)
4. Haz clic en **"Create bucket"**

### Paso 4: Crear Usuarios de Prueba

#### 4.1 Crear Usuario Administrador

1. Ve a **Authentication** > **Users** en el menú lateral
2. Haz clic en **"Add user"** > **"Create new user"**
3. Ingresa los datos:
   - **Email:** `admin@paginadoc.com` (o el email que prefieras)
   - **Password:** Una contraseña segura
   - **Auto Confirm User:** ✅ SÍ (marcado)
4. Haz clic en **"Create user"**
5. **Copia el UUID** del usuario (lo necesitarás en el siguiente paso)

#### 4.2 Registrar Admin en la Tabla Usuarios

1. Ve a **SQL Editor**
2. Ejecuta el siguiente SQL (reemplaza `UUID-DEL-USUARIO` con el UUID que copiaste):

```sql
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES (
    'UUID-DEL-USUARIO',
    'admin@paginadoc.com',
    'Administrador del Sistema',
    'admin',
    NULL
);
```

#### 4.3 Crear Usuario Alumno (Opcional para Pruebas)

1. Repite el proceso anterior para crear un alumno:
   - Ve a **Authentication** > **Users** > **"Add user"**
   - Email: `alumno@paginadoc.com`
   - Password: Una contraseña segura
   - Auto Confirm: ✅ SÍ
   - **Copia el UUID**

2. Ejecuta en SQL Editor:

```sql
INSERT INTO public.usuarios (id, email, nombre, rol, numero_control)
VALUES (
    'UUID-DEL-USUARIO',
    'alumno@paginadoc.com',
    'Alumno de Prueba',
    'alumno',
    '12345678'
);
```

### Paso 5: Verificar la Configuración

1. Ve a **SQL Editor**
2. Ejecuta las siguientes consultas de verificación:

```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usuarios', 'documentos');

-- Verificar cantidad de usuarios
SELECT COUNT(*) as total_usuarios, rol 
FROM usuarios 
GROUP BY rol;

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Resultados esperados:**
- ✅ Se muestran las tablas `usuarios` y `documentos`
- ✅ Se muestra al menos 1 usuario admin
- ✅ Se muestran múltiples políticas RLS

---

## 🔧 Actualización del Código JavaScript

El archivo `js/supabase-init.js` ya ha sido actualizado con las nuevas credenciales. Si necesitas verificar:

```javascript
// js/supabase-init.js
const SUPABASE_URL = 'https://whemlpmqoqgwwgdjqyed.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BcxHbxuzyoIVL-O82DNpqQ_RnNBAerz';
```

### Archivos que Usan Supabase

Los siguientes archivos en tu proyecto interactúan con Supabase:

- ✅ `js/supabase-init.js` - Inicialización del cliente (YA ACTUALIZADO)
- ✅ `js/supabase-utils.js` - Funciones auxiliares
- ✅ `js/auth.js` - Autenticación
- ✅ `js/documentos.js` - Gestión de documentos
- ✅ `js/storage.js` - Gestión de archivos

**No necesitas modificar nada más**, el código ya está configurado para usar los nombres de columnas correctos (snake_case).

---

## 📊 Estructura de las Tablas

### Tabla: `usuarios`

```sql
id                UUID PRIMARY KEY
email             TEXT NOT NULL UNIQUE
nombre            TEXT NOT NULL
rol               TEXT NOT NULL ('admin' | 'alumno')
numero_control    TEXT UNIQUE
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Tabla: `documentos`

```sql
id                      UUID PRIMARY KEY
numero_control          TEXT NOT NULL
tipo_documento          TEXT NOT NULL
nombre_archivo          TEXT
url_archivo             TEXT
ruta_archivo            TEXT
estado                  TEXT ('pendiente' | 'aprobado' | 'rechazado')
observaciones           TEXT
revisado_por            TEXT
fecha_carga             TIMESTAMP
fecha_revision          TIMESTAMP
fecha_creacion          TIMESTAMP
fecha_actualizacion     TIMESTAMP
```

---

## 🛡️ Seguridad (Row Level Security)

### Políticas Implementadas

#### Tabla `usuarios`:
- ✅ Los usuarios pueden ver su propia información
- ✅ Los admins pueden ver todos los usuarios
- ✅ Los admins pueden insertar nuevos usuarios
- ✅ Los admins pueden actualizar usuarios
- ✅ Los usuarios pueden actualizar su propia información (excepto el rol)

#### Tabla `documentos`:
- ✅ Usuarios autenticados pueden insertar documentos
- ✅ Usuarios autenticados pueden ver documentos
- ✅ Usuarios autenticados pueden actualizar documentos
- ✅ Usuarios autenticados pueden eliminar documentos

> **Nota:** El control de acceso detallado (ej. alumnos solo ven sus documentos) se maneja a nivel de aplicación en el código JavaScript.

#### Storage `documentos`:
- ✅ Usuarios autenticados pueden subir archivos
- ✅ Usuarios autenticados pueden leer archivos
- ✅ Usuarios autenticados pueden actualizar archivos
- ✅ Usuarios autenticados pueden eliminar archivos

---

## 🧪 Pruebas

### 1. Probar Autenticación

1. Abre `index.html` en tu navegador
2. Intenta iniciar sesión con:
   - Email: `admin@paginadoc.com`
   - Password: [tu contraseña]
3. Deberías ser redirigido a `admin.html`

### 2. Probar Gestión de Usuarios (Admin)

1. Inicia sesión como admin
2. Ve a la sección de gestión de usuarios
3. Intenta crear un nuevo usuario alumno
4. Verifica que aparezca en la lista

### 3. Probar Carga de Documentos (Alumno)

1. Inicia sesión como alumno
2. Ve a la sección de documentos
3. Intenta subir un archivo PDF
4. Verifica que se muestre en tu lista de documentos

### 4. Probar Revisión de Documentos (Admin)

1. Inicia sesión como admin
2. Ve a la sección de documentos pendientes
3. Deberías ver los documentos subidos por alumnos
4. Intenta aprobar o rechazar un documento

---

## 🐛 Solución de Problemas

### Error: "Failed to fetch"

**Causa:** El cliente de Supabase no está inicializado.  
**Solución:**
1. Verifica que `js/supabase-init.js` esté cargado antes que otros scripts
2. Abre la consola del navegador y verifica mensajes de error
3. Asegúrate de que las credenciales sean correctas

### Error: "Row level security policy violation"

**Causa:** Las políticas RLS no permiten la operación.  
**Solución:**
1. Verifica que el usuario esté autenticado
2. Verifica que el rol del usuario esté sincronizado en el JWT
3. Ejecuta este SQL para verificar el rol:
   ```sql
   SELECT id, email, rol FROM usuarios WHERE email = 'tu-email@ejemplo.com';
   ```

### Error: "Column does not exist"

**Causa:** El código está usando nombres de columnas antiguos (camelCase).  
**Solución:**
1. Verifica que todos los archivos JS usen snake_case para las columnas
2. Ejemplo: usa `numero_control` en lugar de `numeroControl`

### Error al subir archivos

**Causa:** El bucket 'documentos' no existe o las políticas no están configuradas.  
**Solución:**
1. Verifica que el bucket 'documentos' exista en Storage
2. Ejecuta las políticas de storage del script SQL
3. Verifica que el bucket NO sea público

---

## 📚 Recursos Adicionales

### Documentación Oficial de Supabase

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)
- [Authentication](https://supabase.com/docs/guides/auth)

### Archivos de Referencia en Este Proyecto

- `CONFIGURACION-NUEVO-PROYECTO.sql` - Script completo de configuración
- `fix-supabase-rls.sql` - Script de corrección de RLS (referencia)
- `fix-storage-y-columnas.sql` - Script de corrección de storage (referencia)
- `MIGRACION-SUPABASE.md` - Documentación de la migración original

---

## ✅ Lista de Verificación Final

Antes de poner el proyecto en producción, verifica:

- [ ] Script SQL ejecutado completamente sin errores
- [ ] Bucket 'documentos' creado y configurado como privado
- [ ] Al menos un usuario admin creado y registrado
- [ ] Usuario admin puede iniciar sesión
- [ ] Usuario admin puede crear nuevos usuarios
- [ ] Usuario alumno puede subir documentos
- [ ] Usuario admin puede revisar documentos
- [ ] Todas las pruebas básicas funcionan correctamente
- [ ] No hay errores en la consola del navegador
- [ ] Las credenciales están protegidas y no expuestas públicamente

---

## 🎉 ¡Proyecto Configurado!

Si completaste todos los pasos, tu nuevo proyecto de Supabase está completamente configurado y listo para usar.

**Cambios principales vs. proyecto anterior:**
- ✅ Sin recursión infinita en RLS
- ✅ Nombres de columnas consistentes (snake_case)
- ✅ Storage funcional con políticas simples
- ✅ Sincronización automática de roles en JWT
- ✅ Mejor rendimiento y estabilidad

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la sección "Solución de Problemas" de este documento
2. Verifica los logs en la consola del navegador (F12)
3. Revisa los logs en Supabase Dashboard > Logs
4. Consulta la documentación oficial de Supabase

---

**Última actualización:** 17 de febrero de 2026  
**Versión del documento:** 1.0
