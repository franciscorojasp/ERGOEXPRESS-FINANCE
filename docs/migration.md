# Guía de Migración a Supabase - ERGOEXPRESS FINANCE

## Resumen Ejecutivo

Esta guía detalla el proceso de migración desde el backend actual (Google Apps Script + Sheets) hacia una arquitectura moderna con **Supabase PostgreSQL** como base de datos principal y **APIs REST** propias.

**Beneficios esperados:**
- 🚀 **Rendimiento:** 10-100x más rápido
- 📈 **Escalabilidad:** De miles a millones de registros
- 🔒 **Confiabilidad:** 99.99% uptime SLA
- 💰 **Costo:** Desde $0/mes (plan gratuito)

---

## Arquitectura Objetivo

```
Frontend (Vanilla JS)     APIs REST (Node.js)     Base de Datos
├── HTML/CSS/JS         ├── Express Server      ├── PostgreSQL (Supabase)
├── Single Page App     ├── Supabase Auth       ├── Realtime subscriptions
├── PWA Ready           ├── Rate Limiting       ├── Auto-generated APIs
└── Mobile Friendly     └── Microservicios      └── Built-in security
```

### Servicios Supabase Requeridos

1. **PostgreSQL** - Base de datos principal (incluida)
2. **Supabase Auth** - Autenticación integrada
3. **Realtime** - Suscripciones en tiempo real
4. **Storage** - Archivos y assets (opcional)
5. **Edge Functions** - Serverless functions (opcional)

---

## Fase 1: Preparación (1-2 semanas)

### Paso 1: Configurar Supabase

1. **Crear cuenta:**
   - Ve a [supabase.com](https://supabase.com)
   - Regístrate (plan gratuito disponible)

2. **Crear proyecto:**
   - Click en "New project"
   - Nombre: `ergoexpress-finance`
   - Base de datos: PostgreSQL (automática)
   - Región: Elige la más cercana

3. **Obtener credenciales:**
   - Ve a Settings → API
   - Copia: Project URL, anon/public key, service_role key
   avn service create redis-cache \
     --service-type redis \
     --cloud google-europe-west1 \
     --plan free
   ```

3. **Obtener connection strings:**
   - PostgreSQL: `postgresql://user:pass@host:port/db`
   - Redis: `redis://user:pass@host:port`

### Paso 2: Diseño de Base de Datos

Ejecuta el esquema en [`database/schema.sql`](../database/schema.sql):

```sql
-- Crear base de datos
CREATE DATABASE ergoexpress_finance;

-- Usar la base de datos
\c ergoexpress_finance;

-- Crear esquemas y tablas
-- (Ver archivo schema.sql para detalles completos)
```

### Paso 3: Configurar Entorno de Desarrollo

```bash
# Instalar dependencias
npm init -y
npm install express pg redis dotenv cors helmet express-rate-limit jsonwebtoken bcryptjs

# Variables de entorno
cat > .env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=tu_jwt_secret
API_KEY=tu_api_key
EOF
```

---

## Fase 2: Desarrollo de APIs (2-3 semanas)

### Paso 1: Estructura del Servidor

Crea [`api/server.js`](../api/server.js):

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Conexión a base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Conexión a Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.connect();

// Rutas
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/finances', require('./routes/finances'));
app.use('/api/v1/ai', require('./routes/ai'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
```

### Paso 2: APIs de Autenticación

Crea [`api/routes/auth.js`](../api/routes/auth.js):

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Cachear sesión en Redis
    await redisClient.setEx(`session:${user.id}`, 28800, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware de autenticación
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar en Redis
    const cachedToken = await redisClient.get(`session:${decoded.id}`);
    if (!cachedToken || cachedToken !== token) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { router, authenticate };
```

### Paso 3: APIs de Productos

Crea [`api/routes/products.js`](../api/routes/products.js):

```javascript
const express = require('express');
const { Pool } = require('pg');
const { authenticate } = require('./auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Obtener productos
router.get('/', authenticate, async (req, res) => {
  try {
    const { categoria, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, nombre, descripcion, categoria, precio_usd, costo_usd,
             impuesto_pct, stock_actual, stock_minimo, activo
      FROM productos
      WHERE activo = true
    `;
    const params = [];
    let paramCount = 1;

    if (categoria) {
      query += ` AND categoria = $${paramCount}`;
      params.push(categoria);
      paramCount++;
    }

    query += ` ORDER BY nombre LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countQuery = 'SELECT COUNT(*) FROM productos WHERE activo = true';
    const countResult = await pool.query(countQuery);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Crear producto
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria, precio_usd, costo_usd,
      impuesto_pct, stock_actual, stock_minimo
    } = req.body;

    const result = await pool.query(`
      INSERT INTO productos (
        nombre, descripcion, categoria, precio_usd, costo_usd,
        impuesto_pct, stock_actual, stock_minimo, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      nombre, descripcion, categoria, precio_usd, costo_usd,
      impuesto_pct, stock_actual, stock_minimo, req.user.id
    ]);

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: 'Producto creado exitosamente'
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Actualizar producto
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    values.push(id);

    const result = await pool.query(`
      UPDATE productos
      SET ${fields.join(', ')}, actualizado_en = NOW()
      WHERE id = $${paramCount} AND activo = true
      RETURNING id
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente'
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar producto (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE productos
      SET activo = false, eliminado_en = NOW(), eliminado_por = $1
      WHERE id = $2 AND activo = true
      RETURNING id
    `, [req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
```

---

## Fase 3: Migración de Datos (1 semana)

### Paso 1: Scripts de Exportación

Crea [`database/export-sheets.js`](../database/export-sheets.js):

```javascript
const fs = require('fs');
const path = require('path');

// Simular exportación desde Sheets
async function exportFromSheets() {
  // En producción, usarías Google Sheets API
  // Para demo, crear datos de ejemplo

  const products = [
    {
      nombre: 'Laptop Dell XPS 13',
      descripcion: 'Laptop ultrabook premium',
      categoria: 'Electrónicos',
      precio_usd: 1200.00,
      costo_usd: 1000.00,
      impuesto_pct: 16.00,
      stock_actual: 15,
      stock_minimo: 5
    },
    // ... más productos
  ];

  const finances = [
    {
      fecha: '2026-04-01',
      tipo: 'ingreso',
      concepto: 'Venta de productos',
      monto_usd: 2500.00,
      monto_ves: 2500000.00,
      tasa: 1000.00,
      categoria: 'Ventas'
    },
    // ... más transacciones
  ];

  // Guardar como JSON para migración
  fs.writeFileSync(
    path.join(__dirname, 'sheets-export.json'),
    JSON.stringify({ products, finances }, null, 2)
  );

  console.log('✅ Datos exportados de Sheets');
}

exportFromSheets();
```

### Paso 2: Scripts de Importación

Crea [`database/import-postgres.js`](../database/import-postgres.js):

```javascript
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importToPostgres() {
  try {
    // Leer datos exportados
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sheets-export.json'), 'utf8')
    );

    console.log('🚀 Iniciando migración a PostgreSQL...');

    // Migrar productos
    console.log('📦 Migrando productos...');
    for (const product of data.products) {
      await pool.query(`
        INSERT INTO productos (
          nombre, descripcion, categoria, precio_usd, costo_usd,
          impuesto_pct, stock_actual, stock_minimo, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (nombre) DO NOTHING
      `, [
        product.nombre, product.descripcion, product.categoria,
        product.precio_usd, product.costo_usd, product.impuesto_pct,
        product.stock_actual, product.stock_minimo, true
      ]);
    }

    // Migrar finanzas
    console.log('💰 Migrando transacciones financieras...');
    for (const finance of data.finances) {
      await pool.query(`
        INSERT INTO transacciones_financieras (
          fecha, tipo, concepto, monto_usd, monto_ves, tasa, categoria
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        finance.fecha, finance.tipo, finance.concepto,
        finance.monto_usd, finance.monto_ves, finance.tasa, finance.categoria
      ]);
    }

    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await pool.end();
  }
}

importToPostgres();
```

### Paso 3: Ejecutar Migración

```bash
# Exportar desde Sheets
node database/export-sheets.js

# Importar a PostgreSQL
node database/import-postgres.js

# Verificar
psql $DATABASE_URL -c "SELECT COUNT(*) FROM productos;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM transacciones_financieras;"
```

---

## Fase 4: Testing y Optimización (1 semana)

### Paso 1: Tests Automatizados

Crea [`tests/api.test.js`](../tests/api.test.js):

```javascript
const request = require('supertest');
const app = require('../api/server');

describe('API Tests', () => {
  test('GET /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });

  test('POST /api/v1/auth/login - Invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
    expect(response.status).toBe(401);
  });

  // Más tests...
});
```

### Paso 2: Optimizaciones de Performance

```javascript
// Índices en PostgreSQL
await pool.query(`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_productos_categoria
  ON productos (categoria);

  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_productos_activo
  ON productos (activo) WHERE activo = true;

  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finanzas_fecha
  ON transacciones_financieras (fecha);

  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finanzas_tipo
  ON transacciones_financieras (tipo);
`);

// Cache con Redis
const cache = require('./cache');

router.get('/', authenticate, cache('products', 300), async (req, res) => {
  // Lógica con cache
});
```

---

## Fase 5: Despliegue en Producción (3-5 días)

### Opción 1: Railway (Recomendado)

```bash
# Conectar repo
railway login
railway link
railway add --name postgres

# Variables de entorno
railway variables set DATABASE_URL=postgresql://...
railway variables set REDIS_URL=redis://...
railway variables set JWT_SECRET=tu_secret

# Desplegar
railway up
```

### Opción 2: Heroku

```bash
# Crear app
heroku create ergoexpress-api

# Base de datos
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev

# Desplegar
git push heroku main
```

### Opción 3: VPS con Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## Timeline Completo

| Fase | Duración | Actividades | Entregables |
|------|----------|-------------|-------------|
| **Preparación** | 1-2 semanas | Setup Supabase, diseño BD | Schema SQL, configs |
| **APIs** | 2-3 semanas | Desarrollo REST APIs | Server Node.js, rutas |
| **Migración** | 1 semana | Export/Import datos | Scripts, validación |
| **Testing** | 1 semana | Tests, optimización | Suite de tests, índices |
| **Despliegue** | 3-5 días | Producción | App desplegada |

**Tiempo total estimado:** 5-7 semanas
**Costo estimado:** $0-25/mes (Supabase gratuito) + hosting

---

## Rollback Plan

Si algo sale mal:

1. **Mantén Apps Script activo** como backup
2. **Exporta datos diariamente** durante transición
3. **Test A/B:** Algunos usuarios en nuevo sistema, otros en antiguo
4. **Tiempo de rollback:** < 4 horas

---

## Beneficios Esperados

### Rendimiento
- **Queries:** 50-200ms vs 2-5s en Sheets
- **Concurrencia:** 1000+ usuarios vs 10-20
- **Escalabilidad:** Millones de registros vs 10M celdas

### Confiabilidad
- **Uptime:** 99.99% vs 99.9%
- **Backups:** Automáticos vs manuales
- **Recuperación:** Point-in-time vs snapshots

### Costo-Beneficio
- **Inicial:** $200/mes vs $0 (Sheets incluido)
- **Escala:** $500/mes vs $1000+ (ERP comerciales)
- **ROI:** 6-12 meses

---

## Soporte y Recursos

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 🐘 [PostgreSQL Docs](https://www.postgresql.org/docs/)
- 🚀 [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- 💬 [Discord Community](https://discord.gg/ergoexpress)

¿Necesitas ayuda con algún paso específico de la migración?

---

*Guía actualizada: Abril 2026*