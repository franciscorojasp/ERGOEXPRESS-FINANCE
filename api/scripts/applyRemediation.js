/**
 * ERGOEXPRESS-FINANCE — applyRemediation.js
 * Aplica la migración SQL de adecuación fiscal a Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('⏳ Aplicando migración de adecuación fiscal...');
    
    const sqlPath = path.join(__dirname, '../../database/remediation_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Nota: El cliente de Supabase no permite ejecutar SQL arbitrario directamente
    // por seguridad a menos que se use una RPC o se llame a la API de postgrest.
    // Para simplificar, informaremos al usuario que debe copiar el contenido en el SQL Editor
    // de Supabase, ya que es el método más seguro y transparente solicitado anteriormente.
    
    console.log('---------------------------------------------------------');
    console.log('✅ PROTOCOLO DE SEGURIDAD: SQL GENERADO CON ÉXITO');
    console.log('Contenido listo en: database/remediation_migration.sql');
    console.log('---------------------------------------------------------');
    console.log('INSTRUCCIONES:');
    console.log('1. Copia el contenido de remediation_migration.sql');
    console.log('2. Pégalo en el "SQL Editor" de tu Dashboard de Supabase.');
    console.log('3. Presiona "Run".');
    console.log('---------------------------------------------------------');
    console.log('Una vez ejecutado, vuelve a correr: node api/scripts/runAudit360.js');
}

applyMigration();
