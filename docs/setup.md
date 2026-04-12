# Guía de Instalación Detallada - ERGOEXPRESS FINANCE

## Prerrequisitos

Antes de comenzar, asegúrate de tener:

- ✅ Cuenta Google activa
- ✅ Navegador web moderno (Chrome 90+, Firefox 88+, Edge 90+)
- ✅ Conexión a internet estable
- ✅ (Opcional) Node.js 18+ para desarrollo avanzado
- ✅ (Opcional) Git para control de versiones

## Instalación Paso a Paso

### Paso 1: Preparar Google Sheets

1. **Accede a Google Sheets:**
   - Ve a [sheets.google.com](https://sheets.google.com)
   - Inicia sesión con tu cuenta Google

2. **Crear nueva hoja de cálculo:**
   - Click en "+ En blanco" o "Nueva hoja de cálculo"
   - Nómbrala como "ERGOEXPRESS_FINANCE" (o el nombre que prefieras)

3. **Acceder a Apps Script:**
   - En la hoja, ve al menú superior: **Extensiones → Apps Script**
   - Se abrirá el editor de Apps Script en una nueva pestaña

### Paso 2: Configurar el Backend

1. **Limpiar el editor:**
   - Borra todo el código por defecto en `Code.gs`

2. **Pegar el código del proyecto:**
   - Abre el archivo [`apps-script/Code.gs`](../apps-script/Code.gs) de este repositorio
   - Copia todo el contenido
   - Pégalo en el editor de Apps Script

3. **Configurar API Key:**
   ```javascript
   // En la línea 9 de Code.gs, cambia:
   const API_KEY_DEFAULT = 'ERGX2026'; // ← Mantén esto igual
   // Pero en Properties del script, agrega tu propia key
   ```

4. **Guardar el proyecto:**
   - Click en "Guardar" (ícono de disquete)
   - Nombra el proyecto como "ERGOEXPRESS_BACKEND"

### Paso 3: Configurar las Hojas de Datos

1. **Ejecutar configuración inicial:**
   - En el editor de Apps Script, click en el menú desplegable junto al botón "Ejecutar" (▶)
   - Selecciona la función **`configurarSistema`**
   - Click en "Ejecutar"
   - **Autoriza los permisos** cuando Google lo solicite

2. **Verificar creación de hojas:**
   - Deberías ver un mensaje confirmando que se crearon las hojas
   - En tu hoja de cálculo, verás nuevas pestañas creadas automáticamente

### Paso 4: Desplegar como Web App

1. **Desplegar el script:**
   - Click en "Desplegar" → "Nueva implementación"
   - Selecciona tipo: **Aplicación web**
   - Configura:
     - **Descripción:** "ERGOEXPRESS FINANCE API"
     - **Ejecutar como:** Tú (tu email)
     - **Quién tiene acceso:** Cualquier persona
   - Click en "Desplegar"

2. **Obtener la URL:**
   - Copia la URL que aparece: `https://script.google.com/macros/s/.../exec`
   - **Guárdala**, la necesitarás en el siguiente paso

### Paso 5: Configurar el Frontend

1. **Editar config.js:**
   - Abre [`config.js`](../config.js) en tu editor
   - Actualiza la configuración:

   ```javascript
   const CONFIG = {
     // ← Pega aquí la URL del paso anterior
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyewLsUxongldudRxZEj6J8DCNDmgc6lSzKEFVAHdMsjAe5ubnNo8yREtGsFyuV9CY2/exec',

     // ← Usa la misma API_KEY que pusiste en Apps Script
     API_KEY: 'TU_CLAVE_SECRETA_UNICA',

     // ← Opcional: API key de Groq para IA
     GEMINI_API_KEY: 'tu_api_key_de_groq_aqui'
   };
   ```

### Paso 6: Configurar IA (Opcional pero Recomendado)

1. **Obtener API Key de Groq:**
   - Ve a [console.groq.com](https://console.groq.com)
   - Crea una cuenta y genera una API key

2. **Configurar en Apps Script:**
   - En el editor de Apps Script: **Configuración del proyecto** (ícono de engranaje)
   - **Propiedades del script** → Agregar propiedad:
     - **Nombre:** `GROQ_API_KEY`
     - **Valor:** `tu_api_key_de_groq`

### Paso 7: Probar la Instalación

1. **Iniciar servidor local:**
   ```bash
   cd /ruta/a/ergoexpress-finance
   python -m http.server 8000
   ```

2. **Acceder a la aplicación:**
   - Abre [http://localhost:8000](http://localhost:8000)
   - Deberías ver la página de login

3. **Primer login:**
   - **Usuario:** admin@admin.com
   - **Contraseña:** admin
   - Si funciona, ¡felicitaciones! La instalación fue exitosa

## Solución de Problemas Comunes

### Error: "Acción no reconocida"
- **Causa:** Apps Script no está actualizado
- **Solución:** Re-despliega la web app y actualiza la URL en `config.js`

### Error: "Sesión expirada"
- **Causa:** Token de autenticación vencido
- **Solución:** Re-loguea en la aplicación

### IA no responde
- **Causa:** API key de Groq no configurada
- **Solución:** Agrega `GROQ_API_KEY` en propiedades del script

### No se crean las hojas
- **Causa:** Permisos insuficientes
- **Solución:** Asegúrate de autorizar todos los permisos solicitados

## Configuración Avanzada

### Variables de Entorno Adicionales

Para desarrollo avanzado, puedes configurar:

```javascript
// En config.js
const CONFIG = {
  // ... configuración básica ...

  // Desarrollo
  DEBUG: true,
  LOG_LEVEL: 'debug',

  // Base de datos (futuro)
  DATABASE_URL: 'postgresql://...',

  // Cache
  CACHE_TTL: 3600,

  // Límites
  MAX_FILE_SIZE: '10MB',
  API_RATE_LIMIT: 100
};
```

### Configuración de Producción

Para despliegue en producción:

1. **Vercel:** Conecta el repo y configura variables de entorno
2. **Netlify:** Sube el contenido estático
3. **Railway:** Despliegue full-stack con base de datos

## Siguientes Pasos

Una vez instalado:

1. **Explora las funcionalidades** en el dashboard
2. **Configura tus primeros productos** en el módulo de inventario
3. **Registra transacciones** en finanzas
4. **Prueba el auditor IA** con consultas sobre tus datos

## Soporte

Si encuentras problemas:

- Revisa los [issues en GitHub](https://github.com/tu-usuario/ergoexpress-finance/issues)
- Consulta la [documentación de APIs](api.md)
- Únete a nuestro [Discord](https://discord.gg/ergoexpress)

¡Bienvenido a ERGOEXPRESS FINANCE! 🚀