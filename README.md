# 🚀 ASAPALSA Analytics

Sistema de análisis de datos agroindustriales con visualizaciones interactivas y estadísticas avanzadas.

## 📊 Características

- **Carga de Datos**: Procesamiento automático de archivos CSV
- **Visualizaciones**: 7 tipos de gráficos interactivos
- **Análisis Estadístico**: Correlaciones, tendencias y métricas
- **Reportes**: Generación automática de PDFs
- **Historial**: Almacenamiento de análisis previos
- **Exportación**: Descarga de datos y gráficos

## 🛠️ Tecnologías

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Visualizaciones**: Chart.js
- **Procesamiento**: Pandas, NumPy
- **Base de Datos**: SQLite
- **Estilos**: Bootstrap 5

## 🚀 Instalación y Uso

### Requisitos
- Python 3.11+
- pip (gestor de paquetes)

### Instalación Local
```bash
# 1. Clonar el repositorio
git clone https://github.com/tuusuario/asapalsa-analytics.git
cd asapalsa-analytics

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Ejecutar la aplicación
python start.py --dev
```

### Acceso
- **URL Local**: http://localhost:5000
- **Puerto**: 5000 (configurable)

## 📱 Uso de la Aplicación

### 1. Cargar Datos
- Arrastra y suelta archivos CSV
- O haz clic para seleccionar archivos
- El sistema validará y procesará automáticamente

### 2. Visualizaciones
- **Gráfico de Líneas**: Evolución temporal
- **Gráfico de Barras**: Comparación por períodos
- **Gráfico de Comparación**: Proyección vs Realidad
- **Gráfico de Precisión**: Análisis de exactitud
- **Gráfico de Diferencias**: Desviaciones detectadas
- **Gráfico de Dispersión**: Correlaciones
- **Gráfico Radar**: Análisis multidimensional

### 3. Análisis
- Métricas estadísticas automáticas
- Correlaciones entre variables
- Tendencias y patrones
- Exportación de reportes

## 🌐 Despliegue en la Nube

### Opciones Gratuitas
- **Heroku**: [Guía de despliegue](DEPLOYMENT_GUIDE.md#opción-1-heroku-recomendado)
- **Railway**: [Guía de despliegue](DEPLOYMENT_GUIDE.md#opción-2-railway-más-fácil)
- **Render**: [Guía de despliegue](DEPLOYMENT_GUIDE.md#opción-3-render)
- **PythonAnywhere**: [Guía de despliegue](DEPLOYMENT_GUIDE.md#opción-4-pythonanywhere)

### Despliegue Rápido
```bash
# 1. Crear cuenta en Heroku
# 2. Instalar Heroku CLI
# 3. Desplegar
heroku create asapalsa-analytics
git push heroku main
heroku open
```

## 📁 Estructura del Proyecto

```
asapalsa-analytics/
├── app.py                 # Aplicación Flask principal
├── start.py              # Script de inicio
├── requirements.txt      # Dependencias Python
├── Procfile             # Configuración Heroku
├── runtime.txt          # Versión de Python
├── templates/           # Plantillas HTML
│   ├── index.html       # Página principal
│   └── historial.html   # Página de historial
├── static/              # Archivos estáticos
│   ├── css/            # Estilos CSS
│   ├── js/             # JavaScript
│   └── images/         # Imágenes
├── uploads/            # Archivos subidos
└── analytics_history.db # Base de datos SQLite
```

## 🔧 Configuración

### Variables de Entorno
```bash
FLASK_ENV=production
PORT=5000
```

### Personalización
- **Colores**: Modifica las variables CSS en `static/css/style.css`
- **Logo**: Reemplaza `static/images/asapalsa.png`
- **Título**: Cambia en `templates/index.html`

## 📊 Ejemplo de Datos

La aplicación procesa archivos CSV con las siguientes columnas:
- **Fecha**: Formato YYYY-MM-DD
- **Proyección**: Valores proyectados
- **Realidad**: Valores reales
- **Variables adicionales**: Para análisis de correlación

## 🤝 Contribuciones

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **Leonel Villanueva** - Desarrollo principal
- **Arnold Suate** - Desarrollo principal

## 🙏 Agradecimientos

- Bootstrap por el framework CSS
- Chart.js por las visualizaciones
- Flask por el framework web
- Pandas por el procesamiento de datos

## 📞 Contacto

- **Proyecto**: [GitHub Repository](https://github.com/tuusuario/asapalsa-analytics)
- **Issues**: [GitHub Issues](https://github.com/tuusuario/asapalsa-analytics/issues)
- **Email**: tu-email@ejemplo.com

---

⭐ **¡Dale una estrella al proyecto si te gusta!** ⭐