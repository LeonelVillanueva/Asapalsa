# 🌱 ASAPALSA Analytics - Streamlit Version

Sistema de análisis de datos agroindustriales convertido para Streamlit Cloud.

## 🚀 Despliegue en Streamlit Cloud

### Pasos para desplegar:

1. **Sube los archivos a GitHub:**
   - `streamlit_app.py` (archivo principal)
   - `requirements_streamlit.txt` (dependencias)
   - `.streamlit/config.toml` (configuración)
   - Carpeta `static/` con las imágenes

2. **En Streamlit Cloud:**
   - Conecta tu repositorio de GitHub
   - Selecciona `streamlit_app.py` como archivo principal
   - Usa `requirements_streamlit.txt` como archivo de dependencias
   - Deploy!

### 📁 Estructura de archivos necesaria:

```
asapalsa/
├── streamlit_app.py          # Archivo principal de Streamlit
├── requirements_streamlit.txt # Dependencias para Streamlit
├── .streamlit/
│   └── config.toml           # Configuración de Streamlit
├── static/
│   └── images/
│       ├── asapalsa.png      # Logo de la empresa
│       ├── favicon.ico       # Favicon
│       ├── favicon-16x16.png
│       └── favicon-32x32.png
└── README_STREAMLIT.md       # Este archivo
```

## 🔧 Características

- **Interfaz moderna**: Diseño responsive con Streamlit
- **Carga de datos**: Drag & drop para archivos CSV
- **Visualizaciones**: Gráficos interactivos con Plotly
- **Análisis estadístico**: Correlaciones, tendencias y estadísticas
- **Reportes**: Generación automática de reportes
- **Exportación**: Descarga de datos en CSV

## 📊 Tipos de visualizaciones

1. **Líneas**: Evolución temporal de tipos de movimiento
2. **Barras**: Comparación por período
3. **Comparación**: Proyección vs realidad
4. **Precisión**: Precisión de proyección
5. **Diferencias**: Diferencias entre proyección ajustada y recibida

## 🛠️ Desarrollo local

Para ejecutar localmente:

```bash
pip install -r requirements_streamlit.txt
streamlit run streamlit_app.py
```

## 📝 Formato de datos esperado

El sistema espera archivos CSV con las siguientes columnas:
- `DESCRIPCION`: Descripción del movimiento
- `MES`: Mes (enero, febrero, etc.)
- `year`: Año
- `T.M.`: Toneladas métricas

## 🎯 Diferencias con la versión Flask

- **Interfaz**: Streamlit UI en lugar de HTML/CSS/JS
- **Gráficos**: Plotly en lugar de Chart.js
- **Estado**: Session state en lugar de variables globales
- **Navegación**: Pestañas en lugar de rutas Flask
- **Despliegue**: Streamlit Cloud en lugar de servidor propio

## 🔍 Solución de problemas

### Error de Flask en Streamlit Cloud
El error original se debe a que Flask intenta iniciar su propio servidor, lo cual no es compatible con Streamlit Cloud. La versión Streamlit resuelve esto usando la interfaz nativa de Streamlit.

### Dependencias faltantes
Si hay errores de dependencias, verifica que `requirements_streamlit.txt` contenga todas las librerías necesarias.

### Archivos estáticos
Asegúrate de que las imágenes estén en la carpeta `static/images/` y sean accesibles desde Streamlit Cloud.
