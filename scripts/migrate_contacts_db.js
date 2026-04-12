const { pool } = require('../api/config/database');
const dotenv = require('dotenv');
dotenv.config({ path: './api/.env' });

async function migrate() {
  console.log('Iniciando migración de base de datos...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Agregando columna etapa_pipeline...');
    await client.query('ALTER TABLE finance.entidades ADD COLUMN IF NOT EXISTS etapa_pipeline VARCHAR(50) DEFAULT \'Nuevo\';');
    
    console.log('Agregando columna vendedor_email...');
    await client.query('ALTER TABLE finance.entidades ADD COLUMN IF NOT EXISTS vendedor_email VARCHAR(255);');
    
    console.log('Actualizando comentarios...');
    await client.query("COMMENT ON COLUMN finance.entidades.etapa_pipeline IS 'Etapa del embudo de ventas (Nuevo, Ganado, etc)';");
    await client.query("COMMENT ON COLUMN finance.entidades.vendedor_email IS 'Email del vendedor asignado para filtrado de seguridad';");

    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
