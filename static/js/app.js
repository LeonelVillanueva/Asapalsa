// ASAPALSA Analytics - JavaScript Principal
class ASAPALSAnalytics {
    constructor() {
        this.currentChart = null;
        this.currentChartType = null;
        this.isProcessing = false;
        this.chartReady = false;
        this.autoRefreshInterval = null;
        this.currentFileName = null;
        this.debounceTimers = {};
        this.intersectionObserver = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupAutoRefresh();
        this.setupLazyLoading();
        this.optimizeImages();
        this.preloadCriticalResources();
        this.setupPerformanceMonitoring();
    }

    setupEventListeners() {
        // File input change
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Chart type buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.currentTarget.dataset.chart;
                this.loadChart(chartType);
                this.updateActiveButton(e.currentTarget);
            });
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Save analysis button
        document.getElementById('saveAnalysisBtn').addEventListener('click', () => {
            this.showSaveModal();
        });

        // Confirm save analysis
        document.getElementById('confirmSaveAnalysis').addEventListener('click', () => {
            this.saveCurrentAnalysis();
        });

        // Export event listeners
        document.getElementById('exportPNGBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.exportChart('png');
        });

        document.getElementById('exportPDFBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.exportChart('pdf');
        });

        const generateSimpleReportBtn = document.getElementById('generateSimpleReportBtn');
        if (generateSimpleReportBtn) {
            generateSimpleReportBtn.addEventListener('click', () => {
                this.generateSimpleReport();
            });
        }


        // Report event listeners - Simplified


        // Cache management buttons
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
            this.clearCache();
        });
        }

        const getCacheStatsBtn = document.getElementById('getCacheStatsBtn');
        if (getCacheStatsBtn) {
            getCacheStatsBtn.addEventListener('click', () => {
            this.getCacheStats();
        });
        }

        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        }, false);

        // Click to select file
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleFileSelect(file) {
        if (!file || !file.name.toLowerCase().endsWith('.csv')) {
            this.showAlert('Por favor selecciona un archivo CSV válido.', 'danger');
            return;
        }

        if (this.isProcessing) return;

        this.isProcessing = true;
        this.showProgress(true);
        this.hideFileInfo();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.currentFileName = file.name;
                this.showFileInfo(result.info);
                this.showChartsSection();
                this.showSummarySection();
                this.loadSummaryData();
                this.showAlert('Archivo procesado correctamente!', 'success');
                
                // Auto-load first chart
                setTimeout(() => {
                    this.loadChart('line');
                }, 500);
            } else {
                this.showAlert(result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('Error al procesar el archivo: ' + error.message, 'danger');
        } finally {
            this.isProcessing = false;
            this.showProgress(false);
        }
    }

    showProgress(show) {
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (show) {
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = 'Procesando archivo...';
            
            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
                
                if (progress >= 90) {
                    clearInterval(interval);
                    progressText.textContent = 'Finalizando...';
                }
            }, 200);
        } else {
            progressContainer.style.display = 'none';
        }
    }

    showFileInfo(info) {
        const fileInfo = document.getElementById('fileInfo');
        const fileDetails = document.getElementById('fileDetails');
        
        fileDetails.innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <strong>Registros:</strong> ${info.total_records.toLocaleString()}
                </div>
                <div class="col-md-3">
                    <strong>Período:</strong> ${info.date_range}
                </div>
                <div class="col-md-3">
                    <strong>Toneladas Totales:</strong> ${info.total_tonnage.toLocaleString()}
                </div>
                <div class="col-md-3">
                    <strong>Tipos de Movimiento:</strong> ${info.movement_types.length}
                </div>
            </div>
        `;
        
        fileInfo.style.display = 'block';
        fileInfo.classList.add('fade-in');
    }

    hideFileInfo() {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.style.display = 'none';
        fileInfo.classList.remove('fade-in');
    }

    showChartsSection() {
        const chartsSection = document.getElementById('charts-section');
        chartsSection.style.display = 'block';
        chartsSection.classList.add('fade-in');
        
        // Actualizar disponibilidad de gráficos
        this.updateChartAvailability();
        
        // Scroll to charts section
        setTimeout(() => {
            chartsSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    showSummarySection() {
        const summarySection = document.getElementById('summary-section');
        summarySection.style.display = 'block';
        summarySection.classList.add('fade-in');
        
        // Mostrar botón de guardar análisis
        document.getElementById('saveAnalysisBtn').style.display = 'block';
        
        // Mostrar botones de navegación para secciones adicionales
        this.showAdditionalSections();
    }

    showAdditionalSections() {
        // Crear botones de navegación para secciones adicionales
        const summarySection = document.getElementById('summary-section');
        
        // Verificar si ya existen los botones
        if (document.getElementById('additionalSectionsNav')) {
            return;
        }
        
        const navHtml = `
            <div class="row mt-4" id="additionalSectionsNav">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-cogs me-2"></i>
                                Herramientas Avanzadas
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 mb-2">
                                    <button class="btn btn-outline-primary w-100" data-section="stats-section">
                                        <i class="fas fa-chart-line me-2"></i>
                                        Estadísticas Avanzadas
                                    </button>
                                </div>
                                <div class="col-md-3 mb-2">
                                    <button class="btn btn-outline-info w-100" data-section="reports-section">
                                        <i class="fas fa-file-alt me-2"></i>
                                        Generador de Reportes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        summarySection.insertAdjacentHTML('beforeend', navHtml);
        
        // Add event listeners to the buttons
        document.querySelectorAll('#additionalSectionsNav button[data-section]').forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section');
                this.toggleSection(sectionId);
            });
        });
    }

    toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        // Hide all sections first
        const allSections = ['stats-section', 'reports-section'];
        allSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.remove('fade-in');
            }
        });

        // Show the selected section
        section.style.display = 'block';
        section.classList.add('fade-in');
        
        // Cargar contenido específico de la sección
        switch(sectionId) {
            case 'stats-section':
                this.loadAdvancedStatistics();
                break;
            case 'reports-section':
                this.loadGeneratedReports();
                break;
        }
    }

    async loadChart(chartType) {
        console.log('Loading chart:', chartType);
        
        if (this.isProcessing) return;

        // Verificar si el gráfico está disponible
        const chartBtn = document.querySelector(`[data-chart="${chartType}"]`);
        if (chartBtn && chartBtn.classList.contains('disabled')) {
            this.showAlert('Este tipo de gráfico no está disponible con los datos actuales', 'warning');
            return;
        }

        this.isProcessing = true;
        this.currentChartType = chartType;
        this.chartReady = false; // Reiniciar estado de gráfico

        try {
            console.log('Fetching chart data from:', `/chart/${chartType}`);
            const response = await fetch(`/chart/${chartType}`);
            console.log('Response status:', response.status);
            
            const chartConfig = await response.json();
            console.log('Chart config received:', chartConfig);

            if (chartConfig.error) {
                console.error('Chart error:', chartConfig.error);
                this.showAlert(chartConfig.error, 'danger');
                return;
            }

            this.renderChart(chartConfig);
            this.updateChartTitle(chartType);
            
        } catch (error) {
            console.error('Chart loading error:', error);
            this.showAlert('Error al cargar el gráfico: ' + error.message, 'danger');
        } finally {
            this.isProcessing = false;
        }
    }

    async updateChartAvailability() {
        const chartTypes = ['line', 'bar', 'comparison', 'precision', 'difference', 'scatter', 'radar'];
        let availableCount = 0;
        
        for (const chartType of chartTypes) {
            const chartBtn = document.querySelector(`[data-chart="${chartType}"]`);
            if (!chartBtn) continue;

            try {
                const response = await fetch(`/chart/${chartType}`);
                const result = await response.json();

                if (result.error || !result.data) {
                    // Gráfico no disponible
                    chartBtn.classList.add('disabled');
                    chartBtn.disabled = true;
                    chartBtn.title = this.getChartUnavailableMessage(chartType);
                } else {
                    // Gráfico disponible
                    chartBtn.classList.remove('disabled');
                    chartBtn.disabled = false;
                    chartBtn.title = this.getChartDescription(chartType);
                    availableCount++;
                }
            } catch (error) {
                // En caso de error, deshabilitar el botón
                chartBtn.classList.add('disabled');
                chartBtn.disabled = true;
                chartBtn.title = 'Error al verificar disponibilidad';
            }
        }
        
        // Actualizar contador de gráficos disponibles
        this.updateAvailableChartsCount(availableCount);
    }

    updateAvailableChartsCount(count) {
        const countElement = document.getElementById('availableCount');
        const badgeElement = document.getElementById('availableChartsCount');
        const noChartsMessage = document.getElementById('noChartsMessage');
        
        if (countElement && badgeElement) {
            countElement.textContent = count;
            badgeElement.style.display = count > 0 ? 'inline-block' : 'none';
            
            // Cambiar color del badge según la cantidad
            if (count === 5) {
                badgeElement.className = 'badge bg-success ms-2';
            } else if (count >= 3) {
                badgeElement.className = 'badge bg-warning ms-2';
            } else if (count > 0) {
                badgeElement.className = 'badge bg-danger ms-2';
            }
        }
        
        // Mostrar/ocultar mensaje de no hay gráficos disponibles
        if (noChartsMessage) {
            noChartsMessage.style.display = count === 0 ? 'block' : 'none';
        }
    }

    getChartDescription(chartType) {
        const descriptions = {
            'line': 'Evolución temporal de toneladas por tipo de movimiento',
            'bar': 'Comparación mensual de toneladas por tipo de movimiento',
            'comparison': 'Comparación entre fruta proyectada y recibida',
            'precision': 'Análisis de precisión de proyecciones mensuales',
            'difference': 'Diferencia entre proyección ajustada y fruta recibida',
            'scatter': 'Correlación entre diferentes tipos de movimiento',
            'radar': 'Comparación multidimensional de tipos de movimiento',
        };
        return descriptions[chartType] || '';
    }

    getChartUnavailableMessage(chartType) {
        const messages = {
            'line': 'No hay suficientes datos para generar este gráfico',
            'bar': 'No hay suficientes datos para generar este gráfico',
            'comparison': 'Se requieren datos de fruta proyectada y recibida',
            'precision': 'Se requieren datos de proyecciones para calcular precisión',
            'difference': 'Se requieren datos de proyección ajustada y fruta recibida',
            'scatter': 'Se requieren al menos 2 variables con datos válidos',
            'radar': 'Se requieren al menos 3 variables con datos válidos',
        };
        return messages[chartType] || 'Gráfico no disponible con los datos actuales';
    }

    renderChart(config) {
        console.log('Rendering chart with config:', config);
        
        const canvas = document.getElementById('mainChart');
        if (!canvas) {
            console.error('Canvas element not found');
            this.showAlert('Error: No se encontró el elemento del gráfico', 'danger');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.currentChart) {
            console.log('Destroying existing chart');
            this.currentChart.destroy();
        }

        // Create new chart
        console.log('Creating new chart');
        this.currentChart = new Chart(ctx, {
            type: config.type,
            data: config.data,
            options: {
                ...config.options,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    ...config.options.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                    onComplete: () => {
                        console.log('Chart animation completed - ready for export');
                        // Esperar un poco más para asegurar que el canvas esté completamente renderizado
                        setTimeout(() => {
                            this.chartReady = true;
                            console.log('Chart marked as ready for export');
                        }, 200);
                    }
                }
            }
        });

        // Asegurar que el canvas esté visible y tenga dimensiones correctas
        canvas.style.display = 'block';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Forzar redibujado del gráfico
        this.currentChart.resize();
        
        console.log('Chart created successfully, canvas dimensions:', canvas.width, 'x', canvas.height);
    }

    updateChartTitle(chartType) {
        const titles = {
            'line': 'Evolución de Toneladas por Tipo de Movimiento',
            'bar': 'Toneladas Mensuales por Tipo de Movimiento',
            'comparison': 'Comparación: Fruta Proyectada vs Recibida',
            'precision': 'Precisión Mensual de Proyección (%)',
            'difference': 'Diferencia entre Proyección Ajustada y Fruta Recibida',
            'scatter': 'Correlación entre Tipos de Movimiento',
            'radar': 'Comparación Multidimensional de Tipos de Movimiento',
        };

        document.getElementById('chartTitle').textContent = titles[chartType] || 'Gráfico';
    }

    getChartTitle(chartType) {
        const titles = {
            'line': 'Evolución de Toneladas por Tipo de Movimiento',
            'bar': 'Toneladas Mensuales por Tipo de Movimiento',
            'comparison': 'Comparación: Fruta Proyectada vs Recibida',
            'precision': 'Precisión Mensual de Proyección (%)',
            'difference': 'Diferencia entre Proyección Ajustada y Fruta Recibida',
            'scatter': 'Correlación entre Tipos de Movimiento',
            'radar': 'Comparación Multidimensional de Tipos de Movimiento',
        };
        return titles[chartType] || 'Gráfico';
    }

    updateActiveButton(activeBtn) {
        // Remove active class from all buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        activeBtn.classList.add('active');
    }

    async loadSummaryData() {
        try {
            const response = await fetch('/data/summary');
            const summary = await response.json();

            if (summary.error) {
                this.showAlert(summary.error, 'danger');
                return;
            }

            this.renderSummaryCards(summary);
        } catch (error) {
            this.showAlert('Error al cargar el resumen: ' + error.message, 'danger');
        }
    }

    renderSummaryCards(summary) {
        const summaryCards = document.getElementById('summaryCards');
        
        const cards = [
            {
                icon: 'fas fa-database',
                value: summary.total_records.toLocaleString(),
                label: 'Registros Totales',
                color: 'text-primary'
            },
            {
                icon: 'fas fa-calendar-alt',
                value: `${summary.date_range.start} - ${summary.date_range.end}`,
                label: 'Período de Datos',
                color: 'text-info'
            },
            {
                icon: 'fas fa-weight',
                value: `${summary.total_tonnage.toLocaleString()} T.M.`,
                label: 'Toneladas Totales',
                color: 'text-success'
            },
            {
                icon: 'fas fa-chart-line',
                value: `${summary.monthly_average.toFixed(0)} T.M.`,
                label: 'Promedio Mensual',
                color: 'text-warning'
            },
            {
                icon: 'fas fa-tags',
                value: summary.columns.length,
                label: 'Tipos de Movimiento',
                color: 'text-danger'
            },
            {
                icon: 'fas fa-clock',
                value: 'Tiempo Real',
                label: 'Actualización',
                color: 'text-secondary'
            }
        ];

        summaryCards.innerHTML = cards.map(card => `
            <div class="col-md-4 col-lg-2 mb-4">
                <div class="summary-card">
                    <div class="icon ${card.color}">
                        <i class="${card.icon}"></i>
                    </div>
                    <div class="value ${card.color}">${card.value}</div>
                    <div class="label">${card.label}</div>
                </div>
            </div>
        `).join('');
    }

    async refreshData() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        const refreshBtn = document.getElementById('refreshBtn');
        const originalContent = refreshBtn.innerHTML;
        
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin d-block mb-2"></i>Actualizando...';
        refreshBtn.disabled = true;

        try {
            // Reload current chart
            if (this.currentChartType) {
                await this.loadChart(this.currentChartType);
            }
            
            // Reload summary
            await this.loadSummaryData();
            
            this.showAlert('Datos actualizados correctamente!', 'success');
        } catch (error) {
            this.showAlert('Error al actualizar los datos: ' + error.message, 'danger');
        } finally {
            this.isProcessing = false;
            refreshBtn.innerHTML = originalContent;
            refreshBtn.disabled = false;
        }
    }

    setupAutoRefresh() {
        // Auto-refresh every 30 seconds if data is loaded
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentChart && !this.isProcessing) {
                this.refreshData();
            }
        }, 30000);
    }

    showSaveModal() {
        // Generar nombre por defecto
        const defaultName = `Análisis ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`;
        document.getElementById('analysisName').value = defaultName;
        document.getElementById('analysisDescription').value = '';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('saveAnalysisModal'));
        modal.show();
    }

    async saveCurrentAnalysis() {
        if (this.isProcessing) return;

        const name = document.getElementById('analysisName').value.trim();
        const description = document.getElementById('analysisDescription').value.trim();

        if (!name) {
            this.showAlert('Por favor ingresa un nombre para el análisis', 'danger');
            return;
        }

        this.isProcessing = true;
        const saveBtn = document.getElementById('confirmSaveAnalysis');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
        saveBtn.disabled = true;

        try {
            const response = await fetch('/api/save-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    description: description,
                    file_name: this.currentFileName || 'archivo.csv'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Análisis guardado correctamente en el historial!', 'success');
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('saveAnalysisModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                this.showAlert('Error al guardar: ' + result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('Error al guardar: ' + error.message, 'danger');
        } finally {
            this.isProcessing = false;
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    showAlert(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-temp');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-temp alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Métodos de exportación
    async loadLogoAsDataURL() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('No se pudo cargar el logo'));
            img.src = '/static/images/asapalsa.png';
        });
    }

    async waitForChartReady() {
        return new Promise((resolve) => {
            if (this.chartReady) {
                resolve(true);
            return;
        }

            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            const checkReady = () => {
                attempts++;
                if (this.chartReady || attempts >= maxAttempts) {
                    resolve(this.chartReady);
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            
            checkReady();
        });
    }

    async exportChart(format) {
        if (!this.currentChartType) {
            this.showAlert('No hay gráfico seleccionado para exportar', 'warning');
            return;
        }

        if (!this.currentChart) {
            this.showAlert('No hay gráfico cargado para exportar', 'warning');
            return;
        }

        // Mostrar mensaje de carga
        this.showAlert('Preparando gráfico para exportación...', 'info');

        try {
            // Esperar a que el gráfico esté listo
            const isReady = await this.waitForChartReady();
            if (!isReady) {
                this.showAlert('El gráfico no se cargó completamente. Intenta de nuevo.', 'warning');
                return;
            }

            // Obtener el canvas del gráfico actual
            const canvas = document.getElementById('mainChart');
            if (!canvas) {
                this.showAlert('No se encontró el gráfico para exportar', 'error');
                return;
            }

            // Verificar que el canvas tenga contenido
            if (canvas.width === 0 || canvas.height === 0) {
                this.showAlert('El gráfico no está completamente cargado. Intenta de nuevo en unos segundos.', 'warning');
                return;
            }

            // Forzar redibujado del gráfico antes de exportar
            this.currentChart.resize();
            this.currentChart.update('none'); // Actualizar sin animación
            
            // Pequeña pausa para asegurar que el canvas se actualice
            await new Promise(resolve => setTimeout(resolve, 100));

            if (format === 'png') {
                // Exportar como PNG
            const link = document.createElement('a');
                link.download = `grafico_${this.currentChartType}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.png`;
                link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
                this.showAlert('Gráfico exportado como PNG', 'success');
            } else if (format === 'pdf') {
                // Exportar como PDF usando jsPDF
                await this.exportChartToPDF(canvas);
            }
        } catch (error) {
            this.showAlert('Error al exportar el gráfico: ' + error.message, 'danger');
            console.error('Export error:', error);
        }
    }

    async exportChartToPDF(canvas) {
        try {
            // Verificar que el canvas tenga contenido
            if (canvas.width === 0 || canvas.height === 0) {
                this.showAlert('El gráfico no está completamente cargado para exportar a PDF', 'warning');
                return;
            }

            // Crear un PDF con el gráfico
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            
            // Obtener las dimensiones del canvas
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            // Calcular las dimensiones para el PDF (mantener proporción)
            // Reducir el ancho para que quepa en la página con márgenes
            const pdfWidth = 250; // mm (reducido de 280)
            const pdfHeight = (canvasHeight / canvasWidth) * pdfWidth;
            
            // Verificar que la altura no exceda el espacio disponible
            // Considerar espacio para título (45mm) y pie de página (20mm)
            const availableHeight = 150; // mm máximo de altura disponible
            const finalHeight = Math.min(pdfHeight, availableHeight);
            const finalWidth = finalHeight === availableHeight ? (canvasWidth / canvasHeight) * availableHeight : pdfWidth;
            
            // Asegurar que el ancho no exceda los límites de la página
            const maxWidth = 250; // mm máximo de ancho
            const adjustedWidth = Math.min(finalWidth, maxWidth);
            const adjustedHeight = adjustedWidth === maxWidth ? (canvasHeight / canvasWidth) * maxWidth : finalHeight;
            
            // Obtener dimensiones de la página
            const pageWidth = pdf.internal.pageSize.width;
            const pageHeight = pdf.internal.pageSize.height;
            
            // Convertir canvas a imagen con alta calidad
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Cargar y agregar el logo
            let logoData = null;
            try {
                logoData = await this.loadLogoAsDataURL();
                if (logoData) {
                    // Agregar logo en la esquina superior derecha
                    const logoWidth = 25; // mm
                    const logoHeight = 18; // mm
                    pdf.addImage(logoData, 'PNG', pageWidth - logoWidth - 15, 8, logoWidth, logoHeight);
                }
            } catch (error) {
                console.warn('No se pudo cargar el logo:', error);
            }
            
            // Agregar título
            pdf.setFontSize(16);
            pdf.text('ASAPALSA Analytics - Reporte de Gráfico', 20, 20);
            
            // Agregar fecha y tipo de gráfico
            pdf.setFontSize(10);
            pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
            pdf.text(`Tipo de gráfico: ${this.getChartTitle(this.currentChartType)}`, 20, 35);
            
            // Centrar el gráfico horizontalmente
            const centeredX = (pageWidth - adjustedWidth) / 2;
            
            // Agregar un borde alrededor del gráfico
            pdf.setDrawColor(200, 200, 200); // Color gris claro
            pdf.setLineWidth(0.5);
            pdf.rect(centeredX - 2, 43, adjustedWidth + 4, adjustedHeight + 4);
            
            // Agregar el gráfico centrado
            pdf.addImage(imgData, 'PNG', centeredX, 45, adjustedWidth, adjustedHeight);
            
            // Agregar pie de página
            
            // Agregar logo en el pie de página si está disponible (a la derecha)
            if (logoData) {
                const footerLogoWidth = 12; // mm
                const footerLogoHeight = 8; // mm
                // Posicionar el logo en la esquina inferior derecha
                pdf.addImage(logoData, 'PNG', pageWidth - footerLogoWidth - 20, pageHeight - 15, footerLogoWidth, footerLogoHeight);
            }
            
            // Agregar texto del pie de página (a la izquierda, separado del logo)
            pdf.setFontSize(8);
            pdf.text('Sistema de Análisis Agroindustrial - ASAPALSA', 20, pageHeight - 10);
            
            // Guardar el PDF
            const fileName = `grafico_${this.currentChartType}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`;
            pdf.save(fileName);
            
            this.showAlert('Gráfico exportado como PDF', 'success');
        } catch (error) {
            this.showAlert('Error al generar PDF: ' + error.message, 'danger');
            console.error('PDF export error:', error);
        }
    }

    async generateSimpleReport() {
        try {
            const reportType = document.querySelector('input[name="reportType"]:checked').value;
            const reportTitle = document.getElementById('simpleReportTitle').value || 'Reporte Ejecutivo de Análisis';
            
            if (reportType === 'current') {
                await this.generateCurrentChartReport(reportTitle);
            } else {
                await this.generateAllChartsReport(reportTitle);
            }
        } catch (error) {
            this.showAlert('Error al generar el reporte: ' + error.message, 'danger');
            console.error('Report generation error:', error);
        }
    }

    async generateCurrentChartReport(reportTitle) {
        if (!this.currentChartType) {
            this.showAlert('No hay gráfico seleccionado para el reporte', 'warning');
            return;
        }
        
        const canvas = document.getElementById('mainChart');
        if (!canvas) {
            this.showAlert('No se encontró el gráfico para el reporte', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Cargar logo
        let logoData = null;
        try {
            logoData = await this.loadLogoAsDataURL();
        } catch (error) {
            console.warn('No se pudo cargar el logo:', error);
        }
        
        // Agregar logo en header
        if (logoData) {
            const logoWidth = 25;
            const logoHeight = 18;
            const pageWidth = pdf.internal.pageSize.width;
            pdf.addImage(logoData, 'PNG', pageWidth - logoWidth - 15, 8, logoWidth, logoHeight);
        }
        
        // Título del reporte
        pdf.setFontSize(20);
        pdf.text('ASAPALSA Analytics', 20, 20);
        pdf.setFontSize(16);
        pdf.text(reportTitle, 20, 30);
        pdf.setFontSize(12);
        pdf.text(`Tipo de gráfico: ${this.getChartTitle(this.currentChartType)}`, 20, 40);
        pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, 50);
        
        // Agregar gráfico
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const pdfWidth = 250;
        const pdfHeight = (canvasHeight / canvasWidth) * pdfWidth;
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, 60, pdfWidth, pdfHeight);
        
        // Pie de página
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(10);
        pdf.text('Sistema de Análisis Agroindustrial - ASAPALSA', 20, pageHeight - 20);
        
        // Logo en pie de página
        if (logoData) {
            const footerLogoWidth = 12;
            const footerLogoHeight = 8;
            const pageWidth = pdf.internal.pageSize.width;
            pdf.addImage(logoData, 'PNG', pageWidth - footerLogoWidth - 20, pageHeight - 15, footerLogoWidth, footerLogoHeight);
        }
        
        const fileName = `reporte_ejecutivo_${this.currentChartType}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`;
        pdf.save(fileName);
        this.showAlert('Reporte ejecutivo generado exitosamente', 'success');
    }

    async generateAllChartsReport(reportTitle) {
        this.showAlert('Generando reporte completo con todos los gráficos...', 'info');
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Cargar logo
        let logoData = null;
        try {
            logoData = await this.loadLogoAsDataURL();
        } catch (error) {
            console.warn('No se pudo cargar el logo:', error);
        }
        
        // Obtener todos los tipos de gráficos disponibles
        const chartTypes = ['line', 'bar', 'comparison', 'precision', 'difference', 'scatter', 'radar'];
        let chartCount = 0;
        
        for (const chartType of chartTypes) {
            try {
                // Verificar si el gráfico está disponible
                const chartBtn = document.querySelector(`[data-chart="${chartType}"]`);
                if (chartBtn && chartBtn.classList.contains('disabled')) {
                    continue; // Saltar gráficos no disponibles
                }
                
                // Cargar el gráfico
                const response = await fetch(`/chart/${chartType}`);
                if (!response.ok) continue;
                
                const chartConfig = await response.json();
                if (chartConfig.error) continue;
                
                // Crear un canvas temporal para renderizar el gráfico
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 800;
                tempCanvas.height = 400;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Renderizar el gráfico temporalmente
                const tempChart = new Chart(tempCtx, {
                    ...chartConfig,
                    options: {
                        ...chartConfig.options,
                        responsive: false,
                        maintainAspectRatio: false,
                        animation: false
                    }
                });
                
                // Esperar a que se renderice
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Agregar nueva página si no es la primera
                if (chartCount > 0) {
                    pdf.addPage();
                }
                
                // Agregar logo en header
                if (logoData) {
                    const logoWidth = 25;
                    const logoHeight = 18;
                    const pageWidth = pdf.internal.pageSize.width;
                    pdf.addImage(logoData, 'PNG', pageWidth - logoWidth - 15, 8, logoWidth, logoHeight);
                }
                
                // Título de la página
                pdf.setFontSize(16);
                pdf.text('ASAPALSA Analytics', 20, 20);
                pdf.setFontSize(14);
                pdf.text(`${reportTitle} - ${this.getChartTitle(chartType)}`, 20, 30);
                pdf.setFontSize(10);
                pdf.text(`Página ${chartCount + 1} de ${chartTypes.length}`, 20, 40);
                
                // Agregar gráfico
                const imgData = tempCanvas.toDataURL('image/png');
                const pdfWidth = 250;
                const pdfHeight = 150;
                pdf.addImage(imgData, 'PNG', 20, 50, pdfWidth, pdfHeight);
                
                // Pie de página
                const pageHeight = pdf.internal.pageSize.height;
                pdf.setFontSize(8);
                pdf.text('Sistema de Análisis Agroindustrial - ASAPALSA', 20, pageHeight - 10);
                
                // Logo en pie de página
                if (logoData) {
                    const footerLogoWidth = 12;
                    const footerLogoHeight = 8;
                    const pageWidth = pdf.internal.pageSize.width;
                    pdf.addImage(logoData, 'PNG', pageWidth - footerLogoWidth - 20, pageHeight - 15, footerLogoWidth, footerLogoHeight);
                }
                
                // Destruir el gráfico temporal
                tempChart.destroy();
                chartCount++;
                
            } catch (error) {
                console.warn(`Error generando gráfico ${chartType}:`, error);
                continue;
            }
        }
        
        if (chartCount === 0) {
            this.showAlert('No se pudieron generar gráficos para el reporte', 'warning');
            return;
        }
        
        const fileName = `reporte_ejecutivo_completo_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`;
        pdf.save(fileName);
        this.showAlert(`Reporte ejecutivo completo generado con ${chartCount} gráficos`, 'success');
    }






    // Métodos de análisis estadístico avanzado
    async loadAdvancedStatistics() {
        try {
            await Promise.all([
                this.loadCorrelations(),
                this.loadTrends(),
                this.loadDescriptiveStats(),
                this.loadAnomalies()
            ]);
        } catch (error) {
            console.error('Error al cargar estadísticas avanzadas:', error);
        }
    }

    async loadCorrelations() {
        try {
            const response = await fetch('/api/statistics/correlations');
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('correlationMatrix').innerHTML = 
                    `<div class="alert alert-warning">${data.error}</div>`;
                return;
            }

            const { correlations, variables } = data;
            let html = '<table class="table table-sm table-bordered">';
            
            // Header
            html += '<thead><tr><th>Variable</th>';
            variables.forEach(variable => {
                html += `<th class="text-center">${variable}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Rows
            variables.forEach(var1 => {
                html += `<tr><th>${var1}</th>`;
                variables.forEach(var2 => {
                    const corr = correlations[var1][var2];
                    const color = this.getCorrelationColor(corr);
                    html += `<td class="text-center" style="background-color: ${color}20; color: ${color}">
                        ${corr.toFixed(3)}
                    </td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            document.getElementById('correlationMatrix').innerHTML = html;
            
        } catch (error) {
            document.getElementById('correlationMatrix').innerHTML = 
                `<div class="alert alert-danger">Error al cargar correlaciones: ${error.message}</div>`;
        }
    }

    async loadTrends() {
        try {
            const response = await fetch('/api/statistics/trends');
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('trendAnalysis').innerHTML = 
                    `<div class="alert alert-warning">${data.error}</div>`;
                return;
            }

            const { trends } = data;
            let html = '';
            
            Object.entries(trends).forEach(([variable, trend]) => {
                html += `
                    <div class="mb-3 p-3 border rounded">
                        <h6 class="mb-2">${variable}</h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-${trend.trend_color}">${trend.trend_type}</span>
                            <small class="text-muted">Cambio: ${trend.change_pct.toFixed(1)}%</small>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                Pendiente: ${trend.slope.toFixed(4)} | 
                                Inicio: ${trend.first_value.toFixed(1)} | 
                                Final: ${trend.last_value.toFixed(1)}
                            </small>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('trendAnalysis').innerHTML = html || 
                '<div class="alert alert-info">No se encontraron tendencias significativas</div>';
            
        } catch (error) {
            document.getElementById('trendAnalysis').innerHTML = 
                `<div class="alert alert-danger">Error al cargar tendencias: ${error.message}</div>`;
        }
    }

    async loadDescriptiveStats() {
        try {
            const response = await fetch('/api/statistics/descriptive');
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('descriptiveStats').innerHTML = 
                    `<div class="alert alert-warning">${data.error}</div>`;
                return;
            }

            const { statistics } = data;
            let html = '';
            
            Object.entries(statistics).forEach(([variable, stats]) => {
                html += `
                    <div class="mb-3 p-3 border rounded">
                        <h6 class="mb-2">${variable}</h6>
                        <div class="row">
                            <div class="col-6">
                                <small><strong>Media:</strong> ${stats.mean.toFixed(2)}</small><br>
                                <small><strong>Mediana:</strong> ${stats.median.toFixed(2)}</small><br>
                                <small><strong>Desv. Est.:</strong> ${stats.std.toFixed(2)}</small>
                            </div>
                            <div class="col-6">
                                <small><strong>Mín:</strong> ${stats.min.toFixed(2)}</small><br>
                                <small><strong>Máx:</strong> ${stats.max.toFixed(2)}</small><br>
                                <small><strong>Rango:</strong> ${(stats.max - stats.min).toFixed(2)}</small>
                            </div>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                Q1: ${stats.q1.toFixed(2)} | Q3: ${stats.q3.toFixed(2)} | 
                                Asimetría: ${stats.skewness.toFixed(3)} | 
                                Curtosis: ${stats.kurtosis.toFixed(3)}
                            </small>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('descriptiveStats').innerHTML = html || 
                '<div class="alert alert-info">No hay estadísticas disponibles</div>';
            
        } catch (error) {
            document.getElementById('descriptiveStats').innerHTML = 
                `<div class="alert alert-danger">Error al cargar estadísticas: ${error.message}</div>`;
        }
    }

    async loadAnomalies() {
        try {
            const response = await fetch('/api/statistics/anomalies');
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('anomalyDetection').innerHTML = 
                    `<div class="alert alert-warning">${data.error}</div>`;
                return;
            }

            const { anomalies } = data;
            let html = '';
            
            if (Object.keys(anomalies).length === 0) {
                html = '<div class="alert alert-success">No se detectaron anomalías en los datos</div>';
            } else {
                Object.entries(anomalies).forEach(([variable, anomaly]) => {
                    html += `
                        <div class="mb-3 p-3 border rounded border-warning">
                            <h6 class="mb-2 text-warning">${variable}</h6>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-warning">${anomaly.count} anomalías</span>
                                <small class="text-muted">${anomaly.percentage.toFixed(1)}% del total</small>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">
                                    Rango normal: ${anomaly.bounds.lower.toFixed(2)} - ${anomaly.bounds.upper.toFixed(2)}
                                </small>
                            </div>
                            <div class="anomaly-values">
                                ${anomaly.values.slice(0, 3).map(val => 
                                    `<span class="badge bg-danger me-1">${val.date}: ${val.value.toFixed(1)}</span>`
                                ).join('')}
                                ${anomaly.values.length > 3 ? `<small class="text-muted">... y ${anomaly.values.length - 3} más</small>` : ''}
                            </div>
                        </div>
                    `;
                });
            }
            
            document.getElementById('anomalyDetection').innerHTML = html;
            
        } catch (error) {
            document.getElementById('anomalyDetection').innerHTML = 
                `<div class="alert alert-danger">Error al detectar anomalías: ${error.message}</div>`;
        }
    }

    getCorrelationColor(correlation) {
        const abs = Math.abs(correlation);
        if (abs >= 0.8) return '#dc3545'; // Rojo - correlación fuerte
        if (abs >= 0.6) return '#fd7e14'; // Naranja - correlación moderada-fuerte
        if (abs >= 0.4) return '#ffc107'; // Amarillo - correlación moderada
        if (abs >= 0.2) return '#20c997'; // Verde claro - correlación débil
        return '#6c757d'; // Gris - correlación muy débil
    }


    // Métodos de reportes - Simplified









    // Métodos de optimización de rendimiento
    debounce(func, wait) {
        return (...args) => {
            const key = func.name || 'anonymous';
            clearTimeout(this.debounceTimers[key]);
            this.debounceTimers[key] = setTimeout(() => func.apply(this, args), wait);
        };
    }

    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        if (element.dataset.lazyLoad) {
                            this.loadLazyContent(element);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });

            // Observar elementos con lazy loading
            document.querySelectorAll('[data-lazy-load]').forEach(el => {
                this.intersectionObserver.observe(el);
            });
        }
    }

    loadLazyContent(element) {
        const loadType = element.dataset.lazyLoad;
        
        switch (loadType) {
            case 'statistics':
                this.loadAdvancedStatistics();
                break;
            case 'alerts':
                this.loadAlerts();
                break;
            case 'reports':
                this.loadGeneratedReports();
                break;
        }
        
        // Remover el atributo para evitar cargar múltiples veces
        element.removeAttribute('data-lazy-load');
        this.intersectionObserver.unobserve(element);
    }

    optimizeImages() {
        // Lazy loading para imágenes
        const images = document.querySelectorAll('img[data-src]');
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        }
    }

    preloadCriticalResources() {
        // Precargar recursos críticos
        const criticalResources = [
            '/static/css/style.css',
            '/static/js/app.js'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.css') ? 'style' : 'script';
            document.head.appendChild(link);
        });
    }

    setupPerformanceMonitoring() {
        // Monitorear rendimiento
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('Performance metrics:', {
                        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
                        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
                    });
                }, 0);
            });
        }
    }

    clearCache() {
        // Limpiar caché del servidor
        fetch('/api/cache/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showAlert('Caché limpiado exitosamente', 'success');
            } else {
                this.showAlert('Error al limpiar caché: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error al limpiar caché:', error);
            this.showAlert('Error al limpiar caché', 'error');
        });
    }

    getCacheStats() {
        // Obtener estadísticas del caché
        fetch('/api/cache/stats')
        .then(response => response.json())
        .then(data => {
            if (data.entries) {
                console.log('Cache statistics:', data);
                this.showAlert(`Caché: ${data.total_entries} entradas, TTL: ${data.cache_ttl}s`, 'info');
            } else {
                this.showAlert('Error al obtener estadísticas de caché: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error al obtener estadísticas de caché:', error);
            this.showAlert('Error al obtener estadísticas de caché', 'error');
        });
    }
}

// Initialize the application when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ASAPALSAnalytics();
    // Make app available globally
    window.app = app;
});

// Additional utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(date));
}

// Export for potential external use
window.ASAPALSAnalytics = ASAPALSAnalytics;


