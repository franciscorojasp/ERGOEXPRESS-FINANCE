
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkAudit() {
  console.log('Verificando audit.logs_auditoria con prefijo de esquema...');
  try {
    const { count, error } = await supabaseAdmin
      .from('audit.logs_auditoria')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Éxito. Registros found:', count);
    }
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
  }
}

checkAudit();
