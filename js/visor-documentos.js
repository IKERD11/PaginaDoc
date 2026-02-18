// Sistema de vista previa de documentos

// Abrir modal con vista previa del documento
async function verVistaPrevia(documentoId) {
    console.log('Solicitando vista previa para ID:', documentoId);
    if (typeof mostrarToast === 'function') mostrarToast('Cargando vista previa...', 'info');

    if (!documentoId || documentoId === 'undefined' || documentoId === 'null') {
        console.error('ID de documento no válido:', documentoId);
        if (typeof mostrarToast === 'function') mostrarToast('ID de documento no válido', 'error');
        return;
    }

    // Obtener documento desde Firestore (vía la función unificada en documentos.js)
    const documento = await obtenerDocumentoPorId(documentoId);

    if (!documento) {
        console.error('Documento no encontrado para ID:', documentoId);
        if (typeof mostrarToast === 'function') mostrarToast('Documento no encontrado', 'error');
        return;
    }

    // Obtener información del tipo de documento
    const documentosRequeridos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];
    const tipoDoc = documentosRequeridos.find(d => d.id === documento.tipoDocumento);
    const nombreDocumento = tipoDoc ? tipoDoc.nombre : (documento.tipoDocumento || 'Documento');

    // Crear modal
    const modalContainer = document.getElementById('modalContainer') || document.body;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay glass-entrance';
    modal.id = 'vistaPrevia-modal';
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    });

    const obsHtml = documento.observaciones ? `
        <div class="visor-obs" style="background: rgba(255, 255, 255, 0.05); border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4 style="color: #f59e0b; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;"><i class="fas fa-comment-dots"></i> Observaciones del Administrador</h4>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px;">${documento.observaciones}</p>
        </div>
    ` : '';

    modal.innerHTML = `
        <div class="modal modal-visor glass-card" style="width: 100%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
            <div class="modal-header" style="padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                <h3 style="margin: 0; color: white;"><i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 10px;"></i> ${nombreDocumento}</h3>
                <button class="modal-close" onclick="cerrarModal()" style="background: rgba(255, 255, 255, 0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; transition: all 0.3s;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body modal-body-visor" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0; background: #0f172a;">
                <div class="visor-container" id="visor-container" style="flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 20px; position: relative;">
                    <canvas id="pdf-canvas" style="box-shadow: 0 0 30px rgba(0,0,0,0.5); max-width: 100%;"></canvas>
                </div>
                <div class="visor-controls" style="padding: 15px; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; gap: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button id="prev-page" class="btn-control" title="Página anterior" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="page-info" class="page-info" style="color: white; font-weight: 600; min-width: 120px; text-align: center;">Cargando...</span>
                    <button id="next-page" class="btn-control" title="Página siguiente" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div style="width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 0 10px;"></div>
                    <button id="download-pdf" class="btn-control" title="Descargar" style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">
                        <i class="fas fa-download"></i>
                    </button>
                    <button id="fullscreen-pdf" class="btn-control" title="Pantalla completa" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
            <div class="modal-footer" style="padding: 25px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.6); font-size: 13px;">Información del documento</p>
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 5px 15px; color: white; font-size: 14px;">
                            <span style="color: rgba(255,255,255,0.5);">Alumno:</span> <span>${documento.numero_control || documento.numeroControl}</span>
                            <span style="color: rgba(255,255,255,0.5);">Fecha:</span> <span>${formatearFechaHora(documento.fecha_carga || documento.fechaCarga || documento.fecha_creacion || documento.fechaCreacion)}</span>
                            <span style="color: rgba(255,255,255,0.5);">Estado:</span> <span>${obtenerBadgeEstado(documento.estado)}</span>
                        </div>
                    </div>
                    <div style="flex: 2; min-width: 300px;">
                        ${obsHtml}
                    </div>
                </div>
                <div style="margin-top: 25px; display: flex; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="cerrarModal()" style="padding: 10px 25px; border-radius: 50px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; cursor: pointer; font-weight: 600;">Cerrar Visualizador</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('vistaPrevia-modal');
    if (existingModal) existingModal.remove();

    modalContainer.appendChild(modal);

    // Para buckets privados, generar URL firmada temporal
    let urlDoc = documento.url_archivo || documento.urlArchivo || documento.contenido;
    if (!urlDoc) {
        console.error('No se encontró URL o contenido del documento');
        if (typeof mostrarToast === 'function') mostrarToast('El documento no tiene contenido disponible', 'error');
        cerrarModal();
        return;
    }

    // Si es una URL pública de Supabase Storage (legacy), extraer la ruta
    if (urlDoc.includes('/storage/v1/object/public/documentos/')) {
        const match = urlDoc.match(/\/documentos\/(.+?)(?:\?|$)/);
        if (match && match[1]) {
            urlDoc = match[1]; // Extraer solo la ruta del archivo
            console.log('URL pública detectada, extraída ruta:', urlDoc);
        }
    }

    // Si es una ruta (no URL completa de datos/blob), generar URL firmada
    if (urlDoc && !urlDoc.startsWith('data:') && !urlDoc.startsWith('blob:')) {
        // Verificar si es ruta simple o URL que necesita conversión
        if (!urlDoc.startsWith('http') || urlDoc.includes('/storage/v1/object/')) {
            console.log('Generando URL firmada para ruta:', urlDoc);
            try {
                const resultado = await obtenerURLDescargaSupabase(urlDoc);
                if (resultado.exito) {
                    urlDoc = resultado.url;
                    console.log('URL firmada generada exitosamente');
                } else {
                    console.error('Error al generar URL firmada:', resultado.mensaje);
                    if (typeof mostrarToast === 'function') mostrarToast('Error al acceder al documento', 'error');
                    cerrarModal();
                    return;
                }
            } catch (error) {
                console.error('Error al obtener URL firmada:', error);
                if (typeof mostrarToast === 'function') mostrarToast('Error al cargar el documento', 'error');
                cerrarModal();
                return;
            }
        }
    }

    cargarPDFenVisor(urlDoc, documentoId);

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

// Variables globales para el visor
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;

// Cargar PDF en el visor
function cargarPDFenVisor(contenidoBase64, documentoId) {
    if (!window.pdfjsWorkerLoaded) {
        // Cargar PDF.js desde CDN si no está cargado
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            window.pdfjsWorkerLoaded = true;
            renderizarPDF(contenidoBase64, documentoId);
        };
        document.head.appendChild(script);
    } else {
        renderizarPDF(contenidoBase64, documentoId);
    }
}

// Renderizar PDF en el canvas
function renderizarPDF(contenido, documentoId) {
    let loadingTask;

    // Validar que el contenido existe
    if (!contenido) {
        console.error('Contenido de documento vacío o undefined');
        if (typeof mostrarToast === 'function') mostrarToast('No se pudo cargar el documento', 'error');
        return;
    }

    // Verificar si es una URL o base64
    if (typeof contenido === 'string' && (contenido.startsWith('http') || contenido.startsWith('blob:'))) {
        loadingTask = pdfjsLib.getDocument(contenido);
    } else if (typeof contenido === 'string') {
        // Asumir base64
        try {
            const base64Data = contenido.includes(',') ? contenido.split(',')[1] : contenido;
            const bstr = atob(base64Data);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
                u8arr[i] = bstr.charCodeAt(i);
            }
            loadingTask = pdfjsLib.getDocument(u8arr);
        } catch (error) {
            console.error('Error al decodificar base64:', error);
            if (typeof mostrarToast === 'function') mostrarToast('Error al cargar el documento', 'error');
            return;
        }
    } else {
        console.error('Formato de contenido no reconocido:', typeof contenido);
        if (typeof mostrarToast === 'function') mostrarToast('Formato de documento no válido', 'error');
        return;
    }

    // Cargar PDF
    loadingTask.promise.then(doc => {
        pdfDoc = doc;
        pageNum = 1;

        // Mostrar primera página
        renderPage(pageNum);

        // Agregar event listeners
        document.getElementById('prev-page').addEventListener('click', () => {
            if (pageNum > 1) {
                pageNum--;
                renderPage(pageNum);
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (pageNum < pdfDoc.numPages) {
                pageNum++;
                renderPage(pageNum);
            }
        });

        // Descargar
        document.getElementById('download-pdf').addEventListener('click', () => {
            descargarDocumentoPDF(documentoId);
        });

        // Pantalla completa
        document.getElementById('fullscreen-pdf').addEventListener('click', () => {
            const container = document.getElementById('visor-container');
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
        });

    }).catch(error => {
        mostrarToast('Error al cargar el PDF: ' + error.message, 'error');
        document.getElementById('page-info').textContent = 'Error al cargar el PDF';
    });
}

// Renderizar página específica
function renderPage(num) {
    pageRendering = true;

    pdfDoc.getPage(num).then(page => {
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        page.render({
            canvasContext: context,
            viewport: viewport
        }).promise.then(() => {
            pageRendering = false;

            // Actualizar controles
            document.getElementById('prev-page').disabled = pageNum <= 1;
            document.getElementById('next-page').disabled = pageNum >= pdfDoc.numPages;
            document.getElementById('page-info').textContent = `Página ${pageNum} de ${pdfDoc.numPages}`;

            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        }).catch(error => {
            mostrarToast('Error al renderizar página: ' + error.message, 'error');
        });
    });
}

// Descargar documento
async function descargarDocumentoPDF(documentoId) {
    // Usar la función de descarga unificada de documentos.js si está disponible
    if (typeof descargarDocumento === 'function' && typeof db !== 'undefined') {
        return await descargarDocumento(documentoId);
    }

    const documento = await obtenerDocumentoPorId(documentoId);

    if (!documento) {
        mostrarToast('Documento no encontrado', 'error');
        return;
    }

    let urlDescarga = documento.url_archivo || documento.urlArchivo || documento.contenido;
    
    // Si es una URL pública de Supabase Storage (legacy), extraer la ruta
    if (urlDescarga && urlDescarga.includes('/storage/v1/object/public/documentos/')) {
        const match = urlDescarga.match(/\/documentos\/(.+?)(?:\?|$)/);
        if (match && match[1]) {
            urlDescarga = match[1];
        }
    }
    
    // Si es una ruta (no URL completa de datos/blob), generar URL firmada
    if (urlDescarga && !urlDescarga.startsWith('data:') && !urlDescarga.startsWith('blob:')) {
        if (!urlDescarga.startsWith('http') || urlDescarga.includes('/storage/v1/object/')) {
            try {
                const resultado = await obtenerURLDescargaSupabase(urlDescarga);
                if (resultado.exito) {
                    urlDescarga = resultado.url;
                } else {
                    mostrarToast('Error al generar URL de descarga', 'error');
                    return;
                }
            } catch (error) {
                console.error('Error al obtener URL firmada:', error);
                mostrarToast('Error al preparar la descarga', 'error');
                return;
            }
        }
    }

    // Crear elemento temporal
    const link = document.createElement('a');
    link.href = urlDescarga;
    link.download = documento.nombre_archivo || documento.nombreArchivo || `documento-${documentoId}.pdf`;
    link.click();

    mostrarToast('Descargando documento...', 'success');
}

// Alias para compatibilidad en admin.js y alumno.js
async function descargarDocumento(documentoId) {
    await descargarDocumentoPDF(documentoId);
}
