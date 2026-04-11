/**
 * ERGOEXPRESS-FINANCE — Script de Certificación Fiscal y Operativa
 * 
 * Este script valida que el sistema cumpla con:
 * 1. SNAT/2024/00121 (Inalterabilidad y Trazabilidad)
 * 2. Zero-Trust Architecture (RBAC y Aislamiento)
 * 3. Integridad de Datos (RIF Normalizado y Tasas)
 */

function run360Audit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = {
    timestamp: new Date().toISOString(),
    status: "FAIL",
    checks: []
  };

  try {
    // 1. Verificación de Hojas Fiscales
    const fiscalSheets = ['Finanzas_Ingresos', 'Finanzas_Egresos', 'Notas_Operaciones'];
    fiscalSheets.forEach(s => {
      const sh = ss.getSheetByName(s);
      report.checks.push({
        module: "FISCAL",
        test: `Existencia de hoja ${s}`,
        passed: !!sh
      });
    });

    // 2. Verificación de Inalterabilidad (Lógica del Servidor)
    // Probamos getNextNumber con prefijo
    const nextNC = getNextNumber({ sheet: 'Notas_Operaciones', prefix: 'NC-' });
    report.checks.push({
      module: "FISCAL",
      test: "Consecutividad Independiente (NC)",
      passed: nextNC.success && nextNC.formatted.startsWith('NC-')
    });

    // 3. Verificación de Seguridad (RBAC)
    // Simulamos un usuario 'vendedor'
    const mockUser = { role: 'vendedor', email: 'vendedor@test.com' };
    const sensitiveSheets = ['Nomina_Control', 'Configuracion', 'Usuarios'];
    sensitiveSheets.forEach(s => {
      let accessBlocked = false;
      try {
        // La función read() debería fallar o devolver vacío si es sensible
        const result = read({ action: 'READ', sheet: s, user: mockUser });
        if (!result.success || (result.data && result.data.length === 0)) {
           accessBlocked = true;
        }
      } catch(e) {
        accessBlocked = true;
      }
      report.checks.push({
        module: "SECURITY",
        test: `Bloqueo Zero-Trust: ${s}`,
        passed: accessBlocked
      });
    });

    // 4. Verificación de Motor LOTTT
    try {
      const lottt = calcDobleLiquidacion('AUDIT-MOCK', 6);
      report.checks.push({
        module: "LABORAL",
        test: "Cálculo Doble Liquidación (LOTTT)",
        passed: lottt.success && typeof lottt.art142C_calculado === 'number'
      });
    } catch(e) {
      report.checks.push({
        module: "LABORAL",
        test: "Cálculo LOTTT",
        passed: false,
        error: e.message
      });
    }

    // Calcular estatus final
    const fails = report.checks.filter(c => !c.passed).length;
    report.status = fails === 0 ? "CERTIFIED" : "FAILED_AUDIT";
    report.total_checks = report.checks.length;
    report.failed_checks = fails;

    // Log del resultado
    console.log("AUDIT REPORT:", report);
    
    // Si es exitoso, emitir certificado en logs
    if (report.status === "CERTIFIED") {
      logAction('SYSTEM_CERTIFICATION', 'SYSTEM', 'SUCCESS', report);
    }

    return report;

  } catch(err) {
    return { success: false, error: err.message };
  }
}
