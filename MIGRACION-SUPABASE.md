# Migración a Supabase - Pasos Finales

## ✅ Completado

1. ✓ Instalación de Supabase JS
2. ✓ Creación de archivos de configuración
3. ✓ Migración de autenticación
4. ✓ Migración de base de datos
5. ✓ Actualización de archivos HTML

## 🔧 Configuración en Supabase (Dashboard)

### 1. Crear Tabla `usuarios`

En el dashboard de Supabase, ve a **Table Editor** y crea la tabla `usuarios`:

```sql
-- Crear tabla usuarios
CREATE TABLE usuarios (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'alumno')),
    numeroControl TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Los usuarios pueden leer su propia información
CREATE POLICY "Los usuarios pueden ver su propia info"
    ON usuarios FOR SELECT
    USING (auth.uid() = id);

-- Los admins pueden ver todo
CREATE POLICY "Los admins pueden ver todos los usuarios"
    ON usuarios FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );
```

### 2. Crear Tabla `documentos`

```sql
-- Crear tabla documentos
CREATE TABLE documentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numeroControl TEXT NOT NULL,
    tipoDocumento TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    url TEXT NOT NULL,
    observaciones TEXT,
    fechaCreacion TIMESTAMP DEFAULT NOW(),
    fechaActualizacion TIMESTAMP DEFAULT NOW(),
    revisadoPor TEXT
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_documentos_numeroControl ON documentos(numeroControl);
CREATE INDEX idx_documentos_estado ON documentos(estado);

-- Habilitar Row Level Security
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Los alumnos pueden ver sus propios documentos
CREATE POLICY "Los alumnos pueden ver sus documentos"
    ON documentos FOR SELECT
    USING (
        numeroControl = (
            SELECT numeroControl FROM usuarios WHERE id = auth.uid()
        )
    );

-- Los alumnos pueden insertar sus documentos
CREATE POLICY "Los alumnos pueden insertar documentos"
    ON documentos FOR INSERT
    WITH CHECK (
        numeroControl = (
            SELECT numeroControl FROM usuarios WHERE id = auth.uid()
        )
    );

-- Los admins pueden ver y modificar todo
CREATE POLICY "Los admins pueden gestionar documentos"
    ON documentos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );
```

### 3. Crear Bucket de Storage `documentos`

1. En el dashboard, ve a **Storage**
2. Haz clic en **New bucket**
3. Nombre: `documentos`
4. **Desactiva** "Public bucket" (para mantener privacidad)
5. Haz clic en **Create bucket**

### 4. Configurar Políticas de Storage

En Storage > Policies para el bucket `documentos`:

```sql
-- Permitir que usuarios suban sus archivos
CREATE POLICY "Los usuarios pueden subir sus archivos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = (
        SELECT numeroControl FROM usuarios WHERE id = auth.uid()
    )
);

-- Permitir que usuarios lean sus archivos
CREATE POLICY "Los usuarios pueden leer sus archivos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = (
        SELECT numeroControl FROM usuarios WHERE id = auth.uid()
    )
);

-- Permitir que admins lean todos los archivos
CREATE POLICY "Los admins pueden leer todos los archivos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documentos' AND
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    )
);

-- Permitir que admins eliminen archivos
CREATE POLICY "Los admins pueden eliminar archivos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documentos' AND
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid() AND rol = 'admin'
    )
);
```

### 5. Crear Usuario de Prueba

En **Authentication** > **Users** > **Add user**:

**Usuario Admin:**
- Email: `admin@test.com`
- Password: `Admin123!`

Luego, en **Table Editor** > **usuarios**, agrega manualmente:
```sql
INSERT INTO usuarios (id, email, nombre, rol, numeroControl)
VALUES (
    '[UUID del usuario creado]',
    'admin@test.com',
    'Administrador',
    'admin',
    '00000000'
);
```

**Usuario Alumno:**
- Email: `alumno@test.com`
- Password: `Alumno123!`

Luego:
```sql
INSERT INTO usuarios (id, email, nombre, rol, numeroControl)
VALUES (
    '[UUID del usuario creado]',
    'alumno@test.com',
    'Alumno Prueba',
    'alumno',
    '12345678'
);
```

## 🚀 Probar la Aplicación

1. Inicia el servidor local:
   ```bash
   npm start
   ```

2. Abre `http://localhost:3000` en tu navegador

3. Intenta iniciar sesión con:
   - Admin: `admin@test.com` / `Admin123!`
   - Alumno: `alumno@test.com` / `Alumno123!`

## 📝 Notas Importantes

- **Sin problemas de CORS**: Supabase maneja CORS automáticamente
- **Plan gratuito**: 500 MB storage, 2 GB transferencia/mes
- **No se requiere tarjeta**: El plan gratuito no requiere tarjeta de crédito
- **RLS activado**: Row Level Security protege tus datos automáticamente

## ⚠️ Archivos Obsoletos (puedes eliminarlos)

- `js/firebase-bundle.js`
- `js/firebase-init.js`
- `js/firebase-utils.js`
- `firebase-bundle-src.js`
- `configurar-firestore-rules.js`
- `apply-cors.js`
- `storage-cors.json`
- `paginadoc-5a1fb-firebase-adminsdk-*.json`

## 🔄 Próximos Pasos (Opcional)

Si tienes datos en Firebase que quieres migrar:

1. Exporta los datos de Firestore
2. Transforma el formato JSON a SQL
3. Importa los datos en Supabase usando el SQL Editor

¿Necesitas ayuda con algo más?
