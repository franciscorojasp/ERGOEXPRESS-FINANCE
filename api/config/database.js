/**
 * ERGOEXPRESS FINANCE - Configuración de Base de Datos
 * Configuración de conexión y utilidades para PostgreSQL
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración de la base de datos
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones idle después de 30s
  connectionTimeoutMillis: 2000, // Timeout de conexión de 2s
};

// Crear pool de conexiones
const pool = new Pool(dbConfig);

// Event listeners para el pool
pool.on('connect', (client) => {
  console.log('🔗 Nueva conexión a PostgreSQL establecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Error en el pool de PostgreSQL:', err);
  process.exit(-1);
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL exitosa');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
};

// Función para ejecutar queries con manejo de errores
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 Query ejecutada en ${duration}ms:`, text);
    return res;
  } catch (error) {
    console.error('❌ Error en query:', error);
    throw error;
  }
};

// Función para transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en transacción:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Función para obtener una conexión del pool
const getClient = async () => {
  return await pool.connect();
};

// Función para cerrar el pool
const closePool = async () => {
  console.log('🔌 Cerrando pool de conexiones PostgreSQL...');
  await pool.end();
  console.log('✅ Pool de conexiones cerrado');
};

// Health check de la base de datos
const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  pool,
  query,
  transaction,
  getClient,
  testConnection,
  closePool,
  healthCheck
};