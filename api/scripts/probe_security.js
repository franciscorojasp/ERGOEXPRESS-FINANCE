const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function probeSecurity() {
  console.log('--- PROBANDO SEGURIDAD DE SUPABASE (Caja Negra) ---');
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ Faltan credenciales en .env');
    return;
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n1. Intento de acceso ANÓNIMO (Simulando intruso):');
  try {
    const { data, error } = await anonClient
      .from('finance.usuarios')
      .select('email, nombre')
      .limit(1);

    if (error) {
      console.log('✅ Acceso ANÓNIMO bloqueado:', error.message);
      console.log('   (Esto indica que RLS está funcionando o no hay permisos públicos)');
    } else if (data && data.length > 0) {
      console.log('⚠️ ADVERTENCIA: Acceso ANÓNIMO permitido. Se obtuvieron datos sin autenticación.');
      console.log('   Se pudo leer el correo:', data[0].email);
      console.log('   ❗ RIESGO: RLS podría estar deshabilitado.');
    } else {
      console.log('✅ Acceso ANÓNIMO no devolvió datos (posiblemente tabla vacía o bloqueada).');
    }
  } catch (err) {
    console.error('❌ Error en prueba anónima:', err.message);
  }

  console.log('\n2. Intento de acceso ADMIN (Backend):');
  try {
    const { data, error } = await adminClient
      .from('finance.usuarios')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error de conexión Admin:', error.message);
    } else {
      console.log('✅ Conexión Admin exitosa. El backend tiene acceso total.');
    }
  } catch (err) {
    console.error('❌ Error en prueba admin:', err.message);
  }
}

probeSecurity();
