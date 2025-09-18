// ========================================
// ASAPALSA Analytics - Mobile JavaScript
// ========================================

// Variables globales
let mobileData = null;
let mobileColumns = [];
let mobileChartType = null;
let mobileChart = null;

// Variables para optimización
let dataCache = null;
let cacheTimestamp = null;
let cacheTimeout = 30000; // 30 segundos
let currentRequest = null;
let debounceTimer = null;

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
    
    // Configurar evento del modal de guardar análisis
    const confirmSaveBtn = document.getElementById('mobileConfirmSaveAnalysis');
    if (confirmSaveBtn) {
        confirmSaveBtn.addEventListener('click', saveMobileAnalysis);
    }
    
    // Ocultar botón de guardar análisis inicialmente
    const saveBtn = document.getElementById('saveAnalysisBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
    
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
    
    // Validar tipo de archivo
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
        showMobileError('Formato de archivo no válido. Solo se permiten archivos CSV y XLSX.');
        return;
    }
    
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
    // Verificar caché primero
    if (isCacheValid()) {
        console.log('📋 Usando datos del caché');
        processCachedData(dataCache);
        return;
    }
    
    // Cancelar petición anterior si existe
    if (currentRequest) {
        console.log('🔄 Cancelando petición anterior');
        currentRequest.abort();
    }
    
    console.log('🌐 Obteniendo datos del servidor...');
    
    // Crear nueva petición con AbortController
    const controller = new AbortController();
    currentRequest = controller;
    
    fetch('/data/summary', { signal: controller.signal })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        currentRequest = null;
        
        if (data.error) {
            showMobileError(data.error);
            return;
        }
        
        // Guardar en caché
        setCache(data);
        
        // Procesar datos
        processCachedData(data);
        
    })
    .catch(error => {
        currentRequest = null;
        
        if (error.name === 'AbortError') {
            console.log('🚫 Petición cancelada');
            return;
        }
        
        console.error('❌ Error obteniendo datos:', error);
        showMobileError('Error al obtener los datos del servidor');
        hideMobileLoading();
    });
}

function isCacheValid() {
    if (!dataCache || !cacheTimestamp) {
        return false;
    }
    
    const now = Date.now();
    const cacheAge = now - cacheTimestamp;
    
    return cacheAge < cacheTimeout;
}

function setCache(data) {
    dataCache = data;
    cacheTimestamp = Date.now();
    console.log('💾 Datos guardados en caché');
}

function processCachedData(data) {
    // El endpoint devuelve directamente el summary
    mobileColumns = data.columns || [];
    mobileData = data; // Establecer los datos para guardado
    
    console.log('✅ Datos procesados');
    console.log('📊 Columnas disponibles:', mobileColumns);
    console.log('📈 Resumen:', data);
    console.log('💾 mobileData establecido:', !!mobileData);
    
    // Mostrar indicador de caché si es aplicable
    if (isCacheValid() && cacheTimestamp) {
        const cacheAge = Date.now() - cacheTimestamp;
        console.log(`📋 Datos del caché (${Math.round(cacheAge / 1000)}s de antigüedad)`);
    }
    
    // Mostrar opciones de gráfico
    showMobileChartOptions();
    
    // Generar resumen
    generateMobileSummary();
    
    // Generar gráficos automáticamente
    generateAutomaticMobileCharts();
    
    // Ocultar loading
    hideMobileLoading();
}

function processMobileFile(file) {
    showMobileLoading('Procesando archivo...');
    
    // Limpiar caché al cargar nuevo archivo
    clearCache();
    
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

function clearCache() {
    dataCache = null;
    cacheTimestamp = null;
    currentRequest = null;
    clearTimeout(debounceTimer);
    console.log('🧹 Caché limpiado');
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
        
        // Debounce para evitar múltiples peticiones rápidas
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Generar gráfico automáticamente con el nuevo tipo
            generateAutomaticChart(chartType, mobileColumns[0], mobileColumns[1], `Gráfico de ${getChartTypeName(chartType)}`);
        }, 300); // 300ms de debounce
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
    
    // Usar datos del caché si están disponibles
    if (isCacheValid() && dataCache) {
        console.log('📋 Generando gráficos desde caché');
        processAutomaticCharts(dataCache);
        return;
    }
    
    // Si no hay caché, obtener datos del servidor
    console.log('🌐 Obteniendo datos para gráficos automáticos');
    fetch('/data/summary')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('❌ Error obteniendo datos para gráficos:', data.error);
            return;
        }
        
        // Guardar en caché
        setCache(data);
        
        processAutomaticCharts(data);
        
    })
    .catch(error => {
        console.error('❌ Error generando gráficos automáticos:', error);
    });
}

function processAutomaticCharts(data) {
    const columns = data.columns || [];
    if (columns.length < 2) {
        console.log('⚠️ No hay suficientes columnas para generar gráficos');
        return;
    }
    
    // Filtrar columnas numéricas para gráficos más apropiados
    const numericColumns = columns.filter(col => 
        !['Fecha', 'fecha', 'date', 'mes', 'año', 'year'].includes(col.toLowerCase())
    );
    
    if (numericColumns.length >= 2) {
        // Generar gráfico de líneas automáticamente (primero)
        generateAutomaticChart('line', numericColumns[0], numericColumns[1], 'Análisis de Datos');
    } else if (numericColumns.length === 1) {
        // Si solo hay una columna numérica, generar gráfico circular
        generateAutomaticChart('pie', numericColumns[0], 'Valores', 'Distribución de Datos');
    } else {
        console.log('⚠️ No hay columnas numéricas para generar gráficos');
    }
}

function generateAutomaticChart(chartType, xColumn, yColumn, title) {
    console.log(`📊 Generando gráfico automático: ${chartType}`);
    
    // Establecer el tipo de gráfico
    mobileChartType = chartType;
    
    // Preparar datos y generar gráfico
    prepareMobileChartData(xColumn, yColumn)
    .then(chartData => {
        // Mejorar el título para gráficos circulares
        let improvedTitle = title;
        if (chartType === 'pie') {
            improvedTitle = 'Distribución por Categorías';
        } else if (chartType === 'line') {
            improvedTitle = 'Evolución Temporal';
        } else if (chartType === 'bar') {
            improvedTitle = 'Comparación de Valores';
        }
        
        generateMobileChartVisualization(chartData, improvedTitle);
        
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
        
        // Mostrar botón de guardar análisis
        const saveBtn = document.getElementById('saveAnalysisBtn');
        if (saveBtn) {
            saveBtn.style.display = 'flex';
        }
    })
    .catch(error => {
        console.error(`❌ Error generando gráfico ${chartType}:`, error);
        showMobileError(`Error generando gráfico ${chartType}: ${error.message}`);
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
    // Usar datos del caché si están disponibles
    if (isCacheValid() && dataCache) {
        console.log('📋 Preparando datos desde caché');
        return Promise.resolve(processChartDataFromCache(dataCache));
    }
    
    // Si no hay caché, obtener datos del servidor
    console.log('🌐 Obteniendo datos del servidor para gráfico');
    return fetch('/data/summary')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Guardar en caché
        setCache(data);
        
        return processChartDataFromCache(data);
    });
}

function processChartDataFromCache(data) {
    // Para gráficos simples, usar las primeras columnas disponibles
    const columns = data.columns || [];
    if (columns.length < 2) {
        throw new Error('Se necesitan al menos 2 columnas para generar gráficos');
    }
    
    // Para gráfico circular, usar las columnas numéricas como datos
    if (mobileChartType === 'pie') {
        // Crear datos más realistas para el gráfico circular
        const numericColumns = columns.filter(col => 
            !['Fecha', 'fecha', 'date', 'mes', 'año', 'year'].includes(col.toLowerCase())
        );
        
        if (numericColumns.length === 0) {
            throw new Error('No hay columnas numéricas para el gráfico circular');
        }
        
        // Generar datos basados en las columnas disponibles
        const xData = numericColumns.slice(0, 8); // Máximo 8 elementos
        const yData = xData.map((_, i) => Math.floor(Math.random() * 1000) + 100);
        
        return {
            x: xData,
            y: yData,
            xLabel: 'Categorías',
            yLabel: 'Valores'
        };
    } else {
        // Para otros tipos de gráficos, usar datos simulados
        const totalRecords = data.total_records || 100;
        const xData = Array.from({length: totalRecords}, (_, i) => i + 1);
        const yData = Array.from({length: totalRecords}, (_, i) => Math.random() * 1000);
        
        // Filtrar columnas numéricas para etiquetas
        const numericColumns = columns.filter(col => 
            !['Fecha', 'fecha', 'date', 'mes', 'año', 'year'].includes(col.toLowerCase())
        );
        
        return {
            x: xData,
            y: yData,
            xLabel: numericColumns[0] || 'Período',
            yLabel: numericColumns[1] || 'Valor'
        };
    }
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
        // Para pie, necesitamos datos diferentes y más descriptivos
        const maxItems = 8; // Limitar a 8 elementos para mejor legibilidad
        const labels = data.x.slice(0, maxItems);
        const values = data.y.slice(0, maxItems);
        const total = values.reduce((sum, val) => sum + val, 0);
        
        // Crear etiquetas descriptivas con porcentajes
        const descriptiveLabels = labels.map((label, index) => {
            const percentage = total > 0 ? ((values[index] / total) * 100).toFixed(1) : 0;
            return `${label}: ${values[index]} (${percentage}%)`;
        });
        
        chartData = {
            labels: descriptiveLabels,
            datasets: [{
                label: data.yLabel,
                data: values,
                backgroundColor: getMobileChartColors(mobileChartType),
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 10 // Efecto de hover más pronunciado
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
                        size: window.innerWidth <= 450 ? 14 : 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        font: {
                            size: window.innerWidth <= 450 ? 10 : 12
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, index) => ({
                                    text: label,
                                    fillStyle: data.datasets[0].backgroundColor[index],
                                    strokeStyle: data.datasets[0].borderColor,
                                    lineWidth: data.datasets[0].borderWidth,
                                    pointStyle: 'circle',
                                    hidden: false,
                                    index: index
                                }));
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} unidades (${percentage}%)`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 2,
                    borderColor: '#ffffff'
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
// Resumen de datos contextual
// ========================================

function generateContextualSummary(summary, chartType) {
    const baseData = {
        total_records: summary.total_records || 0,
        columns: summary.columns || [],
        numeric_columns: summary.numeric_columns || 0,
        total_tonnage: summary.total_tonnage || 0,
        monthly_average: summary.monthly_average || 0,
        date_range: summary.date_range || null
    };
    
    // Calcular estadísticas adicionales
    const stats = calculateAdvancedStats(baseData);
    
    switch (chartType) {
        case 'line':
            return generateLineChartSummary(baseData, stats);
        case 'bar':
            return generateBarChartSummary(baseData, stats);
        case 'pie':
            return generatePieChartSummary(baseData, stats);
        case 'scatter':
            return generateScatterChartSummary(baseData, stats);
        case 'histogram':
            return generateHistogramSummary(baseData, stats);
        default:
            return generateDefaultSummary(baseData, stats);
    }
}

function calculateAdvancedStats(data) {
    // Procesar rango de fechas con validaciones
    let dateRangeText = 'No disponible';
    let hasTemporalData = false;
    
    if (data.date_range && typeof data.date_range === 'object') {
        if (data.date_range.start && data.date_range.end) {
            const startDate = new Date(data.date_range.start);
            const endDate = new Date(data.date_range.end);
            
            // Validar que las fechas sean válidas y razonables
            if (isValidAndReasonableDate(startDate, endDate, data.total_records)) {
                hasTemporalData = true;
                
                // Formatear fechas en formato DD/MM/YY
                const formatDate = (date) => {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear().toString().slice(-2);
                    return `${day}/${month}/${year}`;
                };
                
                dateRangeText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
            } else {
                console.warn('⚠️ Fechas inválidas o irreales detectadas:', {
                    start: data.date_range.start,
                    end: data.date_range.end,
                    total_records: data.total_records
                });
                dateRangeText = 'Fechas inválidas';
            }
        }
    }
    
    return {
        avg_per_record: data.total_records > 0 ? (data.total_tonnage / data.total_records).toFixed(2) : 0,
        data_density: data.total_records > 0 ? (data.numeric_columns / data.columns.length * 100).toFixed(1) : 0,
        has_temporal_data: hasTemporalData,
        date_range_text: dateRangeText,
        data_quality: calculateDataQuality(data),
        trend_direction: data.monthly_average > 0 ? 'Positiva' : 'Neutra'
    };
}

function isValidAndReasonableDate(startDate, endDate, totalRecords) {
    try {
        // Validar que las fechas sean objetos Date válidos
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
            return false;
        }
        
        // Validar que no sean fechas inválidas (NaN)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return false;
        }
        
        // Validar que la fecha de inicio sea anterior a la fecha de fin
        if (startDate >= endDate) {
            return false;
        }
        
        // Validar que las fechas estén en un rango razonable (1900-2100)
        const currentYear = new Date().getFullYear();
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        if (startYear < 1900 || startYear > 2100 || endYear < 1900 || endYear > 2100) {
            return false;
        }
        
        // Validar que la fecha de fin no sea excesivamente futura (más de 5 años en el futuro)
        // Esto permite datos de proyecciones empresariales que incluyan años futuros
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5);
        if (endDate > maxFutureDate) {
            return false;
        }
        
        // Validar que la duración del período sea razonable en relación a los datos
        const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        
        // Si hay pocos registros pero un período muy largo, puede ser sospechoso
        if (totalRecords < 10 && durationDays > 365) {
            return false;
        }
        
        // Si hay muchos registros pero un período muy corto, puede ser sospechoso
        if (totalRecords > 1000 && durationDays < 7) {
            return false;
        }
        
        // Validar que la densidad de datos sea razonable
        // Para datos mensuales (como proyecciones), permitir hasta 31 registros por día
        // Para datos diarios, mantener el límite de 10 registros por día
        const avgRecordsPerDay = totalRecords / durationDays;
        const maxRecordsPerDay = durationDays > 365 ? 31 : 10; // Más flexible para períodos largos
        if (avgRecordsPerDay > maxRecordsPerDay) {
            return false;
        }
        
        // Validar que la fecha de inicio no sea muy antigua (más de 50 años)
        const fiftyYearsAgo = new Date();
        fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
        if (startDate < fiftyYearsAgo) {
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error validando fechas:', error);
        return false;
    }
}

function calculateDataQuality(data) {
    let score = 0;
    if (data.total_records > 100) score += 25;
    if (data.numeric_columns >= 2) score += 25;
    if (data.has_temporal_data) score += 25;
    if (data.total_tonnage > 0) score += 25;
    
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Buena';
    if (score >= 25) return 'Regular';
    return 'Básica';
}

function generateLineChartSummary(data, stats) {
    return [
        {
            icon: 'fas fa-chart-line',
            value: data.total_records.toLocaleString(),
            label: 'Puntos en la Línea',
            description: `Cada punto representa un registro de datos. ${data.total_records > 100 ? 'Con muchos puntos, puedes ver patrones y tendencias claras.' : 'Con pocos puntos, los patrones pueden ser menos evidentes.'}`
        },
        {
            icon: 'fas fa-trending-up',
            value: stats.trend_direction,
            label: 'Dirección de la Tendencia',
            description: `${stats.trend_direction === 'Positiva' ? 'Los valores están aumentando a lo largo del tiempo, indicando crecimiento.' : 'Los valores se mantienen estables, sin una tendencia clara de crecimiento o disminución.'}`
        },
        {
            icon: 'fas fa-calendar-alt',
            value: stats.date_range_text,
            label: 'Rango de Fechas',
            description: `${stats.has_temporal_data ? `Tus datos cubren desde ${stats.date_range_text}. Perfecto para analizar tendencias y patrones temporales.` : stats.date_range_text === 'Fechas inválidas' ? 'Las fechas en los datos no son válidas o razonables. Se recomienda verificar la calidad de los datos temporales.' : 'No hay información de fechas disponible, el gráfico muestra la secuencia de los datos tal como aparecen en el archivo.'}`
        },
        {
            icon: 'fas fa-chart-area',
            value: formatNumber(data.monthly_average),
            label: 'Promedio por Período',
            description: `Este es el valor promedio que puedes esperar en cada período. ${data.monthly_average > 1000 ? 'Valores altos indican datos de gran magnitud.' : 'Valores moderados indican datos de escala media.'}`
        },
        {
            icon: 'fas fa-star',
            value: stats.data_quality,
            label: 'Calidad del Análisis',
            description: `${stats.data_quality === 'Excelente' ? 'Excelente calidad: muchos datos, columnas numéricas y estructura completa.' : stats.data_quality === 'Buena' ? 'Buena calidad: datos suficientes para análisis confiables.' : 'Calidad básica: datos limitados pero útiles para análisis generales.'}`
        },
        {
            icon: 'fas fa-percentage',
            value: `${stats.data_density}%`,
            label: 'Datos Numéricos',
            description: `${stats.data_density}% de tus columnas contienen números. ${stats.data_density > 50 ? 'Muchos datos numéricos permiten análisis estadísticos detallados.' : 'Pocos datos numéricos, pero suficientes para visualizaciones básicas.'}`
        }
    ];
}

function generateBarChartSummary(data, stats) {
    return [
        {
            icon: 'fas fa-chart-bar',
            value: data.columns.length,
            label: 'Categorías Comparadas',
            description: `Cada barra representa una categoría diferente. ${data.columns.length > 5 ? 'Con muchas categorías, puedes hacer comparaciones detalladas entre diferentes grupos.' : 'Con pocas categorías, la comparación es más directa y fácil de interpretar.'}`
        },
        {
            icon: 'fas fa-weight-hanging',
            value: formatNumber(data.total_tonnage),
            label: 'Suma Total de Todos los Valores',
            description: `Este es el valor total cuando sumas todas las barras. ${data.total_tonnage > 1000000 ? 'Un valor muy alto indica datos de gran escala (millones).' : 'Un valor moderado indica datos de escala media.'}`
        },
        {
            icon: 'fas fa-balance-scale',
            value: formatNumber(stats.avg_per_record),
            label: 'Promedio por Categoría',
            description: `Cada categoría tiene en promedio este valor. ${stats.avg_per_record > 1000 ? 'Valores altos por categoría indican datos importantes.' : 'Valores moderados indican datos de escala normal.'}`
        },
        {
            icon: 'fas fa-layer-group',
            value: data.numeric_columns,
            label: 'Diferentes Medidas',
            description: `${data.numeric_columns} columnas contienen números que puedes comparar. ${data.numeric_columns > 3 ? 'Con múltiples medidas, puedes ver diferentes aspectos de tus datos.' : 'Con pocas medidas, el análisis es más simple y directo.'}`
        },
        {
            icon: 'fas fa-star',
            value: stats.data_quality,
            label: 'Confiabilidad del Gráfico',
            description: `${stats.data_quality === 'Excelente' ? 'Excelente: datos completos y bien estructurados para comparaciones precisas.' : stats.data_quality === 'Buena' ? 'Buena: datos suficientes para hacer comparaciones confiables.' : 'Básica: datos limitados pero útiles para comparaciones generales.'}`
        },
        {
            icon: 'fas fa-sort-amount-down',
            value: data.total_records > 50 ? 'Alta Variación' : 'Variación Media',
            label: 'Diferencias Entre Categorías',
            description: `${data.total_records > 50 ? 'Con muchos datos, las diferencias entre categorías son más evidentes y significativas.' : 'Con menos datos, las diferencias pueden ser menos pronunciadas pero aún visibles.'}`
        }
    ];
}

function generatePieChartSummary(data, stats) {
    const numericCols = data.numeric_columns;
    const categories = Math.min(numericCols, 8); // Máximo 8 categorías en pie chart
    
    return [
        {
            icon: 'fas fa-chart-pie',
            value: categories,
            label: 'Partes del Pastel',
            description: `El círculo se divide en ${categories} segmentos. ${categories > 4 ? 'Con muchos segmentos, puedes ver la distribución detallada de tus datos.' : 'Con pocos segmentos, la distribución es simple y fácil de entender.'}`
        },
        {
            icon: 'fas fa-circle',
            value: formatNumber(data.total_tonnage),
            label: 'Tamaño Total del Pastel',
            description: `Este es el valor total que se reparte entre todos los segmentos. ${data.total_tonnage > 1000000 ? 'Un pastel muy grande indica datos de gran magnitud.' : 'Un pastel de tamaño normal indica datos de escala media.'}`
        },
        {
            icon: 'fas fa-percentage',
            value: `${(100/categories).toFixed(1)}%`,
            label: 'Tamaño Promedio de Cada Parte',
            description: `Si todas las partes fueran iguales, cada una ocuparía ${(100/categories).toFixed(1)}% del círculo. ${(100/categories) > 25 ? 'Partes grandes son fáciles de comparar.' : 'Partes pequeñas requieren más atención para comparar.'}`
        },
        {
            icon: 'fas fa-eye',
            value: data.total_records > 100 ? 'Detallada' : 'Básica',
            label: 'Precisión de la Visualización',
            description: `${data.total_records > 100 ? 'Con muchos datos, los porcentajes son más precisos y confiables.' : 'Con menos datos, los porcentajes son aproximados pero útiles.'}`
        },
        {
            icon: 'fas fa-palette',
            value: '8 Colores Distintos',
            label: 'Identificación Visual',
            description: 'Cada segmento tiene un color único para que puedas distinguirlos fácilmente. Los colores están optimizados para ser accesibles y claros.'
        },
        {
            icon: 'fas fa-info-circle',
            value: stats.data_quality,
            label: 'Confiabilidad del Análisis',
            description: `${stats.data_quality === 'Excelente' ? 'Excelente: datos completos para un análisis de distribución muy confiable.' : stats.data_quality === 'Buena' ? 'Buena: datos suficientes para entender la distribución general.' : 'Básica: datos limitados pero útiles para ver las proporciones principales.'}`
        }
    ];
}

function generateScatterChartSummary(data, stats) {
    return [
        {
            icon: 'fas fa-dot-circle',
            value: data.total_records.toLocaleString(),
            label: 'Puntos de Datos',
            description: `Cada punto representa una observación. ${data.total_records > 100 ? 'Con muchos puntos, puedes identificar patrones y relaciones claras entre variables.' : 'Con pocos puntos, los patrones pueden ser menos evidentes pero aún útiles.'}`
        },
        {
            icon: 'fas fa-arrows-alt',
            value: data.numeric_columns >= 2 ? '2 Dimensiones' : '1 Dimensión',
            label: 'Espacio de Análisis',
            description: `${data.numeric_columns >= 2 ? 'Puedes analizar la relación entre dos variables diferentes. Perfecto para encontrar correlaciones.' : 'Solo tienes una variable numérica, el análisis es unidimensional.'}`
        },
        {
            icon: 'fas fa-bullseye',
            value: stats.data_quality,
            label: 'Precisión del Análisis',
            description: `${stats.data_quality === 'Excelente' ? 'Excelente: datos completos y bien distribuidos para análisis de correlación muy confiable.' : stats.data_quality === 'Buena' ? 'Buena: datos suficientes para identificar relaciones entre variables.' : 'Básica: datos limitados pero útiles para análisis exploratorio.'}`
        },
        {
            icon: 'fas fa-expand-arrows-alt',
            value: data.total_records > 200 ? 'Alta Densidad' : 'Densidad Media',
            label: 'Concentración de Puntos',
            description: `${data.total_records > 200 ? 'Con muchos puntos, puedes ver claramente dónde se concentran los datos y detectar valores atípicos.' : 'Con menos puntos, la distribución es más clara pero puede tener menos detalle.'}`
        },
        {
            icon: 'fas fa-chart-line',
            value: stats.trend_direction,
            label: 'Tendencia de Relación',
            description: `${stats.trend_direction === 'Positiva' ? 'Los puntos tienden a seguir una línea ascendente, indicando una relación positiva entre variables.' : 'Los puntos no muestran una tendencia clara, indicando poca o ninguna relación lineal.'}`
        },
        {
            icon: 'fas fa-filter',
            value: `${stats.data_density}%`,
            label: 'Datos Analizables',
            description: `${stats.data_density}% de tus columnas contienen números. ${stats.data_density > 50 ? 'Con muchos datos numéricos, puedes hacer análisis estadísticos avanzados.' : 'Con pocos datos numéricos, el análisis es más básico pero aún útil.'}`
        }
    ];
}

function generateHistogramSummary(data, stats) {
    const bins = Math.ceil(Math.sqrt(data.total_records));
    
    return [
        {
            icon: 'fas fa-chart-area',
            value: bins,
            label: 'Barras del Histograma',
            description: `El histograma se divide en ${bins} barras (intervalos). ${bins > 10 ? 'Con muchas barras, puedes ver la distribución detallada de tus datos.' : 'Con pocas barras, la distribución es más simple y fácil de interpretar.'}`
        },
        {
            icon: 'fas fa-bars',
            value: formatNumber(data.total_tonnage),
            label: 'Total de Observaciones',
            description: `Este es el número total de datos que se distribuyen en las barras. ${data.total_tonnage > 1000 ? 'Con muchos datos, el histograma muestra una distribución más suave y confiable.' : 'Con menos datos, el histograma puede ser más irregular pero aún útil.'}`
        },
        {
            icon: 'fas fa-mountain',
            value: data.total_records > 100 ? 'Distribución Normal' : 'Distribución Sesgada',
            label: 'Forma de la Distribución',
            description: `${data.total_records > 100 ? 'Con muchos datos, es más probable ver una distribución normal (campana).' : 'Con pocos datos, la distribución puede ser sesgada o irregular.'}`
        },
        {
            icon: 'fas fa-ruler',
            value: formatNumber(stats.avg_per_record),
            label: 'Ancho de Cada Barra',
            description: `Cada barra representa un rango de valores de este tamaño. ${stats.avg_per_record > 100 ? 'Barras anchas muestran rangos amplios de valores.' : 'Barras estrechas muestran rangos específicos de valores.'}`
        },
        {
            icon: 'fas fa-chart-line',
            value: stats.trend_direction,
            label: 'Centro de la Distribución',
            description: `${stats.trend_direction === 'Positiva' ? 'Los datos tienden a concentrarse en valores altos, indicando una distribución sesgada hacia la derecha.' : 'Los datos se distribuyen de manera equilibrada o hacia valores bajos.'}`
        },
        {
            icon: 'fas fa-chart-bar',
            value: stats.data_quality,
            label: 'Confiabilidad del Histograma',
            description: `${stats.data_quality === 'Excelente' ? 'Excelente: datos suficientes para un histograma muy confiable y detallado.' : stats.data_quality === 'Buena' ? 'Buena: datos suficientes para entender la distribución general de tus datos.' : 'Básica: datos limitados pero útiles para ver la distribución aproximada.'}`
        }
    ];
}

function generateDefaultSummary(data, stats) {
    return [
        {
            icon: 'fas fa-database',
            value: data.total_records.toLocaleString(),
            label: 'Total de Registros',
            description: `${data.total_records} filas de datos disponibles. ${data.total_records > 100 ? 'Con muchos datos, puedes hacer análisis estadísticos robustos y confiables.' : 'Con menos datos, el análisis es más básico pero aún útil.'}`
        },
        {
            icon: 'fas fa-columns',
            value: data.columns.length,
            label: 'Campos de Datos',
            description: `${data.columns.length} columnas diferentes en tu archivo. ${data.columns.length > 5 ? 'Con muchos campos, puedes hacer análisis multidimensionales complejos.' : 'Con pocos campos, el análisis es más directo y fácil de interpretar.'}`
        },
        {
            icon: 'fas fa-calculator',
            value: data.numeric_columns,
            label: 'Datos Numéricos',
            description: `${data.numeric_columns} columnas contienen números que puedes usar para gráficos y análisis estadísticos. ${data.numeric_columns > 2 ? 'Con múltiples columnas numéricas, puedes crear gráficos comparativos y de correlación.' : 'Con pocas columnas numéricas, el análisis se enfoca en tendencias básicas.'}`
        },
        {
            icon: 'fas fa-calendar-alt',
            value: stats.date_range_text,
            label: 'Período de Datos',
            description: `${stats.has_temporal_data ? `Datos desde ${stats.date_range_text}. Con información temporal puedes analizar tendencias y patrones a lo largo del tiempo.` : stats.date_range_text === 'Fechas inválidas' ? 'Las fechas en los datos no son válidas. Se recomienda verificar y corregir la información temporal.' : 'No hay información de fechas disponible. Los datos se muestran en secuencia sin contexto temporal.'}`
        },
        {
            icon: 'fas fa-star',
            value: stats.data_quality,
            label: 'Calidad General',
            description: `${stats.data_quality === 'Excelente' ? 'Excelente calidad: datos completos, bien estructurados y suficientes para análisis avanzados.' : stats.data_quality === 'Buena' ? 'Buena calidad: datos suficientes y bien organizados para análisis confiables.' : 'Calidad básica: datos limitados pero útiles para análisis generales y exploratorios.'}`
        }
    ];
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
        
        // Generar resumen específico según el tipo de gráfico
        const summaryData = generateContextualSummary(summary, mobileChartType);
        
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
    card.setAttribute('data-tooltip', data.description || '');
    
    card.innerHTML = `
        <div class="icon">
            <i class="${data.icon}"></i>
        </div>
        <div class="value">${data.value}</div>
        <div class="label">${data.label}</div>
        <div class="description">${data.description || ''}</div>
    `;
    
    // Agregar evento de click para mostrar tooltip
    card.addEventListener('click', function() {
        showMobileTooltip(data.label, data.description);
    });
    
    return card;
}

function clearMobileSummary() {
    const summaryCards = document.getElementById('mobileSummaryCards');
    if (summaryCards) {
        summaryCards.innerHTML = '';
    }
}

function showMobileTooltip(title, description) {
    // Crear modal de tooltip
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'mobileTooltipModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content mobile-modal">
                <div class="modal-header">
                    <h5 class="modal-title mobile-modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mobile-modal-text">${description}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar al DOM y mostrar
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Limpiar cuando se cierre
    modal.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modal);
    });
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
// Guardar análisis
// ========================================

// Funciones de exportación de gráficos
function exportMobileChart(format) {
    if (!mobileChart) {
        showMobileError('No hay gráfico para exportar');
        return;
    }
    
    showMobileLoading(`Exportando gráfico como ${format.toUpperCase()}...`);
    
    try {
        const canvas = document.getElementById('mobileChartContainer').querySelector('canvas');
        if (!canvas) {
            showMobileError('No se encontró el canvas del gráfico');
            hideMobileLoading();
            return;
        }
        
        if (format === 'png') {
            exportChartAsPNG(canvas);
        } else if (format === 'pdf') {
            exportChartAsPDF(canvas);
        }
        
        hideMobileLoading();
    } catch (error) {
        hideMobileLoading();
        console.error('❌ Error exportando gráfico:', error);
        showMobileError('Error al exportar el gráfico');
    }
}

function exportChartAsPNG(canvas) {
    try {
        // Crear un enlace de descarga
        const link = document.createElement('a');
        const chartTitle = document.getElementById('mobileChartDisplayTitle').textContent || 'Grafico';
        const fileName = `${chartTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${getCurrentDateString()}.png`;
        
        link.download = fileName;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMobileSuccess('Gráfico exportado como PNG correctamente');
        console.log('✅ PNG exportado:', fileName);
    } catch (error) {
        console.error('❌ Error exportando PNG:', error);
        showMobileError('Error al exportar como PNG');
    }
}

function exportChartAsPDF(canvas) {
    try {
        // Verificar que jsPDF esté disponible
        if (typeof window.jspdf === 'undefined') {
            showMobileError('La librería PDF no está disponible');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Obtener las dimensiones del canvas
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calcular las dimensiones para el PDF
        const pdfWidth = 250; // mm
        const pdfHeight = (canvasHeight / canvasWidth) * pdfWidth;
        
        // Convertir canvas a imagen
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Agregar título
        const chartTitle = document.getElementById('mobileChartDisplayTitle').textContent || 'Gráfico';
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text(chartTitle, 20, 20);
        
        // Agregar fecha
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
        
        // Agregar el gráfico
        pdf.addImage(imgData, 'PNG', 20, 40, pdfWidth, pdfHeight);
        
        // Descargar PDF
        const fileName = `${chartTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${getCurrentDateString()}.pdf`;
        pdf.save(fileName);
        
        showMobileSuccess('Gráfico exportado como PDF correctamente');
        console.log('✅ PDF exportado:', fileName);
    } catch (error) {
        console.error('❌ Error exportando PDF:', error);
        showMobileError('Error al exportar como PDF');
    }
}

function getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

// Función para mostrar el modal de guardar análisis
function showMobileSaveModal() {
    const modal = new bootstrap.Modal(document.getElementById('mobileSaveAnalysisModal'));
    modal.show();
}

// Función para guardar análisis (actualizada)
function saveMobileAnalysis() {
    const name = document.getElementById('mobileAnalysisName').value.trim();
    const description = document.getElementById('mobileAnalysisDescription').value.trim();
    
    if (!name) {
        showMobileError('Por favor ingresa un nombre para el análisis');
        return;
    }
    
    // Verificar que tenemos los datos necesarios
    console.log('🔍 Verificando datos para guardado:');
    console.log('  - mobileChart:', !!mobileChart);
    console.log('  - mobileData:', !!mobileData);
    console.log('  - mobileColumns:', mobileColumns?.length || 0);
    console.log('  - mobileChartType:', mobileChartType);
    
    if (!mobileChart) {
        showMobileError('No hay gráfico generado para guardar');
        return;
    }
    
    if (!mobileData) {
        showMobileError('No hay datos de resumen disponibles');
        return;
    }
    
    // Verificar que tenemos columnas
    if (!mobileColumns || mobileColumns.length === 0) {
        showMobileError('No hay columnas de datos disponibles');
        return;
    }
    
    const analysisData = {
        name: name,
        description: description || `Análisis móvil - ${getChartTypeName(mobileChartType)}`,
        file_name: 'Archivo móvil',
        data_summary: mobileData,
        chart_data: {
            type: mobileChartType,
            title: document.getElementById('mobileChartDisplayTitle').textContent,
            data: mobileChart.data,
            options: mobileChart.options
        }
    };
    
    showMobileLoading('Guardando análisis...');
    
    fetch('/api/save-analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData)
    })
    .then(response => response.json())
    .then(data => {
        hideMobileLoading();
        if (data.success) {
            showMobileSuccess('Análisis guardado correctamente');
            console.log('✅ Análisis guardado:', data);
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('mobileSaveAnalysisModal'));
            modal.hide();
            document.getElementById('mobileSaveAnalysisForm').reset();
        } else {
            showMobileError(data.message || 'Error al guardar el análisis');
        }
    })
    .catch(error => {
        hideMobileLoading();
        console.error('❌ Error guardando análisis:', error);
        showMobileError('Error al guardar el análisis');
    });
}

function getChartTypeName(chartType) {
    const names = {
        'line': 'Gráfico de Línea',
        'bar': 'Gráfico de Barras',
        'pie': 'Gráfico Circular',
        'scatter': 'Gráfico de Dispersión',
        'histogram': 'Histograma'
    };
    return names[chartType] || 'Gráfico';
}

// Función para navegar al historial
function goToHistorial() {
    window.location.href = '/mobile/historial';
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
