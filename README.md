# ASAPALSA Analytics - Sistema de Análisis de Datos Agroindustriales

## Descripción

ASAPALSA Analytics es una aplicación web moderna que permite analizar datos agroindustriales de manera interactiva. La aplicación procesa archivos CSV con información de producción de fruta, proyecciones y datos históricos, generando visualizaciones dinámicas y actualizaciones en tiempo real.

## Características Principales

- **Carga de Archivos CSV**: Interfaz drag-and-drop para subir archivos CSV
- **Procesamiento Automático**: Limpieza y transformación automática de datos
- **Visualizaciones Interactivas**: 5 tipos diferentes de gráficos:
  - Gráficos de líneas (evolución temporal)
  - Gráficos de barras apiladas
  - Comparación fruta proyectada vs recibida
  - Análisis de precisión de proyecciones
  - Análisis de diferencias
- **Actualización en Tiempo Real**: Los datos se actualizan automáticamente cada 30 segundos
- **Interfaz Responsiva**: Diseño moderno que se adapta a diferentes dispositivos
- **Resumen de Datos**: Dashboard con métricas clave

## Tecnologías Utilizadas

### Backend
- **Flask**: Framework web de Python
- **Pandas**: Manipulación y análisis de datos
- **NumPy**: Cálculos numéricos

### Frontend
- **HTML5/CSS3**: Estructura y estilos
- **JavaScript ES6**: Lógica de la aplicación
- **Bootstrap 5**: Framework CSS responsive
- **Chart.js**: Librería de gráficos interactivos
- **Font Awesome**: Iconografía

## Instalación y Uso

### Requisitos Previos
- Python 3.8 o superior
- pip (gestor de paquetes de Python)

### Inicio Rápido

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <url-del-repositorio>
   cd ProyectoCD2
   ```

2. **Iniciar la aplicación (Método Único y Profesional)**
   ```bash
   # Modo producción (recomendado)
   python start.py
   
   # Modo desarrollo con auto-reload
   python start.py --dev
   
   # Puerto personalizado
   python start.py --port 8080
   
   # Host personalizado
   python start.py --host 127.0.0.1
   ```

3. **Abrir en el navegador**
   ```
   http://localhost:5000
   ```

### Opciones Avanzadas

El script `start.py` incluye múltiples opciones:

```bash
# Mostrar ayuda
python start.py --help

# Mostrar información del sistema
python start.py --info

# Mostrar versión
python start.py --version

# Desarrollo en puerto específico
python start.py --dev --port 3000

# Producción en host específico
python start.py --host 0.0.0.0 --port 8080
```

### Características del Script de Inicio

- ✅ **Verificación automática** de Python y dependencias
- ✅ **Instalación automática** de dependencias faltantes
- ✅ **Creación automática** de directorios necesarios
- ✅ **Modo desarrollo** con auto-reload
- ✅ **Modo producción** optimizado
- ✅ **Información detallada** del sistema
- ✅ **Manejo de errores** robusto
- ✅ **Interfaz profesional** con colores y emojis

## Uso de la Aplicación

### 1. Cargar Datos
- Arrastra y suelta un archivo CSV en el área de carga
- O haz clic en "Seleccionar Archivo" para buscar un archivo
- El archivo debe tener el formato esperado con columnas: DESCRIPCION, T.M., MES, year

### 2. Visualizar Gráficos
- Selecciona el tipo de gráfico deseado usando los botones
- Los gráficos se actualizan automáticamente
- Usa el botón "Actualizar" para refrescar los datos manualmente

### 3. Revisar Resumen
- El dashboard muestra métricas clave de los datos cargados
- Incluye información sobre registros, período, toneladas totales, etc.

## Formato de Datos CSV

El archivo CSV debe contener las siguientes columnas:
- `DESCRIPCION`: Descripción del tipo de movimiento
- `T.M.`: Toneladas métricas (valores numéricos)
- `MES`: Mes (nombre en español)
- `year`: Año (número)

### Ejemplo de formato:
```csv
DESCRIPCION;T.M.;MES;year
Fruta Recibida;3365.65;enero;2017
Fruta Proyectada;6500.00;enero;2019
Proyeccion Compra de Fruta Ajustada;10000.00;julio;2019
```

## Estructura del Proyecto

```
ProyectoCD2/
├── start.py              # 🚀 Script de inicio unificado (NUEVO)
├── app.py                # Aplicación Flask principal
├── requirements.txt      # Dependencias de Python
├── README.md            # Este archivo
├── templates/
│   ├── index.html       # Plantilla HTML principal
│   └── historial.html   # Plantilla de historial
├── static/
│   ├── css/
│   │   └── style.css    # Estilos CSS personalizados
│   ├── js/
│   │   ├── app.js       # JavaScript de la aplicación
│   │   └── historial.js # JavaScript del historial
│   ├── images/
│   │   ├── asapalsa.png # Logo de la empresa
│   │   ├── favicon.ico  # Favicon ICO
│   │   ├── favicon-16x16.png # Favicon 16x16
│   │   └── favicon-32x32.png # Favicon 32x32
│   └── manifest.json    # Manifiesto web para PWA
├── uploads/             # Directorio para archivos subidos (incluye datos de ejemplo)
└── analytics_history.db # Base de datos SQLite
```

### Archivos Eliminados (Unificación)
- ❌ `start.bat` - Reemplazado por `start.py`
- ❌ `start.sh` - Reemplazado por `start.py`
- ❌ `start_dev.bat` - Reemplazado por `start.py --dev`
- ❌ `dev_server.py` - Reemplazado por `start.py --dev`
- ❌ `run.py` - Reemplazado por `start.py`

## API Endpoints

- `GET /`: Página principal
- `POST /upload`: Cargar archivo CSV
- `GET /chart/<tipo>`: Obtener datos para gráfico específico
- `GET /data/summary`: Obtener resumen de datos

## Personalización

### Modificar Tipos de Gráficos
Edita la función `get_chart_data()` en `app.py` para agregar nuevos tipos de visualizaciones.

### Cambiar Estilos
Modifica `static/css/style.css` para personalizar la apariencia de la aplicación.

### Ajustar Actualización Automática
Cambia el intervalo en `setupAutoRefresh()` en `static/js/app.js` (actualmente 30 segundos).

## Solución de Problemas

### Error de Codificación
Si hay problemas con caracteres especiales, asegúrate de que el archivo CSV esté guardado en UTF-8.

### Archivo No Válido
Verifica que el archivo CSV tenga el formato correcto y las columnas necesarias.

### Puerto en Uso
Si el puerto 5000 está ocupado, usa el parámetro `--port`:
```bash
python start.py --port 8080
```

### Problemas de Dependencias
El script `start.py` instala automáticamente las dependencias faltantes. Si hay problemas, ejecuta:
```bash
pip install -r requirements.txt
```

## Contribuciones

Para contribuir al proyecto:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza los cambios
4. Envía un pull request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.

## Contacto

- **Desarrollado por**: Grupo 1 - Empresa Agroindustrial ASAPALSA
- **Integrantes**: Arnold Suate, Leonel Villanueva
- **Curso**: Ciencia de Datos I - X Semestre CEUTEC

