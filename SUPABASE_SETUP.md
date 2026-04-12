# Guía de Configuración - Supabase

## 🚀 Configuración Inicial de Supabase

### 1. Crear Proyecto
1. Ve a [supabase.com](https://supabase.com)
2. Crea cuenta gratuita
3. Nuevo proyecto: `ergoexpress-finance`
4. Espera a que se cree (~2 minutos)

### 2. Ejecutar Schema SQL
1. Ve a **SQL Editor** en tu proyecto
2. Copia y pega el contenido de `database/schema.sql`
3. Haz click en **"Run"** o presiona `Ctrl+Enter`
4. Verifica que no haya errores

### 3. Configurar Variables de Entorno
En tu aplicación local (`api/.env`):
```env
SUPABASE_URL=https://tu-project-ref.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NODE_ENV=development
PORT=3001
```

### 4. Configurar en Vercel (Producción)
En tu proyecto Vercel → **Settings → Environment Variables**:
```env
SUPABASE_URL=https://tu-project-ref.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NODE_ENV=production
```

## 🔐 Configuración de Autenticación

### Crear Usuario Admin
Después de ejecutar el schema, puedes crear un usuario admin desde la aplicación o directamente en Supabase:

1. Ve a **Authentication → Users** en Supabase Dashboard
2. Click **"Add user"**
3. Email: `admin@ergoexpress.com`
4. Password: `admin123`
5. Role: `admin`

### Configurar RLS (Opcional - Avanzado)
Para configurar Row Level Security:

1. Ve a **SQL Editor**
2. Ejecuta consultas para habilitar RLS en tablas específicas
3. Crea políticas basadas en `auth.uid()` en lugar de `current_user_id()`

## 📊 Verificar Instalación

### Local
```bash
cd api
npm run verify
npm run seed  # Opcional: datos de ejemplo
npm run dev
```

### Producción (Vercel)
- API: `https://tu-proyecto.vercel.app/api/health`
- App: `https://tu-proyecto.vercel.app/`

## 🐛 Solución de Problemas

### Error de sintaxis en SQL
- Asegúrate de usar el SQL Editor de Supabase, no psql
- Los comandos `\c` y `CREATE DATABASE` no son necesarios

### Error de conexión
- Verifica que las variables de entorno sean correctas
- Asegúrate de que el proyecto Supabase esté activo

### Error de autenticación
- Verifica que las API keys sean correctas
- Asegúrate de que el usuario esté confirmado en Supabase Auth

## 📚 Recursos Adicionales

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)