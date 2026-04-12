# ERGOEXPRESS FINANCE API

API REST para el sistema de gestión financiera ERGOEXPRESS FINANCE.

## 🚀 Características

- **🔐 Autenticación Supabase** con JWT integrado
- **🗄️ PostgreSQL via Supabase** con Row Level Security
- **📊 API REST automática** generada por Supabase
- **⚡ Rate limiting** y protección contra ataques
- **🔒 Validación de datos** con Joi
- **📝 Logging estructurado** con Winston
- **🧪 Tests unitarios** con Jest
- **🐳 Docker** listo para despliegue

## 📋 Prerrequisitos

- ✅ Cuenta [Supabase](https://supabase.com/) (gratuita)
- ✅ Node.js 18+ y npm
- ✅ Navegador moderno

## 🛠️ Configuración

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea cuenta
2. Crea un nuevo proyecto: `ergoexpress-finance`
3. Ve a **Settings → API** y copia:
   - `Project URL`
   - `anon public` key
   - `service_role` key

### 2. Configurar variables de entorno

Edita el archivo `api/.env`:

```env
# Supabase (Requerido)
SUPABASE_URL=https://tu-project-ref.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase

NODE_ENV=development
PORT=3001
```

### 3. Ejecutar setup

```bash
cd api
npm install
npm run migrate
npm run seed
npm run dev
```

### 4. Verificar instalación

```bash
npm run verify
```

Debería confirmar:
- ✅ Conexión a Supabase
- ✅ Migraciones aplicadas
- ✅ API funcionando

   # Producción
   npm start
   ```

## � Despliegue en Vercel

### Configuración Automática

1. **Conectar repositorio:**
   - Ve a [vercel.com](https://vercel.com) y conecta tu repositorio de GitHub
   - Selecciona el proyecto `ergoexpress-finance`

2. **Configurar Variables de Entorno:**
   - Ve a **Settings → Environment Variables** en tu proyecto Vercel
   - Agrega las siguientes variables (usa los valores de tu proyecto Supabase):
   ```env
   SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
   SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   NODE_ENV=production
   ```

3. **Desplegar:**
   - Vercel detectará automáticamente la configuración en `vercel.json`
   - El despliegue tomará unos minutos
   - Tu API estará disponible en: `https://tu-proyecto.vercel.app/api/`

### URLs de Producción

- **API Base:** `https://ergoexpress-finance.vercel.app/api/`
- **Health Check:** `https://ergoexpress-finance.vercel.app/api/health`
- **Frontend:** `https://ergoexpress-finance.vercel.app/`

## �📚 Documentación de la API

### Autenticación

Todos los endpoints requieren autenticación JWT excepto `/health`, `/api/info` y `/api/auth/login`.

```javascript
// Headers requeridos
{
  "Authorization": "Bearer <tu_jwt_token>",
  "Content-Type": "application/json"
}
```

### Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token

#### Productos
- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

#### Dashboard
- `GET /api/dashboard/finance` - Dashboard financiero

### Códigos de Respuesta

- `200` - Éxito
- `201` - Creado
- `400` - Datos inválidos
- `401` - No autorizado
- `403` - Prohibido
- `404` - No encontrado
- `500` - Error interno

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch
```

## � Despliegue con Docker

### Desarrollo Local

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# Servicios disponibles:
# - API: http://localhost:3001
# - pgAdmin: http://localhost:5050 (admin@ergoexpress.com / admin123)
# - Redis Commander: http://localhost:8081
# - PostgreSQL: localhost:5432
```

### Producción

```bash
# Construir imagen
docker build -t ergoexpress-finance-api .

# Ejecutar contenedor
docker run -p 3001:3001 --env-file .env ergoexpress-finance-api
```

## 🔍 Verificación de Instalación

Ejecuta el script de verificación:

```bash
node scripts/verify.js
```

Esto verificará:
- ✅ Conexión a PostgreSQL
- ✅ Conexión a Redis (opcional)
- ✅ Migraciones aplicadas
- ✅ API responding
- ✅ Endpoints básicos funcionando

## 🔒 Seguridad

- **Helmet.js** para headers de seguridad
- **Rate limiting** para prevenir ataques DoS
- **bcrypt** para hash de contraseñas
- **JWT** con expiración de 8 horas
- **CORS** configurado para orígenes específicos
- **Validación de entrada** con Joi
- **Logging seguro** sin exposición de datos sensibles

## 📊 Monitoreo

- Health checks en `/health`
- Métricas de rendimiento
- Logging estructurado
- Alertas automáticas

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](../LICENSE) para más detalles.

## 📞 Soporte

- **Email:** support@ergoexpress-finance.com
- **Issues:** [GitHub Issues](https://github.com/ergoexpress/ergoexpress-finance/issues)
- **Documentación:** [Wiki](https://github.com/ergoexpress/ergoexpress-finance/wiki)

---

**ERGOEXPRESS FINANCE** - Sistema de gestión financiera profesional