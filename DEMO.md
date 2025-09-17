# 🚀 Demo de ASAPALSA Analytics

## Guía de Demostración

### Paso 1: Iniciar la Aplicación

**Opción A - Windows:**
```bash
# Doble clic en start.bat
# O ejecutar en terminal:
start.bat
```

**Opción B - Linux/Mac:**
```bash
# Ejecutar en terminal:
./start.sh
```

**Opción C - Manual:**
```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar aplicación
python run.py
```

### Paso 2: Acceder a la Aplicación

1. Abre tu navegador web
2. Ve a: `http://localhost:5000`
3. Verás la página principal con el diseño moderno

### Paso 3: Cargar Datos de Prueba

1. **Usa los datos de ejemplo incluidos:**
   - Ve a la carpeta `uploads/`
   - Selecciona `Historial_Proyecciones.csv` o `Produccion_Detallada.csv`

2. **Carga el archivo:**
   - Arrastra y suelta el archivo en el área de carga
   - O haz clic en "Seleccionar Archivo" y busca el archivo

3. **Observa el procesamiento:**
   - Verás una barra de progreso
   - Aparecerá información del archivo procesado

### Paso 4: Explorar Visualizaciones

Una vez cargado el archivo, tendrás acceso a 5 tipos de gráficos:

#### 📈 Gráfico de Líneas
- **Propósito**: Mostrar evolución temporal de toneladas
- **Uso**: Haz clic en el botón "Líneas"
- **Información**: Muestra tendencias a lo largo del tiempo

#### 📊 Gráfico de Barras
- **Propósito**: Comparar toneladas mensuales por tipo
- **Uso**: Haz clic en el botón "Barras"
- **Información**: Barras apiladas para comparación visual

#### ⚖️ Comparación
- **Propósito**: Fruta proyectada vs recibida
- **Uso**: Haz clic en el botón "Comparación"
- **Información**: Líneas superpuestas para análisis de precisión

#### 🎯 Precisión
- **Propósito**: Porcentaje de cumplimiento de proyecciones
- **Uso**: Haz clic en el botón "Precisión"
- **Información**: Barras que muestran % de precisión mensual

#### 📉 Diferencias
- **Propósito**: Diferencia entre proyección ajustada y recibida
- **Uso**: Haz clic en el botón "Diferencias"
- **Información**: Línea que muestra sobre/sub-proyección

### Paso 5: Funcionalidades en Tiempo Real

#### 🔄 Actualización Automática
- Los datos se actualizan automáticamente cada 30 segundos
- No necesitas recargar la página

#### 🔄 Actualización Manual
- Usa el botón "Actualizar" para refrescar inmediatamente
- Útil para ver cambios en tiempo real

#### 📊 Dashboard de Resumen
- Métricas clave en tarjetas informativas
- Información sobre registros, período, toneladas totales
- Se actualiza automáticamente

### Paso 6: Interactuar con los Gráficos

#### 🖱️ Funcionalidades Interactivas
- **Hover**: Pasa el mouse sobre los puntos para ver valores
- **Zoom**: Usa la rueda del mouse para hacer zoom
- **Leyenda**: Haz clic en los elementos de la leyenda para mostrar/ocultar series
- **Tooltips**: Información detallada al pasar el mouse

#### 📱 Diseño Responsivo
- La aplicación se adapta a diferentes tamaños de pantalla
- Funciona en computadoras, tablets y móviles
- Los gráficos se redimensionan automáticamente

### Paso 7: Probar con Diferentes Archivos

#### 📁 Formatos Soportados
- Archivos CSV con separador `;` (punto y coma)
- Columnas requeridas: `DESCRIPCION`, `T.M.`, `MES`, `year`
- Codificación UTF-8

#### 🔄 Proceso de Carga
1. Arrastra un nuevo archivo
2. El sistema procesa automáticamente
3. Los gráficos se actualizan con los nuevos datos
4. El resumen se recalcula

### Características Destacadas

#### ✨ Interfaz Moderna
- Diseño limpio y profesional
- Colores corporativos
- Animaciones suaves
- Iconografía intuitiva

#### ⚡ Rendimiento
- Procesamiento rápido de archivos
- Gráficos optimizados
- Actualizaciones eficientes
- Carga asíncrona

#### 🛡️ Robustez
- Validación de archivos
- Manejo de errores
- Mensajes informativos
- Recuperación automática

### Solución de Problemas Comunes

#### ❌ Error: "Archivo no válido"
- Verifica que sea un archivo CSV
- Asegúrate de que tenga las columnas correctas
- Revisa la codificación (debe ser UTF-8)

#### ❌ Error: "No se pudo procesar"
- Verifica el formato de las fechas
- Asegúrate de que los valores numéricos sean válidos
- Revisa que no haya caracteres especiales problemáticos

#### ❌ Error: "Puerto en uso"
- Cambia el puerto en `run.py`
- O cierra otras aplicaciones que usen el puerto 5000

### Próximos Pasos

1. **Personalización**: Modifica los estilos en `static/css/style.css`
2. **Nuevos Gráficos**: Agrega tipos de visualización en `app.py`
3. **Integración**: Conecta con bases de datos o APIs
4. **Despliegue**: Sube a un servidor web para uso en producción

---

## 🎉 ¡Felicidades!

Has transformado exitosamente tu proyecto de análisis de datos en una aplicación web moderna y funcional. La aplicación ahora permite:

- ✅ Carga interactiva de archivos CSV
- ✅ 5 tipos de visualizaciones diferentes
- ✅ Actualización en tiempo real
- ✅ Interfaz moderna y responsive
- ✅ Procesamiento automático de datos
- ✅ Dashboard con métricas clave

**¡Tu proyecto está listo para ser usado!** 🚀

