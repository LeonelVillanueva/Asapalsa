# 🚀 Guía de Despliegue - ASAPALSA Analytics

## 📋 Opciones Gratuitas para Desplegar tu Proyecto

### 1. **Heroku** (Recomendado) ⭐
- ✅ **Gratuito** (con limitaciones)
- ✅ **Fácil de usar**
- ✅ **Soporte para Flask**
- ✅ **Dominio personalizado**

### 2. **Railway** 🚄
- ✅ **Gratuito** (con límites generosos)
- ✅ **Muy fácil**
- ✅ **Deploy automático desde GitHub**

### 3. **Render** 🎨
- ✅ **Gratuito** (con limitaciones)
- ✅ **Buena documentación**
- ✅ **Soporte para Python/Flask**

### 4. **PythonAnywhere** 🐍
- ✅ **Gratuito** (con limitaciones)
- ✅ **Perfecto para Python/Flask**
- ✅ **Fácil configuración**

---

## 🎯 **OPCIÓN 1: HEROKU** (Recomendado)

### Paso 1: Preparar el Proyecto
Tu proyecto ya está preparado con:
- ✅ `Procfile` - Configuración de Heroku
- ✅ `runtime.txt` - Versión de Python
- ✅ `requirements.txt` - Dependencias actualizadas
- ✅ `start.py` - Script de inicio

### Paso 2: Crear Cuenta en Heroku
1. Ve a [heroku.com](https://heroku.com)
2. Haz clic en "Sign up for free"
3. Confirma tu email

### Paso 3: Instalar Heroku CLI
1. Descarga desde [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
2. Instala la aplicación
3. Abre PowerShell y ejecuta:
```bash
heroku --version
```

### Paso 4: Subir tu Proyecto
```bash
# 1. Inicializar Git (si no lo has hecho)
git init
git add .
git commit -m "Initial commit"

# 2. Crear app en Heroku
heroku create asapalsa-analytics

# 3. Subir código
git push heroku main

# 4. Abrir en el navegador
heroku open
```

### Paso 5: Configurar Variables de Entorno (si es necesario)
```bash
heroku config:set FLASK_ENV=production
```

---

## 🚄 **OPCIÓN 2: RAILWAY** (Más Fácil)

### Paso 1: Crear Cuenta
1. Ve a [railway.app](https://railway.app)
2. Haz clic en "Login" y conecta con GitHub

### Paso 2: Conectar Repositorio
1. Haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Conecta tu repositorio

### Paso 3: Configurar
1. Railway detectará automáticamente que es una app Python
2. Configurará el puerto automáticamente
3. Deployará automáticamente

### Paso 4: Obtener URL
1. Una vez desplegado, obtendrás una URL como: `https://asapalsa-analytics-production.up.railway.app`
2. ¡Listo! Tu app estará disponible públicamente

---

## 🎨 **OPCIÓN 3: RENDER**

### Paso 1: Crear Cuenta
1. Ve a [render.com](https://render.com)
2. Haz clic en "Get Started for Free"
3. Conecta con GitHub

### Paso 2: Crear Web Service
1. Haz clic en "New +"
2. Selecciona "Web Service"
3. Conecta tu repositorio

### Paso 3: Configurar
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python start.py --prod`
- **Python Version**: 3.11.0

### Paso 4: Deploy
1. Haz clic en "Create Web Service"
2. Render construirá y desplegará tu app
3. Obtendrás una URL como: `https://asapalsa-analytics.onrender.com`

---

## 🐍 **OPCIÓN 4: PYTHONANYWHERE**

### Paso 1: Crear Cuenta
1. Ve a [pythonanywhere.com](https://pythonanywhere.com)
2. Haz clic en "Create a Beginner account"
3. Confirma tu email

### Paso 2: Subir Archivos
1. Ve a "Files" en el dashboard
2. Sube todos los archivos de tu proyecto
3. Asegúrate de que estén en la carpeta correcta

### Paso 3: Configurar Web App
1. Ve a "Web" en el dashboard
2. Haz clic en "Add a new web app"
3. Selecciona "Flask"
4. Configura la ruta a tu app

### Paso 4: Instalar Dependencias
1. Ve a "Tasks" y crea una nueva tarea
2. Ejecuta: `pip3.10 install --user -r requirements.txt`

---

## 🔧 **Configuración Adicional**

### Variables de Entorno Recomendadas
```bash
# Para Heroku
heroku config:set FLASK_ENV=production
heroku config:set PORT=5000

# Para Railway/Render
FLASK_ENV=production
PORT=5000
```

### Dominio Personalizado (Opcional)
- **Heroku**: Configuración en Settings > Domains
- **Railway**: Configuración en Settings > Domains
- **Render**: Configuración en Settings > Custom Domains

---

## 📱 **Verificar el Despliegue**

Una vez desplegado, tu app debería:
1. ✅ Cargar la página principal
2. ✅ Mostrar el logo de ASAPALSA
3. ✅ Permitir subir archivos CSV
4. ✅ Generar visualizaciones
5. ✅ Mostrar el historial

---

## 🆘 **Solución de Problemas Comunes**

### Error: "Module not found"
```bash
# Verificar que todas las dependencias estén en requirements.txt
pip freeze > requirements.txt
```

### Error: "Port already in use"
```bash
# En start.py, cambiar el puerto
port = int(os.environ.get('PORT', 5000))
```

### Error: "Static files not found"
```bash
# Verificar que la carpeta static esté incluida
git add static/
git commit -m "Add static files"
git push heroku main
```

---

## 🎉 **¡Felicidades!**

Una vez desplegado, tendrás:
- 🌐 **URL pública** para compartir
- 📱 **Acceso desde cualquier dispositivo**
- 🔄 **Actualizaciones automáticas** (con Git)
- 📊 **Portfolio profesional** para mostrar tu trabajo

### Ejemplo de URLs:
- **Heroku**: `https://asapalsa-analytics.herokuapp.com`
- **Railway**: `https://asapalsa-analytics-production.up.railway.app`
- **Render**: `https://asapalsa-analytics.onrender.com`
- **PythonAnywhere**: `https://tuusuario.pythonanywhere.com`

---

## 💡 **Recomendación Final**

**Para principiantes**: Usa **Railway** - es el más fácil
**Para profesionales**: Usa **Heroku** - es el más popular
**Para Python**: Usa **PythonAnywhere** - está especializado

¡Tu proyecto ASAPALSA Analytics estará disponible para que otros desarrolladores lo vean y lo usen! 🚀✨
