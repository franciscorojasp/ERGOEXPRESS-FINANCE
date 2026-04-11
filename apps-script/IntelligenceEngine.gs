/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — Business Intelligence Data Aggregator
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Obtiene el paquete completo de datos para el Dashboard de BI.
 */
function getBIStatsPackage(options = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const balanceUSD = getGlobalBalanceUSD(); // Función que ya debe existir en ReportingEngine o similar
  const budgetData = getBudgetDashboard();
  
  // Obtener Egresos Recientes para Punto de Equilibrio
  const egresosSheet = ss.getSheetByName('Finanzas_Egresos');
  const egresosRaw = egresosSheet.getRange(2, 1, egresosSheet.getLastRow() - 1, egresosSheet.getLastColumn()).getValues();
  
  // Categorización (Fijo/Variable) - Podría venir de Config
  const categoryConfig = options.categoryConfig || {
    'Operativos': 'variable',
    'Administrativos': 'fijo',
    'Marketing': 'variable',
    'Honorarios': 'variable',
    'Impuestos': 'fijo',
    'Servicios': 'fijo',
    'Nómina': 'fijo'
  };

  const { fijos, variables } = categorizeExpenses(egresosRaw, categoryConfig);
  
  // Obtener Ingresos para PE
  const ingresosSheet = ss.getSheetByName('Finanzas_Ingresos');
  const ingresosValues = ingresosSheet.getRange(2, 11, ingresosSheet.getLastRow() - 1, 1).getValues();
  const totalIngresos = ingresosValues.reduce((acc, row) => acc + (Number(row[0]) || 0), 0);

  const breakEvenPoint = calculateBreakEven({
    ingresos: totalIngresos,
    fijos: fijos,
    variables: variables
  });

  // Generar Proyecciones (1000% inflación por defecto)
  const inflationRate = options.inflationRate || 10.0;
  const projections = generateProjectionSeries(totalIngresos / 12, inflationRate); // Usamos promedio mensual estimado

  return {
    success: true,
    budgets: budgetData,
    breakEven: {
      pe_usd: breakEvenPoint,
      fijos: fijos,
      variables: variables,
      ingresos: totalIngresos,
      percentage: totalIngresos > 0 ? (breakEvenPoint / totalIngresos) * 100 : 0
    },
    projections: projections,
    historical: {
      ingresos: totalIngresos,
      egresos: fijos + variables
    }
  };
}

/**
 * Endpoint para el Auditor AI con datos de Inteligencia.
 */
function runAIAudit(userQuery, history = []) {
  const context = getAIContextSummary();
  const fullPrompt = `CONTEXTO DEL SISTEMA:\n${context}\n\nCONSULTA DEL USUARIO:\n${userQuery}`;
  return callGroqAI(fullPrompt, history);
}

/**
 * Obtiene balance consolidado (USD)
 */
function getGlobalBalanceUSD() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const i = ss.getSheetByName('Finanzas_Ingresos').getRange("K2:K").getValues();
  const e = ss.getSheetByName('Finanzas_Egresos').getRange("L2:L").getValues();
  
  const sumI = i.reduce((acc, r) => acc + (Number(r[0]) || 0), 0);
  const sumE = e.reduce((acc, r) => acc + (Number(r[0]) || 0), 0);
  
  return sumI - sumE;
}
