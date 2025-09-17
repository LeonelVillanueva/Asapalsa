import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import sqlite3
import json
import uuid
from datetime import datetime
import hashlib
import time
from functools import lru_cache
import io
import base64
from scipy import stats

# Configuración de la página
st.set_page_config(
    page_title="ASAPALSA Analytics",
    page_icon="🌱",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS personalizado
st.markdown("""
<style>
    .main-header {
        text-align: center;
        padding: 2rem 0;
        background: linear-gradient(90deg, #2E8B57, #32CD32);
        color: white;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #2E8B57;
        margin: 0.5rem 0;
    }
    .sidebar .sidebar-content {
        background: linear-gradient(180deg, #f8f9fa, #e9ecef);
    }
    .stButton > button {
        background: linear-gradient(90deg, #2E8B57, #32CD32);
        color: white;
        border: none;
        border-radius: 5px;
        padding: 0.5rem 1rem;
        font-weight: bold;
    }
    .stButton > button:hover {
        background: linear-gradient(90deg, #228B22, #2E8B57);
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Inicializar estado de sesión
if 'data_loaded' not in st.session_state:
    st.session_state.data_loaded = False
if 'processed_data' not in st.session_state:
    st.session_state.processed_data = None
if 'original_data' not in st.session_state:
    st.session_state.original_data = None
if 'current_data' not in st.session_state:
    st.session_state.current_data = None

# Configuración de base de datos
DATABASE = 'analytics_history.db'

def init_db():
    """Inicializar la base de datos para el historial"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            file_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_summary TEXT,
            chart_data TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL,
            variable TEXT NOT NULL,
            threshold_value REAL,
            threshold_condition TEXT,
            frequency TEXT DEFAULT 'immediate',
            email TEXT,
            enabled BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def process_csv_data(uploaded_file):
    """Procesa el archivo CSV y prepara los datos para visualización"""
    try:
        # Leer el archivo CSV
        df = pd.read_csv(uploaded_file, sep=';', encoding='utf-8')
        
        # Limpiar nombres de columnas
        df.columns = df.columns.str.strip()
        
        # Extraer tipo de movimiento de la descripción
        df['TipoMovimiento'] = df['DESCRIPCION'].str.extract(r'\d*\s*(.*)', expand=False).str.strip().str.lower()
        
        # Arreglar nombres inconsistentes
        df['TipoMovimiento'] = df['TipoMovimiento'].replace({
            'fruta recibida': 'fruta recibida',
            'fruta proyectada': 'fruta proyectada',
            'proyeccion compra de fruta ajustada': 'proyeccion ajustada',
            'proyeccion compra de fruta ajustada': 'proyeccion ajustada',
            'fruta proyectada 2019': 'fruta proyectada',
            'fruta proyectada 2020': 'fruta proyectada',
            'fruta proyectada 2021': 'fruta proyectada',
            'fruta proyectada 2022': 'fruta proyectada',
            'fruta proyectada 2023': 'fruta proyectada',
            'fruta proyectada 2024': 'fruta proyectada',
            'fruta proyectada 2025': 'fruta proyectada'
        })
        
        # Mapeo de nombres de mes a número
        meses_map = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
            'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
            'septiembre': '09', 'setiembre': '09',
            'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        }
        
        # Convertir nombres de mes a número
        df['MES'] = df['MES'].str.strip().str.lower().map(meses_map)
        
        # Crear columna de fecha
        df['Fecha'] = pd.to_datetime(df['year'].astype(str) + '-' + df['MES'] + '-01')
        
        # Limpiar y convertir T.M. a numérico
        df['T.M.'] = df['T.M.'].replace(',', '', regex=True).astype(float)
        
        # Seleccionar solo columnas necesarias
        df_clean = df[['Fecha', 'TipoMovimiento', 'T.M.']]
        
        # Agrupar por fecha y tipo de movimiento
        df_grouped = df_clean.groupby(['Fecha', 'TipoMovimiento'])['T.M.'].sum().reset_index()
        
        # Pivotear para graficación
        pivot = df_grouped.pivot(index='Fecha', columns='TipoMovimiento', values='T.M.').fillna(0)
        
        # Calcular métricas adicionales
        if 'fruta proyectada' in pivot.columns and 'fruta recibida' in pivot.columns:
            pivot['diferencia_ajustada'] = pivot.get('proyeccion ajustada', 0) - pivot.get('fruta recibida', 0)
            pivot['precision_proy'] = (pivot.get('fruta recibida', 0) / pivot.get('fruta proyectada', 1)) * 100
            pivot['precision_proy'] = pivot['precision_proy'].replace([np.inf, -np.inf], np.nan)
        
        return True, pivot, df_clean
        
    except Exception as e:
        return False, None, None, f"Error al procesar el archivo: {str(e)}"

def create_line_chart(data, title="Evolución Temporal"):
    """Crear gráfico de líneas con Plotly"""
    fig = go.Figure()
    
    valid_columns = [col for col in data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and data[col].sum() > 0]
    
    colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
    
    for i, column in enumerate(valid_columns):
        fig.add_trace(go.Scatter(
            x=data.index,
            y=data[column],
            mode='lines+markers',
            name=column.title(),
            line=dict(color=colors[i % len(colors)], width=3),
            marker=dict(size=6)
        ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Fecha",
        yaxis_title="Toneladas",
        hovermode='x unified',
        template="plotly_white",
        height=500
    )
    
    return fig

def create_bar_chart(data, title="Comparación por Período"):
    """Crear gráfico de barras con Plotly"""
    fig = go.Figure()
    
    valid_columns = [col for col in data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and data[col].sum() > 0]
    colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
    
    for i, column in enumerate(valid_columns):
        fig.add_trace(go.Bar(
            x=data.index,
            y=data[column],
            name=column.title(),
            marker_color=colors[i % len(colors)]
        ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Fecha",
        yaxis_title="Toneladas",
        barmode='group',
        template="plotly_white",
        height=500
    )
    
    return fig

def create_comparison_chart(data, title="Proyección vs Realidad"):
    """Crear gráfico de comparación"""
    if 'fruta proyectada' not in data.columns or 'fruta recibida' not in data.columns:
        return None
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=data.index,
        y=data['fruta proyectada'],
        mode='lines+markers',
        name='Fruta Proyectada',
        line=dict(color='#36A2EB', width=3),
        marker=dict(size=6)
    ))
    
    fig.add_trace(go.Scatter(
        x=data.index,
        y=data['fruta recibida'],
        mode='lines+markers',
        name='Fruta Recibida',
        line=dict(color='#FF6384', width=3),
        marker=dict(size=6)
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Fecha",
        yaxis_title="Toneladas",
        hovermode='x unified',
        template="plotly_white",
        height=500
    )
    
    return fig

def create_precision_chart(data, title="Precisión de Proyección"):
    """Crear gráfico de precisión"""
    if 'precision_proy' not in data.columns:
        return None
    
    valid_data = data.dropna(subset=['precision_proy'])
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=valid_data.index,
        y=valid_data['precision_proy'],
        name='Precisión (%)',
        marker_color='#4BC0C0'
    ))
    
    # Línea de referencia al 100%
    fig.add_hline(y=100, line_dash="dash", line_color="gray", 
                  annotation_text="Proyección Exacta", annotation_position="top right")
    
    fig.update_layout(
        title=title,
        xaxis_title="Fecha",
        yaxis_title="Porcentaje de Cumplimiento",
        template="plotly_white",
        height=500
    )
    
    return fig

def get_data_summary(data):
    """Obtener resumen de los datos"""
    if data is None or data.empty:
        return None
    
    return {
        'total_records': len(data),
        'columns': list(data.columns),
        'date_range': {
            'start': data.index.min().strftime('%Y-%m-%d'),
            'end': data.index.max().strftime('%Y-%m-%d')
        },
        'total_tonnage': float(data.sum().sum()),
        'monthly_average': float(data.sum(axis=1).mean()),
        'movement_types': len(data.columns)
    }

def main():
    # Header principal
    st.markdown("""
    <div class="main-header">
        <h1>🌱 ASAPALSA Analytics</h1>
        <h3>Sistema de Análisis Agroindustrial</h3>
        <p>Análisis avanzado de datos de producción y proyecciones</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Inicializar base de datos
    init_db()
    
    # Sidebar
    with st.sidebar:
        st.image("static/images/asapalsa.png", width=200)
        st.markdown("### 📊 Panel de Control")
        
        # Opciones de navegación
        page = st.selectbox(
            "Seleccionar página",
            ["🏠 Inicio", "📈 Análisis", "📊 Reportes", "⚙️ Configuración"]
        )
        
        st.markdown("---")
        
        # Información del sistema
        st.markdown("### ℹ️ Información")
        st.info(f"**Versión:** 2.0.0\n\n**Fecha:** {datetime.now().strftime('%d/%m/%Y')}")
    
    # Página principal
    if page == "🏠 Inicio":
        st.markdown("## 🚀 Bienvenido a ASAPALSA Analytics")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.markdown("""
            ### 📋 Características del Sistema
            
            - **Carga de Datos**: Sube archivos CSV con drag & drop
            - **Visualizaciones**: 5 tipos de gráficos interactivos
            - **Análisis Estadístico**: Correlaciones, tendencias y anomalías
            - **Reportes**: Generación automática de reportes
            - **Exportación**: Descarga de gráficos y datos
            - **Historial**: Guardado de análisis anteriores
            """)
        
        with col2:
            st.markdown("### 📁 Cargar Archivo CSV")
            uploaded_file = st.file_uploader(
                "Selecciona un archivo CSV",
                type=['csv'],
                help="Formato esperado: separado por punto y coma (;)"
            )
            
            if uploaded_file is not None:
                with st.spinner("Procesando archivo..."):
                    success, processed_data, current_data = process_csv_data(uploaded_file)
                    
                    if success:
                        st.session_state.data_loaded = True
                        st.session_state.processed_data = processed_data
                        st.session_state.current_data = current_data
                        st.session_state.original_data = processed_data.copy()
                        
                        st.success("✅ Archivo procesado correctamente!")
                        
                        # Mostrar resumen
                        summary = get_data_summary(processed_data)
                        if summary:
                            st.markdown("### 📊 Resumen de Datos")
                            col1, col2, col3 = st.columns(3)
                            
                            with col1:
                                st.metric("Total Registros", summary['total_records'])
                            with col2:
                                st.metric("Toneladas Totales", f"{summary['total_tonnage']:,.2f}")
                            with col3:
                                st.metric("Promedio Mensual", f"{summary['monthly_average']:,.2f}")
                    else:
                        st.error("❌ Error al procesar el archivo")
    
    # Página de análisis
    elif page == "📈 Análisis":
        if not st.session_state.data_loaded:
            st.warning("⚠️ Por favor, carga un archivo CSV primero en la página de Inicio")
            return
        
        st.markdown("## 📈 Análisis de Datos")
        
        data = st.session_state.processed_data
        
        # Selector de tipo de gráfico
        chart_type = st.selectbox(
            "Seleccionar tipo de visualización",
            ["Líneas", "Barras", "Comparación", "Precisión", "Diferencias"]
        )
        
        # Generar gráfico según el tipo seleccionado
        if chart_type == "Líneas":
            fig = create_line_chart(data, "Evolución Temporal de Tipos de Movimiento")
            st.plotly_chart(fig, use_container_width=True)
            
        elif chart_type == "Barras":
            fig = create_bar_chart(data, "Comparación por Período")
            st.plotly_chart(fig, use_container_width=True)
            
        elif chart_type == "Comparación":
            fig = create_comparison_chart(data, "Proyección vs Realidad")
            if fig:
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning("No hay datos de proyección y recepción para comparar")
                
        elif chart_type == "Precisión":
            fig = create_precision_chart(data, "Precisión de Proyección")
            if fig:
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning("No hay datos de precisión disponibles")
                
        elif chart_type == "Diferencias":
            if 'diferencia_ajustada' in data.columns:
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=data.index,
                    y=data['diferencia_ajustada'],
                    mode='lines+markers',
                    name='Diferencia (Ajustada - Recibida)',
                    line=dict(color='#FF6384', width=3),
                    marker=dict(size=6)
                ))
                fig.add_hline(y=0, line_dash="dash", line_color="gray", 
                              annotation_text="Línea de Referencia")
                fig.update_layout(
                    title="Diferencias entre Proyección Ajustada y Recibida",
                    xaxis_title="Fecha",
                    yaxis_title="Toneladas (positiva = sobreproyección)",
                    template="plotly_white",
                    height=500
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning("No hay datos de diferencias disponibles")
        
        # Análisis estadístico
        st.markdown("### 📊 Análisis Estadístico")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### 📈 Estadísticas Descriptivas")
            numeric_cols = data.select_dtypes(include=[np.number]).columns
            numeric_cols = [col for col in numeric_cols if col not in ['diferencia_ajustada', 'precision_proy']]
            
            if len(numeric_cols) > 0:
                stats_df = data[numeric_cols].describe()
                st.dataframe(stats_df, use_container_width=True)
        
        with col2:
            st.markdown("#### 🔗 Correlaciones")
            if len(numeric_cols) > 1:
                corr_matrix = data[numeric_cols].corr()
                fig_corr = px.imshow(corr_matrix, 
                                   text_auto=True, 
                                   aspect="auto",
                                   color_continuous_scale='RdBu_r')
                st.plotly_chart(fig_corr, use_container_width=True)
    
    # Página de reportes
    elif page == "📊 Reportes":
        st.markdown("## 📊 Generación de Reportes")
        
        if not st.session_state.data_loaded:
            st.warning("⚠️ Por favor, carga un archivo CSV primero")
            return
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.markdown("### 📋 Configuración del Reporte")
            
            report_title = st.text_input("Título del Reporte", value="Reporte de Análisis ASAPALSA")
            report_type = st.selectbox("Tipo de Reporte", ["Ejecutivo", "Técnico", "Detallado"])
            
            sections = st.multiselect(
                "Secciones a incluir",
                ["Resumen Ejecutivo", "Estadísticas", "Tendencias", "Anomalías", "Recomendaciones"],
                default=["Resumen Ejecutivo", "Estadísticas", "Recomendaciones"]
            )
        
        with col2:
            st.markdown("### ⚙️ Opciones")
            
            if st.button("🔍 Generar Reporte", type="primary"):
                with st.spinner("Generando reporte..."):
                    # Generar reporte
                    data = st.session_state.processed_data
                    summary = get_data_summary(data)
                    
                    st.markdown("### 📄 Reporte Generado")
                    st.markdown(f"**Título:** {report_title}")
                    st.markdown(f"**Tipo:** {report_type}")
                    st.markdown(f"**Fecha:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
                    
                    if "Resumen Ejecutivo" in sections:
                        st.markdown("#### 📊 Resumen Ejecutivo")
                        if summary:
                            col1, col2, col3 = st.columns(3)
                            with col1:
                                st.metric("Total Registros", summary['total_records'])
                            with col2:
                                st.metric("Toneladas Totales", f"{summary['total_tonnage']:,.2f}")
                            with col3:
                                st.metric("Promedio Mensual", f"{summary['monthly_average']:,.2f}")
                    
                    if "Estadísticas" in sections:
                        st.markdown("#### 📈 Estadísticas Descriptivas")
                        numeric_cols = data.select_dtypes(include=[np.number]).columns
                        numeric_cols = [col for col in numeric_cols if col not in ['diferencia_ajustada', 'precision_proy']]
                        if len(numeric_cols) > 0:
                            stats_df = data[numeric_cols].describe()
                            st.dataframe(stats_df, use_container_width=True)
                    
                    if "Recomendaciones" in sections:
                        st.markdown("#### 💡 Recomendaciones")
                        recommendations = [
                            "Revisar la precisión de las proyecciones mensualmente",
                            "Implementar alertas automáticas para desviaciones significativas",
                            "Analizar tendencias estacionales para mejorar la planificación",
                            "Mantener un registro detallado de las proyecciones vs realidad"
                        ]
                        for i, rec in enumerate(recommendations, 1):
                            st.markdown(f"{i}. {rec}")
    
    # Página de configuración
    elif page == "⚙️ Configuración":
        st.markdown("## ⚙️ Configuración del Sistema")
        
        tab1, tab2, tab3 = st.tabs(["📊 Datos", "🔔 Alertas", "💾 Exportación"])
        
        with tab1:
            st.markdown("### 📊 Información de Datos")
            if st.session_state.data_loaded:
                data = st.session_state.processed_data
                summary = get_data_summary(data)
                
                if summary:
                    st.json(summary)
            else:
                st.info("No hay datos cargados")
        
        with tab2:
            st.markdown("### 🔔 Configuración de Alertas")
            st.info("Funcionalidad de alertas en desarrollo")
        
        with tab3:
            st.markdown("### 💾 Exportación de Datos")
            if st.session_state.data_loaded:
                data = st.session_state.processed_data
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button("📊 Exportar CSV"):
                        csv = data.to_csv()
                        st.download_button(
                            label="Descargar CSV",
                            data=csv,
                            file_name=f"asapalsa_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                            mime="text/csv"
                        )
                
                with col2:
                    if st.button("📈 Exportar Gráfico"):
                        st.info("Funcionalidad de exportación de gráficos en desarrollo")

if __name__ == "__main__":
    main()
