const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde la carpeta api
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

async function testSupabase() {
  console.log('Testing Supabase Client...');
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL or Anon Key missing in .env');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    // Intentar leer de la tabla de usuarios en el esquema finance
    const { data, error, count } = await supabase
      .from('finance.usuarios')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase Client Error (finance.usuarios):', error.message);
      if (error.hint) console.log('💡 Hint:', error.hint);
      if (error.details) console.log('📋 Details:', error.details);
      
      // Intentar en el esquema public como fallback
      console.log('Checking public.usuarios...');
      const { data: pData, error: pError } = await supabase
        .from('usuarios')
        .select('id')
        .limit(1);
      if (pError) console.error('❌ Supabase Client Error (public.usuarios):', pError.message);
      else console.log('✅ public.usuarios exists');
    } else {
      console.log('✅ Supabase Client Connected: finance.usuarios reachable');
      console.log(`📊 Count of users: ${count}`);
    }
  } catch (err) {
    console.error('❌ Supabase Client Fatal Error:', err.message);
  }
}

async function testPostgres() {
  console.log('\nTesting PostgreSQL Direct Connection...');
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL missing in .env');
    return;
  }
  
  // Extraer host de la URL para debug
  try {
    const dbUrlObj = new URL(databaseUrl);
    console.log(`Connecting to: ${dbUrlObj.host}`);
  } catch(e) {}

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Direct Connected successfully');
    const res = await client.query('SELECT current_schema(), current_database(), version()');
    console.log('📊 Current DB/Schema:', res.rows[0]);
    
    // Check for finance schema
    const schemaCheck = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'finance'");
    if (schemaCheck.rows.length > 0) {
      console.log('✅ "finance" schema exists');
      const tableCheck = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'finance'");
      console.log('📋 Tables in "finance" schema:', tableCheck.rows.map(r => r.table_name));
    } else {
      console.log('⚠️ "finance" schema NOT found');
      const allSchemas = await client.query("SELECT schema_name FROM information_schema.schemata");
      console.log('📋 Available schemas:', allSchemas.rows.map(r => r.schema_name));
    }
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ PostgreSQL Direct Error:', err.message || err);
    if (err.stack) console.error(err.stack);
  }
}

async function run() {
  await testSupabase();
  await testPostgres();
}

run();
