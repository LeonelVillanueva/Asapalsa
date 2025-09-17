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
    print("=" * 80)
    print(f"🌱 {PROJECT_NAME} v{VERSION}")
    print("   Sistema de Análisis Agroindustrial")
    print("=" * 80)

def check_python_version():
    """Verificar versión de Python"""
    if sys.version_info < (3, 8):
        print("❌ ERROR: Se requiere Python 3.8 o superior")
        print(f"   Versión actual: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version.split()[0]} detectado")

def check_dependencies():
    """Verificar e instalar dependencias"""
    print("🔍 Verificando dependencias...")
    
    # Lista completa de dependencias necesarias
    all_deps = ['flask', 'pandas', 'matplotlib', 'numpy', 'requests', 'watchdog', 'werkzeug']
    missing_deps = []
    
    for dep in all_deps:
        try:
            __import__(dep)
            print(f"✅ {dep} ya está instalado")
        except ImportError:
            missing_deps.append(dep)
    
    if missing_deps:
        print(f"📦 Instalando dependencias faltantes: {', '.join(missing_deps)}")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_deps)
            print("✅ Dependencias instaladas correctamente")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Advertencia: Error instalando algunas dependencias: {e}")
            print("💡 Intenta instalar manualmente: pip install -r requirements.txt")
    else:
        print("✅ Todas las dependencias están instaladas")

def install_requirements():
    """Instalar dependencias desde requirements.txt"""
    requirements_file = Path("requirements.txt")
    if requirements_file.exists():
        print("📦 Instalando dependencias desde requirements.txt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("✅ Dependencias instaladas correctamente")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Advertencia: Error instalando requirements.txt: {e}")
    else:
        print("ℹ️  No se encontró requirements.txt, usando dependencias básicas")

def create_directories():
    """Crear directorios necesarios"""
    directories = ['uploads', 'static/css', 'static/js', 'static/images', 'templates']
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directorios del proyecto verificados")

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
    print("🚀 Iniciando servidor de producción...")
    print(f"🌐 URL: http://{host}:{port}")
    print("🔧 Modo: Producción")
    print("🛑 Para detener: Ctrl+C")
    print("=" * 80)
    
    # Configurar variables de entorno para producción
    os.environ['FLASK_ENV'] = 'production'
    os.environ['FLASK_DEBUG'] = '0'
    os.environ['FLASK_APP'] = 'app.py'
    
    try:
        # Importar y ejecutar la aplicación
        from app import app
        app.run(debug=False, host=host, port=port, use_reloader=False)
    except KeyboardInterrupt:
        print("\n\n👋 ¡Servidor detenido! Gracias por usar ASAPALSA Analytics")
    except Exception as e:
        print(f"\n❌ Error al iniciar el servidor: {e}")
        print("💡 Verifica que el puerto no esté en uso y que todas las dependencias estén instaladas")

def show_system_info():
    """Mostrar información del sistema"""
    print("\n📋 Información del Sistema:")
    print(f"   • Sistema Operativo: {platform.system()} {platform.release()}")
    print(f"   • Arquitectura: {platform.machine()}")
    print(f"   • Python: {sys.version.split()[0]}")
    print(f"   • Directorio de trabajo: {os.getcwd()}")

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
    
    # Instalar dependencias
    install_requirements()
    check_dependencies()
    
    # Mostrar información del sistema
    show_system_info()
    
    print("\n" + "=" * 80)
    
    # Iniciar servidor según el modo
    if args.dev:
        start_development_server(args.host, args.port)
    else:
        start_production_server(args.host, args.port)

if __name__ == '__main__':
    main()
