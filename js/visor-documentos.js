// Sistema de vista previa de documentos

// Abrir modal con vista previa del documento
function verVistaPrevia(documentoId) {
    const documento = obtenerDocumentoPorId(documentoId);
    
    if (!documento) {
        mostrarToast('Documento no encontrado', 'error');
        return;
    }
    
    // Obtener información del tipo de documento
    const documentosRequeridos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];
    const tipoDoc = documentosRequeridos.find(d => d.id === documento.tipoDocumento);
    const nombreDocumento = tipoDoc ? tipoDoc.nombre : documento.tipoDocumento;
    
    // Crear modal
    const modalContainer = document.getElementById('modalContainer');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'vistaPrevia-modal';
    
    modal.innerHTML = `
        <div class="modal modal-visor">
            <div class="modal-header">
                <h3><i class="fas fa-file-pdf"></i> Vista Previa: ${nombreDocumento}</h3>
                <button class="modal-close" onclick="cerrarModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body modal-body-visor">
                <div class="visor-container" id="visor-container">
                    <canvas id="pdf-canvas"></canvas>
                </div>
                <div class="visor-controls">
                    <button id="prev-page" class="btn-control" title="Página anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="page-info" class="page-info">Cargando...</span>
                    <button id="next-page" class="btn-control" title="Página siguiente">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button id="download-pdf" class="btn-control" title="Descargar">
                        <i class="fas fa-download"></i>
                    </button>
                    <button id="fullscreen-pdf" class="btn-control" title="Pantalla completa">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <div class="documento-info">
                    <p><strong>Alumno:</strong> ${documento.numeroControl}</p>
                    <p><strong>Tipo:</strong> ${nombreDocumento}</p>
                    <p><strong>Fecha de carga:</strong> ${formatearFecha(documento.fechaCarga)}</p>
                    <p><strong>Estado:</strong> ${obtenerBadgeEstado(documento.estado)}</p>
                    ${documento.estado === 'rechazado' ? `
                        <p><strong style="color: #ef4444;">Observaciones:</strong> ${documento.observaciones}</p>
                    ` : ''}
                </div>
                <button class="btn-secondary" onclick="cerrarModal()">Cerrar</button>
            </div>
        </div>
    `;
    
    modalContainer.innerHTML = '';
    modalContainer.appendChild(modal);
    
    // Cargar PDF
    cargarPDFenVisor(documento.contenido, documentoId);
    
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
function renderizarPDF(contenidoBase64, documentoId) {
    // Convertir base64 a Uint8Array
    const bstr = atob(contenidoBase64.split(',')[1] || contenidoBase64);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    
    // Cargar PDF
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.getDocument(u8arr).promise.then(doc => {
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
function descargarDocumentoPDF(documentoId) {
    const documento = obtenerDocumentoPorId(documentoId);
    
    if (!documento) {
        mostrarToast('Documento no encontrado', 'error');
        return;
    }
    
    // Crear elemento temporal
    const link = document.createElement('a');
    link.href = documento.contenido;
    link.download = documento.nombreArchivo || `documento-${documentoId}.pdf`;
    link.click();
    
    mostrarToast('Descargando documento...', 'success');
}

// Alias para compatibilidad en admin.js y alumno.js
function descargarDocumento(documentoId) {
    descargarDocumentoPDF(documentoId);
}

// Función para obtener documento (si no existe en storage.js)
function obtenerDocumentoPorId(id) {
    const documentos = JSON.parse(localStorage.getItem('documentos')) || [];
    return documentos.find(d => d.id === id);
}
