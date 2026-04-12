const { pool } = require('../config/database');
const dotenv = require('dotenv');
// En Vercel/api, .env suele estar en la raiz de la carpeta api
dotenv.config({ path: './.env' });

async function migrate() {
  console.log('Iniciando migración de base de datos desde API/SCRIPTS...');
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
    if (client) await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate().catch(err => {
    console.error("Error fatal:", err);
    process.exit(1);
});
