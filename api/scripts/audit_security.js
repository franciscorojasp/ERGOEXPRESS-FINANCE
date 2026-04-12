const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

async function auditRLS() {
  console.log('--- AUDITORÍA DE SEGURIDAD (Supabase RLS) ---');
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no encontrada en .env');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // 1. Verificar si RLS está habilitado por tabla
    console.log('\n1. Estado de Row Level Security (RLS) por tabla:');
    const rlsStatus = await client.query(`
      SELECT 
        schemaname, 
        tablename, 
        relrowsecurity as rls_enabled
      FROM pg_tables t
      JOIN pg_class c ON t.tablename = c.relname
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
      WHERE schemaname = 'finance'
      ORDER BY tablename;
    `);

    let anyDisabled = false;
    rlsStatus.rows.forEach(row => {
      const status = row.rls_enabled ? '✅ Habilitado' : '⚠️ DESHABILITADO';
      if (!row.rls_enabled) anyDisabled = true;
      console.log(`- ${row.tablename}: ${status}`);
    });

    if (anyDisabled) {
      console.log('\n❗ ADVERTENCIA: Hay tablas con RLS deshabilitado. Esto significa que cualquier persona con la Anon Key podría acceder a los datos si no hay reglas adicionales en el API.');
    }

    // 2. Listar Políticas actuales
    console.log('\n2. Políticas de Seguridad (Policies) definidas:');
    const policies = await client.query(`
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        roles, 
        cmd, 
        qual as filter_condition
      FROM pg_policies
      WHERE schemaname = 'finance'
      ORDER BY tablename, policyname;
    `);

    if (policies.rows.length === 0) {
      console.log('⚠️ No se encontraron políticas definidas en el esquema "finance".');
    } else {
      policies.rows.forEach(policy => {
        console.log(`- Tabla: ${policy.tablename} | Política: ${policy.policyname}`);
        console.log(`  Comando: ${policy.cmd} | Roles: ${policy.roles.join(', ')}`);
        console.log(`  Condición: ${policy.filter_condition}`);
      });
    }

    // 3. Verificar esquema 'audit'
    console.log('\n3. Verificando esquema de auditoría:');
    const auditStatus = await client.query(`
      SELECT tablename, relrowsecurity 
      FROM pg_tables t
      JOIN pg_class c ON t.tablename = c.relname
      WHERE schemaname = 'audit';
    `);
    auditStatus.rows.forEach(row => {
      console.log(`- audit.${row.tablename}: ${row.relrowsecurity ? '✅ RLS Habilitado' : '⚠️ RLS DESHABILITADO'}`);
    });

    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Error durante la auditoría:', err.message);
  }
}

auditRLS();
