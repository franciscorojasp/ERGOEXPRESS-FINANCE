const path = require('path');
const dotenv = require('dotenv');
// Cargar variables de entorno ANTES de importar cualquier configuración
dotenv.config({ path: path.join(__dirname, '../.env') });

const { supabaseAdmin } = require('../config/supabase');

async function verifyRPC() {
  console.log('--- VERIFICANDO RPC DASHBOARD ---');
  
  if (!supabaseAdmin) {
    console.error('❌ supabaseAdmin no inicializado. Verifica el SUPABASE_SERVICE_ROLE_KEY en .env');
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_dashboard_metrics');

    if (error) {
      if (error.message.includes('function finance.get_dashboard_metrics() does not exist')) {
        console.log('⚠️ LA FUNCIÓN RPC NO EXISTE TODAVÍA.');
        console.log('👉 Por favor, pega el contenido de "supabase_rpc_setup.sql" en el SQL Editor de Supabase.');
      } else {
        console.error('❌ Error llamando RPC:', error.message);
      }
      return;
    }

    console.log('✅ RPC funcionando correctamente.');
    console.log('📊 Datos recibidos:', data[0]);
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
  }
}

verifyRPC();
