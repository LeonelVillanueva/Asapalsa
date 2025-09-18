from flask import Flask, render_template, request, jsonify, send_from_directory, make_response, redirect, url_for
import pandas as pd
import json
import os
from datetime import datetime
import numpy as np
from werkzeug.utils import secure_filename
import sqlite3
import uuid
import base64
import io
from matplotlib import pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import requests
import hashlib
import time
from functools import lru_cache
import re
import google.generativeai as genai
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configurar Google Gemini (gratuito)
# Para obtener tu API key: https://makersuite.google.com/app/apikey
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
if GEMINI_API_KEY and GEMINI_API_KEY != 'tu_api_key_aqui':
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        ai_model = genai.GenerativeModel('gemini-pro')
        print("✅ Google Gemini configurado correctamente")
    except Exception as e:
        print(f"⚠️ Error configurando Gemini: {e}")
        ai_model = None
else:
    ai_model = None
    print("ℹ️ Google Gemini no configurado - usando análisis local")

# Función para detectar dispositivos móviles
def is_mobile_device():
    """Detecta si el usuario está accediendo desde un dispositivo móvil"""
    user_agent = request.headers.get('User-Agent', '').lower()
    
    # Patrones comunes de dispositivos móviles
    mobile_patterns = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 
        'windows phone', 'opera mini', 'iemobile', 'palm', 'smartphone',
        'tablet', 'kindle', 'silk', 'playbook', 'bb10', 'windows mobile'
    ]
    
    # Verificar si el User-Agent contiene algún patrón móvil
    for pattern in mobile_patterns:
        if pattern in user_agent:
            return True
    
    # Verificar tamaño de pantalla si está disponible en headers
    screen_width = request.headers.get('X-Screen-Width')
    if screen_width and int(screen_width) < 768:
        return True
    
    return False


# Crear directorio de uploads si no existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Variables globales para almacenar datos
current_data = None
processed_data = None
original_data = None

# Sistema de caché
cache = {}
cache_ttl = 300  # 5 minutos en segundos

# Configuración de base de datos
DATABASE = 'analytics_history.db'

def get_cache_key(data_hash, operation):
    """Generar clave de caché única"""
    return f"{data_hash}_{operation}"

def is_cache_valid(cache_entry):
    """Verificar si una entrada de caché es válida"""
    if not cache_entry:
        return False
    return time.time() - cache_entry['timestamp'] < cache_ttl

def get_from_cache(data_hash, operation):
    """Obtener datos del caché"""
    key = get_cache_key(data_hash, operation)
    cache_entry = cache.get(key)
    
    if is_cache_valid(cache_entry):
        return cache_entry['data']
    return None

def set_cache(data_hash, operation, data):
    """Guardar datos en el caché"""
    key = get_cache_key(data_hash, operation)
    cache[key] = {
        'data': data,
        'timestamp': time.time()
    }

def clear_cache():
    """Limpiar todo el caché"""
    global cache
    cache.clear()

def get_data_hash(data):
    """Generar hash único para los datos"""
    if data is None or data.empty:
        return None
    return hashlib.md5(str(data.values.tobytes()).encode()).hexdigest()

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
    
    # Crear tabla de alertas
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

def save_analysis(name, description, file_name, data_summary, chart_data):
    """Guardar un análisis en el historial"""
    analysis_id = str(uuid.uuid4())
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO analysis_history 
        (id, name, description, file_name, data_summary, chart_data)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (analysis_id, name, description, file_name, 
          json.dumps(data_summary), json.dumps(chart_data)))
    
    conn.commit()
    conn.close()
    return analysis_id

def get_analysis_history():
    """Obtener todo el historial de análisis"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name, description, file_name, created_at, data_summary
        FROM analysis_history 
        ORDER BY created_at DESC
    ''')
    results = cursor.fetchall()
    conn.close()
    
    history = []
    for row in results:
        history.append({
            'id': row[0],
            'name': row[1],
            'description': row[2],
            'file_name': row[3],
            'created_at': row[4],
            'data_summary': json.loads(row[5]) if row[5] else {}
        })
    
    return history

def get_analysis_by_id(analysis_id):
    """Obtener un análisis específico por ID"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name, description, file_name, created_at, data_summary, chart_data
        FROM analysis_history 
        WHERE id = ?
    ''', (analysis_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            'id': result[0],
            'name': result[1],
            'description': result[2],
            'file_name': result[3],
            'created_at': result[4],
            'data_summary': json.loads(result[5]) if result[5] else {},
            'chart_data': json.loads(result[6]) if result[6] else {}
        }
    return None

# Inicializar la base de datos al iniciar la aplicación
init_db()

def process_file_data(file_path):
    """Procesa archivo CSV y prepara los datos para visualización"""
    global current_data, processed_data, original_data
    
    try:
        print(f"🔍 Procesando archivo: {file_path}")
        
        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            return False, "El archivo no existe"
        
        # Verificar que el archivo no esté vacío
        if os.path.getsize(file_path) == 0:
            return False, "El archivo está vacío"
        
        # Solo procesar archivos CSV
        if file_path.lower().endswith('.csv'):
            return process_csv_file(file_path)
        else:
            return False, "Solo se admiten archivos CSV"
        
    except Exception as e:
        print(f"❌ Error en process_file_data: {e}")
        import traceback
        traceback.print_exc()
        return False, f"Error al procesar el archivo: {str(e)}"

def process_csv_file(file_path):
    """Procesa archivos CSV con el formato original"""
    global current_data, processed_data, original_data
    
    try:
        print(f"📄 Procesando CSV: {file_path}")
        
        # Intentar diferentes separadores y encodings
        df = None
        encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
        separators = [';', ',', '\t']
        
        for encoding in encodings:
            for sep in separators:
                try:
                    df = pd.read_csv(file_path, sep=sep, encoding=encoding)
                    if len(df.columns) > 1:  # Si tiene más de una columna, probablemente es correcto
                        print(f"✅ CSV leído con separador '{sep}' y encoding '{encoding}'")
                        break
                except Exception as e:
                    print(f"❌ Error con separador '{sep}' y encoding '{encoding}': {e}")
                    continue
            if df is not None and len(df.columns) > 1:
                break
        
        if df is None:
            return False, "No se pudo leer el archivo CSV con ningún separador o encoding"
        
        # Limpiar nombres de columnas
        df.columns = df.columns.str.strip()
        
        print(f"Columnas encontradas: {list(df.columns)}")
        print(f"Forma del DataFrame: {df.shape}")
        
        # Verificar que el DataFrame no esté vacío
        if df.empty:
            return False, "El archivo CSV está vacío"
        
        # Verificar si es el formato específico de ASAPALSA
        if 'DESCRIPCION' in df.columns and 'MES' in df.columns:
            # Procesar formato específico de ASAPALSA
            return process_asapalsa_format(df)
        else:
            # Procesar formato genérico
            return process_generic_format(df)
        
    except Exception as e:
        print(f"❌ Error crítico en process_csv_file: {e}")
        import traceback
        traceback.print_exc()
        return False, f"Error al procesar CSV: {str(e)}"


def process_asapalsa_format(df):
    """Procesa el formato específico de ASAPALSA"""
    global current_data, processed_data, original_data
    
    try:
        print(f"🔍 Columnas disponibles: {list(df.columns)}")
        print(f"🔍 Tipos de datos: {df.dtypes.to_dict()}")
        
        # Verificar que las columnas necesarias existen
        required_columns = ['DESCRIPCION', 'T.M.', 'MES']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return False, f"Columnas faltantes en formato ASAPALSA: {missing_columns}. Columnas disponibles: {list(df.columns)}"
        
        # Verificar si existe columna 'year' o crear una
        if 'year' not in df.columns:
            print("⚠️ Columna 'year' no encontrada, intentando crear desde fecha actual")
            # Usar año actual como fallback
            df['year'] = pd.Timestamp.now().year
        
        # Extraer tipo de movimiento de la descripción
        df['TipoMovimiento'] = df['DESCRIPCION'].str.extract(r'\d*\s*(.*)', expand=False).str.strip().str.lower()
        
        # Arreglar nombres inconsistentes
        df['TipoMovimiento'] = df['TipoMovimiento'].replace({
            'fruta recibida': 'fruta recibida',
            'fruta proyectada': 'fruta proyectada',
            'proyeccion compra de fruta ajustada': 'proyeccion ajustada',
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
        
        # Verificar que el mapeo funcionó
        if df['MES'].isna().any():
            return False, f"Error al mapear meses. Valores únicos en MES: {df['MES'].unique()}"
        
        # Crear columna de fecha
        df['Fecha'] = pd.to_datetime(df['year'].astype(str) + '-' + df['MES'] + '-01')
        
        # Limpiar y convertir T.M. a numérico
        df['T.M.'] = df['T.M.'].replace(',', '', regex=True).astype(float)
        
        # Seleccionar solo columnas necesarias
        df_clean = df[['Fecha', 'TipoMovimiento', 'T.M.']]
        
        # Pivotar datos
        df_pivot = df_clean.pivot_table(
            index='Fecha', 
            columns='TipoMovimiento', 
            values='T.M.', 
            fill_value=0
        )
        
        # Mantener el índice de fecha para el resumen
        # No resetear el índice para preservar las fechas
        
        # Almacenar datos
        current_data = df_clean
        processed_data = df_pivot
        original_data = df
        
        print(f"✅ ASAPALSA procesado: {len(df)} filas, {len(df_clean['TipoMovimiento'].unique())} tipos de movimiento")
        return True, f"Archivo procesado correctamente. {len(df)} filas, {len(df.columns)} columnas"
        
    except Exception as e:
        print(f"❌ Error detallado en process_asapalsa_format: {e}")
        import traceback
        traceback.print_exc()
        return False, f"Error al procesar formato ASAPALSA: {str(e)}"

def split_concatenated_columns(df):
    """Separa columnas concatenadas con punto y coma"""
    try:
        print(f"🔧 Iniciando separación de columnas...")
        print(f"🔧 DataFrame original: {df.shape}")
        print(f"🔧 Columnas originales: {list(df.columns)}")
        
        # Buscar la columna que contiene múltiples campos separados por ';'
        main_col = None
        for col in df.columns:
            if ';' in str(col):
                main_col = col
                break
        
        if main_col is None:
            print("❌ No se encontró columna con ';'")
            return df
        
        print(f"🔧 Columna principal encontrada: {main_col}")
        
        # Separar los nombres de columnas
        column_names = str(main_col).split(';')
        column_names = [name.strip() for name in column_names]
        
        print(f"🔧 Nombres de columnas separados: {column_names}")
        
        # Crear un nuevo DataFrame con las columnas separadas
        new_data = {}
        
        # Para cada nombre de columna, crear datos apropiados
        for i, col_name in enumerate(column_names):
            if i == 0:
                # Primera columna: usar los datos originales de la primera columna
                new_data[col_name] = df.iloc[:, 0]
            else:
                # Crear datos simulados basados en el patrón
                if col_name.lower() in ['t.m.', 'tm']:
                    # Generar datos numéricos
                    new_data[col_name] = [1500, 2000, 1800, 2200, 1200][:len(df)]
                elif col_name.lower() in ['mes']:
                    # Generar meses
                    new_data[col_name] = ['enero'] * len(df)
                elif col_name.lower() in ['year']:
                    # Generar años
                    new_data[col_name] = [2024] * len(df)
                else:
                    # Datos genéricos
                    new_data[col_name] = range(len(df))
        
        # Crear nuevo DataFrame
        new_df = pd.DataFrame(new_data)
        
        print(f"✅ Columnas separadas: {list(new_df.columns)}")
        print(f"📊 Datos separados:")
        print(new_df.head(3))
        return new_df
        
    except Exception as e:
        print(f"❌ Error separando columnas: {str(e)}")
        import traceback
        traceback.print_exc()
        return df

def get_date_range(data):
    """Obtiene el rango de fechas de manera segura"""
    if data is None or data.empty:
        return "N/A"
    
    try:
        # Verificar si el índice es datetime
        if hasattr(data.index, 'min') and hasattr(data.index.min(), 'strftime'):
            return f"{data.index.min().strftime('%Y-%m')} a {data.index.max().strftime('%Y-%m')}"
        else:
            # Si no es datetime, usar el número de registros
            return f"Registros: {len(data)}"
    except:
        return f"Registros: {len(data)}"

def process_generic_format(df):
    """Procesa formato genérico de archivos CSV/XLSX"""
    global current_data, processed_data, original_data
    
    try:
        # Verificar que el archivo no esté vacío
        if df.empty:
            return False, "El archivo está vacío"
        
        # Verificar que tenga al menos 2 columnas
        if len(df.columns) < 2:
            return False, "El archivo debe tener al menos 2 columnas"
        
        # Buscar columna de fecha
        date_columns = []
        for col in df.columns:
            if any(keyword in col.lower() for keyword in ['fecha', 'date', 'fec']):
                date_columns.append(col)
        
        # Si no hay columna de fecha, crear una artificial
        if not date_columns:
            df['Fecha'] = pd.date_range(start='2024-01-01', periods=len(df), freq='D')
        else:
            # Usar la primera columna de fecha encontrada
            date_col = date_columns[0]
            try:
                df['Fecha'] = pd.to_datetime(df[date_col])
            except:
                df['Fecha'] = pd.date_range(start='2024-01-01', periods=len(df), freq='D')
        
        # Identificar columnas numéricas (excluyendo fecha)
        numeric_columns = []
        for col in df.columns:
            if col != 'Fecha' and df[col].dtype in ['int64', 'float64']:
                numeric_columns.append(col)
        
        # Si no hay columnas numéricas, convertir todas las no-fecha a numérico
        if not numeric_columns:
            for col in df.columns:
                if col != 'Fecha':
                    try:
                        # Intentar convertir a numérico
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        # Verificar que no todos los valores sean NaN
                        if not df[col].isna().all():
                            numeric_columns.append(col)
                    except:
                        pass
        
        # Si aún no hay columnas numéricas, crear datos de ejemplo
        if not numeric_columns:
            df['Valor'] = range(1, len(df) + 1)
            numeric_columns = ['Valor']
        
        # Limpiar nombres de columnas numéricas
        clean_numeric_columns = []
        for col in numeric_columns:
            # Limpiar nombres de columnas
            clean_name = col.replace(';', '_').replace(' ', '_').replace(':', '_')
            if clean_name != col:
                df = df.rename(columns={col: clean_name})
            clean_numeric_columns.append(clean_name)
        
        numeric_columns = clean_numeric_columns
        
        # Crear dataset procesado con solo columnas numéricas y fecha
        processed_df = df[['Fecha'] + numeric_columns].copy()
        
        # Establecer Fecha como índice para compatibilidad
        processed_df = processed_df.set_index('Fecha')
        
        # Almacenar datos
        current_data = df
        processed_data = processed_df
        original_data = df
        
        return True, f"Archivo procesado correctamente. {len(df)} filas, {len(numeric_columns)} columnas numéricas"
        
    except Exception as e:
        return False, f"Error al procesar formato genérico: {str(e)}"

def get_chart_data(chart_type):
    """Prepara los datos para diferentes tipos de gráficos"""
    global processed_data
    
    if processed_data is None:
        return {'error': 'No hay datos procesados'}
    
    # Verificar que hay datos suficientes
    if len(processed_data) == 0:
        return {'error': 'No hay datos suficientes para generar gráficos'}
    
    # Formatear fechas para el eje X
    dates = [date.strftime('%b-%Y') for date in processed_data.index]
    
    if chart_type == 'line':
        # Gráfico de líneas - evolución temporal
        # Verificar que hay al menos una columna de datos válida
        valid_columns = [col for col in processed_data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].sum() > 0]
        
        if not valid_columns:
            return {'error': 'No hay datos válidos para generar el gráfico de líneas'}
        
        datasets = []
        colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        
        for i, column in enumerate(valid_columns):
            datasets.append({
                'label': column.title(),
                'data': processed_data[column].tolist(),
                'borderColor': colors[i % len(colors)],
                'backgroundColor': colors[i % len(colors)] + '20',
                'tension': 0.1
            })
        
        return {
            'type': 'line',
            'data': {
                'labels': dates,
                'datasets': datasets
            },
            'options': {
                'responsive': True,
                'scales': {
                    'y': {
                        'beginAtZero': True,
                        'title': {
                            'display': True,
                            'text': 'Toneladas'
                        }
                    },
                    'x': {
                        'title': {
                            'display': True,
                            'text': 'Fecha'
                        }
                    }
                }
            }
        }
    
    elif chart_type == 'bar':
        # Gráfico de barras apiladas
        # Verificar que hay al menos una columna de datos válida
        valid_columns = [col for col in processed_data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].sum() > 0]
        
        if not valid_columns:
            return {'error': 'No hay datos válidos para generar el gráfico de barras'}
        
        datasets = []
        colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        
        for i, column in enumerate(valid_columns):
            datasets.append({
                'label': column.title(),
                'data': processed_data[column].tolist(),
                'backgroundColor': colors[i % len(colors)]
            })
        
        return {
            'type': 'bar',
            'data': {
                'labels': dates,
                'datasets': datasets
            },
            'options': {
                'responsive': True,
                'scales': {
                    'y': {
                        'beginAtZero': True,
                        'stacked': True,
                        'title': {
                            'display': True,
                            'text': 'Toneladas'
                        }
                    },
                    'x': {
                        'stacked': True,
                        'title': {
                            'display': True,
                            'text': 'Fecha'
                        }
                    }
                }
            }
        }
    
    elif chart_type == 'comparison':
        # Comparación fruta proyectada vs recibida
        if 'fruta proyectada' not in processed_data.columns or 'fruta recibida' not in processed_data.columns:
            return {'error': 'Se requieren datos de fruta proyectada y recibida para este gráfico'}
        
        if processed_data['fruta proyectada'].sum() == 0 or processed_data['fruta recibida'].sum() == 0:
            return {'error': 'No hay datos válidos de fruta proyectada o recibida'}
        
        return {
                'type': 'line',
                'data': {
                    'labels': dates,
                    'datasets': [
                        {
                            'label': 'Fruta Proyectada',
                            'data': processed_data['fruta proyectada'].tolist(),
                            'borderColor': '#36A2EB',
                            'backgroundColor': '#36A2EB20',
                            'tension': 0.1
                        },
                        {
                            'label': 'Fruta Recibida',
                            'data': processed_data['fruta recibida'].tolist(),
                            'borderColor': '#FF6384',
                            'backgroundColor': '#FF638420',
                            'tension': 0.1
                        }
                    ]
                },
                'options': {
                    'responsive': True,
                    'scales': {
                        'y': {
                            'beginAtZero': True,
                            'title': {
                                'display': True,
                                'text': 'Toneladas'
                            }
                        },
                        'x': {
                            'title': {
                                'display': True,
                                'text': 'Fecha'
                            }
                        }
                    }
                }
            }
        return None
    
    elif chart_type == 'precision':
        # Gráfico de precisión de proyección
        if 'fruta proyectada' not in processed_data.columns or 'fruta recibida' not in processed_data.columns:
            return {'error': 'Se requieren datos de fruta proyectada y recibida para calcular precisión'}
        
        if processed_data['fruta proyectada'].sum() == 0 or processed_data['fruta recibida'].sum() == 0:
            return {'error': 'No hay datos válidos para calcular precisión de proyección'}
        
        if 'precision_proy' in processed_data.columns:
            # Filtrar valores válidos
            valid_data = processed_data.dropna(subset=['precision_proy'])
            valid_dates = [date.strftime('%b-%Y') for date in valid_data.index]
            
            return {
                'type': 'bar',
                'data': {
                    'labels': valid_dates,
                    'datasets': [{
                        'label': 'Precisión de Proyección (%)',
                        'data': valid_data['precision_proy'].tolist(),
                        'backgroundColor': '#4BC0C0',
                        'borderColor': '#4BC0C0'
                    }]
                },
                'options': {
                    'responsive': True,
                    'scales': {
                        'y': {
                            'beginAtZero': True,
                            'max': 120,
                            'title': {
                                'display': True,
                                'text': 'Porcentaje de Cumplimiento'
                            }
                        },
                        'x': {
                            'title': {
                                'display': True,
                                'text': 'Fecha'
                            }
                        }
                    },
                    'plugins': {
                        'annotation': {
                            'annotations': {
                                'line1': {
                                    'type': 'line',
                                    'yMin': 100,
                                    'yMax': 100,
                                    'borderColor': 'gray',
                                    'borderDash': [5, 5],
                                    'label': {
                                        'content': 'Proyección Exacta',
                                        'enabled': True
                                    }
                                }
                            }
                        }
                    }
                }
            }
        return None
    
    elif chart_type == 'difference':
        # Gráfico de diferencia entre proyección ajustada y recibida
        if 'proyeccion ajustada' not in processed_data.columns or 'fruta recibida' not in processed_data.columns:
            return {'error': 'Se requieren datos de proyección ajustada y fruta recibida para este gráfico'}
        
        if processed_data['proyeccion ajustada'].sum() == 0 or processed_data['fruta recibida'].sum() == 0:
            return {'error': 'No hay datos válidos para calcular diferencias'}
        
        if 'diferencia_ajustada' in processed_data.columns:
            return {
                'type': 'line',
                'data': {
                    'labels': dates,
                    'datasets': [{
                        'label': 'Diferencia (Ajustada - Recibida)',
                        'data': processed_data['diferencia_ajustada'].tolist(),
                        'borderColor': '#FF6384',
                        'backgroundColor': '#FF638420',
                        'tension': 0.1,
                        'fill': False
                    }]
                },
                'options': {
                    'responsive': True,
                    'scales': {
                        'y': {
                            'title': {
                                'display': True,
                                'text': 'Toneladas (positiva = sobreproyección)'
                            }
                        },
                        'x': {
                            'title': {
                                'display': True,
                                'text': 'Fecha'
                            }
                        }
                    },
                    'plugins': {
                        'annotation': {
                            'annotations': {
                                'line1': {
                                    'type': 'line',
                                    'yMin': 0,
                                    'yMax': 0,
                                    'borderColor': 'gray',
                                    'borderDash': [5, 5],
                                    'label': {
                                        'content': 'Línea de Referencia',
                                        'enabled': True
                                    }
                                }
                            }
                        }
                    }
                }
            }
        return None

    elif chart_type == 'scatter':
        # Gráfico de dispersión - correlación entre variables
        if len(processed_data.columns) < 2:
            return {'error': 'Se requieren al menos 2 variables para el gráfico de dispersión'}
        
        # Buscar dos columnas con datos válidos
        valid_columns = [col for col in processed_data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].sum() > 0]
        
        if len(valid_columns) < 2:
            return {'error': 'No hay suficientes variables válidas para el gráfico de dispersión'}
        
        x_col = valid_columns[0]
        y_col = valid_columns[1] if len(valid_columns) > 1 else valid_columns[0]
        
        # Crear datos de dispersión
        scatter_data = []
        for i, (idx, row) in enumerate(processed_data.iterrows()):
            if pd.notna(row[x_col]) and pd.notna(row[y_col]) and row[x_col] > 0 and row[y_col] > 0:
                scatter_data.append({
                    'x': float(row[x_col]),
                    'y': float(row[y_col])
                })
        
        if len(scatter_data) < 2:
            return {'error': 'No hay suficientes puntos de datos válidos para el gráfico de dispersión'}
        
        return {
            'type': 'scatter',
            'data': {
                'datasets': [{
                    'label': f'{x_col} vs {y_col}',
                    'data': scatter_data,
                    'backgroundColor': '#36A2EB',
                    'borderColor': '#36A2EB',
                    'pointRadius': 6,
                    'pointHoverRadius': 8
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'plugins': {
                    'title': {'display': True, 'text': f'Correlación: {x_col} vs {y_col}'},
                    'tooltip': {'mode': 'point'}
                },
                'scales': {
                    'x': {'title': {'display': True, 'text': x_col}, 'beginAtZero': True},
                    'y': {'title': {'display': True, 'text': y_col}, 'beginAtZero': True}
                }
            }
        }

    elif chart_type == 'radar':
        # Gráfico de radar - comparación multidimensional
        if len(processed_data.columns) < 3:
            return {'error': 'Se requieren al menos 3 variables para el gráfico de radar'}
        
        # Obtener las primeras 6 columnas con datos válidos
        valid_columns = [col for col in processed_data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].sum() > 0][:6]
        
        if len(valid_columns) < 3:
            return {'error': 'No hay suficientes variables válidas para el gráfico de radar'}
        
        # Calcular promedios normalizados
        radar_data = []
        for col in valid_columns:
            avg_value = processed_data[col].mean()
            max_value = processed_data[col].max()
            normalized_value = (avg_value / max_value) * 100 if max_value > 0 else 0
            radar_data.append(normalized_value)
        
        return {
            'type': 'radar',
            'data': {
                'labels': valid_columns,
                'datasets': [{
                    'label': 'Promedio Normalizado (%)',
                    'data': radar_data,
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                    'borderColor': '#36A2EB',
                    'pointBackgroundColor': '#36A2EB',
                    'pointBorderColor': '#fff',
                    'pointHoverBackgroundColor': '#fff',
                    'pointHoverBorderColor': '#36A2EB'
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'plugins': {
                    'title': {'display': True, 'text': 'Comparación Multidimensional de Tipos de Movimiento'},
                    'legend': {'position': 'top'}
                },
                'scales': {
                    'r': {
                        'beginAtZero': True,
                        'max': 100,
                        'ticks': {'stepSize': 20}
                    }
                }
            }
        }

    elif chart_type == 'boxplot':
        # Gráfico de caja - distribución de datos
        if len(processed_data.columns) < 1:
            return {'error': 'Se requieren datos para el gráfico de caja'}
        
        # Obtener columnas con datos válidos
        valid_columns = [col for col in processed_data.columns if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].sum() > 0][:5]
        
        if len(valid_columns) < 1:
            return {'error': 'No hay variables válidas para el gráfico de caja'}
        
        # Calcular estadísticas de caja para cada columna
        box_data = []
        for col in valid_columns:
            values = processed_data[col].dropna()
            if len(values) > 0:
                q1 = values.quantile(0.25)
                q3 = values.quantile(0.75)
                median = values.median()
                min_val = values.min()
                max_val = values.max()
                
                box_data.append({
                    'label': col,
                    'min': float(min_val),
                    'q1': float(q1),
                    'median': float(median),
                    'q3': float(q3),
                    'max': float(max_val)
                })
        
        if len(box_data) < 1:
            return {'error': 'No se pudieron calcular estadísticas de caja'}
        
        return {
            'type': 'boxplot',
            'data': {
                'labels': [item['label'] for item in box_data],
                'datasets': [{
                    'label': 'Distribución de Datos',
                    'data': box_data,
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                    'borderColor': '#36A2EB',
                    'borderWidth': 2
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'plugins': {
                    'title': {'display': True, 'text': 'Distribución de Datos por Tipo de Movimiento'},
                    'legend': {'display': False}
                },
                'scales': {
                    'y': {'beginAtZero': True, 'title': {'display': True, 'text': 'Toneladas'}}
                }
            }
        }
    
    return None

@app.route('/')
def index():
    # Detectar si es un dispositivo móvil y redirigir
    if is_mobile_device():
        return redirect(url_for('mobile_index'))
    return render_template('index.html')


@app.route('/mobile')
def mobile_index():
    """Versión móvil de la página principal"""
    return render_template('mobile.html')

@app.route('/mobile/historial')
def mobile_historial():
    """Versión móvil del historial"""
    return render_template('mobile_historial.html')


@app.route('/historial')
def historial():
    return render_template('historial.html')

@app.route('/favicon.ico')
def favicon():
    """Servir el favicon con headers apropiados"""
    return send_from_directory(os.path.join(app.root_path, 'static', 'images'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No se seleccionó ningún archivo'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No se seleccionó ningún archivo'})
        
        if file and file.filename.lower().endswith('.csv'):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Crear directorio si no existe
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            # Manejar archivos duplicados
            if os.path.exists(file_path):
                try:
                    # Intentar eliminar archivo existente
                    os.remove(file_path)
                except PermissionError:
                    # Si no se puede eliminar, usar nombre con timestamp
                    name, ext = os.path.splitext(filename)
                    timestamp = int(time.time())
                    filename = f"{name}_{timestamp}{ext}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            file.save(file_path)
            
            success, message = process_file_data(file_path)
            
            if success:
                # Obtener información del dataset de forma segura
                try:
                    info = {
                        'total_records': len(processed_data) if processed_data is not None else 0,
                        'date_range': get_date_range(processed_data),
                        'movement_types': list(processed_data.columns) if processed_data is not None else [],
                        'total_tonnage': float(processed_data.sum().sum()) if processed_data is not None and not processed_data.empty else 0
                    }
                except Exception as e:
                    print(f"Error obteniendo info del dataset: {e}")
                    info = {
                        'total_records': 0,
                        'date_range': 'N/A',
                        'movement_types': [],
                        'total_tonnage': 0
                    }
                
                return jsonify({
                    'success': True, 
                    'message': message,
                    'info': info
                })
            else:
                return jsonify({'success': False, 'message': message})
        
        return jsonify({'success': False, 'message': 'Formato de archivo no válido. Solo se permiten archivos CSV y XLSX.'})
        
    except Exception as e:
        print(f"Error crítico en upload_file: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error interno del servidor: {str(e)}'}), 500

@app.route('/chart/<chart_type>')
def get_chart(chart_type):
    chart_data = get_chart_data(chart_type)
    if chart_data:
        return jsonify(chart_data)
    else:
        return jsonify({'error': 'Tipo de gráfico no válido o datos insuficientes'}), 400

@app.route('/data/summary')
def get_data_summary():
    try:
        global processed_data
        print(f"get_data_summary called, processed_data is None: {processed_data is None}")
        
        if processed_data is not None and not processed_data.empty:
            print(f"processed_data shape: {processed_data.shape}")
            print(f"processed_data columns: {list(processed_data.columns)}")
            print(f"processed_data index: {processed_data.index}")
            
            try:
                # Filtrar solo columnas numéricas para cálculos
                numeric_cols = [col for col in processed_data.columns if processed_data[col].dtype in ['float64', 'int64']]
                numeric_data = processed_data[numeric_cols] if numeric_cols else processed_data.select_dtypes(include=[np.number])
                
                summary = {
                    'total_records': len(processed_data),
                    'columns': list(processed_data.columns),
                    'date_range': {
                        'start': processed_data.index.min().strftime('%Y-%m-%d') if hasattr(processed_data.index.min(), 'strftime') else str(processed_data.index.min()),
                        'end': processed_data.index.max().strftime('%Y-%m-%d') if hasattr(processed_data.index.max(), 'strftime') else str(processed_data.index.max())
                    },
                    'total_tonnage': float(numeric_data.sum().sum()) if not numeric_data.empty else 0,
                    'monthly_average': float(numeric_data.sum(axis=1).mean()) if len(numeric_data) > 0 else 0,
                    'movement_types': len(processed_data.columns),
                    'numeric_columns': len(numeric_cols)
                }
                print(f"summary: {summary}")
                return summary
            except Exception as e:
                print(f"Error creando summary: {e}")
                # Filtrar solo columnas numéricas para el fallback
                numeric_cols = [col for col in processed_data.columns if processed_data[col].dtype in ['float64', 'int64']]
                return {
                    'total_records': len(processed_data),
                    'columns': list(processed_data.columns),
                    'date_range': 'N/A',
                    'total_tonnage': 0,
                    'monthly_average': 0,
                    'movement_types': len(processed_data.columns),
                    'numeric_columns': len(numeric_cols)
                }
        
        return {'error': 'No hay datos disponibles'}
        
    except Exception as e:
        print(f"Error crítico en get_data_summary: {e}")
        import traceback
        traceback.print_exc()
        return {'error': f'Error interno del servidor: {str(e)}'}

@app.route('/api/save-analysis', methods=['POST'])
def save_analysis_api():
    """Guardar el análisis actual en el historial"""
    global processed_data, current_data
    
    if processed_data is None:
        return jsonify({'success': False, 'message': 'No hay datos para guardar'})
    
    data = request.get_json()
    name = data.get('name', f'Análisis {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    description = data.get('description', '')
    file_name = data.get('file_name', 'archivo.csv')
    
    # Crear resumen de datos
    data_summary = {
        'total_records': len(processed_data),
        'columns': list(processed_data.columns),
        'date_range': {
            'start': processed_data.index.min().strftime('%Y-%m-%d'),
            'end': processed_data.index.max().strftime('%Y-%m-%d')
        },
        'total_tonnage': float(processed_data.sum().sum()),
        'monthly_average': float(processed_data.sum(axis=1).mean())
    }
    
    # Crear datos de gráficos para todos los tipos
    chart_data = {}
    for chart_type in ['line', 'bar', 'comparison', 'precision', 'difference']:
        chart_config = get_chart_data(chart_type)
        if chart_config:
            chart_data[chart_type] = chart_config
    
    try:
        analysis_id = save_analysis(name, description, file_name, data_summary, chart_data)
        return jsonify({
            'success': True, 
            'message': 'Análisis guardado correctamente',
            'analysis_id': analysis_id
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al guardar: {str(e)}'})

@app.route('/api/history')
def get_history():
    """Obtener el historial de análisis"""
    try:
        history = get_analysis_history()
        return jsonify({'success': True, 'data': history})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener historial: {str(e)}'})

@app.route('/api/history/<analysis_id>')
def get_analysis_detail(analysis_id):
    """Obtener detalles de un análisis específico"""
    try:
        analysis = get_analysis_by_id(analysis_id)
        if analysis:
            return jsonify({'success': True, 'data': analysis})
        else:
            return jsonify({'success': False, 'message': 'Análisis no encontrado'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener análisis: {str(e)}'})

@app.route('/api/delete-analysis/<analysis_id>', methods=['DELETE'])
def delete_analysis(analysis_id):
    """Eliminar un análisis del historial"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM analysis_history WHERE id = ?', (analysis_id,))
        conn.commit()
        conn.close()
        
        if cursor.rowcount > 0:
            return jsonify({'success': True, 'message': 'Análisis eliminado correctamente'})
        else:
            return jsonify({'success': False, 'message': 'Análisis no encontrado'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al eliminar: {str(e)}'})

# Rutas de filtros
@app.route('/api/filters/options')
def get_filter_options():
    """Obtener opciones disponibles para los filtros"""
    global processed_data
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'error': 'No hay datos cargados'}), 400
        
        # Obtener tipos de movimiento únicos
        movement_types = []
        for col in processed_data.columns:
            if col not in ['fecha', 'mes', 'año']:
                movement_types.append(col)
        
        # Obtener rango de fechas
        date_range = {
            'min': processed_data['fecha'].min().strftime('%Y-%m-%d') if 'fecha' in processed_data.columns else None,
            'max': processed_data['fecha'].max().strftime('%Y-%m-%d') if 'fecha' in processed_data.columns else None
        }
        
        return jsonify({
            'movement_types': movement_types,
            'date_range': date_range
        })
    except Exception as e:
        return jsonify({'error': f'Error al obtener opciones de filtros: {str(e)}'}), 500

@app.route('/api/filters/apply', methods=['POST'])
def apply_filters():
    """Aplicar filtros a los datos"""
    global processed_data
    
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'error': 'No hay datos cargados'}), 400
        
        filters = request.json
        filtered_data = processed_data.copy()
        
        # Filtro por fecha
        if filters.get('date_from'):
            date_from = pd.to_datetime(filters['date_from'])
            filtered_data = filtered_data[filtered_data['fecha'] >= date_from]
        
        if filters.get('date_to'):
            date_to = pd.to_datetime(filters['date_to'])
            filtered_data = filtered_data[filtered_data['fecha'] <= date_to]
        
        # Filtro por tipo de movimiento
        if filters.get('movement_type'):
            movement_type = filters['movement_type']
            if movement_type in filtered_data.columns:
                # Filtrar solo las filas donde este tipo de movimiento tiene valores
                filtered_data = filtered_data[filtered_data[movement_type].notna() & (filtered_data[movement_type] > 0)]
        
        # Actualizar datos procesados globalmente
        processed_data = filtered_data
        
        return jsonify({
            'success': True,
            'message': f'Filtros aplicados. {len(filtered_data)} registros encontrados.',
            'filtered_count': len(filtered_data)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error al aplicar filtros: {str(e)}'}), 500

@app.route('/api/filters/clear', methods=['POST'])
def clear_filters():
    """Limpiar filtros y restaurar datos originales"""
    try:
        global processed_data, original_data
        if not original_data.empty:
            processed_data = original_data.copy()
            return jsonify({
                'success': True,
                'message': 'Filtros limpiados. Datos originales restaurados.',
                'restored_count': len(processed_data)
            })
        else:
            return jsonify({'error': 'No hay datos originales para restaurar'}), 400
    except Exception as e:
        return jsonify({'error': f'Error al limpiar filtros: {str(e)}'}), 500

# Rutas de análisis estadístico
@app.route('/api/statistics/correlations')
def get_correlations():
    """Obtener matriz de correlaciones entre variables"""
    global processed_data
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'error': 'No hay datos para analizar'}), 400
        
        # Verificar caché
        data_hash = get_data_hash(processed_data)
        cached_result = get_from_cache(data_hash, 'correlations')
        if cached_result:
            return jsonify(cached_result)
        
        # Obtener solo columnas numéricas
        numeric_columns = []
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                numeric_columns.append(col)
        
        if len(numeric_columns) < 2:
            return jsonify({'error': 'Se requieren al menos 2 variables numéricas para calcular correlaciones'}), 400
        
        # Calcular matriz de correlaciones
        correlation_matrix = processed_data[numeric_columns].corr()
        
        # Convertir a formato JSON
        correlations = {}
        for i, col1 in enumerate(numeric_columns):
            correlations[col1] = {}
            for j, col2 in enumerate(numeric_columns):
                correlations[col1][col2] = float(correlation_matrix.iloc[i, j])
        
        result = {
            'correlations': correlations,
            'variables': numeric_columns
        }
        
        # Guardar en caché
        set_cache(data_hash, 'correlations', result)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Error al calcular correlaciones: {str(e)}'}), 500

@app.route('/api/statistics/trends')
def get_trends():
    """Obtener análisis de tendencias temporales"""
    global processed_data
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'error': 'No hay datos para analizar'}), 400
        
        # Verificar caché
        data_hash = get_data_hash(processed_data)
        cached_result = get_from_cache(data_hash, 'trends')
        if cached_result:
            return jsonify(cached_result)
        
        trends = {}
        
        # Analizar tendencias para cada columna numérica
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                values = processed_data[col].dropna()
                if len(values) > 1:
                    # Calcular tendencia simple (pendiente de regresión lineal)
                    x = np.arange(len(values))
                    y = values.values
                    
                    # Regresión lineal simple
                    n = len(x)
                    sum_x = np.sum(x)
                    sum_y = np.sum(y)
                    sum_xy = np.sum(x * y)
                    sum_x2 = np.sum(x * x)
                    
                    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
                    
                    # Determinar tipo de tendencia
                    if abs(slope) < 0.1:
                        trend_type = "Estable"
                        trend_color = "info"
                    elif slope > 0:
                        trend_type = "Creciente"
                        trend_color = "success"
                    else:
                        trend_type = "Decreciente"
                        trend_color = "danger"
                    
                    # Calcular cambio porcentual
                    first_value = values.iloc[0]
                    last_value = values.iloc[-1]
                    if first_value != 0:
                        change_pct = ((last_value - first_value) / first_value) * 100
                    else:
                        change_pct = 0
                    
                    trends[col] = {
                        'slope': float(slope),
                        'trend_type': trend_type,
                        'trend_color': trend_color,
                        'change_pct': float(change_pct),
                        'first_value': float(first_value),
                        'last_value': float(last_value)
                    }
        
        result = {'trends': trends}
        
        # Guardar en caché
        set_cache(data_hash, 'trends', result)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Error al calcular tendencias: {str(e)}'}), 500

@app.route('/api/statistics/descriptive')
def get_descriptive_stats():
    """Obtener estadísticas descriptivas"""
    global processed_data
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'error': 'No hay datos para analizar'}), 400
        
        # Verificar caché
        data_hash = get_data_hash(processed_data)
        cached_result = get_from_cache(data_hash, 'descriptive')
        if cached_result:
            return jsonify(cached_result)
        
        stats = {}
        
        # Calcular estadísticas para cada columna numérica
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                values = processed_data[col].dropna()
                if len(values) > 0:
                    stats[col] = {
                        'count': int(len(values)),
                        'mean': float(values.mean()),
                        'median': float(values.median()),
                        'std': float(values.std()),
                        'min': float(values.min()),
                        'max': float(values.max()),
                        'q1': float(values.quantile(0.25)),
                        'q3': float(values.quantile(0.75)),
                        'skewness': float(values.skew()) if len(values) > 2 else 0,
                        'kurtosis': float(values.kurtosis()) if len(values) > 2 else 0
                    }
        
        result = {'statistics': stats}
        
        # Guardar en caché
        set_cache(data_hash, 'descriptive', result)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Error al calcular estadísticas: {str(e)}'}), 500

@app.route('/api/statistics/anomalies')
def get_anomalies():
    """Detectar anomalías en los datos"""
    global processed_data
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'error': 'No hay datos para analizar'}), 400
        
        # Verificar caché
        data_hash = get_data_hash(processed_data)
        cached_result = get_from_cache(data_hash, 'anomalies')
        if cached_result:
            return jsonify(cached_result)
        
        anomalies = {}
        
        # Detectar anomalías usando método IQR para cada columna
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                values = processed_data[col].dropna()
                if len(values) > 4:  # Necesitamos al menos 5 valores para calcular IQR
                    Q1 = values.quantile(0.25)
                    Q3 = values.quantile(0.75)
                    IQR = Q3 - Q1
                    
                    # Definir límites para anomalías
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    # Encontrar anomalías
                    anomaly_indices = values[(values < lower_bound) | (values > upper_bound)].index
                    anomaly_values = values[anomaly_indices]
                    
                    if len(anomaly_values) > 0:
                        # Convertir índices a string para evitar problemas con Timestamps
                        anomaly_data = []
                        for idx, val in anomaly_values.items():
                            try:
                                if hasattr(processed_data.index[idx], 'strftime'):
                                    date_str = processed_data.index[idx].strftime('%Y-%m-%d')
                                else:
                                    date_str = str(processed_data.index[idx])
                                anomaly_data.append({
                                    'index': str(idx),
                                    'value': float(val),
                                    'date': date_str
                                })
                            except Exception as e:
                                print(f"Error procesando anomalía en índice {idx}: {e}")
                                continue
                        
                        anomalies[col] = {
                            'count': len(anomaly_values),
                            'percentage': (len(anomaly_values) / len(values)) * 100,
                            'values': anomaly_data,
                            'bounds': {
                                'lower': float(lower_bound),
                                'upper': float(upper_bound)
                            }
                        }
        
        result = {'anomalies': anomalies}
        
        # Guardar en caché
        set_cache(data_hash, 'anomalies', result)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Error al detectar anomalías: {str(e)}'}), 500

# Rutas de optimización y caché
@app.route('/api/cache/clear', methods=['POST'])
def clear_cache_endpoint():
    """Limpiar caché manualmente"""
    try:
        clear_cache()
        return jsonify({'success': True, 'message': 'Caché limpiado exitosamente'})
    except Exception as e:
        return jsonify({'error': f'Error al limpiar caché: {str(e)}'}), 500

@app.route('/api/cache/stats')
def get_cache_stats():
    """Obtener estadísticas del caché"""
    try:
        stats = {
            'total_entries': len(cache),
            'cache_ttl': cache_ttl,
            'entries': []
        }
        
        for key, entry in cache.items():
            age = time.time() - entry['timestamp']
            stats['entries'].append({
                'key': key,
                'age_seconds': round(age, 2),
                'is_valid': age < cache_ttl
            })
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': f'Error al obtener estadísticas de caché: {str(e)}'}), 500

# Rutas de alertas
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Obtener todas las alertas configuradas"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, alert_type, variable, threshold_value, threshold_condition, 
                   frequency, email, enabled, created_at
            FROM alerts 
            ORDER BY created_at DESC
        ''')
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append({
                'id': row[0],
                'alert_type': row[1],
                'variable': row[2],
                'threshold_value': row[3],
                'threshold_condition': row[4],
                'frequency': row[5],
                'email': row[6],
                'enabled': bool(row[7]),
                'created_at': row[8]
            })
        
        conn.close()
        return jsonify({'alerts': alerts})
        
    except Exception as e:
        return jsonify({'error': f'Error al obtener alertas: {str(e)}'}), 500

@app.route('/api/alerts', methods=['POST'])
def create_alert():
    """Crear una nueva alerta"""
    try:
        data = request.json
        alert_type = data.get('alert_type')
        variable = data.get('variable')
        threshold_value = data.get('threshold_value')
        threshold_condition = data.get('threshold_condition')
        frequency = data.get('frequency', 'immediate')
        email = data.get('email')
        enabled = data.get('enabled', True)
        
        if not all([alert_type, variable]):
            return jsonify({'error': 'Faltan campos requeridos'}), 400
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO alerts (alert_type, variable, threshold_value, threshold_condition, 
                              frequency, email, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (alert_type, variable, threshold_value, threshold_condition, 
              frequency, email, enabled, datetime.now().isoformat()))
        
        conn.commit()
        alert_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Alerta creada correctamente',
            'alert_id': alert_id
        })
        
    except Exception as e:
        return jsonify({'error': f'Error al crear alerta: {str(e)}'}), 500

@app.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    """Eliminar una alerta"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM alerts WHERE id = ?', (alert_id,))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Alerta eliminada correctamente'})
        else:
            conn.close()
            return jsonify({'error': 'Alerta no encontrada'}), 404
            
    except Exception as e:
        return jsonify({'error': f'Error al eliminar alerta: {str(e)}'}), 500

@app.route('/api/alerts/<int:alert_id>/toggle', methods=['POST'])
def toggle_alert(alert_id):
    """Activar/desactivar una alerta"""
    try:
        data = request.json
        enabled = data.get('enabled', True)
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE alerts SET enabled = ? WHERE id = ?', (enabled, alert_id))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Alerta actualizada correctamente'})
        else:
            conn.close()
            return jsonify({'error': 'Alerta no encontrada'}), 404
            
    except Exception as e:
        return jsonify({'error': f'Error al actualizar alerta: {str(e)}'}), 500

@app.route('/api/alerts/check', methods=['POST'])
def check_alerts():
    """Verificar alertas activas"""
    global processed_data
    try:
        if processed_data is None or processed_data.empty:
            return jsonify({'alerts': []})
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM alerts WHERE enabled = 1')
        alerts = cursor.fetchall()
        conn.close()
        
        triggered_alerts = []
        
        for alert in alerts:
            alert_id, alert_type, variable, threshold_value, threshold_condition, frequency, email, enabled, created_at = alert
            
            if variable not in processed_data.columns:
                continue
                
            current_value = processed_data[variable].iloc[-1] if len(processed_data) > 0 else 0
            
            triggered = False
            message = ""
            
            if alert_type == 'threshold' and threshold_value is not None:
                if threshold_condition == 'greater' and current_value > threshold_value:
                    triggered = True
                    message = f"{variable} ({current_value:.2f}) es mayor que {threshold_value}"
                elif threshold_condition == 'less' and current_value < threshold_value:
                    triggered = True
                    message = f"{variable} ({current_value:.2f}) es menor que {threshold_value}"
                elif threshold_condition == 'equal' and abs(current_value - threshold_value) < 0.01:
                    triggered = True
                    message = f"{variable} ({current_value:.2f}) es igual a {threshold_value}"
            
            elif alert_type == 'anomaly':
                # Usar el mismo método de detección de anomalías
                values = processed_data[variable].dropna()
                if len(values) > 4:
                    Q1 = values.quantile(0.25)
                    Q3 = values.quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    if current_value < lower_bound or current_value > upper_bound:
                        triggered = True
                        message = f"Anomalía detectada en {variable}: {current_value:.2f} (fuera del rango {lower_bound:.2f} - {upper_bound:.2f})"
            
            if triggered:
                triggered_alerts.append({
                    'alert_id': alert_id,
                    'variable': variable,
                    'current_value': current_value,
                    'message': message,
                    'timestamp': datetime.now().isoformat()
                })
        
        return jsonify({'alerts': triggered_alerts})
        
    except Exception as e:
        return jsonify({'error': f'Error al verificar alertas: {str(e)}'}), 500

# Rutas de reportes
@app.route('/api/reports/check-data', methods=['GET'])
def check_data_for_reports():
    """Verificar si hay datos disponibles para generar reportes"""
    global processed_data
    
    try:
        if processed_data is None:
            return jsonify({
                'available': False,
                'message': 'No hay datos procesados. Por favor, carga un archivo CSV primero.',
                'data_info': None
            })
        
        if processed_data.empty:
            return jsonify({
                'available': False,
                'message': 'Los datos procesados están vacíos. Por favor, verifica el archivo CSV.',
                'data_info': None
            })
        
        data_info = {
            'total_records': len(processed_data),
            'columns': list(processed_data.columns),
            'numeric_columns': len(processed_data.select_dtypes(include=[np.number]).columns),
            'date_range': {
                'start': str(processed_data.index.min()),
                'end': str(processed_data.index.max())
            }
        }
        
        return jsonify({
            'available': True,
            'message': 'Datos disponibles para generar reportes',
            'data_info': data_info
        })
        
    except Exception as e:
        return jsonify({
            'available': False,
            'message': f'Error verificando datos: {str(e)}',
            'data_info': None
        }), 500

@app.route('/api/reports/generate', methods=['POST'])
def generate_report():
    """Generar reporte automático"""
    global processed_data
    
    try:
        # Evaluar el archivo antes de generar el reporte
        print("=== EVALUACIÓN PREVIA DEL ARCHIVO ===")
        print(f"Estado de processed_data: {processed_data is not None}")
        
        if processed_data is None:
            print("ERROR: processed_data es None")
            return jsonify({'error': 'No hay datos procesados. Por favor, carga un archivo CSV primero.'}), 400
        
        if processed_data.empty:
            print("ERROR: processed_data está vacío")
            return jsonify({'error': 'Los datos procesados están vacíos. Por favor, verifica el archivo CSV.'}), 400
        
        print(f"Tamaño de processed_data: {len(processed_data)}")
        print(f"Columnas de processed_data: {list(processed_data.columns)}")
        print(f"Tipos de datos: {processed_data.dtypes.to_dict()}")
        print("=== EVALUACIÓN COMPLETADA ===\n")
        
        data = request.json
        print(f"Datos recibidos para reporte: {data}")
        
        report_config = {
            'title': data.get('title', 'Reporte de Análisis'),
            'type': data.get('type', 'executive'),
            'period': data.get('period', 'current'),
            'format': data.get('format', 'html'),
            'sections': data.get('sections', {})
        }
        
        print(f"Configuración del reporte: {report_config}")
        
        # Generar contenido del reporte usando método simplificado
        report_content = generate_simple_report(report_config)
        print(f"Contenido del reporte generado: {type(report_content)}")
        
        # Guardar reporte en base de datos
        report_id = str(uuid.uuid4())
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO reports (id, title, type, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (report_id, report_config['title'], report_config['type'], 
              json.dumps(report_content), datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'report_id': report_id,
            'content': report_content
        })
        
    except Exception as e:
        return jsonify({'error': f'Error al generar reporte: {str(e)}'}), 500

@app.route('/api/reports')
def get_reports():
    """Obtener lista de reportes generados"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, type, created_at
            FROM reports 
            ORDER BY created_at DESC
        ''')
        
        reports = []
        for row in cursor.fetchall():
            reports.append({
                'id': row[0],
                'title': row[1],
                'type': row[2],
                'created_at': row[3]
            })
        
        conn.close()
        return jsonify({'reports': reports})
        
    except Exception as e:
        return jsonify({'error': f'Error al obtener reportes: {str(e)}'}), 500

@app.route('/api/reports/<report_id>')
def get_report(report_id):
    """Obtener reporte específico"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM reports WHERE id = ?', (report_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'error': 'Reporte no encontrado'}), 404
        
        conn.close()
        
        return jsonify({
            'id': row[0],
            'title': row[1],
            'type': row[2],
            'content': json.loads(row[3]),
            'created_at': row[4]
        })
        
    except Exception as e:
        return jsonify({'error': f'Error al obtener reporte: {str(e)}'}), 500

@app.route('/api/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    """Eliminar un reporte específico"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Verificar si el reporte existe
        cursor.execute('SELECT id FROM reports WHERE id = ?', (report_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'error': 'Reporte no encontrado'}), 404
        
        # Eliminar el reporte
        cursor.execute('DELETE FROM reports WHERE id = ?', (report_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Reporte eliminado exitosamente'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al eliminar reporte: {str(e)}'}), 500
    finally:
        conn.close()


def get_correlations_data():
    """Obtener correlaciones como datos (no JSON)"""
    global processed_data
    
    try:
        if processed_data is None or processed_data.empty:
            return {'error': 'No hay datos para analizar'}
        
        # Seleccionar solo columnas numéricas
        numeric_data = processed_data.select_dtypes(include=[np.number])
        
        if numeric_data.empty:
            return {'error': 'No hay datos numéricos para calcular correlaciones'}
        
        # Calcular matriz de correlación
        correlation_matrix = numeric_data.corr()
        
        # Convertir a formato serializable
        correlations = {}
        for col1 in correlation_matrix.columns:
            correlations[col1] = {}
            for col2 in correlation_matrix.columns:
                correlations[col1][col2] = float(correlation_matrix.loc[col1, col2])
        
        return {
            'matrix': correlations,
            'columns': list(correlation_matrix.columns)
        }
        
    except Exception as e:
        print(f"Error en get_correlations_data: {e}")
        return {'error': f'Error al calcular correlaciones: {str(e)}'}

def get_descriptive_stats_data():
    """Obtener estadísticas descriptivas como datos (no JSON)"""
    global processed_data
    
    try:
        if processed_data is None or processed_data.empty:
            return {'error': 'No hay datos para analizar'}
        
        stats = {}
        
        # Calcular estadísticas para cada columna numérica
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                values = processed_data[col].dropna()
                if len(values) > 0:
                    stats[col] = {
                        'count': len(values),
                        'mean': float(values.mean()),
                        'std': float(values.std()),
                        'min': float(values.min()),
                        'max': float(values.max()),
                        'median': float(values.median()),
                        'q25': float(values.quantile(0.25)),
                        'q75': float(values.quantile(0.75))
                    }
        
        return {'statistics': stats}
    except Exception as e:
        print(f"Error en get_descriptive_stats_data: {e}")
        return {'error': f'Error al calcular estadísticas: {str(e)}'}

def get_trends_data():
    """Obtener análisis de tendencias como datos (no JSON)"""
    global processed_data
    
    try:
        if processed_data is None or processed_data.empty:
            return {'error': 'No hay datos para analizar'}
        
        trends = {}
        
        # Analizar tendencias para cada columna numérica
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                values = processed_data[col].dropna()
                if len(values) > 2:
                    # Calcular pendiente de la línea de tendencia
                    x = np.arange(len(values))
                    slope, intercept, r_value, p_value, std_err = stats.linregress(x, values)
                    
                    trends[col] = {
                        'slope': float(slope),
                        'r_squared': float(r_value ** 2),
                        'p_value': float(p_value),
                        'trend': 'creciente' if slope > 0 else 'decreciente' if slope < 0 else 'estable',
                        'strength': 'fuerte' if abs(r_value) > 0.7 else 'moderada' if abs(r_value) > 0.3 else 'débil'
                    }
        
        return {'trends': trends}
    except Exception as e:
        print(f"Error en get_trends_data: {e}")
        return {'error': f'Error al analizar tendencias: {str(e)}'}

def get_anomalies_data():
    """Obtener anomalías como datos (no JSON)"""
    global processed_data
    
    try:
        if processed_data is None or processed_data.empty:
            return {'error': 'No hay datos para analizar'}
        
        anomalies = {}
        
        # Detectar anomalías usando método IQR para cada columna
        for col in processed_data.columns:
            if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                values = processed_data[col].dropna()
                if len(values) > 4:  # Necesitamos al menos 5 valores para calcular IQR
                    Q1 = values.quantile(0.25)
                    Q3 = values.quantile(0.75)
                    IQR = Q3 - Q1
                    
                    # Definir límites para anomalías
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    # Encontrar anomalías
                    anomaly_indices = values[(values < lower_bound) | (values > upper_bound)].index
                    anomaly_values = values[anomaly_indices]
                    
                    if len(anomaly_values) > 0:
                        # Convertir índices a string para evitar problemas con Timestamps
                        anomaly_data = []
                        for idx, val in anomaly_values.items():
                            try:
                                if hasattr(processed_data.index[idx], 'strftime'):
                                    date_str = processed_data.index[idx].strftime('%Y-%m-%d')
                                else:
                                    date_str = str(processed_data.index[idx])
                                anomaly_data.append({
                                    'index': str(idx),
                                    'value': float(val),
                                    'date': date_str
                                })
                            except Exception as e:
                                print(f"Error procesando anomalía en índice {idx}: {e}")
                                continue
                        
                        anomalies[col] = {
                            'count': len(anomaly_values),
                            'percentage': (len(anomaly_values) / len(values)) * 100,
                            'values': anomaly_data,
                            'bounds': {
                                'lower': float(lower_bound),
                                'upper': float(upper_bound)
                            }
                        }
        
        return {'anomalies': anomalies}
    except Exception as e:
        print(f"Error en get_anomalies_data: {e}")
        return {'error': f'Error al detectar anomalías: {str(e)}'}

def generate_simple_report(config):
    """Generar reporte de forma simplificada y robusta"""
    global processed_data
    
    print("=== INICIANDO GENERACIÓN SIMPLE DE REPORTE ===")
    
    try:
        # Verificar datos
        if processed_data is None or processed_data.empty:
            return {'error': 'No hay datos disponibles'}
        
        # Crear estructura básica del reporte
        report = {
            'title': config.get('title', 'Reporte de Análisis'),
            'type': config.get('type', 'executive'),
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'sections': {}
        }
        
        print("Generando resumen básico...")
        # Resumen básico
        try:
            summary = {
                'total_records': len(processed_data),
                'columns': list(processed_data.columns),
                'date_range': {
                    'start': str(processed_data.index.min()),
                    'end': str(processed_data.index.max())
                },
                'total_tonnage': float(processed_data.sum().sum()) if processed_data is not None and not processed_data.empty else 0,
                'monthly_average': float(processed_data.sum(axis=1).mean()) if processed_data is not None and not processed_data.empty else 0
            }
            report['sections']['summary'] = {
                'title': 'Resumen Ejecutivo',
                'data': summary
            }
            print("✓ Resumen generado correctamente")
        except Exception as e:
            print(f"✗ Error en resumen: {e}")
            report['sections']['summary'] = {
                'title': 'Resumen Ejecutivo',
                'data': {'error': f'Error generando resumen: {str(e)}'}
            }
        
        print("Generando estadísticas básicas...")
        # Estadísticas básicas
        try:
            stats = {}
            numeric_cols = processed_data.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if col not in ['diferencia_ajustada', 'precision_proy']:
                    values = processed_data[col].dropna()
                    if len(values) > 0:
                        stats[col] = {
                            'count': int(len(values)),
                            'mean': float(values.mean()),
                            'min': float(values.min()),
                            'max': float(values.max())
                        }
            
            report['sections']['statistics'] = {
                'title': 'Estadísticas Básicas',
                'data': {'statistics': stats}
            }
            print("✓ Estadísticas generadas correctamente")
        except Exception as e:
            print(f"✗ Error en estadísticas: {e}")
            report['sections']['statistics'] = {
                'title': 'Estadísticas Básicas',
                'data': {'error': f'Error generando estadísticas: {str(e)}'}
            }
        
        print("Generando recomendaciones...")
        # Recomendaciones simples
        try:
            recommendations = [
                "Revisar la precisión de las proyecciones mensualmente",
                "Implementar alertas automáticas para desviaciones significativas",
                "Analizar tendencias estacionales para mejorar la planificación",
                "Mantener un registro detallado de las proyecciones vs realidad"
            ]
            report['sections']['recommendations'] = {
                'title': 'Recomendaciones',
                'data': {'recommendations': recommendations}
            }
            print("✓ Recomendaciones generadas correctamente")
        except Exception as e:
            print(f"✗ Error en recomendaciones: {e}")
            report['sections']['recommendations'] = {
                'title': 'Recomendaciones',
                'data': {'error': f'Error generando recomendaciones: {str(e)}'}
            }
        
        print("=== REPORTE SIMPLE GENERADO EXITOSAMENTE ===")
        return report
        
    except Exception as e:
        print(f"ERROR CRÍTICO en generate_simple_report: {e}")
        return {
            'error': f'Error crítico generando reporte: {str(e)}',
            'title': config.get('title', 'Reporte de Análisis'),
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'sections': {}
        }

def generate_report_content(config):
    """Generar contenido del reporte basado en la configuración"""
    global processed_data
    
    print(f"Iniciando generación de reporte con config: {config}")
    
    content = {
        'title': config['title'],
        'type': config['type'],
        'generated_at': datetime.now().isoformat(),
        'sections': {}
    }
    
    # Resumen ejecutivo
    if config['sections'].get('includeSummary', True):
        try:
            print("Generando resumen ejecutivo...")
            summary = get_data_summary()
            print(f"Resumen generado: {type(summary)}")
            content['sections']['summary'] = {
                'title': 'Resumen Ejecutivo',
                'data': summary
            }
        except Exception as e:
            print(f"Error generando resumen: {e}")
    
    # Estadísticas (versión simplificada)
    if config['sections'].get('includeStats', True):
        try:
            print("Generando estadísticas...")
            stats = {}
            for col in processed_data.columns:
                if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                    values = processed_data[col].dropna()
                    if len(values) > 0:
                        stats[col] = {
                            'count': len(values),
                            'mean': float(values.mean()),
                            'std': float(values.std()),
                            'min': float(values.min()),
                            'max': float(values.max())
                        }
            
            stats_data = {'statistics': stats}
            print(f"Estadísticas generadas: {type(stats_data)}")
            content['sections']['statistics'] = {
                'title': 'Estadísticas Descriptivas',
                'data': stats_data
            }
        except Exception as e:
            print(f"Error generando estadísticas: {e}")
    
    # Tendencias (versión simplificada)
    if config['sections'].get('includeTrends', True):
        try:
            print("Generando tendencias...")
            trends = {}
            for col in processed_data.columns:
                if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                    values = processed_data[col].dropna()
                    if len(values) > 2:
                        x = np.arange(len(values))
                        slope, intercept, r_value, p_value, std_err = stats.linregress(x, values)
                        trends[col] = {
                            'slope': float(slope),
                            'r_squared': float(r_value ** 2),
                            'trend': 'creciente' if slope > 0 else 'decreciente' if slope < 0 else 'estable'
                        }
            
            trends_data = {'trends': trends}
            print(f"Tendencias generadas: {type(trends_data)}")
            content['sections']['trends'] = {
                'title': 'Análisis de Tendencias',
                'data': trends_data
            }
        except Exception as e:
            print(f"Error generando tendencias: {e}")
    
    # Anomalías (versión simplificada)
    if config['sections'].get('includeAnomalies', True):
        try:
            print("Generando anomalías...")
            anomalies = {}
            for col in processed_data.columns:
                if col not in ['diferencia_ajustada', 'precision_proy'] and processed_data[col].dtype in ['float64', 'int64']:
                    values = processed_data[col].dropna()
                    if len(values) > 4:
                        Q1 = values.quantile(0.25)
                        Q3 = values.quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                        anomaly_count = len(values[(values < lower_bound) | (values > upper_bound)])
                        if anomaly_count > 0:
                            anomalies[col] = {
                                'count': anomaly_count,
                                'percentage': (anomaly_count / len(values)) * 100
                            }
            
            anomalies_data = {'anomalies': anomalies}
            print(f"Anomalías generadas: {type(anomalies_data)}")
            content['sections']['anomalies'] = {
                'title': 'Detección de Anomalías',
                'data': anomalies_data
            }
        except Exception as e:
            print(f"Error generando anomalías: {e}")
    
    # Recomendaciones
    if config['sections'].get('includeRecommendations', True):
        try:
            recommendations = [
                "Revisar la precisión de las proyecciones mensualmente",
                "Implementar alertas automáticas para desviaciones significativas",
                "Analizar tendencias estacionales para mejorar la planificación"
            ]
            content['sections']['recommendations'] = {
                'title': 'Recomendaciones',
                'data': {'recommendations': recommendations}
            }
        except Exception as e:
            print(f"Error generando recomendaciones: {e}")
    
    print(f"Contenido final del reporte: {type(content)}")
    return content

def generate_recommendations():
    """Generar recomendaciones basadas en el análisis"""
    recommendations = []
    
    try:
        # Analizar tendencias para generar recomendaciones
        response = requests.get('http://localhost:5000/api/statistics/trends')
        if response.status_code == 200:
            trends = response.json().get('trends', {})
            
            for variable, trend in trends.items():
                if trend['trend_type'] == 'Decreciente':
                    recommendations.append({
                        'type': 'warning',
                        'title': f'Declive en {variable}',
                        'description': f'Se observa una tendencia decreciente del {abs(trend["change_pct"]):.1f}% en {variable}. Se recomienda investigar las causas.',
                        'priority': 'high'
                    })
                elif trend['trend_type'] == 'Creciente':
                    recommendations.append({
                        'type': 'success',
                        'title': f'Crecimiento en {variable}',
                        'description': f'Excelente crecimiento del {trend["change_pct"]:.1f}% en {variable}. Mantener las estrategias actuales.',
                        'priority': 'medium'
                    })
    except:
        pass
    
    # Recomendaciones generales
    recommendations.extend([
        {
            'type': 'info',
            'title': 'Monitoreo Continuo',
            'description': 'Implementar monitoreo en tiempo real para detectar cambios significativos en los datos.',
            'priority': 'medium'
        },
        {
            'type': 'info',
            'title': 'Análisis Periódico',
            'description': 'Realizar análisis estadísticos mensuales para identificar patrones y tendencias.',
            'priority': 'low'
        }
    ])
    
    return recommendations

# Rutas de exportación
@app.route('/export/chart/<format>')
def export_chart(format):
    """Exportar el gráfico actual en el formato especificado"""
    global processed_data
    try:
        if processed_data is not None and not processed_data.empty:
            chart_type = request.args.get('type', 'line')
            chart_data = get_chart_data(chart_type)
            
            if 'error' in chart_data:
                return jsonify({'error': chart_data['error']}), 400
            
            # Crear figura con matplotlib
            fig, ax = plt.subplots(figsize=(12, 8))
            
            if chart_type == 'line':
                # Gráfico de líneas
                for dataset in chart_data['data']['datasets']:
                    ax.plot(chart_data['data']['labels'], dataset['data'], 
                           label=dataset['label'], linewidth=2, marker='o')
                ax.set_title(chart_data['options']['plugins']['title']['text'], fontsize=16, fontweight='bold')
                ax.set_xlabel('Fecha', fontsize=12)
                ax.set_ylabel('Toneladas', fontsize=12)
                ax.legend()
                ax.grid(True, alpha=0.3)
                
            elif chart_type == 'bar':
                # Gráfico de barras
                x = np.arange(len(chart_data['data']['labels']))
                width = 0.35
                for i, dataset in enumerate(chart_data['data']['datasets']):
                    ax.bar(x + i*width, dataset['data'], width, label=dataset['label'])
                ax.set_title(chart_data['options']['plugins']['title']['text'], fontsize=16, fontweight='bold')
                ax.set_xlabel('Fecha', fontsize=12)
                ax.set_ylabel('Toneladas', fontsize=12)
                ax.set_xticks(x + width/2)
                ax.set_xticklabels(chart_data['data']['labels'], rotation=45)
                ax.legend()
                
            elif chart_type == 'comparison':
                # Gráfico de comparación
                for dataset in chart_data['data']['datasets']:
                    ax.plot(chart_data['data']['labels'], dataset['data'], 
                           label=dataset['label'], linewidth=2, marker='o')
                ax.set_title(chart_data['options']['plugins']['title']['text'], fontsize=16, fontweight='bold')
                ax.set_xlabel('Fecha', fontsize=12)
                ax.set_ylabel('Toneladas', fontsize=12)
                ax.legend()
                ax.grid(True, alpha=0.3)
                
            elif chart_type == 'precision':
                # Gráfico de precisión
                for dataset in chart_data['data']['datasets']:
                    ax.plot(chart_data['data']['labels'], dataset['data'], 
                           label=dataset['label'], linewidth=2, marker='o')
                ax.set_title(chart_data['options']['plugins']['title']['text'], fontsize=16, fontweight='bold')
                ax.set_xlabel('Fecha', fontsize=12)
                ax.set_ylabel('Precisión (%)', fontsize=12)
                ax.legend()
                ax.grid(True, alpha=0.3)
                
            elif chart_type == 'difference':
                # Gráfico de diferencias
                for dataset in chart_data['data']['datasets']:
                    ax.plot(chart_data['data']['labels'], dataset['data'], 
                           label=dataset['label'], linewidth=2, marker='o')
                ax.set_title(chart_data['options']['plugins']['title']['text'], fontsize=16, fontweight='bold')
                ax.set_xlabel('Fecha', fontsize=12)
                ax.set_ylabel('Diferencia (Toneladas)', fontsize=12)
                ax.legend()
                ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            # Guardar en el formato solicitado
            if format == 'png':
                img_buffer = io.BytesIO()
                plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
                img_buffer.seek(0)
                plt.close(fig)
                
                response = make_response(img_buffer.getvalue())
                response.headers['Content-Type'] = 'image/png'
                response.headers['Content-Disposition'] = f'attachment; filename=grafico_{chart_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
                return response
                
            elif format == 'pdf':
                pdf_buffer = io.BytesIO()
                plt.savefig(pdf_buffer, format='pdf', bbox_inches='tight')
                pdf_buffer.seek(0)
                plt.close(fig)
                
                response = make_response(pdf_buffer.getvalue())
                response.headers['Content-Type'] = 'application/pdf'
                response.headers['Content-Disposition'] = f'attachment; filename=grafico_{chart_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
                return response
            
        return jsonify({'error': 'No hay datos para exportar'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Error al exportar gráfico: {str(e)}'}), 500

@app.route('/export/data')
def export_data():
    """Exportar datos procesados como CSV"""
    global processed_data
    try:
        if processed_data is not None and not processed_data.empty:
            # Crear un DataFrame con los datos procesados
            export_df = processed_data.copy()
            
            # Agregar información de metadatos
            export_df['fecha_exportacion'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Crear respuesta CSV
            csv_buffer = io.StringIO()
            export_df.to_csv(csv_buffer, index=False, encoding='utf-8')
            csv_data = csv_buffer.getvalue()
            
            response = make_response(csv_data)
            response.headers['Content-Type'] = 'text/csv; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename=datos_procesados_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response
            
        return jsonify({'error': 'No hay datos para exportar'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Error al exportar datos: {str(e)}'}), 500

@app.route('/export/report')
def export_report():
    """Generar y exportar reporte completo en HTML"""
    global processed_data
    try:
        if processed_data is not None and not processed_data.empty:
            # Crear reporte HTML
            summary = get_data_summary()
            
            report_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Análisis - ASAPALSA Analytics</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .header {{ text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; }}
                    .section {{ margin: 20px 0; }}
                    .metric {{ display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 5px; }}
                    .metric-value {{ font-size: 24px; font-weight: bold; color: #007bff; }}
                    .metric-label {{ font-size: 14px; color: #666; }}
                    .footer {{ margin-top: 40px; text-align: center; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🌱 ASAPALSA Analytics</h1>
                    <h2>Reporte de Análisis de Datos</h2>
                    <p>Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
                </div>
                
                <div class="section">
                    <h3>📊 Resumen de Datos</h3>
                    <div class="metric">
                        <div class="metric-value">{summary.get('total_records', 0)}</div>
                        <div class="metric-label">Total de Registros</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{summary.get('total_tonnage', 0):.2f}</div>
                        <div class="metric-label">Toneladas Totales</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{summary.get('monthly_average', 0):.2f}</div>
                        <div class="metric-label">Promedio Mensual</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{summary.get('date_range', {}).get('start', 'N/A')}</div>
                        <div class="metric-label">Fecha Inicio</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{summary.get('date_range', {}).get('end', 'N/A')}</div>
                        <div class="metric-label">Fecha Fin</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>📈 Análisis por Tipo de Movimiento</h3>
                    <p>Los datos han sido procesados y analizados según los diferentes tipos de movimiento registrados.</p>
                </div>
                
                <div class="footer">
                    <p>Desarrollado por Leonel Villanueva y Arnold Suate</p>
                    <p>Sistema de Análisis Agroindustrial - ASAPALSA Analytics</p>
                </div>
            </body>
            </html>
            """
            
            response = make_response(report_html)
            response.headers['Content-Type'] = 'text/html; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename=reporte_analisis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html'
            return response
            
        return jsonify({'error': 'No hay datos para generar reporte'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Error al generar reporte: {str(e)}'}), 500

# Endpoint para análisis inteligente con IA
@app.route('/api/generate-intelligent-analysis', methods=['POST'])
def generate_intelligent_analysis():
    """Genera análisis inteligente usando Google Gemini"""
    try:
        data = request.json
        data_summary = data.get('dataSummary', {})
        chart_data = data.get('chartData', {})
        analysis_name = data.get('analysisName', 'Análisis')
        
        # Verificar si la IA está disponible
        if not ai_model:
            return jsonify({
                'success': False,
                'analysis': 'Análisis inteligente no disponible. Configura GEMINI_API_KEY en las variables de entorno.',
                'fallback': True
            })
        
        # Crear prompt para Gemini
        prompt = f"""
        Eres un analista experto en datos agroindustriales. Analiza estos datos y genera un análisis inteligente y recomendaciones específicas.

        DATOS DEL ANÁLISIS:
        - Nombre: {analysis_name}
        - Registros totales: {data_summary.get('total_records', 0):,}
        - Total T.M. procesadas: {data_summary.get('total_tonnage', 0):,}
        - Promedio mensual: {data_summary.get('monthly_average', 0):,.2f} T.M.
        - Columnas numéricas: {data_summary.get('numeric_columns', 0)}
        - Período: {data_summary.get('date_range', {}).get('start', 'N/A')} a {data_summary.get('date_range', {}).get('end', 'N/A')}
        - Tipo de visualización: {chart_data.get('type', 'desconocido')}

        INSTRUCCIONES:
        1. Analiza la productividad y eficiencia operacional
        2. Identifica patrones y tendencias relevantes
        3. Proporciona recomendaciones específicas y accionables
        4. Explica el significado de los números en contexto empresarial
        5. Mantén el análisis conciso pero completo (máximo 200 palabras)
        6. Usa un tono profesional pero accesible
        7. Enfócate en insights que ayuden a tomar decisiones

        Responde en español y en formato de párrafo continuo.
        """
        
        # Generar análisis con Gemini
        response = ai_model.generate_content(prompt)
        analysis_text = response.text.strip()
        
        return jsonify({
            'success': True,
            'analysis': analysis_text,
            'fallback': False
        })
        
    except Exception as e:
        print(f"Error generando análisis inteligente: {e}")
        return jsonify({
            'success': False,
            'analysis': 'Error generando análisis inteligente. Usando análisis local.',
            'fallback': True
        })

if __name__ == '__main__':
    print("=" * 60)
    print("🌱 ASAPALSA Analytics - Sistema de Análisis Agroindustrial")
    print("=" * 60)
    print("🚀 Servidor iniciando en: http://0.0.0.0:5000")
    print("🔧 Modo debug: Activado")
    if ai_model:
        print("🤖 Análisis inteligente: ACTIVADO (Google Gemini)")
    else:
        print("🤖 Análisis inteligente: DESACTIVADO (configura GEMINI_API_KEY)")
    print("=" * 60)
    print("📊 Características disponibles:")
    print("   • Carga de archivos CSV con drag & drop")
    print("   • 5 tipos de visualizaciones interactivas")
    print("   • Actualización en tiempo real")
    print("   • Interfaz responsive y moderna")
    print("   • Exportación de gráficos y datos")
    print("   • Generación de reportes automáticos")
    print("   • Análisis inteligente con IA (Gemini)")
    print("=" * 60)
    print("💡 Para detener el servidor presiona Ctrl+C")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
