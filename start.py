#!/usr/bin/env python3
"""
ASAPALSA Analytics - Script de Inicio Unificado
Sistema de análisis de datos agroindustriales

Este script proporciona una única forma profesional de iniciar el proyecto,
reemplazando todos los métodos de inicio anteriores.

Uso:
    python start.py                    # Modo producción
    python start.py --dev              # Modo desarrollo con auto-reload
    python start.py --help             # Mostrar ayuda
"""

import os
import sys
import argparse
import subprocess
import platform
import time
from pathlib import Path

# Configuración del proyecto
PROJECT_NAME = "ASAPALSA Analytics"
VERSION = "2.0.0"
DEFAULT_PORT = 5000
DEFAULT_HOST = "0.0.0.0"

def print_banner():
    """Mostrar banner de inicio"""
    print(f"🌱 {PROJECT_NAME} v{VERSION}")

def check_python_version():
    """Verificar versión de Python"""
    if sys.version_info < (3, 8):
        print("Error: Se requiere Python 3.8 o superior")
        sys.exit(1)

def check_critical_dependencies():
    """Verificar dependencias críticas sin instalar automáticamente"""
    critical_deps = ['flask']
    
    for dep in critical_deps:
        try:
            __import__(dep)
        except ImportError:
            print(f"Error: Dependencia crítica '{dep}' no encontrada")
            print("Instala las dependencias con: pip install -r requirements.txt")
            sys.exit(1)

def install_requirements():
    """Instalar dependencias desde requirements.txt"""
    requirements_file = Path("requirements.txt")
    if requirements_file.exists():
        try:
            # Instalar con timeout para evitar bloqueos
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            pass  # Silenciar errores de instalación

def create_directories():
    """Crear directorios necesarios"""
    directories = ['uploads', 'static/css', 'static/js', 'static/images', 'templates']
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)

def start_development_server(host, port):
    """Iniciar servidor en modo desarrollo con auto-reload"""
    print("🚀 Iniciando servidor de desarrollo...")
    print(f"🌐 URL: http://{host}:{port}")
    print("🔄 Auto-reload: Activado")
    print("🛑 Para detener: Ctrl+C")
    print("=" * 80)
    
    # Configurar variables de entorno para desarrollo
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = '1'
    os.environ['FLASK_APP'] = 'app.py'
    
    try:
        # Importar y ejecutar la aplicación
        from app import app
        app.run(debug=True, host=host, port=port, use_reloader=True)
    except KeyboardInterrupt:
        print("\n\n👋 ¡Servidor detenido! Gracias por usar ASAPALSA Analytics")
    except Exception as e:
        print(f"\n❌ Error al iniciar el servidor: {e}")
        print("💡 Verifica que el puerto no esté en uso y que todas las dependencias estén instaladas")

def start_production_server(host, port):
    """Iniciar servidor en modo producción"""
    print("🚀 Iniciando servidor...")
    
    # Configurar variables de entorno para producción
    os.environ['FLASK_ENV'] = 'production'
    os.environ['FLASK_DEBUG'] = '0'
    os.environ['FLASK_APP'] = 'app.py'
    
    try:
        # Importar y ejecutar la aplicación
        from app import app
        app.run(debug=False, host=host, port=port, use_reloader=False)
    except KeyboardInterrupt:
        pass  # Silenciar mensaje de parada
    except Exception as e:
        print(f"Error: {e}")

def show_system_info():
    """Mostrar información del sistema"""
    print(f"Python: {sys.version.split()[0]}")

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description=f"{PROJECT_NAME} - Script de inicio unificado",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python start.py                    # Modo producción
  python start.py --dev              # Modo desarrollo
  python start.py --port 8080        # Puerto personalizado
  python start.py --host 127.0.0.1   # Host personalizado
  python start.py --dev --port 3000  # Desarrollo en puerto 3000
        """
    )
    
    parser.add_argument('--dev', action='store_true', 
                       help='Iniciar en modo desarrollo con auto-reload')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT,
                       help=f'Puerto del servidor (default: {DEFAULT_PORT})')
    parser.add_argument('--host', default=DEFAULT_HOST,
                       help=f'Host del servidor (default: {DEFAULT_HOST})')
    parser.add_argument('--info', action='store_true',
                       help='Mostrar información del sistema y salir')
    parser.add_argument('--version', action='version', version=f'{PROJECT_NAME} v{VERSION}')
    
    args = parser.parse_args()
    
    # Mostrar banner
    print_banner()
    
    # Mostrar información del sistema si se solicita
    if args.info:
        show_system_info()
        return
    
    # Verificaciones previas
    check_python_version()
    create_directories()
    
    # Solo verificar dependencias críticas, no instalar automáticamente
    check_critical_dependencies()
    
    # Iniciar servidor según el modo
    if args.dev:
        start_development_server(args.host, args.port)
    else:
        start_production_server(args.host, args.port)

if __name__ == '__main__':
    main()
