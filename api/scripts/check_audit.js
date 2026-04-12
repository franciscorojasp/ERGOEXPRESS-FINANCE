
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan keys de Supabase en el .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'finance' }
});

async function checkFinanceTable() {
  console.log('Verificando tabla usuarios en el esquema finance...');
  try {
    const { data, error, count } = await supabaseAdmin
      .from('usuarios')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('❌ Error consultando tabla:', error.message);
      if (error.message.includes('schema "audit" does not exist')) {
        console.log('💡 Sugerencia: El esquema "audit" no ha sido creado en Supabase.');
      }
    } else {
      console.log('✅ Conexión exitosa. Registros encontrados:', count);
    }
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
  }
}

checkFinanceTable();
