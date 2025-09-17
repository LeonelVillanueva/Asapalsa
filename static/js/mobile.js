// ========================================
// ASAPALSA Analytics - Mobile JavaScript
// ========================================

// Variables globales
let mobileData = null;
let mobileColumns = [];
let mobileChartType = null;
let mobileChart = null;

// ========================================
// Inicialización
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ASAPALSA Analytics Mobile iniciado');
    initializeMobileApp();
});

function initializeMobileApp() {
    // Configurar eventos de drag and drop
    setupMobileDragAndDrop();
    
    // Configurar eventos de botones
    setupMobileEventListeners();
    
    // Mostrar mensaje de bienvenida
    showMobileWelcomeMessage();
}

// ========================================
// Drag and Drop para móviles
// ========================================

function setupMobileDragAndDrop() {
    const uploadArea = document.getElementById('mobileUploadArea');
    const fileInput = document.getElementById('mobileFileInput');
    
    if (!uploadArea || !fileInput) return;
    
    // Eventos de touch para móviles
    uploadArea.addEventListener('touchstart', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('touchend', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        fileInput.click();
    });
    
    // Evento de selección de archivo
    fileInput.addEventListener('change', function(e) {
        handleMobileFileSelect(e.target.files[0]);
    });
    
    // Eventos de click
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
}

// ========================================
// Manejo de archivos
// ========================================

function handleMobileFileSelect(file) {
    if (!file) return;
    
    console.log('📁 Archivo seleccionado:', file.name);
    
    // Mostrar información del archivo
    showMobileFileInfo(file);
    
    // Procesar archivo
    processMobileFile(file);
}

function showMobileFileInfo(file) {
    const fileInfo = document.getElementById('mobileFileInfo');
    const fileName = document.getElementById('mobileFileName');
    const fileSize = document.getElementById('mobileFileSize');
    
    if (fileInfo && fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.remove('d-none');
        fileInfo.classList.add('fade-in');
    }
}

function clearMobileFile() {
    const fileInput = document.getElementById('mobileFileInput');
    const fileInfo = document.getElementById('mobileFileInfo');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.classList.add('d-none');
    
    // Limpiar datos
    mobileData = null;
    mobileColumns = [];
    
    // Ocultar opciones de gráfico
    const chartOptions = document.getElementById('mobileChartOptions');
    if (chartOptions) chartOptions.classList.add('d-none');
    
    // Limpiar resumen
    clearMobileSummary();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========================================
// Procesamiento de datos
// ========================================

function processMobileFile(file) {
    showMobileLoading('Procesando archivo...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideMobileLoading();
        
        if (data.success) {
            mobileData = data.data;
            mobileColumns = data.columns;
            
            console.log('✅ Datos procesados:', mobileData.length, 'filas');
            console.log('📊 Columnas disponibles:', mobileColumns);
            
            // Mostrar opciones de gráfico
            showMobileChartOptions();
            
            // Generar resumen
            generateMobileSummary();
            
            // Mostrar mensaje de éxito
            showMobileSuccess('Archivo procesado correctamente');
            
        } else {
            showMobileError(data.error || 'Error al procesar el archivo');
        }
    })
    .catch(error => {
        hideMobileLoading();
        console.error('❌ Error:', error);
        showMobileError('Error al procesar el archivo');
    });
}

// ========================================
// Opciones de gráfico
// ========================================

function showMobileChartOptions() {
    const chartOptions = document.getElementById('mobileChartOptions');
    const xColumn = document.getElementById('mobileXColumn');
    const yColumn = document.getElementById('mobileYColumn');
    
    if (!chartOptions || !xColumn || !yColumn) return;
    
    // Limpiar opciones anteriores
    xColumn.innerHTML = '<option value="">Seleccionar columna X</option>';
    yColumn.innerHTML = '<option value="">Seleccionar columna Y</option>';
    
    // Llenar opciones con columnas disponibles
    mobileColumns.forEach(column => {
        const optionX = document.createElement('option');
        optionX.value = column;
        optionX.textContent = column;
        xColumn.appendChild(optionX);
        
        const optionY = document.createElement('option');
        optionY.value = column;
        optionY.textContent = column;
        yColumn.appendChild(optionY);
    });
    
    // Mostrar opciones
    chartOptions.classList.remove('d-none');
    chartOptions.classList.add('fade-in');
}

function selectMobileChart(chartType) {
    console.log('📊 Tipo de gráfico seleccionado:', chartType);
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.mobile-chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Agregar clase active al botón seleccionado
    const selectedBtn = document.querySelector(`[data-chart="${chartType}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    mobileChartType = chartType;
    
    // Mostrar opciones de gráfico si hay datos
    if (mobileData && mobileData.length > 0) {
        showMobileChartOptions();
    }
}

// ========================================
// Generación de gráficos
// ========================================

function generateMobileChart() {
    if (!mobileChartType) {
        showMobileError('Por favor selecciona un tipo de gráfico');
        return;
    }
    
    const xColumn = document.getElementById('mobileXColumn').value;
    const yColumn = document.getElementById('mobileYColumn').value;
    const chartTitle = document.getElementById('mobileChartTitle').value || 'Gráfico Generado';
    
    if (!xColumn || !yColumn) {
        showMobileError('Por favor selecciona las columnas X e Y');
        return;
    }
    
    console.log('📊 Generando gráfico:', {
        type: mobileChartType,
        x: xColumn,
        y: yColumn,
        title: chartTitle
    });
    
    showMobileLoading('Generando gráfico...');
    
    // Preparar datos para el gráfico
    const chartData = prepareMobileChartData(xColumn, yColumn);
    
    // Generar gráfico
    generateMobileChartVisualization(chartData, chartTitle);
    
    hideMobileLoading();
}

function prepareMobileChartData(xColumn, yColumn) {
    const xData = mobileData.map(row => row[xColumn]);
    const yData = mobileData.map(row => row[yColumn]);
    
    return {
        x: xData,
        y: yData,
        xLabel: xColumn,
        yLabel: yColumn
    };
}

function generateMobileChartVisualization(data, title) {
    const container = document.getElementById('mobileChartContainer');
    const titleElement = document.getElementById('mobileChartDisplayTitle');
    
    if (!container) return;
    
    // Limpiar contenedor anterior
    container.innerHTML = '';
    
    // Actualizar título
    if (titleElement) {
        titleElement.textContent = title;
    }
    
    // Crear canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'mobileChartCanvas';
    canvas.width = 400;
    canvas.height = 300;
    container.appendChild(canvas);
    
    // Configurar Chart.js
    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (mobileChart) {
        mobileChart.destroy();
    }
    
    // Crear nuevo gráfico
    mobileChart = new Chart(ctx, {
        type: mobileChartType,
        data: {
            labels: data.x,
            datasets: [{
                label: data.yLabel,
                data: data.y,
                backgroundColor: getMobileChartColors(mobileChartType),
                borderColor: '#2d5016',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: data.xLabel
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: data.yLabel
                    }
                }
            }
        }
    });
    
    // Mostrar sección de gráfico
    const chartDisplay = document.getElementById('mobile-chart-display');
    if (chartDisplay) {
        chartDisplay.classList.remove('d-none');
        chartDisplay.classList.add('fade-in');
        
        // Scroll suave a la sección
        chartDisplay.scrollIntoView({ behavior: 'smooth' });
    }
}

function getMobileChartColors(chartType) {
    const colors = {
        line: 'rgba(45, 80, 22, 0.1)',
        bar: 'rgba(45, 80, 22, 0.8)',
        pie: ['#2d5016', '#4a7c59', '#6b8e23', '#8fbc8f', '#98fb98'],
        scatter: 'rgba(45, 80, 22, 0.6)',
        histogram: 'rgba(45, 80, 22, 0.8)',
        box: 'rgba(45, 80, 22, 0.8)'
    };
    
    return colors[chartType] || 'rgba(45, 80, 22, 0.8)';
}

// ========================================
// Resumen de datos
// ========================================

function generateMobileSummary() {
    if (!mobileData || mobileData.length === 0) return;
    
    const summaryCards = document.getElementById('mobileSummaryCards');
    if (!summaryCards) return;
    
    // Limpiar resumen anterior
    summaryCards.innerHTML = '';
    
    // Calcular estadísticas
    const stats = calculateMobileStatistics();
    
    // Crear tarjetas de resumen
    const summaryData = [
        {
            icon: 'fas fa-database',
            value: mobileData.length.toLocaleString(),
            label: 'Total Filas'
        },
        {
            icon: 'fas fa-columns',
            value: mobileColumns.length,
            label: 'Columnas'
        },
        {
            icon: 'fas fa-chart-line',
            value: stats.numericColumns,
            label: 'Columnas Numéricas'
        },
        {
            icon: 'fas fa-calendar',
            value: stats.dateColumns,
            label: 'Columnas de Fecha'
        }
    ];
    
    summaryData.forEach(item => {
        const card = createMobileSummaryCard(item);
        summaryCards.appendChild(card);
    });
    
    // Mostrar resumen
    summaryCards.classList.add('fade-in');
}

function calculateMobileStatistics() {
    let numericColumns = 0;
    let dateColumns = 0;
    
    mobileColumns.forEach(column => {
        const sampleValues = mobileData.slice(0, 10).map(row => row[column]);
        const hasNumbers = sampleValues.some(val => !isNaN(parseFloat(val)) && isFinite(val));
        const hasDates = sampleValues.some(val => {
            const date = new Date(val);
            return !isNaN(date.getTime());
        });
        
        if (hasNumbers) numericColumns++;
        if (hasDates) dateColumns++;
    });
    
    return {
        numericColumns,
        dateColumns
    };
}

function createMobileSummaryCard(data) {
    const card = document.createElement('div');
    card.className = 'mobile-summary-card';
    
    card.innerHTML = `
        <div class="icon">
            <i class="${data.icon}"></i>
        </div>
        <div class="value">${data.value}</div>
        <div class="label">${data.label}</div>
    `;
    
    return card;
}

function clearMobileSummary() {
    const summaryCards = document.getElementById('mobileSummaryCards');
    if (summaryCards) {
        summaryCards.innerHTML = '';
    }
}

// ========================================
// Utilidades de UI
// ========================================

function showMobileLoading(message = 'Cargando...') {
    const modal = document.getElementById('mobileLoadingModal');
    const title = modal.querySelector('.mobile-modal-title');
    const text = modal.querySelector('.mobile-modal-text');
    
    if (title) title.textContent = message;
    if (text) text.textContent = 'Por favor espera...';
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function hideMobileLoading() {
    const modal = document.getElementById('mobileLoadingModal');
    const bsModal = bootstrap.Modal.getInstance(modal);
    if (bsModal) bsModal.hide();
}

function showMobileSuccess(message) {
    showMobileToast(message, 'success');
}

function showMobileError(message) {
    showMobileToast(message, 'error');
}

function showMobileToast(message, type = 'info') {
    // Crear toast si no existe
    let toastContainer = document.getElementById('mobileToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'mobileToastContainer';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Crear toast
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Mostrar toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remover toast después de que se oculte
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function showMobileWelcomeMessage() {
    setTimeout(() => {
        showMobileSuccess('¡Bienvenido a ASAPALSA Analytics Mobile!');
    }, 1000);
}

// ========================================
// Navegación suave
// ========================================

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ========================================
// Event Listeners
// ========================================

function setupMobileEventListeners() {
    // Botones de navegación
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
    
    // Botones de gráfico
    document.querySelectorAll('.mobile-chart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartType = this.getAttribute('data-chart');
            selectMobileChart(chartType);
        });
    });
}

// ========================================
// Descarga de gráficos
// ========================================

function downloadMobileChart() {
    if (!mobileChart) {
        showMobileError('No hay gráfico para descargar');
        return;
    }
    
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.download = `asapalsa-chart-${Date.now()}.png`;
    link.href = mobileChart.toBase64Image();
    link.click();
    
    showMobileSuccess('Gráfico descargado correctamente');
}

// ========================================
// Utilidades adicionales
// ========================================

function formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES').format(new Date(date));
}

// ========================================
// Debug y logging
// ========================================

function logMobileDebug(message, data = null) {
    if (data) {
        console.log(`🔍 [Mobile Debug] ${message}`, data);
    } else {
        console.log(`🔍 [Mobile Debug] ${message}`);
    }
}

// Exportar funciones globales
window.mobileApp = {
    selectMobileChart,
    generateMobileChart,
    clearMobileFile,
    downloadMobileChart,
    scrollToSection
};
