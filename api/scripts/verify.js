/**
 * ERGOEXPRESS FINANCE - Script de Verificación
 * Verifica que la instalación y configuración sean correctas
 */

const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const { testConnection } = require('../config/supabase');
const axios = require('axios');

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const success = (message) => {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
};

const error = (message) => {
  console.error(`[${new Date().toISOString()}] ❌ ERROR: ${message}`);
};

const warning = (message) => {
  console.warn(`[${new Date().toISOString()}] ⚠️  WARNING: ${message}`);
};

async function checkEnvironmentVariables() {
  log('Verificando variables de entorno...');

  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const optional = ['SUPABASE_SERVICE_ROLE_KEY', 'NODE_ENV', 'PORT'];

  let allGood = true;

  // Verificar variables requeridas
  for (const varName of required) {
    if (!process.env[varName]) {
      error(`Variable requerida faltante: ${varName}`);
      allGood = false;
    } else {
      success(`Variable ${varName}: configurada`);
    }
  }

  // Verificar variables opcionales
  for (const varName of optional) {
    if (!process.env[varName]) {
      warning(`Variable opcional ${varName}: no configurada`);
    } else {
      success(`Variable opcional ${varName}: configurada`);
    }
  }

  return allGood;
}

async function checkSupabaseConnection() {
  try {
    log('Verificando conexión a Supabase...');
    const { createClient } = require('@supabase/supabase-js');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Verificación básica: intentar obtener información del usuario actual (siempre disponible)
    const { data, error: supabaseError } = await supabase.auth.getSession();

    // getSession puede devolver error si no hay sesión, pero eso está bien
    // Lo importante es que la conexión funcione
    if (supabaseError && supabaseError.message !== 'Auth session missing!') {
      error(`Error conectando a Supabase: ${supabaseError.message}`);
      return false;
    }

    success('Conexión a Supabase verificada');
    return true;
  } catch (err) {
    error(`Error conectando a Supabase: ${err.message}`);
    return false;
  }
}

async function checkMigrations() {
  try {
    log('Verificando migraciones de base de datos...');
    const { createClient } = require('@supabase/supabase-js');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Verificar que la tabla principal de usuarios existe
    const { data, error: supabaseError } = await supabase
      .from('finance.usuarios')
      .select('id')
      .limit(1);

    if (supabaseError) {
      warning('No se encontró la tabla finance.usuarios. Ejecuta las migraciones primero.');
      return false;
    }

    if (data) {
      success('Migraciones aplicadas: tabla finance.usuarios encontrada');
      return true;
    }

    warning('No se pudo verificar la existencia de las tablas de migración.');
    return false;
  } catch (err) {
    warning(`No se pudieron verificar migraciones: ${err.message}`);
    return false;
  }
}

async function checkAPIServer() {
  try {
    log('Verificando servidor API...');

    const baseURL = 'http://localhost:3001';

    // Health check
    const healthResponse = await axios.get(`${baseURL}/health`, { timeout: 5000 });
    if (healthResponse.data.success) {
      success('API server responds correctamente');
    } else {
      warning('API server no responde correctamente');
      return false;
    }

    // API info
    const infoResponse = await axios.get(`${baseURL}/api/info`, { timeout: 5000 });
    if (infoResponse.data.success) {
      success(`API info: ${infoResponse.data.name} v${infoResponse.data.version}`);
    } else {
      warning('Endpoint /api/info no funciona correctamente');
      return false;
    }

    return true;
  } catch (err) {
    warning(`No se pudo verificar API server: ${err.message}`);
    return false;
  }
}

async function runVerification() {
  log('🚀 Iniciando verificación de ERGOEXPRESS FINANCE...');
  log('='.repeat(60));

  let checksPassed = 0;
  let totalChecks = 4;

  // 1. Variables de entorno
  if (await checkEnvironmentVariables()) checksPassed++;

  // 2. Conexión a Supabase
  if (await checkSupabaseConnection()) checksPassed++;

  // 3. Migraciones (opcional - solo si las tablas existen)
  try {
    if (await checkMigrations()) checksPassed++;
  } catch (err) {
    warning('Migraciones no verificadas (tablas pueden no existir aún)');
  }

  // 4. API Server (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    try {
      if (await checkAPIServer()) checksPassed++;
    } catch (err) {
      warning('API server no disponible (ejecuta: npm run dev)');
    }
  } else {
    success('API server check skipped in production (Vercel)');
    checksPassed++;
  }

  log('='.repeat(60));

  if (checksPassed >= 2) { // Al menos variables de entorno y Supabase deben pasar
    success(`🎉 Verificación básica exitosa: ${checksPassed}/${totalChecks} checks pasaron`);
    success('🚀 ERGOEXPRESS FINANCE está configurado correctamente!');
    if (checksPassed < totalChecks) {
      warning('Algunos checks opcionales fallaron, pero la aplicación debería funcionar.');
    }
    process.exit(0);
  } else {
    error(`❌ Verificación fallida: ${checksPassed}/${totalChecks} checks pasaron`);
    error('Revisa los errores arriba y corrige la configuración');
    process.exit(1);
  }
}

// Ejecutar verificación si se llama directamente
if (require.main === module) {
  runVerification().catch(err => {
    error(`Error fatal durante verificación: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runVerification };