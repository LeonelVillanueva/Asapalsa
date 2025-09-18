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
        this.currentDataSummary = null;
        this.currentChartData = null;
        
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

        // Intelligent analysis button
        document.getElementById('intelligentAnalysisBtn').addEventListener('click', () => {
            this.showIntelligentAnalysisModal();
        });

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            handleNavbarScroll();
        });

        // Dropdown z-index fix
        document.addEventListener('DOMContentLoaded', () => {
            const dropdownToggle = document.getElementById('analyticsDropdown');
            const dropdownMenu = dropdownToggle?.nextElementSibling;
            
            if (dropdownToggle && dropdownMenu) {
                dropdownToggle.addEventListener('show.bs.dropdown', () => {
                    dropdownMenu.style.zIndex = '99999';
                    dropdownMenu.style.position = 'absolute';
                });
                
                dropdownToggle.addEventListener('shown.bs.dropdown', () => {
                    dropdownMenu.style.zIndex = '99999';
                    dropdownMenu.style.position = 'absolute';
                });
            }
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

        console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size);

        // Verificar si es un archivo reparado
        if (file.name.includes('reparado') || file.name.includes('repaired')) {
            console.log('Archivo reparado detectado, procesando directamente');
            await this.processRepairedFileFromDrag(file);
            this.isProcessing = false;
            this.showProgress(false);
            return;
        }

        // Primero validar el archivo
        try {
            const validationResult = await this.validateFile(file);
            console.log('Resultado de validación:', validationResult);
            
            if (!validationResult.success) {
                if (validationResult.can_repair) {
                    console.log('Mostrando modal de reparación');
                    this.showRepairModal(validationResult, file);
                } else {
                    this.showAlert('Documento dañado', 'danger');
                }
                return;
            }
        } catch (error) {
            console.error('Error validando archivo:', error);
            this.showAlert('Error validando archivo', 'danger');
            this.isProcessing = false;
            this.showProgress(false);
            return;
        }

        // Si llegamos aquí, el archivo es válido, procesarlo normalmente
        await this.processValidFile(file);
    }

    async processValidFile(file) {
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
                this.showAlert('Error al procesar el archivo', 'danger');
            }
        } catch (error) {
            this.showAlert('Error al procesar el archivo', 'danger');
        } finally {
            this.isProcessing = false;
            this.showProgress(false);
        }
    }

    async validateFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('Enviando archivo para validación:', file.name);

            const response = await fetch('/api/csv-validation', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Respuesta de validación:', result);
            return result;
        } catch (error) {
            console.error('Error en validateFile:', error);
            throw error;
        }
    }

    showRepairModal(validationResult, file) {
        console.log('Mostrando modal de reparación para archivo:', file);
        console.log('Estado del archivo:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
        
        // Crear interfaz de reparación mejor organizada
        const repairHtml = `
            <div id="repairScreen" class="repair-screen">
                <div class="repair-container">
                    <!-- Header más compacto -->
                    <div class="repair-header">
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="repair-title">
                                        <i class="fas fa-tools me-3"></i>
                                        <div>
                                            <h3 class="mb-0">Reparación de CSV</h3>
                                            <p class="mb-0">Archivo: ${file.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <button class="btn btn-outline-light btn-sm" onclick="app.closeRepairModal()">
                                        <i class="fas fa-times me-1"></i>Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Contenido reorganizado -->
                    <div class="repair-content">
                        <div class="container-fluid">
                            <div class="row g-4">
                                <!-- Panel principal: Proceso de reparación -->
                                <div class="col-lg-8">
                                    <!-- 1. Estado del archivo (más prominente) -->
                                    <div class="repair-status-card mb-4">
                                        <div class="status-icon">
                                            <i class="fas fa-exclamation-triangle"></i>
                                        </div>
                                        <div class="status-content">
                                            <h5>Documento dañado detectado</h5>
                                            <p>Se encontraron errores que requieren reparación automática</p>
                                        </div>
                                    </div>
                                    
                                    <!-- 2. Errores detectados (más visible) -->
                                    <div class="errors-card mb-4">
                                        <h6 class="card-title">
                                            <i class="fas fa-exclamation-triangle me-2"></i>Errores Detectados
                                        </h6>
                                        <div class="errors-list" id="errorsList">
                                            ${this.generateRepairErrorContent(validationResult)}
                                        </div>
                                    </div>
                                    
                                    <!-- 3. Barra de progreso (cuando se inicie) -->
                                    <div class="repair-progress-section mb-4" id="progressSection" style="display: none;">
                                        <div class="progress-header">
                                            <span id="repairProgressText">Iniciando reparación...</span>
                                            <span id="repairProgressPercent">0%</span>
                                        </div>
                                        <div class="progress-container">
                                            <div class="progress-bar-custom" id="repairProgressBar">
                                                <div class="progress-fill"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 4. Pasos del proceso (más compactos) -->
                                    <div class="repair-steps-container mb-4" id="stepsSection" style="display: none;">
                                        <h6 class="steps-title">Proceso de Reparación</h6>
                                        <div class="steps-grid" id="repairSteps">
                                            <div class="step-card" id="step-1">
                                                <div class="step-icon"><i class="fas fa-search"></i></div>
                                                <div class="step-content">
                                                    <h6>Análisis</h6>
                                                    <p>Estructura</p>
                                                </div>
                                            </div>
                                            <div class="step-card" id="step-2">
                                                <div class="step-icon"><i class="fas fa-bug"></i></div>
                                                <div class="step-content">
                                                    <h6>Detección</h6>
                                                    <p>Errores</p>
                                                </div>
                                            </div>
                                            <div class="step-card" id="step-3">
                                                <div class="step-icon"><i class="fas fa-wrench"></i></div>
                                                <div class="step-content">
                                                    <h6>Reparación</h6>
                                                    <p>Correcciones</p>
                                                </div>
                                            </div>
                                            <div class="step-card" id="step-4">
                                                <div class="step-icon"><i class="fas fa-check-circle"></i></div>
                                                <div class="step-content">
                                                    <h6>Validación</h6>
                                                    <p>Verificación</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 5. Log de reparación (más compacto) -->
                                    <div class="repair-log-section mb-4" id="logSection" style="display: none;">
                                        <h6 class="log-title">
                                            <i class="fas fa-list me-2"></i>Registro de Reparación
                                        </h6>
                                        <div class="log-container" id="repairLog">
                                            <div class="log-entry">
                                                <i class="fas fa-info-circle text-info me-2"></i>
                                                <span>Iniciando proceso de reparación...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Panel lateral: Información y acciones -->
                                <div class="col-lg-4">
                                    <div class="repair-sidebar">
                                        <!-- Información del archivo (más compacta) -->
                                        <div class="file-info-card mb-4">
                                            <h6 class="card-title">
                                                <i class="fas fa-file-csv me-2"></i>Información del Archivo
                                            </h6>
                                            <div class="file-details">
                                                <div class="file-detail">
                                                    <span class="label">Tamaño:</span>
                                                    <span class="value">${(file.size / 1024).toFixed(2)} KB</span>
                                                </div>
                                                <div class="file-detail">
                                                    <span class="label">Tipo:</span>
                                                    <span class="value">${file.type || 'CSV'}</span>
                                                </div>
                                                <div class="file-detail">
                                                    <span class="label">Modificado:</span>
                                                    <span class="value">${new Date(file.lastModified).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Botones de acción (más prominentes) -->
                                        <div class="action-buttons">
                                            <button class="btn btn-primary w-100 mb-3" onclick="app.startRepairProcess()">
                                                <i class="fas fa-play me-2"></i>Iniciar Reparación
                                            </button>
                                            <button class="btn btn-outline-secondary w-100" onclick="app.closeRepairModal()">
                                                <i class="fas fa-times me-2"></i>Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover pantalla existente si existe
        const existingScreen = document.getElementById('repairScreen');
        if (existingScreen) {
            existingScreen.remove();
        }
        
        // Agregar pantalla de reparación al DOM
        document.body.insertAdjacentHTML('beforeend', repairHtml);
        
        // Iniciar reparación automáticamente después de un breve delay
        setTimeout(() => {
            this.startRepairProcess();
        }, 1000);
    }
