#!/usr/bin/env python3
"""
ASAPALSA Analytics - Inicio Rápido
Versión optimizada para desarrollo rápido
"""

import os
import sys
from app import app

if __name__ == '__main__':
    print("🚀 Iniciando ASAPALSA Analytics (Modo Rápido)...")
    print("🌐 URL: http://localhost:5000")
    print("🛑 Para detener: Ctrl+C")
    print("=" * 50)
    
    # Configuración mínima para desarrollo rápido
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = '1'
    
    # Iniciar servidor directamente
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False,  # Deshabilitar reloader para mayor velocidad
        threaded=True
    )
