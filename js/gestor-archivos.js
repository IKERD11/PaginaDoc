// Sistema de gestión de archivos antes de subir

// Variables globales para gestionar el archivo seleccionado
let archivoSeleccionado = null;
let tipoDocumentoActual = null;

// Manejar selección de archivo
function manejarSeleccionArchivo(tipoDocumento, archivo) {
    if (!archivo) {
        archivoSeleccionado = null;
        tipoDocumentoActual = null;
        return;
    }
    
    // Validar archivo
    const errores = validarArchivo(archivo);
    if (errores.length > 0) {
        mostrarToast(errores.join('\n'), 'error');
        return;
    }
    
    // Guardar archivo seleccionado
    archivoSeleccionado = archivo;
    tipoDocumentoActual = tipoDocumento;
    
    // Mostrar modal de confirmación
    mostrarConfirmacionArchivo(tipoDocumento, archivo);
}

// Mostrar modal con detalles del archivo
function mostrarConfirmacionArchivo(tipoDocumento, archivo) {
    // Obtener información del tipo de documento
    const documentosRequeridos = JSON.parse(localStorage.getItem('documentosRequeridos')) || [];
    const tipoDoc = documentosRequeridos.find(d => d.id === tipoDocumento);
    const nombreDocumento = tipoDoc ? tipoDoc.nombre : tipoDocumento;
    
    const modalContainer = document.getElementById('modalContainer');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal modal-archivo">
            <div class="modal-header">
                <h3><i class="fas fa-file-upload"></i> Confirmar archivo</h3>
                <button class="modal-close" onclick="cerrarModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="archivo-info">
                    <div class="archivo-icono">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="archivo-detalles">
                        <div class="archivo-nombre">
                            <strong>Documento:</strong> ${nombreDocumento}
                        </div>
                        <div class="archivo-fila">
                            <span class="archivo-label">Nombre del archivo:</span>
                            <span class="archivo-valor">${archivo.name}</span>
                        </div>
                        <div class="archivo-fila">
                            <span class="archivo-label">Tamaño:</span>
                            <span class="archivo-valor">${formatearTamano(archivo.size)}</span>
                        </div>
                        <div class="archivo-fila">
                            <span class="archivo-label">Tipo:</span>
                            <span class="archivo-valor">${archivo.type || 'PDF'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="archivo-advertencia">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>Importante:</strong>
                        <p>Verifica que el archivo sea correcto. Una vez enviado, será revisado por el área administrativa.</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="cancelarSeleccionArchivo()">
                    <i class="fas fa-times"></i> Cambiar archivo
                </button>
                <button class="btn-primary" onclick="confirmarSubidaArchivo('${tipoDocumento}')">
                    <i class="fas fa-check"></i> Confirmar y enviar
                </button>
            </div>
        </div>
    `;
    
    modalContainer.innerHTML = '';
    modalContainer.appendChild(modal);
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cancelarSeleccionArchivo();
        }
    });
}

// Cancelar selección de archivo
function cancelarSeleccionArchivo() {
    const tipoDoc = tipoDocumentoActual;
    archivoSeleccionado = null;
    tipoDocumentoActual = null;
    cerrarModal();
    
    // Limpiar input file
    const fileInput = document.getElementById(`file-${tipoDoc}`);
    if (fileInput) {
        fileInput.value = '';
    }
}

// Confirmar subida de archivo
function confirmarSubidaArchivo(tipoDocumento) {
    if (!archivoSeleccionado || !tipoDocumentoActual) {
        mostrarToast('No hay archivo seleccionado', 'error');
        return;
    }
    
    cerrarModal();
    
    // Proceder con la subida
    subirDocumentoAlumno(tipoDocumento, archivoSeleccionado);
    
    // Limpiar variables
    archivoSeleccionado = null;
    tipoDocumentoActual = null;
}

// Función wrapper para el input file
function abrirSelectorArchivo(tipoDocumento) {
    const fileInput = document.getElementById(`file-${tipoDocumento}`);
    if (fileInput) {
        fileInput.click();
    }
}
