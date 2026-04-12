const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkDataIntegrity() {
  console.log('--- VERIFICANDO INTEGRIDAD DE DATOS ---');
  
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const tables = [
    'usuarios', 'contactos', 'entidades', 'productos', 
    'transacciones_financieras', 'cotizaciones', 'configuracion'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await adminClient
        .from(`finance.${table}`)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`- ❌ ${table}: ${error.message}`);
      } else {
        console.log(`- ✅ ${table}: ${count} registros encontrados.`);
      }
    } catch (err) {
      console.error(`- ❌ ${table}: Error fatal ${err.message}`);
    }
  }
}

checkDataIntegrity();
