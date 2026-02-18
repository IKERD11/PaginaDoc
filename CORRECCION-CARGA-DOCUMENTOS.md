# Correcciones para Carga de Documentos

## 🔧 Problema Identificado

El sistema estaba usando nombres de columnas en **camelCase** (ej: `numeroControl`, `tipoDocumento`, `urlArchivo`) cuando la base de datos espera nombres en **snake_case** (ej: `numero_control`, `tipo_documento`, `url_archivo`).

Esto causaba errores al:
- ✅ Subir documentos
- ✅ Actualizar documentos
- ✅ Listar y visualizar documentos
- ✅ Descargar documentos
- ✅ Generar reportes

---

## ✅ Archivos Corregidos

### 1. [js/documentos.js](js/documentos.js)

**Función `subirDocumento()`** - Líneas 186-193

**ANTES:**
```javascript
const datosDoc = {
    numero_control: numeroControl,
    tipo_documento: tipoDocumento,
    url: resultadoArchivo.url,  // ❌ Incorrecto
    estado: 'pendiente',
    observaciones: '',
    revisado_por: null
};
```

**DESPUÉS:**
```javascript
const datosDoc = {
    numero_control: numeroControl,
    tipo_documento: tipoDocumento,
    nombre_archivo: archivo.name,      // ✅ Nuevo
    url_archivo: resultadoArchivo.url, // ✅ Correcto
    ruta_archivo: rutaArchivo,         // ✅ Nuevo
    estado: 'pendiente',
    observaciones: '',
    revisado_por: null
};
```

**Función para eliminar archivo anterior** - Líneas 201-209
- ✅ Cambiado `existente.url` → `existente.url_archivo || existente.ruta_archivo`
- ✅ Usa `ruta_archivo` directamente cuando está disponible

**Función `descargarDocumento()`** - Línea 297
- ✅ Cambiado `doc.url` → `doc.url_archivo || doc.url || doc.contenido`

**Función `eliminarDocumentoCompleto()`** - Líneas 318-327
- ✅ Cambiado `doc.url` → `doc.url_archivo || doc.ruta_archivo`

---

### 2. [js/admin.js](js/admin.js)

**Función para mostrar expediente** - Líneas 1417-1443

**ANTES:**
```javascript
const urlArchivo = realDoc.contenido || realDoc.urlArchivo;
<p class="doc-filename">${realDoc.nombreArchivo || 'documento.pdf'}</p>
<span>Subido: ${formatearFechaHora(realDoc.fechaCarga)}</span>
${realDoc.fechaRevision ? ... : ''}
```

**DESPUÉS:**
```javascript
const urlArchivo = realDoc.url_archivo || realDoc.contenido || realDoc.urlArchivo;
<p class="doc-filename">${realDoc.nombre_archivo || realDoc.nombreArchivo || 'documento.pdf'}</p>
<span>Subido: ${formatearFechaHora(realDoc.fecha_carga || realDoc.fechaCarga)}</span>
${(realDoc.fecha_revision || realDoc.fechaRevision) ? ... : ''}
```

✅ Mantiene compatibilidad con nombres antiguos usando fallback

---

### 3. [js/visor-documentos.js](js/visor-documentos.js)

**Mostrar información del documento** - Línea 90
- ✅ `documento.numeroControl` → `documento.numero_control || documento.numeroControl`
- ✅ `documento.fechaCarga` → `documento.fecha_carga || documento.fechaCarga || documento.fecha_creacion`

**Descargar documento** - Líneas 254-256
- ✅ `documento.urlArchivo` → `documento.url_archivo || documento.urlArchivo || documento.contenido`
- ✅ `documento.nombreArchivo` → `documento.nombre_archivo || documento.nombreArchivo`

---

### 4. [js/reportes.js](js/reportes.js)

**Filtrar documentos por fecha** - Línea 36
- ✅ `d.fechaCarga` → `d.fecha_carga || d.fechaCarga`

**Exportar reporte de documentos** - Líneas 182-185
- ✅ `d.numeroControl` → `d.numero_control || d.numeroControl`
- ✅ `d.tipoDocumento` → `d.tipo_documento || d.tipoDocumento`
- ✅ `d.fechaCarga` → `d.fecha_carga || d.fechaCarga`

---

## 📋 Tabla de Nombres Corregidos

| ❌ Nombre Antiguo (camelCase) | ✅ Nombre Nuevo (snake_case) |
|-------------------------------|------------------------------|
| `numeroControl`               | `numero_control`             |
| `tipoDocumento`               | `tipo_documento`             |
| `nombreArchivo`               | `nombre_archivo`             |
| `urlArchivo` o `url`          | `url_archivo`                |
| `rutaArchivo`                 | `ruta_archivo`               |
| `fechaCarga`                  | `fecha_carga`                |
| `fechaRevision`               | `fecha_revision`             |
| `revisadoPor`                 | `revisado_por`               |
| `fechaCreacion`               | `fecha_creacion`             |
| `fechaActualizacion`          | `fecha_actualizacion`        |

---

## 🔄 Compatibilidad hacia Atrás

Todas las correcciones incluyen **fallback** a los nombres antiguos:

```javascript
// Ejemplo de fallback
const url = doc.url_archivo || doc.urlArchivo || doc.url;
const nombre = doc.nombre_archivo || doc.nombreArchivo;
const fecha = doc.fecha_carga || doc.fechaCarga;
```

Esto asegura que:
- ✅ Los nuevos datos usan snake_case (correcto para la BD)
- ✅ Los datos antiguos en localStorage aún funcionan
- ✅ No se rompe la funcionalidad existente

---

## 🧪 Probar la Corrección

### 1. Crear Nuevo Documento
1. Inicia sesión como alumno
2. Ve a la sección de documentos
3. Sube un archivo PDF
4. **Resultado esperado:** ✅ Se sube sin errores

### 2. Verificar en Base de Datos
```sql
SELECT 
    id,
    numero_control,
    tipo_documento,
    nombre_archivo,
    url_archivo,
    ruta_archivo,
    estado,
    fecha_carga
FROM documentos
ORDER BY fecha_carga DESC
LIMIT 5;
```

**Resultado esperado:** Todas las columnas deben tener valores correctos

### 3. Ver como Admin
1. Inicia sesión como admin
2. Ve a "Expedientes" o "Documentos"
3. Visualiza los documentos subidos
4. **Resultado esperado:** ✅ Se muestran correctamente con nombres y fechas

### 4. Descargar Documento
1. Haz clic en "Descargar" en cualquier documento
2. **Resultado esperado:** ✅ Se descarga con el nombre correcto

---

## ✅ Estado Actual

- ✅ Credenciales de Supabase actualizadas
- ✅ Script SQL completo ejecutado
- ✅ Bucket 'documentos' creado
- ✅ Usuario admin creado
- ✅ Usuario alumno creado
- ✅ **Código JavaScript corregido para carga de documentos**

---

## 🎉 Siguiente Paso

**Abre la aplicación y prueba subir un documento:**

1. Abre [index.html](index.html) en tu navegador
2. Inicia sesión como alumno: `alumno01@paginadoc.com`
3. Ve a la sección de documentos
4. Sube un PDF
5. Verifica que se suba correctamente sin errores

Si todo funciona, el sistema está completamente operativo! 🚀

---

**Fecha de corrección:** 17 de febrero de 2026  
**Archivos modificados:** 4  
**Líneas corregidas:** ~20+
