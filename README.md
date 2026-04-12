# ERGOEXPRESS FINANCE - Sistema de Gestión Empresarial

> **ERP moderno para Venezuela - Desde startup hasta enterprise**

[![Estado](https://img.shields.io/badge/Estado-Desarrollo%20Activo-green)](https://github.com/tu-usuario/ergoexpress-finance)
[![Versión](https://img.shields.io/badge/Versión-6.0.0-blue)](https://github.com/tu-usuario/ergoexpress-finance/releases)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-orange)](LICENSE)

---

## 📊 ¿Qué es ERGOEXPRESS FINANCE?

Sistema integral de gestión financiera y operativa diseñado específicamente para empresas venezolanas. Combina las mejores prácticas de ERP con cumplimiento fiscal local (SENIAT, LOTTT) y análisis predictivo con IA.

### ✨ Características Principales

- **🏢 Gestión Empresarial Completa:** Finanzas, Inventario, Nómina, Contabilidad
- **🤖 IA Integrada:** Auditor Senior con Groq AI para análisis predictivo
- **🇻🇪 Cumplimiento Fiscal:** Integración SENIAT, cálculos de hiperinflación
- **📱 Responsive:** Funciona en desktop, tablet y móvil
- **🔒 Seguro:** Autenticación robusta, encriptación de datos
- **⚡ Escalable:** Desde startup hasta empresa mediana

---

## ⚙️ Configuración de Supabase

**ERGOEXPRESS FINANCE requiere Supabase como base de datos principal.**

### 1. Crear Proyecto Supabase
1. Ve a [supabase.com](https://supabase.com) y crea cuenta gratuita
2. Crea un nuevo proyecto llamado `ergoexpress-finance`
3. Espera a que se cree la base de datos (~2 minutos)

### 2. Configurar Base de Datos
1. Ve a **SQL Editor** en tu proyecto Supabase
2. Copia y pega el contenido completo de [`database/schema.sql`](database/schema.sql)
3. Ejecuta el SQL (asegúrate de que no haya errores)

### 3. Obtener Credenciales
1. Ve a **Settings → API** en Supabase
2. Copia las credenciales:
   - **Project URL**
   - **anon/public key**
   - **service_role key**

### 4. Configurar Variables de Entorno
Actualiza `api/.env` con tus credenciales de Supabase.

---

## 🚀 Inicio Rápido

### Opción 1: Desarrollo Local (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/ergoexpress-finance.git
cd ergoexpress-finance

# Instalar dependencias API
cd api && npm install

# Configurar variables de entorno (ver SUPABASE_SETUP.md)
# cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar migraciones
npm run migrate

# Poblar con datos de ejemplo (opcional)
npm run seed

# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, iniciar frontend
cd ..
python -m http.server 8000

# Abrir en navegador
# Frontend: http://localhost:8000
# API: http://localhost:3001
```

### Opción 2: Despliegue en Producción

#### 🚀 Despliegue Automático con Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/ergoexpress-finance)

**Configuración requerida en Vercel:**

1. **Variables de Entorno (Obligatorio):**
   - Ve a tu proyecto Vercel → **Settings → Environment Variables**
   - Agrega estas variables con tus credenciales de Supabase:
   ```env
   SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
   SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   NODE_ENV=production
   ```

2. **URLs de Producción:**
   - **Aplicación:** `https://ergoexpress-finance.vercel.app/`
   - **API:** `https://ergoexpress-finance.vercel.app/api/`
   - **Health Check:** `https://ergoexpress-finance.vercel.app/api/health`

#### 🐳 Despliegue con Docker (Alternativo)

```bash
# Construir imagen
docker build -t ergoexpress-finance .

# Ejecutar contenedor
docker run -p 3000:3000 ergoexpress-finance
```

---

## 🏗️ Arquitectura

### Frontend
- **Tecnología:** Vanilla JavaScript (ES6+)
- **UI Framework:** Componentes CSS personalizados
- **Responsive:** Mobile-first design
- **PWA:** Progressive Web App capabilities

### Backend API (Node.js/Express + Supabase)
- **Framework:** Node.js + Express
- **Base de Datos:** PostgreSQL via Supabase
- **Autenticación:** Supabase Auth (JWT integrado)
- **API REST:** Endpoints personalizados + Supabase REST API
- **Validación:** Joi schemas
- **Seguridad:** Helmet, CORS, Rate limiting
- **Tiempo Real:** Supabase Realtime para actualizaciones live

### Backend Temporal (Google Apps Script)
- **Motor:** Google Apps Script
- **Base de Datos:** Google Sheets
- **APIs:** RESTful con clave API
- **Despliegue:** Serverless (Google)

### Base de Datos
- **Motor:** PostgreSQL 13+
- **Esquema:** Normalizado con 15+ tablas
- **Funciones:** Triggers y stored procedures
- **Vistas:** Optimizadas para reporting
- **Backup:** Automatizado con Supabase

### IA Integration
- **Motor:** Groq AI API
- **Funciones:** Análisis predictivo, auditoría inteligente
- **Modelos:** GPT-4 level performance
- **Casos:** Forecasting, risk assessment, optimization

---

## 📁 Estructura del Proyecto

```
ergoexpress-finance/
├── api/                    # 🚀 API Backend (Node.js/Express)
│   ├── config/            # Configuraciones de BD y validación
│   ├── scripts/           # Migraciones y seeds
│   ├── tests/             # Tests unitarios
│   ├── server.js          # Servidor principal
│   ├── package.json       # Dependencias Node.js
│   └── README.md          # Documentación API
├── database/              # 🗄️ Esquema PostgreSQL
│   ├── schema.sql         # Estructura completa
│   └── migration.sql      # Scripts de migración
├── docs/                  # 📚 Documentación
│   ├── setup.md          # Guía de instalación
│   ├── api.md            # Referencia API
│   └── migration.md      # Guía de migración
├── js/                    # 🎯 Lógica Frontend
│   ├── app.js            # Core application
│   ├── api.js            # API client
│   ├── auth.js           # Autenticación
│   ├── dashboard.js      # Dashboard principal
│   └── ...
├── css/                   # 🎨 Estilos
│   ├── main.css          # Estilos principales
│   ├── components.css    # Componentes UI
│   └── responsive.css    # Responsive design
├── spa/                   # 📱 Single Page Application
├── apps-script/           # 🔧 Google Apps Script (temporal)
├── _backup_restore_point_20260409/  # 🔄 Backup point
└── *.html                # 📄 Páginas principales
```

---

## 📋 Instalación Detallada

### Prerrequisitos

- ✅ Cuenta Google (para Apps Script)
- ✅ Navegador moderno (Chrome/Firefox/Edge)
- ✅ Conexión a internet
- ✅ Node.js 18+ y Supabase (para API completa)
- ✅ Cuenta Supabase gratuita (para base de datos)

### 🚀 Opción A: Instalación Completa (API + Supabase)

Para desarrollo completo con backend profesional:

#### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea cuenta gratuita
2. Crea un nuevo proyecto llamado `ergoexpress-finance`
3. Ve a **Settings → API** y copia las credenciales
4. Actualiza `api/.env` con tus credenciales de Supabase

#### 2. Instalar y Configurar API

```bash
# Instalar dependencias
cd api
npm install

# Ejecutar migraciones en Supabase
npm run migrate

# Poblar con datos de ejemplo
npm run seed

# Iniciar servidor de desarrollo
npm run dev
```

#### 3. Verificar Instalación

```bash
# Health check
curl http://localhost:3001/health

# Información de la API
curl http://localhost:3001/api/info
```

### 🔧 Opción B: Instalación Básica (Google Apps Script)

Para pruebas rápidas sin infraestructura compleja:

### Paso 1: Configurar Google Apps Script

1. Ve a [sheets.google.com](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Ve a **Extensiones → Apps Script**
4. Borra el código por defecto
5. Copia el contenido de [`apps-script/Code.gs`](apps-script/Code.gs)
6. Cambia la `API_KEY` en la línea 9:
   ```javascript
   const API_KEY = 'TU_CLAVE_SECRETA_UNICA';
   ```
7. Guarda y ejecuta `configurarSistema()`

### Paso 2: Configurar API Key de Groq (Opcional)

Para la funcionalidad de IA:

1. Ve a [console.groq.com](https://console.groq.com)
2. Crea una API key
3. En Apps Script: **Configuración del proyecto → Propiedades del script**
4. Agrega: `GROQ_API_KEY` = `tu_api_key`

### Paso 3: Configurar Frontend

1. Edita [`config.js`](config.js):
   ```javascript
   const CONFIG = {
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/.../exec',
     API_KEY: 'TU_CLAVE_SECRETA_UNICA',
     GEMINI_API_KEY: 'tu_groq_api_key'
   };
   ```

### Paso 4: Probar Instalación

```bash
python -m http.server 8000
# Visita http://localhost:8000
# Login con admin@admin.com / admin
```

---

## 📁 Estructura del Proyecto

```
ergoexpress-finance/
├── index.html              # Página principal
├── login.html              # Página de login
├── spa.html               # Single Page Application
├── config.js              # Configuración global
├── manifest.json          # PWA manifest
├── vercel.json            # Configuración Vercel
├── package.json           # Dependencias Node.js
├── README.md              # Esta documentación
├── docs/                  # Documentación adicional
│   ├── setup.md          # Guía de instalación detallada
│   ├── api.md            # Documentación de APIs
│   └── migration.md      # Guía de migración a Supabase
├── apps-script/          # Backend temporal
│   ├── Code.gs           # API principal
│   ├── AIConnector.gs    # Integración IA
│   └── *.gs              # Módulos especializados
├── js/                   # Frontend JavaScript
│   ├── app.js            # Core application
│   ├── api.js            # API client
│   ├── auth.js           # Autenticación
│   ├── dashboard.js      # Dashboard principal
│   ├── finances.js       # Módulo financiero
│   ├── intelligence.js   # IA y BI
│   └── utils.js          # Utilidades
├── css/                  # Estilos
│   ├── main.css          # Estilos principales
│   ├── components.css    # Componentes UI
│   └── responsive.css    # Responsive design
├── database/             # Esquemas y migraciones
│   ├── schema.sql        # Esquema PostgreSQL
│   └── migration.sql     # Scripts de migración
├── api/                  # APIs REST (futuro)
│   └── server.js         # Servidor Node.js
└── tests/                # Tests automatizados
    ├── unit/            # Tests unitarios
    └── integration/     # Tests de integración
```

---

## 🎯 Funcionalidades

### ✅ Implementadas
- [x] Autenticación de usuarios
- [x] Dashboard ejecutivo
- [x] Gestión de productos/inventario básico
- [x] Finanzas: Ingresos, Egresos, Presupuestos
- [x] Contabilidad básica
- [x] Reportes con gráficos
- [x] IA: Auditor Senior (Groq)
- [x] Responsive design
- [x] PWA capabilities

### 🚧 En Desarrollo
- [ ] Gestión de inventario avanzada
- [ ] Estructuras de costos complejas
- [ ] Presupuestos multinivel
- [ ] Nómina completa
- [ ] Integración fiscal SENIAT
- [ ] APIs REST propias
- [ ] Migración a PostgreSQL

### 📋 Planificadas
- [ ] Multi-empresa
- [ ] API pública
- [ ] Integración bancaria
- [ ] E-commerce integrado
- [ ] Mobile app

---

## 🔧 Desarrollo

### Comandos Útiles

```bash
# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Build para producción
npm run build

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar linter
npm run lint
```

### Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📊 API Reference

### Endpoints Principales

```javascript
// Autenticación
API.call('LOGIN', { email, password })
API.call('VALIDATE_TOKEN', { token })

// Datos
API.call('READ', { sheet: 'Productos' })
API.call('APPEND', { sheet: 'Productos', data: {...} })

// IA
API.call('RUN_AI_AUDIT', { query: 'Analizar gastos', history: [] })

// Finanzas
API.call('GET_FISCAL_DASHBOARD')
API.call('GET_BI_STATS', { options: {} })
```

Ver [`docs/api.md`](docs/api.md) para documentación completa.

---

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repo de GitHub
2. Configura variables de entorno:
   ```
   APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
   API_KEY=tu_clave_secreta
   GROQ_API_KEY=tu_api_key_groq
   ```
3. Deploy automático

### Otros Providers

- **Netlify:** Drag & drop del folder `dist/`
- **Railway:** Conecta repo GitHub
- **Heroku:** Buildpack Node.js

---

## 🐛 Troubleshooting

### Error: "Acción no reconocida"
- Re-despliega Apps Script
- Verifica que la API_KEY coincida

### Error: "Sesión expirada"
- Re-loguea en la aplicación
- Tokens expiran en 8 horas

### IA no funciona
- Verifica API key de Groq en Apps Script properties
- Confirma que IntelligenceEngine.gs esté disponible

### Problemas de rendimiento
- Limpia cache del navegador
- Verifica conexión a internet
- Revisa logs en Apps Script

---

## 📈 Roadmap

### Q2 2026: Migración a Supabase
- [x] PostgreSQL database (Supabase)
- [x] APIs REST propias
- [x] Autenticación integrada (Supabase Auth)
- [x] Gestión de inventario completa

### Q3 2026: Expansión Funcional
- [ ] Nómina completa
- [ ] Integración SENIAT
- [ ] Presupuestos multinivel
- [ ] Reportes avanzados

### Q4 2026: Enterprise Features
- [ ] Multi-empresa
- [ ] API pública
- [ ] Integración bancaria
- [ ] Mobile app

---

## 🤝 Soporte

- 📧 **Email:** support@ergoexpress.com
- 💬 **Discord:** [Únete a nuestra comunidad](https://discord.gg/ergoexpress)
- 📖 **Docs:** [Documentación completa](https://docs.ergoexpress.com)
- 🐛 **Issues:** [Reportar bugs](https://github.com/tu-usuario/ergoexpress-finance/issues)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [`LICENSE`](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- **Google Apps Script** por el backend serverless
- **Supabase** por la plataforma de datos y autenticación
- **Groq AI** por el procesamiento de lenguaje natural
- **Chart.js** por las visualizaciones
- **Comunidad Open Source** por las herramientas

---

**Hecho con ❤️ para emprendedores venezolanos**

[⬆ Volver al inicio](#ergoexpress-finance---sistema-de-gestión-empresarial)

---

### Paso 4 — Desplegar como Web App

1. Click en **Implementar** → **Nueva implementación**
2. Click en el ícono de engranaje ⚙️ → **App web**
3. Configurar:
   - **Descripción:** ERGOEXPRESS CRM
   - **Ejecutar como:** Yo (mi cuenta)
   - **Acceso:** Cualquier usuario
4. Click **Implementar**
5. Autorizar los permisos si se solicitan
6. **Copiar la URL** que aparece (formato: `https://script.google.com/macros/s/XXXXXXXX/exec`)

---

### Paso 5 — Configurar el CRM

1. Abrir [`config.js`](config.js) en cualquier editor de texto
2. Pegar la URL en la línea `APPS_SCRIPT_URL`:
   ```javascript
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TU_ID/exec',
   ```
3. Poner el mismo `API_KEY` que pusiste en el Apps Script:
   ```javascript
   API_KEY: 'TU-CLAVE-SECRETA',
   ```
4. Guardar `config.js`

---

## Primer inicio de sesión

1. Abrir `index.html` en el navegador *(o desde tu servidor)*
2. Click en la pestaña **"Primer acceso"**
3. Completar: Nombre completo, Correo y Contraseña
4. Click **"Configurar administrador"**
5. ¡El CRM iniciará con tu cuenta de administrador!

> Desde la pantalla "Configuración → Usuarios" puedes agregar hasta 6 vendedores con sus propias contraseñas.

---

## Despliegue (para acceder desde cualquier dispositivo)

### Opción A: GitHub Pages (gratis)

```bash
git init
git add .
git commit -m "ERGOEXPRESS CRM v1.0"
# Crear repositorio en github.com y hacer push
```
En GitHub: **Settings → Pages → Branch: main → Save**

**Importante:** La URL del Apps Script ya maneja CORS. No necesitas configurar nada adicional.

### Opción B: Netlify (gratis, más fácil)

1. Ir a [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Arrastrar la carpeta `ERGOEXPRESS CRM` completa
3. ¡Listo! Tendrás una URL pública instantánea.

### Opción C: Servidor local (solo para pruebas)

```bash
# Si tienes Python:
python -m http.server 8080
# Abrir: http://localhost:8080
```

---

## Solución de problemas

| Error | Solución |
|-------|----------|
| `Failed to fetch` | Verifica que `APPS_SCRIPT_URL` en `config.js` sea correcto |
| `API Key inválido` | El `API_KEY` en `config.js` y en `Code.gs` deben ser idénticos |
| `Hoja no encontrada` | Ejecuta de nuevo `configurarSistema()` desde el editor de Apps Script |
| Al actualizar el script: cambios no se reflejan | En Apps Script: Implementar → **Administrar implementaciones** → Editar → **Nueva versión** |

---

## Actualizar el Apps Script después de cambios

> ⚠️ Si modificas el código de `Code.gs`, **debes crear una nueva versión**:
> Apps Script → **Implementar** → **Administrar implementaciones** → ✏️ Editar → **Versión: Nueva versión** → **Implementar**

---

## Estructura del Google Sheet "CRM ERGOEXPRESS"

| Hoja | Contenido |
|------|-----------|
| `Contactos` | Clientes y prospectos |
| `Productos` | Catálogo de servicios |
| `TasasCambio` | Tasas BCV USD/VES |
| `Cotizaciones` | Historial de cotizaciones |
| `Seguimiento` | Interacciones y pipeline |
| `Configuracion` | Datos empresa y textos por defecto |
| `Usuarios` | Usuarios y contraseñas |

---

## Estructura de archivos del proyecto

```
ERGOEXPRESS CRM/
├── index.html          ← Login email + contraseña
├── app.html            ← CRM principal (SPA)
├── config.js           ← ⚙️ CONFIGURAR AQUÍ
├── manifest.json       ← PWA instalable
├── README.md           ← Esta guía
├── assets/
│   └── logo.png
├── apps-script/
│   └── Code.gs         ← Pegar en Google Apps Script
├── css/
│   ├── main.css
│   ├── components.css
│   └── responsive.css
└── js/
    ├── api.js          ← Comunicación con Apps Script
    ├── auth.js         ← Autenticación email/contraseña
    ├── sheets.js       ← Capa de datos
    ├── utils.js        ← Utilidades
    ├── app.js          ← Router SPA
    ├── dashboard.js    ← Panel de control
    ├── contacts.js     ← Módulo contactos
    ├── products.js     ← Módulo productos
    ├── quotations.js   ← Módulo cotizaciones
    ├── quote-builder.js← Generador PDF
    ├── pipeline.js     ← Pipeline Kanban
    ├── rates.js        ← Tasas de cambio
    └── settings.js     ← Configuración y usuarios
```
