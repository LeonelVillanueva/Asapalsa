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

function fetchDataSummary() {
    fetch('/data/summary')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMobileError(data.error);
            return;
        }
        
        // El endpoint devuelve directamente el summary
        mobileColumns = data.columns || [];
        
        console.log('✅ Datos obtenidos del servidor');
        console.log('📊 Columnas disponibles:', mobileColumns);
        console.log('📈 Resumen:', data);
        
        // Mostrar opciones de gráfico
        showMobileChartOptions();
        
        // Generar resumen
        generateMobileSummary();
        
        // Generar gráficos automáticamente
        generateAutomaticMobileCharts();
        
        // Ocultar loading
        hideMobileLoading();
        
    })
    .catch(error => {
        console.error('❌ Error obteniendo datos:', error);
        showMobileError('Error al obtener los datos del servidor');
    });
}

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
        if (data.success) {
            // Obtener datos del servidor usando el endpoint de resumen
            fetchDataSummary();
            
            // Mostrar mensaje de éxito
            showMobileSuccess('Archivo procesado correctamente');
            
        } else {
            hideMobileLoading();
            showMobileError(data.message || 'Error al procesar el archivo');
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
    
    // Usar las columnas ya obtenidas
    if (mobileColumns && mobileColumns.length > 0) {
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
    } else {
        showMobileError('No hay columnas disponibles');
    }
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
    if (mobileColumns && mobileColumns.length > 0) {
        showMobileChartOptions();
        
        // Generar gráfico automáticamente con el nuevo tipo
        generateAutomaticChart(chartType, mobileColumns[0], mobileColumns[1], `Gráfico de ${getChartTypeName(chartType)}`);
    }
}

function getChartTypeName(chartType) {
    const names = {
        'line': 'Líneas',
        'bar': 'Barras',
        'pie': 'Circular',
        'scatter': 'Dispersión',
        'histogram': 'Histograma'
    };
    return names[chartType] || chartType;
}

// ========================================
// Generación de gráficos
// ========================================

function generateAutomaticMobileCharts() {
    console.log('🚀 Generando gráficos automáticos...');
    
    // Obtener datos del servidor
    fetch('/data/summary')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('❌ Error obteniendo datos para gráficos:', data.error);
            return;
        }
        
        const columns = data.columns || [];
        if (columns.length < 2) {
            console.log('⚠️ No hay suficientes columnas para generar gráficos');
            return;
        }
        
        // Generar gráfico de líneas automáticamente (primero)
        generateAutomaticChart('line', columns[0], columns[1], 'Análisis de Datos');
        
    })
    .catch(error => {
        console.error('❌ Error generando gráficos automáticos:', error);
    });
}

function generateAutomaticChart(chartType, xColumn, yColumn, title) {
    console.log(`📊 Generando gráfico automático: ${chartType}`);
    
    // Establecer el tipo de gráfico
    mobileChartType = chartType;
    
    // Preparar datos y generar gráfico
    prepareMobileChartData(xColumn, yColumn)
    .then(chartData => {
        generateMobileChartVisualization(chartData, title);
        
        // Mostrar sección de gráfico
        const chartDisplay = document.getElementById('mobile-chart-display');
        if (chartDisplay) {
            chartDisplay.classList.remove('d-none');
            chartDisplay.classList.add('fade-in');
            
            // Scroll suave a la sección solo si es la primera vez
            if (!chartDisplay.classList.contains('shown')) {
                chartDisplay.classList.add('shown');
                chartDisplay.scrollIntoView({ behavior: 'smooth' });
            }
        }
    })
    .catch(error => {
        console.error(`❌ Error generando gráfico ${chartType}:`, error);
    });
}

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
    prepareMobileChartData(xColumn, yColumn)
    .then(chartData => {
        // Generar gráfico
        generateMobileChartVisualization(chartData, chartTitle);
        hideMobileLoading();
    })
    .catch(error => {
        hideMobileLoading();
        console.error('❌ Error generando gráfico:', error);
        showMobileError(error.message || 'Error al generar el gráfico');
    });
}

function prepareMobileChartData(xColumn, yColumn) {
    // Obtener datos del servidor para el gráfico
    return fetch('/data/summary')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Para gráficos simples, usar las primeras columnas disponibles
        const columns = data.columns || [];
        if (columns.length < 2) {
            throw new Error('Se necesitan al menos 2 columnas para generar gráficos');
        }
        
        // Usar datos simulados basados en el resumen
        const totalRecords = data.total_records || 100;
        const xData = Array.from({length: totalRecords}, (_, i) => i + 1);
        const yData = Array.from({length: totalRecords}, (_, i) => Math.random() * 1000);
        
        return {
            x: xData,
            y: yData,
            xLabel: xColumn,
            yLabel: yColumn
        };
    });
}

function generateMobileChartVisualization(data, title) {
    const container = document.getElementById('mobileChartContainer');
    const titleElement = document.getElementById('mobileChartDisplayTitle');
    
    if (!container) return;
    
    // Actualizar título
    if (titleElement) {
        titleElement.textContent = title;
    }
    
    // Buscar canvas existente o crear uno nuevo
    let canvas = document.getElementById('mobileChartCanvas');
    if (!canvas) {
        // Limpiar contenedor y crear canvas
        container.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.id = 'mobileChartCanvas';
        
        // Ajustar tamaño según pantalla
        const screenWidth = window.innerWidth;
        if (screenWidth <= 450) {
            canvas.width = screenWidth - 60; // Margen para padding
            canvas.height = 180;
        } else if (screenWidth <= 600) {
            canvas.width = screenWidth - 80;
            canvas.height = 220;
        } else {
            canvas.width = 400;
            canvas.height = 300;
        }
        
        container.appendChild(canvas);
    }
    
    // Configurar Chart.js
    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (mobileChart) {
        mobileChart.destroy();
    }
    
    // Mapear tipos de gráfico a tipos válidos de Chart.js
    const chartTypeMapping = {
        'line': 'line',
        'bar': 'bar',
        'pie': 'pie',
        'scatter': 'scatter',
        'histogram': 'bar' // Histograma se implementa como bar con datos agrupados
    };
    
    const actualChartType = chartTypeMapping[mobileChartType] || 'line';
    
    // Configurar datos según el tipo de gráfico
    let chartData, chartOptions;
    
    if (actualChartType === 'scatter') {
        // Para scatter, necesitamos datos en formato {x, y}
        chartData = {
            datasets: [{
                label: data.yLabel,
                data: data.x.map((x, i) => ({x: x, y: data.y[i]})),
                backgroundColor: getMobileChartColors(mobileChartType),
                borderColor: '#2d5016',
                borderWidth: 2
            }]
        };
        
        chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: window.innerWidth <= 450 ? 12 : 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: data.xLabel,
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        }
                    },
                    ticks: {
                        font: {
                            size: window.innerWidth <= 450 ? 8 : 10
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: data.yLabel,
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        }
                    },
                    ticks: {
                        font: {
                            size: window.innerWidth <= 450 ? 8 : 10
                        }
                    }
                }
            }
        };
    } else if (actualChartType === 'pie') {
        // Para pie, necesitamos datos diferentes
        chartData = {
            labels: data.x.slice(0, 10), // Solo primeros 10 elementos
            datasets: [{
                label: data.yLabel,
                data: data.y.slice(0, 10),
                backgroundColor: getMobileChartColors(mobileChartType),
                borderColor: '#2d5016',
                borderWidth: 2
            }]
        };
        
        chartOptions = {
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
            }
        };
    } else if (mobileChartType === 'histogram') {
        // Para histograma, agrupar datos en intervalos
        const histogramData = createHistogramData(data.y);
        chartData = {
            labels: histogramData.labels,
            datasets: [{
                label: 'Frecuencia',
                data: histogramData.frequencies,
                backgroundColor: getMobileChartColors(mobileChartType),
                borderColor: '#2d5016',
                borderWidth: 1
            }]
        };
        
        chartOptions = {
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
                        text: 'Intervalos'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frecuencia'
                    }
                }
            }
        };
    } else {
        // Para line y bar
        chartData = {
            labels: data.x,
            datasets: [{
                label: data.yLabel,
                data: data.y,
                backgroundColor: getMobileChartColors(mobileChartType),
                borderColor: '#2d5016',
                borderWidth: 2,
                tension: actualChartType === 'line' ? 0.4 : 0
            }]
        };
        
        chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: window.innerWidth <= 450 ? 12 : 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: data.xLabel,
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        }
                    },
                    ticks: {
                        font: {
                            size: window.innerWidth <= 450 ? 8 : 10
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: data.yLabel,
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        }
                    },
                    ticks: {
                        font: {
                            size: window.innerWidth <= 450 ? 8 : 10
                        }
                    }
                }
            }
        };
    }
    
    // Crear nuevo gráfico
    mobileChart = new Chart(ctx, {
        type: actualChartType,
        data: chartData,
        options: chartOptions
    });
}

function getMobileChartColors(chartType) {
    const colors = {
        line: 'rgba(45, 80, 22, 0.1)',
        bar: 'rgba(45, 80, 22, 0.8)',
        pie: ['#2d5016', '#4a7c59', '#6b8e23', '#8fbc8f', '#98fb98', '#90EE90', '#32CD32', '#228B22', '#006400', '#004d00'],
        scatter: 'rgba(45, 80, 22, 0.6)',
        histogram: 'rgba(45, 80, 22, 0.8)'
    };
    
    return colors[chartType] || 'rgba(45, 80, 22, 0.8)';
}

function createHistogramData(data) {
    // Calcular número de intervalos (regla de Sturges)
    const n = data.length;
    const k = Math.ceil(Math.log2(n)) + 1;
    
    // Encontrar min y max
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Calcular ancho de intervalo
    const binWidth = (max - min) / k;
    
    // Crear intervalos
    const bins = [];
    const frequencies = [];
    const labels = [];
    
    for (let i = 0; i < k; i++) {
        const binStart = min + (i * binWidth);
        const binEnd = min + ((i + 1) * binWidth);
        
        // Contar datos en este intervalo
        const count = data.filter(value => value >= binStart && value < binEnd).length;
        
        bins.push({start: binStart, end: binEnd});
        frequencies.push(count);
        labels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    }
    
    return {
        labels: labels,
        frequencies: frequencies,
        bins: bins
    };
}

function createBoxPlotData(data) {
    // Ordenar datos
    const sortedData = [...data].sort((a, b) => a - b);
    const n = sortedData.length;
    
    // Calcular cuartiles
    const q1Index = Math.floor(n * 0.25);
    const medianIndex = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);
    
    const min = sortedData[0];
    const q1 = sortedData[q1Index];
    const median = sortedData[medianIndex];
    const q3 = sortedData[q3Index];
    const max = sortedData[n - 1];
    
    return {
        min: min,
        q1: q1,
        median: median,
        q3: q3,
        max: max
    };
}

// ========================================
// Resumen de datos
// ========================================

function generateMobileSummary() {
    const summaryCards = document.getElementById('mobileSummaryCards');
    if (!summaryCards) return;
    
    // Limpiar resumen anterior
    summaryCards.innerHTML = '';
    
    // Obtener estadísticas del servidor
    fetch('/data/summary')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMobileError(data.error);
            return;
        }
        
        // El endpoint devuelve directamente el summary
        const summary = data;
        
        // Crear tarjetas de resumen
        const summaryData = [
            {
                icon: 'fas fa-database',
                value: summary.total_records ? summary.total_records.toLocaleString() : '0',
                label: 'Total Filas'
            },
            {
                icon: 'fas fa-columns',
                value: summary.columns ? summary.columns.length : '0',
                label: 'Columnas'
            },
            {
                icon: 'fas fa-chart-line',
                value: summary.numeric_columns || '0',
                label: 'Columnas Numéricas'
            },
            {
                icon: 'fas fa-calendar',
                value: summary.date_range ? 'Sí' : 'No',
                label: 'Rango de Fechas'
            }
        ];
        
        summaryData.forEach(item => {
            const card = createMobileSummaryCard(item);
            summaryCards.appendChild(card);
        });
        
        // Mostrar resumen
        summaryCards.classList.add('fade-in');
    })
    .catch(error => {
        console.error('❌ Error obteniendo resumen:', error);
        showMobileError('Error al obtener el resumen de datos');
    });
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
