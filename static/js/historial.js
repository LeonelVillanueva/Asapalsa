// Historial de Análisis - JavaScript
class HistorialManager {
    constructor() {
        this.currentAnalysis = null;
        this.modalChart = null;
        this.init();
    }

    init() {
        this.loadHistorial();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botones de tipo de gráfico en el modal
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.currentTarget.dataset.chart;
                this.loadChartInModal(chartType);
                this.updateActiveChartButton(e.currentTarget);
            });
        });

        // Botón de eliminar análisis
        document.getElementById('deleteAnalysisBtn').addEventListener('click', () => {
            this.deleteCurrentAnalysis();
        });

    }

    async loadHistorial() {
        try {
            const response = await fetch('/api/history?platform=web');
            const result = await response.json();

            if (result.success) {
                this.displayHistorial(result.data);
            } else {
                this.showError('Error al cargar el historial: ' + result.message);
            }
        } catch (error) {
            this.showError('Error al cargar el historial: ' + error.message);
        }
    }

    displayHistorial(historial) {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const historialGrid = document.getElementById('historialGrid');

        loadingState.style.display = 'none';

        if (historial.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        historialGrid.style.display = 'block';
        historialGrid.innerHTML = historial.map(analysis => this.createAnalysisCard(analysis)).join('');
    }

    createAnalysisCard(analysis) {
        const createdDate = new Date(analysis.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const summary = analysis.data_summary || {};
        const totalRecords = summary.total_records || 0;
        const totalTonnage = summary.total_tonnage || 0;

        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100 analysis-card" data-analysis-id="${analysis.id}">
                    <div class="card-header text-white" style="background-color: var(--asapalsa-green);">
                        <h6 class="card-title mb-0">
                            <i class="fas fa-chart-bar me-2"></i>
                            ${analysis.name}
                        </h6>
                    </div>
                    <div class="card-body">
                        <p class="card-text text-muted small mb-3">
                            <i class="fas fa-file me-1"></i>
                            ${analysis.file_name}
                        </p>
                        
                        ${analysis.description ? `<p class="card-text small">${analysis.description}</p>` : ''}
                        
                        <div class="row text-center mb-3">
                            <div class="col-6">
                                <div class="metric-value" style="color: var(--asapalsa-green);">${totalRecords.toLocaleString()}</div>
                                <div class="metric-label">Registros</div>
                            </div>
                            <div class="col-6">
                                <div class="metric-value text-success">${totalTonnage.toLocaleString()}</div>
                                <div class="metric-label">T.M.</div>
                            </div>
                        </div>
                        
                        <div class="text-muted small">
                            <i class="fas fa-clock me-1"></i>
                            ${createdDate}
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-sm w-100 view-analysis-btn" data-analysis-id="${analysis.id}" style="background-color: var(--asapalsa-green); color: white; border-color: var(--asapalsa-green);">
                            <i class="fas fa-eye me-2"></i>
                            Ver Análisis
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAnalysisDetail(analysisId) {
        try {
            const response = await fetch(`/api/history/${analysisId}`);
            const result = await response.json();

            if (result.success) {
                this.currentAnalysis = result.data;
                this.showAnalysisModal();
            } else {
                this.showError('Error al cargar el análisis: ' + result.message);
            }
        } catch (error) {
            this.showError('Error al cargar el análisis: ' + error.message);
        }
    }

    showAnalysisModal() {
        const analysis = this.currentAnalysis;
        
        // Llenar información del análisis
        document.getElementById('analysisName').textContent = analysis.name;
        document.getElementById('analysisFile').textContent = analysis.file_name;
        document.getElementById('analysisDate').textContent = new Date(analysis.created_at).toLocaleString('es-ES');
        
        // Mostrar resumen
        const summary = analysis.data_summary || {};
        document.getElementById('analysisSummary').innerHTML = `
            <div class="row">
                <div class="col-6">
                    <small><strong>Registros:</strong> ${summary.total_records || 0}</small><br>
                    <small><strong>Período:</strong> ${summary.date_range?.start || 'N/A'} - ${summary.date_range?.end || 'N/A'}</small>
                </div>
                <div class="col-6">
                    <small><strong>Toneladas:</strong> ${summary.total_tonnage || 0}</small><br>
                    <small><strong>Promedio:</strong> ${summary.monthly_average || 0}</small>
                </div>
            </div>
        `;

        // Actualizar disponibilidad de gráficos en el modal
        this.updateModalChartAvailability(analysis.chart_data);

        // Cargar el primer gráfico disponible
        this.loadFirstAvailableChart(analysis.chart_data);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('analysisModal'));
        modal.show();
    }

    loadChartInModal(chartType) {
        if (!this.currentAnalysis || !this.currentAnalysis.chart_data) {
            console.log('❌ No hay análisis actual o datos de gráficos');
            return;
        }

        console.log('🔍 Cargando gráfico:', chartType);
        console.log('📊 Datos del análisis:', this.currentAnalysis.chart_data);

        // Verificar si el gráfico está disponible
        const chartBtn = document.querySelector(`.chart-type-btn[data-chart="${chartType}"]`);
        if (chartBtn && chartBtn.classList.contains('disabled')) {
            this.showError('Este tipo de gráfico no está disponible para este análisis');
            return;
        }

        const chartData = this.currentAnalysis.chart_data[chartType];
        console.log('📈 Datos del gráfico específico:', chartData);
        
        if (!chartData || chartData.error) {
            console.log('❌ Error en datos del gráfico:', chartData?.error);
            this.showError('Gráfico no disponible para este análisis');
            return;
        }

        const ctx = document.getElementById('modalChart').getContext('2d');
        
        // Destruir gráfico existente
        if (this.modalChart) {
            this.modalChart.destroy();
        }

        console.log('🎨 Creando gráfico con configuración:', {
            type: chartData.type,
            data: chartData.data,
            options: chartData.options
        });

        try {
            // Crear nuevo gráfico
            this.modalChart = new Chart(ctx, {
                type: chartData.type,
                data: chartData.data,
                options: {
                    ...chartData.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        ...chartData.options.plugins,
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
                        easing: 'easeInOutQuart'
                    }
                }
            });
            console.log('✅ Gráfico creado exitosamente');
        } catch (error) {
            console.error('❌ Error al crear gráfico:', error);
            this.showError('Error al crear el gráfico: ' + error.message);
        }
    }

    updateActiveChartButton(activeBtn) {
        // Remover clase active de todos los botones
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Agregar clase active al botón clickeado
        activeBtn.classList.add('active');
    }

    updateModalChartAvailability(chartData) {
        const chartTypes = ['line', 'bar', 'comparison', 'precision', 'difference', 'scatter', 'radar'];
        let availableCount = 0;
        
        chartTypes.forEach(chartType => {
            const chartBtn = document.querySelector(`.chart-type-btn[data-chart="${chartType}"]`);
            if (!chartBtn) return;

            if (chartData && chartData[chartType] && !chartData[chartType].error) {
                // Gráfico disponible
                chartBtn.classList.remove('disabled');
                chartBtn.disabled = false;
                chartBtn.title = this.getChartDescription(chartType);
                availableCount++;
            } else {
                // Gráfico no disponible
                chartBtn.classList.add('disabled');
                chartBtn.disabled = true;
                chartBtn.title = this.getChartUnavailableMessage(chartType);
            }
        });
        
        // Actualizar contador en el modal si existe
        this.updateModalChartCount(availableCount);
    }

    loadFirstAvailableChart(chartData) {
        const chartTypes = ['line', 'bar', 'comparison', 'precision', 'difference', 'scatter', 'radar'];
        
        for (const chartType of chartTypes) {
            if (chartData && chartData[chartType] && !chartData[chartType].error) {
                this.loadChartInModal(chartType);
                // Marcar el botón como activo
                const chartBtn = document.querySelector(`.chart-type-btn[data-chart="${chartType}"]`);
                if (chartBtn) {
                    this.updateActiveChartButton(chartBtn);
                }
                break;
            }
        }
    }

    updateModalChartCount(count) {
        // Buscar elementos del contador en el modal
        const countElement = document.querySelector('#analysisModal .available-count-number');
        const badgeElement = document.querySelector('#analysisModal .available-count');
        const noChartsMessage = document.getElementById('modalNoChartsMessage');
        
        if (countElement && badgeElement) {
            countElement.textContent = count;
            badgeElement.style.display = count > 0 ? 'inline-block' : 'none';
            
            // Cambiar color del badge según la cantidad
            if (count === 7) {
                badgeElement.className = 'badge bg-success ms-2 available-count';
            } else if (count >= 4) {
                badgeElement.className = 'badge bg-warning ms-2 available-count';
            } else if (count > 0) {
                badgeElement.className = 'badge bg-danger ms-2 available-count';
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
            'radar': 'Comparación multidimensional de tipos de movimiento'
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
            'radar': 'Se requieren al menos 3 variables con datos válidos'
        };
        return messages[chartType] || 'Gráfico no disponible con los datos actuales';
    }

    async deleteCurrentAnalysis() {
        if (!this.currentAnalysis) return;

        if (confirm('¿Estás seguro de que quieres eliminar este análisis? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`/api/delete-analysis/${this.currentAnalysis.id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();

                if (result.success) {
                    this.showSuccess('Análisis eliminado correctamente');
                    this.closeModal();
                    this.loadHistorial(); // Recargar la lista
                } else {
                    this.showError('Error al eliminar: ' + result.message);
                }
            } catch (error) {
                this.showError('Error al eliminar: ' + error.message);
            }
        }
    }

    closeModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('analysisModal'));
        if (modal) {
            modal.hide();
        }
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showAlert(message, type) {
        // Remover alertas existentes
        const existingAlerts = document.querySelectorAll('.alert-temp');
        existingAlerts.forEach(alert => alert.remove());

        // Crear nueva alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-temp alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const historialManager = new HistorialManager();

    // Event delegation para los botones de ver análisis
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-analysis-btn') || e.target.closest('.view-analysis-btn')) {
            const btn = e.target.classList.contains('view-analysis-btn') ? e.target : e.target.closest('.view-analysis-btn');
            const analysisId = btn.dataset.analysisId;
            historialManager.loadAnalysisDetail(analysisId);
        }
    });
});
