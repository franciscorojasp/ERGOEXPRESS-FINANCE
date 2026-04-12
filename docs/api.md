# Documentación de APIs - ERGOEXPRESS FINANCE

## Arquitectura API

ERGOEXPRESS FINANCE utiliza una arquitectura híbrida:

- **Backend Temporal:** Google Apps Script + Google Sheets
- **Backend Futuro:** PostgreSQL (Supabase) + Node.js REST APIs

## Cliente API

Todas las llamadas se hacen a través del módulo `API` en [`js/api.js`](../js/api.js):

```javascript
// Ejemplo de uso
const resultado = await API.call('READ', {
  sheet: 'Productos',
  filters: { categoria: 'Electrónicos' }
});

if (resultado.success) {
  console.log('Datos obtenidos:', resultado.data);
} else {
  console.error('Error:', resultado.error);
}
```

## Endpoints Disponibles

### 🔐 Autenticación

#### `LOGIN`
Inicia sesión de usuario.

**Parámetros:**
```javascript
{
  email: string,      // Email del usuario
  password: string    // Contraseña
}
```

**Respuesta:**
```javascript
{
  success: true,
  user: {
    id: number,
    email: string,
    nombre: string,
    rol: string
  },
  token: string       // Token de sesión (válido 8 horas)
}
```

#### `VALIDATE_TOKEN`
Valida un token de sesión.

**Parámetros:**
```javascript
{
  token: string
}
```

**Respuesta:**
```javascript
{
  success: true,
  user: { /* datos del usuario */ }
}
```

### 📊 Operaciones CRUD

#### `READ`
Lee datos de una hoja.

**Parámetros:**
```javascript
{
  sheet: string,      // Nombre de la hoja (ej: 'Productos')
  filters: object,    // Filtros opcionales
  limit: number,      // Límite de resultados
  offset: number      // Offset para paginación
}
```

**Respuesta:**
```javascript
{
  success: true,
  data: [
    { id: 1, nombre: 'Producto A', precio: 100 },
    // ... más registros
  ],
  total: number       // Total de registros
}
```

#### `APPEND`
Agrega nuevos registros.

**Parámetros:**
```javascript
{
  sheet: string,      // Nombre de la hoja
  data: object        // Datos a insertar
}
```

**Respuesta:**
```javascript
{
  success: true,
  id: number          // ID del nuevo registro
}
```

#### `UPDATE`
Actualiza registros existentes.

**Parámetros:**
```javascript
{
  sheet: string,
  id: number,         // ID del registro a actualizar
  data: object        // Nuevos datos
}
```

#### `DELETE`
Elimina registros.

**Parámetros:**
```javascript
{
  sheet: string,
  id: number
}
```

### 💰 Finanzas

#### `GET_FISCAL_DASHBOARD`
Obtiene datos del dashboard fiscal.

**Respuesta:**
```javascript
{
  success: true,
  data: {
    ingresos: number,
    egresos: number,
    balance: number,
    puntoEquilibrio: number,
    // ... más métricas
  }
}
```

#### `EXECUTE_PAYROLL`
Ejecuta cálculo de nómina.

**Parámetros:**
```javascript
{
  periodo: string,    // Formato: 'YYYY-MM'
  empleados: array    // Lista de empleados
}
```

### 🤖 Inteligencia Artificial

#### `RUN_AI_AUDIT`
Ejecuta consulta al auditor IA.

**Parámetros:**
```javascript
{
  query: string,      // Consulta del usuario
  history: array      // Historial de conversación
}
```

**Respuesta:**
```javascript
{
  success: true,
  answer: string,     // Respuesta de la IA
  confidence: number  // Nivel de confianza (0-1)
}
```

#### `GET_BI_STATS`
Obtiene estadísticas de BI.

**Parámetros:**
```javascript
{
  options: {
    periodo: string,
    metricas: array
  }
}
```

### 📋 Gestión

#### `GET_NEXT_NUMBER`
Obtiene siguiente número para documentos.

**Parámetros:**
```javascript
{
  type: string        // 'cotizacion', 'factura', etc.
}
```

**Respuesta:**
```javascript
{
  success: true,
  number: string      // Número formateado
}
```

#### `SYNC_TO_CALENDAR`
Sincroniza eventos con Google Calendar.

**Parámetros:**
```javascript
{
  events: array       // Lista de eventos
}
```

### 🧾 Contabilidad

#### `EXECUTE_QUOTATION`
Procesa cotización.

**Parámetros:**
```javascript
{
  cotizacion: object
}
```

#### `FISCAL_EXPORT_IVA_XML`
Exporta XML de IVA para SENIAT.

**Parámetros:**
```javascript
{
  periodo: string     // 'YYYY-MM'
}
```

**Respuesta:**
```javascript
{
  success: true,
  data: string        // Contenido XML
}
```

## Estructura de Datos

### Usuarios
```javascript
{
  id: number,
  email: string,
  nombre: string,
  rol: string,        // 'admin', 'user', 'viewer'
  activo: boolean,
  fechaRegistro: string,
  superAdmin: boolean
}
```

### Productos
```javascript
{
  id: number,
  nombre: string,
  descripcion: string,
  categoria: string,
  precioUSD: number,
  costoUSD: number,
  impuesto: number,   // Porcentaje
  stockActual: number,
  stockMinimo: number
}
```

### Transacciones Financieras
```javascript
{
  id: number,
  fecha: string,
  tipo: string,       // 'ingreso' | 'egreso'
  concepto: string,
  montoUSD: number,
  montoVES: number,
  tasa: number,
  categoria: string,
  usuario: string
}
```

## Manejo de Errores

Todas las respuestas incluyen:

```javascript
{
  success: boolean,
  error: string,      // Solo presente si success = false
  data: any          // Solo presente si success = true
}
```

### Códigos de Error Comunes

- `UNAUTHORIZED`: Token inválido o expirado
- `FORBIDDEN`: Permisos insuficientes
- `NOT_FOUND`: Recurso no encontrado
- `VALIDATION_ERROR`: Datos inválidos
- `RATE_LIMITED`: Demasiadas peticiones
- `SERVER_ERROR`: Error interno del servidor

## Rate Limiting

- **Límite:** 100 peticiones por hora por IP
- **Headers de respuesta:**
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Peticiones restantes
  - `X-RateLimit-Reset`: Timestamp de reset

## Autenticación

### Tokens
- **Formato:** JWT
- **Vigencia:** 8 horas
- **Refresh:** Automático en el cliente

### Headers Requeridos
```
Authorization: Bearer <token>
Content-Type: application/json
X-API-Key: <api_key>
```

## Versionado

- **Versión actual:** v6.0.0
- **Endpoint versioning:** `/v1/` (planeado para futuro)
- **Backward compatibility:** Mantenida por 2 versiones

## Testing

### Con Postman
```javascript
// Login
POST https://script.google.com/macros/s/.../exec
{
  "apiKey": "TU_API_KEY",
  "action": "LOGIN",
  "email": "admin@admin.com",
  "password": "admin"
}
```

### Con cURL
```bash
curl -X POST https://script.google.com/macros/s/.../exec \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TU_API_KEY",
    "action": "READ",
    "sheet": "Productos"
  }'
```

## Migración a APIs REST

En el futuro, las llamadas cambiarán a:

```javascript
// Actual (Apps Script)
API.call('READ', { sheet: 'Productos' })

// Futuro (REST APIs)
fetch('/api/v1/products', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## Monitoreo

### Logs
- Disponibles en Apps Script: **Ver → Logs**
- Niveles: `INFO`, `WARN`, `ERROR`

### Métricas
- Latencia de respuesta
- Tasa de éxito de llamadas
- Uso de cuotas de Google

## Seguridad

- ✅ Encriptación TLS 1.3
- ✅ Validación de entrada
- ✅ Sanitización de datos
- ✅ Rate limiting
- ✅ Auditoría de acciones
- ✅ Tokens expirables

## Soporte

Para preguntas sobre APIs:

- 📖 [Documentación completa](https://docs.ergoexpress.com/api)
- 💬 [Discord Developer Community](https://discord.gg/ergoexpress)
- 🐛 [GitHub Issues](https://github.com/tu-usuario/ergoexpress-finance/issues)

---

*Última actualización: Abril 2026*