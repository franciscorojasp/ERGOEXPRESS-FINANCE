# ERGOEXPRESS CRM — Guía de Instalación

> **Sin Google Cloud Console. Sin OAuth. Solo necesitas Google Sheets.**

---

## Cómo funciona

```
Tu navegador (CRM)  ──POST──►  Google Apps Script  ──►  Google Sheets
       ▲                              │
       └──────── JSON ◄──────────────┘
```

El CRM web envía peticiones al **Apps Script desplegado como Web App**. El script accede a las hojas con los permisos de tu cuenta Google. No se requiere ninguna configuración de APIs en Google Cloud.

---

## Instalación en 5 pasos

### Paso 1 — Crear el Google Sheet

1. Ir a [sheets.google.com](https://sheets.google.com)
2. **Crear una hoja en blanco** — llámala provisoriamente como quieras
3. Ir a **Extensiones → Apps Script**

---

### Paso 2 — Pegar el código del Apps Script

1. En el editor de Apps Script verás un archivo `Code.gs` vacío
2. **Borrar todo** el contenido existente
3. **Copiar y pegar** el contenido completo de [`apps-script/Code.gs`](apps-script/Code.gs) de este proyecto
4. **Cambiar el API_KEY** en la línea 9 del script:
   ```javascript
   const API_KEY = 'TU-CLAVE-SECRETA'; // Cámbiala por algo tuyo
   ```
5. Guardar con **Ctrl+S**

---

### Paso 3 — Configurar el sistema (una sola vez)

1. En el editor de Apps Script, click en el menú desplegable junto al botón ▶
2. Seleccionar **`configurarSistema`**
3. Click **▶ Ejecutar**
4. Autorizar los permisos cuando se solicite (es tu propia cuenta)
5. Verás una ventana emergente confirmando que las 7 hojas fueron creadas

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
