/**
 * ERGOEXPRESS-FINANCE — runAudit360.js
 * Script de Simulación de Estrés y Auditoría Fiscal
 * 
 * PROPÓSITO: Demostrar vulnerabilidades de inalterabilidad y validación.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'finance' }
});

async function runAudit360() {
    console.log('🚀 INICIANDO SIMULACIÓN DE AUDITORÍA 360...');
    console.log('-------------------------------------------');

    // 1. INTENTO DE BORRADO DE FACTURA (PRUEBA DE INALTERABILIDAD)
    console.log('🔍 CASO 1: Intento de borrado de registro fiscal...');
    const { data: testRecord, error: fetchError } = await supabase
        .from('transacciones_financieras')
        .select('id')
        .limit(1)
        .single();

    if (testRecord) {
        // En un sistema certificado, esto DEBERÍA fallar (error 403 / Violation)
        const { error: deleteError } = await supabase
            .from('transacciones_financieras')
            .delete()
            .eq('id', testRecord.id);

        if (!deleteError) {
            console.log('⚠️ ALERTA: El borrado FUE EXITOSO. El sistema NO es inalterable (NC Crítica).');
        } else {
            console.log('✅ ÉXITO: El borrado fue rechazado por el servidor.');
        }
    } else {
        console.log('ℹ️ No hay registros para probar el borrado.');
    }

    // 2. INSERCIÓN DE RIF MAL FORMATEADO (PRUEBA DE SANITIZACIÓN)
    console.log('\n🔍 CASO 2: Inserción de entidad con RIF inválido (ej: "RIF-MALO-123")...');
    const { error: insertError } = await supabase
        .from('entidades')
        .insert([{
            razon_social: 'Empresa Test Auditoría',
            rif: 'RIF-MALO-123',
            tipo: 'cliente'
        }]);

    if (!insertError) {
        console.log('⚠️ ALERTA: Se permitió la inserción de un RIF no válido. Falta Sanitizador (NC Menor).');
    } else {
        console.log('✅ ÉXITO: La transacción fue rechazada: ' + insertError.message);
    }

    // 3. SIMULACIÓN DE CÁLCULO IGTF (USD/VES)
    console.log('\n🔍 CASO 3: Simulación de cálculo IGTF 3% en transacción mixta...');
    const montoUSD = 100;
    const tasaBCV = 36.50;
    const igtfEsperadoUSD = montoUSD * 0.03;
    const igtfEsperadoVES = igtfEsperadoUSD * tasaBCV;

    console.log(`- Monto: $${montoUSD} USD`);
    console.log(`- IGTF Ley (3%): $${igtfEsperadoUSD} USD / Bs. ${igtfEsperadoVES} (Tasa: ${tasaBCV})`);
    
    // Verificación de redundancia en BD
    const { data: configIGTF } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'sistema.tasa_impuesto_igtf')
        .single();

    if (!configIGTF) {
        console.log('⚠️ ALERTA: No se encontró la tasa IGTF configurada en la base de datos.');
    } else {
        console.log(`✅ Tasa configurada en BD: ${configIGTF.valor}%`);
    }

    console.log('\n-------------------------------------------');
    console.log('🏁 SIMULACIÓN FINALIZADA. Revisa el Informe de Certificación.');
}

runAudit360();
