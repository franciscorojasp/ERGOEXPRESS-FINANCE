/**
 * ERGOEXPRESS FINANCE - Script de Migración
 * Ejecuta las migraciones de base de datos para inicializar el esquema
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const { supabaseAdmin } = require('../config/supabase');

// Función para ejecutar queries SQL directas usando pg
const executeSQL = async (query) => {
  const { Client } = require('pg');

  // Usar la cadena de conexión de Supabase (necesitas configurar la contraseña)
  const connectionString = process.env.DATABASE_URL ||
    `postgresql://postgres:[YOUR-PASSWORD]@db.igjxocbgisxlbpoewysb.supabase.co:5432/postgres`;

  if (connectionString.includes('[YOUR-PASSWORD]')) {
    console.log('\n⚠️  Para usar migraciones directas, necesitas configurar DATABASE_URL con la contraseña de PostgreSQL.');
    console.log('📋 Por ahora, ejecuta el SQL manualmente en el SQL Editor de Supabase:');
    console.log('   1. Ve a https://supabase.com/dashboard/project/igjxocbgisxlbpoewysb');
    console.log('   2. Ve a SQL Editor');
    console.log('   3. Copia y pega el contenido del archivo database/schema.sql');
    console.log('   4. Ejecuta el SQL\n');
    process.exit(0);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(query);
    await client.end();
    return result;
  } catch (error) {
    console.error('Error ejecutando SQL:', error && error.message);
    console.error('Error ejecutando SQL - objeto completo:', error);
    if (error && typeof error === 'object') {
      try {
        console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (jsonErr) {
        console.error('No se pudo serializar error:', jsonErr);
      }
    }
    throw error;
  }
};

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const error = (message) => {
  console.error(`[${new Date().toISOString()}] ❌ ERROR: ${message}`);
};

const success = (message) => {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
};

async function runMigrations() {
  try {
    log('🚀 Iniciando migraciones de ERGOEXPRESS FINANCE...');

    // Verificar que las credenciales de Supabase estén configuradas
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      error('Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
      process.exit(1);
    }

    success('Credenciales de Supabase configuradas correctamente');

    // Leer el archivo de esquema
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      error(`Archivo de esquema no encontrado: ${schemaPath}`);
      process.exit(1);
    }

    log('📖 Leyendo archivo de esquema...');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    log('📋 Ejecutando esquema SQL completo...');
    await executeSQL(schemaSQL);
    success('✅ Esquema SQL ejecutado correctamente');

    // Leer y ejecutar el archivo de migración de datos
    const migrationPath = path.join(__dirname, '../../database/migration.sql');
    if (fs.existsSync(migrationPath)) {
      log('📖 Leyendo archivo de migración de datos...');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      log('📋 Ejecutando migración SQL completa...');
      try {
        await executeSQL(migrationSQL);
        success('✅ Migración de datos ejecutada correctamente');
      } catch (err) {
        if (err.code === '23505' || err.message.includes('duplicate key')) {
          log('⚠️ Algunos registros ya existían, continuando...');
        } else {
          error(`Error ejecutando migración de datos: ${err.message}`);
        }
      }
    } else {
      log('⚠️ Archivo de migración de datos no encontrado, omitiendo...');
    }

    // Verificar que las tablas se crearon correctamente
    log('🔍 Verificando creación de tablas...');
    const { data: tablesData, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'finance')
      .order('table_name');

    if (tablesError) {
      error('Error verificando tablas:', tablesError.message);
      return;
    }

    const tables = tablesData.map(row => row.table_name);
    success(`Tablas creadas: ${tables.join(', ')}`);

    // Verificar que las vistas se crearon
    const { data: viewsData, error: viewsError } = await supabaseAdmin
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'finance')
      .order('table_name');

    if (!viewsError && viewsData.length > 0) {
      const views = viewsData.map(row => row.table_name);
      success(`Vistas creadas: ${views.join(', ')}`);
    }

    // Verificar funciones
    const { data: functionsData, error: functionsError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'finance')
      .eq('routine_type', 'FUNCTION')
      .order('routine_name');

    if (!functionsError && functionsData.length > 0) {
      const functions = functionsData.map(row => row.routine_name);
      success(`Funciones creadas: ${functions.join(', ')}`);
    }

    success('🎉 Migraciones completadas exitosamente!');
    success('🚀 ERGOEXPRESS FINANCE está listo para usar.');

  } catch (err) {
    error(`Error durante la migración: ${err.message}`);
    error('Stack trace:', err.stack);
    process.exit(1);
  }
}

// Ejecutar migraciones si se llama directamente
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };