// Mobile Historial Manager - JavaScript
class MobileHistorialManager {
    constructor() {
        this.currentAnalysis = null;
        this.historial = [];
        this.init();
    }

    init() {
        console.log('🚀 Mobile Historial Manager iniciado');
        this.setupEventListeners();
        this.loadHistorial();
    }

    setupEventListeners() {
        // Event listener para el botón de eliminar en el modal
        const deleteBtn = document.getElementById('deleteAnalysisBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.showDeleteConfirmation();
            });
        }

        // Event listener para confirmar eliminación
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteCurrentAnalysis();
            });
        }

        // Event listener para cerrar modal de análisis
        const analysisModal = document.getElementById('mobileAnalysisModal');
        if (analysisModal) {
            analysisModal.addEventListener('hidden.bs.modal', () => {
                this.currentAnalysis = null;
            });
        }
    }

    async loadHistorial() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/history');
            const result = await response.json();

            if (result.success) {
                this.historial = result.data;
                this.displayHistorial(result.data);
            } else {
                this.showError('Error al cargar el historial: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            this.showError('Error al cargar el historial: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displayHistorial(historial) {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const historialList = document.getElementById('historialList');

        if (!historial || historial.length === 0) {
            loadingState.classList.add('d-none');
            emptyState.classList.remove('d-none');
            historialList.classList.add('d-none');
            return;
        }

        // Ordenar por fecha de creación (más recientes primero)
        historial.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        loadingState.classList.add('d-none');
        emptyState.classList.add('d-none');
        historialList.classList.remove('d-none');

        historialList.innerHTML = '';
        
        historial.forEach(analysis => {
            const card = this.createAnalysisCard(analysis);
            historialList.appendChild(card);
        });

        // Agregar animación de entrada
        setTimeout(() => {
            historialList.classList.add('fade-in');
        }, 100);
    }

    createAnalysisCard(analysis) {
        const card = document.createElement('div');
        card.className = 'mobile-historial-card';
        card.onclick = () => this.viewAnalysis(analysis);

        const createdDate = new Date(analysis.created_at);
        const dateString = createdDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Determinar el icono según el tipo de gráfico
        const chartIcon = this.getChartIcon(analysis.chart_data?.type);

        // Obtener información adicional del análisis
        let dataSummary = analysis.data_summary;
        if (typeof dataSummary === 'string') {
            try {
                dataSummary = JSON.parse(dataSummary);
            } catch (e) {
                dataSummary = {};
            }
        }

        const chartTypeName = this.getChartTypeName(analysis.chart_data?.type || 'line');
        const totalRecords = dataSummary?.total_records || 'N/A';
        const totalColumns = dataSummary?.columns?.length || 'N/A';
        const totalTonnage = dataSummary?.total_tonnage ? dataSummary.total_tonnage.toLocaleString() : 'N/A';
        
        // Formatear rango de fechas si está disponible
        let dateRange = 'N/A';
        if (dataSummary?.date_range?.start && dataSummary?.date_range?.end) {
            const startDate = new Date(dataSummary.date_range.start);
            const endDate = new Date(dataSummary.date_range.end);
            const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            const endStr = endDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            dateRange = `${startStr} - ${endStr}`;
        }

        card.innerHTML = `
            <div class="mobile-historial-card-header">
                <div class="mobile-historial-card-icon">
                    <i class="${chartIcon}"></i>
                </div>
                <div class="mobile-historial-card-info">
                    <h4 class="mobile-historial-card-title">${this.escapeHtml(analysis.name)}</h4>
                    <p class="mobile-historial-card-subtitle">${this.escapeHtml(analysis.description || 'Sin descripción')}</p>
                </div>
                <div class="mobile-historial-card-actions">
                    <button class="btn btn-sm mobile-card-action-btn mobile-card-action-view" 
                            onclick="event.stopPropagation(); mobileHistorial.viewAnalysis('${analysis.id}')" 
                            title="Ver análisis">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm mobile-card-action-btn mobile-card-action-delete" 
                            onclick="event.stopPropagation(); mobileHistorial.showDeleteConfirmation('${analysis.id}')" 
                            title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mobile-historial-card-body">
                <div class="mobile-historial-card-meta">
                    <span class="mobile-historial-card-meta-item">
                        <i class="fas fa-file me-1"></i>
                        ${this.escapeHtml(analysis.file_name)}
                    </span>
                    <span class="mobile-historial-card-meta-item">
                        <i class="fas fa-clock me-1"></i>
                        ${dateString}
                    </span>
                </div>
                <div class="mobile-historial-card-stats">
                    <div class="mobile-stat-line">
                        <strong>Total procesado:</strong> ${totalTonnage} T.M.
                    </div>
                    <div class="mobile-stat-line">
                        <strong>Período analizado:</strong> ${dateRange}
                    </div>
                    <div class="mobile-stat-line mobile-description" id="analysis-description-${analysis.id}">
                        <i class="fas fa-spinner fa-spin me-2"></i>Generando análisis inteligente...
                    </div>
                </div>
            </div>
        `;

        // Cargar análisis de forma asíncrona
        this.loadAnalysisDescription(analysis.id, dataSummary, chartTypeName);

        return card;
    }

    async loadAnalysisDescription(analysisId, dataSummary, chartTypeName) {
        try {
            const description = await this.generateAnalysisDescription(dataSummary, chartTypeName);
            const descriptionElement = document.getElementById(`analysis-description-${analysisId}`);
            if (descriptionElement) {
                descriptionElement.innerHTML = description;
            }
        } catch (error) {
            console.error('Error cargando descripción del análisis:', error);
            const descriptionElement = document.getElementById(`analysis-description-${analysisId}`);
            if (descriptionElement) {
                descriptionElement.innerHTML = 'Error generando análisis.';
            }
        }
    }

    async loadModalAnalysisDescription(analysis) {
        try {
            let dataSummary = {};
            if (typeof analysis.data_summary === 'string') {
                dataSummary = JSON.parse(analysis.data_summary);
            } else {
                dataSummary = analysis.data_summary || {};
            }

            let chartData = {};
            if (typeof analysis.chart_data === 'string') {
                chartData = JSON.parse(analysis.chart_data);
            } else {
                chartData = analysis.chart_data || {};
            }

            const chartTypeName = this.getChartTypeName(chartData.type || 'line');
            const description = await this.generateAnalysisDescription(dataSummary, chartTypeName);
            
            const descriptionElement = document.getElementById(`modal-analysis-description-${analysis.id}`);
            if (descriptionElement) {
                descriptionElement.innerHTML = description;
            }
        } catch (error) {
            console.error('Error cargando descripción del análisis en modal:', error);
            const descriptionElement = document.getElementById(`modal-analysis-description-${analysis.id}`);
            if (descriptionElement) {
                descriptionElement.innerHTML = 'Error generando análisis.';
            }
        }
    }

    getChartIcon(chartType) {
        const icons = {
            'line': 'fas fa-chart-line',
            'bar': 'fas fa-chart-bar',
            'pie': 'fas fa-chart-pie',
            'scatter': 'fas fa-braille',
            'histogram': 'fas fa-chart-area',
            'comparison': 'fas fa-balance-scale',
            'precision': 'fas fa-crosshairs',
            'difference': 'fas fa-chart-line'
        };
        return icons[chartType] || 'fas fa-chart-line';
    }

    getChartTypeName(chartType) {
        const names = {
            'line': 'Gráfico de Línea',
            'bar': 'Gráfico de Barras',
            'pie': 'Gráfico Circular',
            'scatter': 'Gráfico de Dispersión',
            'histogram': 'Histograma',
            'comparison': 'Análisis Comparativo',
            'precision': 'Análisis de Exactitud',
            'difference': 'Análisis de Diferencias'
        };
        return names[chartType] || 'Gráfico';
    }

    async generateAnalysisDescription(dataSummary, chartTypeName) {
        return await this.generateIntelligentAnalysis(dataSummary, chartTypeName);
    }

    async generateIntelligentAnalysis(dataSummary, chartTypeName) {
        try {
            // Intentar usar IA real primero
            const aiResponse = await this.callIntelligentAI(dataSummary, chartTypeName);
            if (aiResponse && aiResponse.success) {
                return aiResponse.analysis;
            }
        } catch (error) {
            console.log('IA no disponible, usando análisis local:', error);
        }
        
        // Fallback al análisis local si la IA no está disponible
        return this.generateLocalAnalysis(dataSummary, chartTypeName);
    }

    async callIntelligentAI(dataSummary, chartTypeName) {
        try {
            const response = await fetch('/api/generate-intelligent-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataSummary: dataSummary,
                    chartData: { type: this.extractChartType(chartTypeName) },
                    analysisName: 'Análisis Móvil'
                })
            });
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error llamando a la IA:', error);
            return null;
        }
    }

    extractChartType(chartTypeName) {
        if (chartTypeName.includes('Línea')) return 'line';
        if (chartTypeName.includes('Barras')) return 'bar';
        if (chartTypeName.includes('Circular')) return 'pie';
        if (chartTypeName.includes('Dispersión')) return 'scatter';
        if (chartTypeName.includes('Histograma')) return 'histogram';
        return 'line';
    }

    generateLocalAnalysis(dataSummary, chartTypeName) {
        const totalRecords = dataSummary?.total_records || 0;
        const totalTonnage = dataSummary?.total_tonnage || 0;
        const monthlyAverage = dataSummary?.monthly_average || 0;
        const numericColumns = dataSummary?.numeric_columns || 0;
        const dateRange = dataSummary?.date_range;
        
        // Análisis de densidad de datos
        const dataDensity = totalRecords > 100 ? 'alta densidad' : totalRecords > 50 ? 'densidad moderada' : 'datos concentrados';
        
        // Análisis de productividad
        let productivityLevel = '';
        let productivityInsight = '';
        if (monthlyAverage > 0) {
            if (monthlyAverage > 2000) {
                productivityLevel = 'excepcional';
                productivityInsight = 'indicando una operación de clase mundial con procesos altamente optimizados';
            } else if (monthlyAverage > 1000) {
                productivityLevel = 'alta';
                productivityInsight = 'demostrando eficiencia operacional sólida y gestión efectiva de recursos';
            } else if (monthlyAverage > 500) {
                productivityLevel = 'moderada';
                productivityInsight = 'sugiriendo oportunidades de optimización y mejora en procesos';
            } else {
                productivityLevel = 'baja';
                productivityInsight = 'revelando la necesidad de revisión estratégica y mejoras operacionales significativas';
            }
        }
        
        // Análisis temporal
        let temporalInsight = '';
        if (dateRange && dateRange.start && dateRange.end) {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const monthsDiff = Math.ceil(daysDiff / 30);
            
            if (monthsDiff > 12) {
                temporalInsight = `El análisis abarca ${monthsDiff} meses, proporcionando una visión a largo plazo`;
            } else if (monthsDiff > 6) {
                temporalInsight = `Cubriendo ${monthsDiff} meses, el análisis captura tendencias estacionales`;
            } else {
                temporalInsight = `Con ${monthsDiff} meses de datos, se identifican patrones a corto plazo`;
            }
        }
        
        // Análisis de variabilidad
        const variability = dataSummary?.std_deviation || 0;
        let variabilityInsight = '';
        if (variability > 0) {
            const coefficientOfVariation = (variability / monthlyAverage) * 100;
            if (coefficientOfVariation > 30) {
                variabilityInsight = 'Se observó alta variabilidad, indicando períodos de inestabilidad operacional';
            } else if (coefficientOfVariation > 15) {
                variabilityInsight = 'Moderada variabilidad sugiere fluctuaciones normales del mercado';
            } else {
                variabilityInsight = 'Baja variabilidad demuestra estabilidad y consistencia operacional';
            }
        }
        
        // Análisis específico por tipo de gráfico
        let chartSpecificInsight = '';
        if (chartTypeName.includes('Línea')) {
            chartSpecificInsight = 'Las tendencias temporales revelan la evolución del rendimiento';
        } else if (chartTypeName.includes('Barras')) {
            chartSpecificInsight = 'La comparación entre categorías identifica segmentos de alto y bajo rendimiento';
        } else if (chartTypeName.includes('Circular')) {
            chartSpecificInsight = 'La composición porcentual destaca los componentes dominantes del sistema';
        } else if (chartTypeName.includes('Dispersión')) {
            chartSpecificInsight = 'Las correlaciones entre variables explican el comportamiento del sistema';
        } else if (chartTypeName.includes('Histograma')) {
            chartSpecificInsight = 'La distribución de frecuencias identifica los rangos de valores más comunes';
        }
        
        // Construir análisis inteligente
        let analysis = `Análisis de ${dataDensity} con ${totalRecords.toLocaleString()} registros `;
        analysis += `procesando ${totalTonnage.toLocaleString()} T.M. `;
        
        if (temporalInsight) {
            analysis += `${temporalInsight.toLowerCase()}. `;
        }
        
        if (productivityLevel && productivityInsight) {
            analysis += `La productividad ${productivityLevel} (${monthlyAverage.toLocaleString()} T.M./mes) ${productivityInsight}. `;
        }
        
        if (variabilityInsight) {
            analysis += `${variabilityInsight}. `;
        }
        
        analysis += chartSpecificInsight ? `${chartSpecificInsight}.` : 'Proporcionando insights valiosos para la toma de decisiones.';
        
        return analysis;
    }

    getVisualizationDescription(chartType) {
        const descriptions = {
            'line': 'Este método de visualización es ideal para mostrar tendencias temporales y cambios en el tiempo, permitiendo identificar patrones de crecimiento, declive o estabilidad en la producción.',
            'bar': 'Las barras facilitan la comparación directa entre diferentes categorías o períodos, destacando claramente las diferencias de rendimiento entre segmentos.',
            'pie': 'El gráfico circular muestra la proporción relativa de cada componente, siendo especialmente útil para identificar los segmentos dominantes en la operación.',
            'scatter': 'La dispersión revela relaciones entre variables, ayudando a identificar correlaciones y patrones que pueden explicar el comportamiento del sistema.',
            'histogram': 'Este método muestra la distribución de frecuencias, identificando los rangos de valores más comunes y la variabilidad de la producción.'
        };
        return descriptions[chartType] || 'Esta visualización proporciona una perspectiva clara de los datos analizados, facilitando la interpretación de resultados.';
    }

    generateDetailedAnalysisDescription(dataSummary, chartData) {
        const totalRecords = dataSummary?.total_records || 0;
        const totalTonnage = dataSummary?.total_tonnage || 0;
        const monthlyAverage = dataSummary?.monthly_average || 0;
        const chartType = chartData?.type || 'line';
        const chartTypeName = this.getChartTypeName(chartType);
        
        // Análisis de patrones específicos
        const patterns = this.analyzeDataPatterns(dataSummary, chartData);
        const insights = this.generateActionableInsights(dataSummary, chartData);
        
        let description = `Este análisis avanzado procesó ${totalRecords.toLocaleString()} registros, `;
        description += `analizando ${totalTonnage.toLocaleString()} T.M. de producción. `;
        
        // Agregar patrones identificados
        if (patterns.length > 0) {
            description += patterns.join(' ') + ' ';
        }
        
        // Agregar insights accionables
        if (insights.length > 0) {
            description += insights.join(' ');
        } else {
            description += `La visualización ${chartTypeName.toLowerCase()} revela información clave para la optimización operacional.`;
        }
        
        return description;
    }

    analyzeDataPatterns(dataSummary, chartData) {
        const patterns = [];
        const monthlyAverage = dataSummary?.monthly_average || 0;
        const totalRecords = dataSummary?.total_records || 0;
        const dateRange = dataSummary?.date_range;
        
        // Análisis de tendencias
        if (dataSummary?.trend_direction) {
            if (dataSummary.trend_direction === 'upward') {
                patterns.push('Se identificó una tendencia ascendente consistente,');
            } else if (dataSummary.trend_direction === 'downward') {
                patterns.push('Se detectó una tendencia descendente que requiere atención,');
            } else {
                patterns.push('Se observó estabilidad en los patrones de producción,');
            }
        }
        
        // Análisis de estacionalidad
        if (dateRange && dateRange.start && dateRange.end) {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            const monthsDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
            
            if (monthsDiff > 12) {
                patterns.push('revelando patrones estacionales a lo largo del período analizado.');
            } else if (monthsDiff > 6) {
                patterns.push('mostrando variaciones periódicas en el rendimiento.');
            }
        }
        
        // Análisis de outliers
        if (dataSummary?.has_outliers) {
            patterns.push('Se identificaron valores atípicos que requieren investigación adicional.');
        }
        
        return patterns;
    }

    generateActionableInsights(dataSummary, chartData) {
        const insights = [];
        const monthlyAverage = dataSummary?.monthly_average || 0;
        const totalRecords = dataSummary?.total_records || 0;
        const chartType = chartData?.type || 'line';
        
        // Insights basados en productividad
        if (monthlyAverage > 0) {
            if (monthlyAverage > 2000) {
                insights.push('Recomendación: Mantener los procesos actuales y considerar expansión estratégica.');
            } else if (monthlyAverage > 1000) {
                insights.push('Recomendación: Optimizar procesos para alcanzar niveles de excelencia operacional.');
            } else if (monthlyAverage > 500) {
                insights.push('Recomendación: Implementar mejoras en eficiencia y gestión de recursos.');
            } else {
                insights.push('Recomendación: Revisión completa de estrategias operacionales y capacitación del personal.');
            }
        }
        
        // Insights específicos por tipo de análisis
        if (chartType === 'line') {
            insights.push('Las tendencias temporales sugieren oportunidades de predicción y planificación.');
        } else if (chartType === 'bar') {
            insights.push('La comparación entre categorías permite priorizar inversiones y recursos.');
        } else if (chartType === 'pie') {
            insights.push('La composición porcentual guía la diversificación y especialización de productos.');
        } else if (chartType === 'scatter') {
            insights.push('Las correlaciones identificadas pueden optimizar variables de control.');
        } else if (chartType === 'histogram') {
            insights.push('La distribución de frecuencias indica rangos óptimos de operación.');
        }
        
        return insights;
    }

    generateAnalysisStats(analysis) {
        try {
            // Verificar si data_summary ya es un objeto o necesita ser parseado
            let dataSummary = analysis.data_summary;
            if (typeof dataSummary === 'string') {
                dataSummary = JSON.parse(dataSummary);
            }
            
            const stats = [];
            
            if (dataSummary.total_records) {
                stats.push(`<span class="mobile-stat-item"><i class="fas fa-database me-1"></i>${dataSummary.total_records} registros</span>`);
            }
            
            if (dataSummary.columns && dataSummary.columns.length) {
                stats.push(`<span class="mobile-stat-item"><i class="fas fa-columns me-1"></i>${dataSummary.columns.length} columnas</span>`);
            }
            
            if (dataSummary.date_range && dataSummary.date_range.start && dataSummary.date_range.end) {
                const startDate = new Date(dataSummary.date_range.start);
                const endDate = new Date(dataSummary.date_range.end);
                const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const endStr = endDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                stats.push(`<span class="mobile-stat-item"><i class="fas fa-calendar me-1"></i>${startStr} - ${endStr}</span>`);
            }
            
            return stats.join('');
        } catch (error) {
            console.error('Error generando estadísticas:', error);
            return '<span class="mobile-stat-item"><i class="fas fa-info-circle me-1"></i>Análisis guardado</span>';
        }
    }

    async viewAnalysis(analysisOrId) {
        try {
            let analysis;
            
            if (typeof analysisOrId === 'string') {
                // Si se pasa un ID, buscar el análisis
                analysis = this.historial.find(a => a.id === analysisOrId);
                if (!analysis) {
                    this.showError('Análisis no encontrado');
                    return;
                }
            } else {
                // Si se pasa el objeto completo
                analysis = analysisOrId;
            }

            this.currentAnalysis = analysis;
            this.showAnalysisModal(analysis);
        } catch (error) {
            console.error('❌ Error viendo análisis:', error);
            this.showError('Error al cargar el análisis');
        }
    }

    showAnalysisModal(analysis) {
        const modal = document.getElementById('mobileAnalysisModal');
        const modalTitle = document.getElementById('modalAnalysisTitle');
        const modalContent = document.getElementById('modalAnalysisContent');

        modalTitle.textContent = analysis.name;
        
        // Generar contenido del modal
        modalContent.innerHTML = this.generateAnalysisModalContent(analysis);
        
        // Cargar análisis de IA para el modal
        this.loadModalAnalysisDescription(analysis);
        
        // Mostrar modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    generateAnalysisModalContent(analysis) {
        const createdDate = new Date(analysis.created_at);
        const dateString = createdDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let dataSummary = {};
        try {
            // Verificar si data_summary ya es un objeto o necesita ser parseado
            if (typeof analysis.data_summary === 'string') {
                dataSummary = JSON.parse(analysis.data_summary);
            } else {
                dataSummary = analysis.data_summary || {};
            }
        } catch (error) {
            console.error('Error parseando data_summary:', error);
            dataSummary = {};
        }

        let chartData = {};
        try {
            // Verificar si chart_data ya es un objeto o necesita ser parseado
            if (typeof analysis.chart_data === 'string') {
                chartData = JSON.parse(analysis.chart_data);
            } else {
                chartData = analysis.chart_data || {};
            }
        } catch (error) {
            console.error('Error parseando chart_data:', error);
            chartData = {};
        }

        return `
            <div class="mobile-analysis-detail">
                <div class="mobile-analysis-section">
                    <h6 class="mobile-analysis-section-title">
                        <i class="fas fa-info-circle me-2"></i>Información General
                    </h6>
                    <div class="mobile-analysis-info-compact">
                        <div class="mobile-info-line"><strong>Análisis:</strong> ${this.escapeHtml(analysis.name)}</div>
                        <div class="mobile-info-line"><strong>Descripción:</strong> ${this.escapeHtml(analysis.description || 'Sin descripción')}</div>
                        <div class="mobile-info-line"><strong>Archivo fuente:</strong> ${this.escapeHtml(analysis.file_name)}</div>
                        <div class="mobile-info-line"><strong>Fecha de creación:</strong> ${dateString}</div>
                    </div>
                </div>

                <div class="mobile-analysis-section">
                    <h6 class="mobile-analysis-section-title">
                        <i class="fas fa-chart-bar me-2"></i>Estadísticas de Datos
                    </h6>
                    <div class="mobile-analysis-info-compact">
                        <div class="mobile-info-line"><strong>Volumen total procesado:</strong> ${dataSummary.total_tonnage ? dataSummary.total_tonnage.toLocaleString() : 'N/A'} T.M.</div>
                        <div class="mobile-info-line"><strong>Promedio mensual:</strong> ${dataSummary.monthly_average ? dataSummary.monthly_average.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : 'N/A'} T.M.</div>
                        ${dataSummary.date_range && dataSummary.date_range.start && dataSummary.date_range.end ? 
                            `<div class="mobile-info-line"><strong>Período analizado:</strong> ${new Date(dataSummary.date_range.start).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })} - ${new Date(dataSummary.date_range.end).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>` : 
                            ''}
                        <div class="mobile-info-line mobile-description" id="modal-analysis-description-${analysis.id}">
                            <i class="fas fa-spinner fa-spin me-2"></i>Generando análisis inteligente...
                        </div>
                    </div>
                </div>

                ${chartData.type ? `
                <div class="mobile-analysis-section">
                    <h6 class="mobile-analysis-section-title">
                        <i class="fas fa-chart-line me-2"></i>Método de Visualización
                    </h6>
                    <div class="mobile-analysis-info-compact">
                        <div class="mobile-info-line"><strong>Visualización:</strong> ${this.getChartTypeName(chartData.type)}</div>
                        <div class="mobile-info-line"><strong>Título del análisis:</strong> ${this.escapeHtml(chartData.title || 'Sin título')}</div>
                        <div class="mobile-info-line mobile-description">
                            ${this.getVisualizationDescription(chartData.type)}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    generateDetailedStats(dataSummary) {
        const stats = [];
        
        if (dataSummary.total_records) {
            stats.push(`
                <div class="mobile-stat-detail">
                    <i class="fas fa-database text-primary"></i>
                    <div>
                        <strong>${dataSummary.total_records.toLocaleString()}</strong>
                        <small>Registros totales</small>
                    </div>
                </div>
            `);
        }
        
        if (dataSummary.columns && dataSummary.columns.length) {
            stats.push(`
                <div class="mobile-stat-detail">
                    <i class="fas fa-columns text-info"></i>
                    <div>
                        <strong>${dataSummary.columns.length}</strong>
                        <small>Columnas</small>
                    </div>
                </div>
            `);
        }
        
        if (dataSummary.numeric_columns) {
            stats.push(`
                <div class="mobile-stat-detail">
                    <i class="fas fa-calculator text-success"></i>
                    <div>
                        <strong>${dataSummary.numeric_columns}</strong>
                        <small>Columnas numéricas</small>
                    </div>
                </div>
            `);
        }
        
        if (dataSummary.total_tonnage) {
            stats.push(`
                <div class="mobile-stat-detail">
                    <i class="fas fa-weight-hanging text-warning"></i>
                    <div>
                        <strong>${parseFloat(dataSummary.total_tonnage).toLocaleString()}</strong>
                        <small>Total de toneladas</small>
                    </div>
                </div>
            `);
        }
        
        if (dataSummary.monthly_average) {
            stats.push(`
                <div class="mobile-stat-detail">
                    <i class="fas fa-chart-line text-danger"></i>
                    <div>
                        <strong>${parseFloat(dataSummary.monthly_average).toFixed(2)}</strong>
                        <small>Promedio mensual</small>
                    </div>
                </div>
            `);
        }
        
        return stats.length > 0 ? `<div class="mobile-stats-grid">${stats.join('')}</div>` : 
               '<p class="text-muted">No hay estadísticas disponibles</p>';
    }

    getChartTypeName(chartType) {
        const names = {
            'line': 'Gráfico de Línea',
            'bar': 'Gráfico de Barras',
            'pie': 'Gráfico Circular',
            'scatter': 'Gráfico de Dispersión',
            'histogram': 'Histograma',
            'comparison': 'Gráfico de Comparación',
            'precision': 'Gráfico de Precisión',
            'difference': 'Gráfico de Diferencias'
        };
        return names[chartType] || 'Gráfico Desconocido';
    }

    showDeleteConfirmation(analysisId = null) {
        if (analysisId) {
            // Si se pasa un ID específico, buscar ese análisis
            const analysis = this.historial.find(a => a.id === analysisId);
            if (analysis) {
                this.currentAnalysis = analysis;
            }
        }
        
        if (!this.currentAnalysis) {
            this.showError('No hay análisis seleccionado para eliminar');
            return;
        }
        
        const modal = document.getElementById('mobileDeleteModal');
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    async deleteCurrentAnalysis() {
        if (!this.currentAnalysis) {
            this.showError('No hay análisis seleccionado para eliminar');
            return;
        }

        try {
            const response = await fetch(`/api/delete-analysis/${this.currentAnalysis.id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Análisis eliminado correctamente');
                
                // Cerrar modales
                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('mobileDeleteModal'));
                if (deleteModal) deleteModal.hide();
                
                const analysisModal = bootstrap.Modal.getInstance(document.getElementById('mobileAnalysisModal'));
                if (analysisModal) analysisModal.hide();
                
                // Recargar historial
                this.loadHistorial();
            } else {
                this.showError('Error al eliminar análisis: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error eliminando análisis:', error);
            this.showError('Error al eliminar el análisis');
        }
    }

    // Funciones de utilidad
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            if (show) {
                loadingState.classList.remove('d-none');
            } else {
                loadingState.classList.add('d-none');
            }
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('mobileToast');
        const toastBody = toast.querySelector('.toast-body');
        const toastHeader = toast.querySelector('.toast-header i');
        
        if (toastBody) {
            toastBody.textContent = message;
        }
        
        if (toastHeader) {
            // Cambiar icono según el tipo
            toastHeader.className = type === 'success' ? 'fas fa-check-circle me-2 text-success' :
                                   type === 'error' ? 'fas fa-exclamation-circle me-2 text-danger' :
                                   'fas fa-info-circle me-2';
        }
        
        const bootstrapToast = new bootstrap.Toast(toast);
        bootstrapToast.show();
    }
}

// Funciones globales para botones
function goBack() {
    window.history.back();
}

function refreshHistorial() {
    if (window.mobileHistorial) {
        window.mobileHistorial.loadHistorial();
    }
}

function goToNewAnalysis() {
    window.location.href = '/mobile';
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.mobileHistorial = new MobileHistorialManager();
});
