/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — Budgeting Engine
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Obtiene el ID del periodo actual (Quincenal o Mensual).
 * @param {Date} date Fecha
 * @param {string} type 'Q' o 'M'
 */
function getPeriodId(date, type) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  if (type === 'M') return `${year}-${month}`;
  
  const day = date.getDate();
  const quincena = day <= 15 ? 'Q1' : 'Q2';
  return `${year}-${month}-${quincena}`;
}

/**
 * Obtiene los datos de ejecución presupuestaria.
 */
function getBudgetDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const budgetSheet = ss.getSheetByName('Presupuestos');
  const data = budgetSheet.getDataRange().getValues();
  
  // Asumimos Headers: ['ID','Partida','Monto_Asignado_USD','Monto_Ejecutado_USD','Disponible_USD','Mes_Año']
  // El campo 'Mes_Año' puede contener IDs de quincena (Q1-04-2026) o Mes (04-2026)
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(r => {
    const asignado = Number(r[2]) || 0;
    const ejecutado = Number(r[3]) || 0;
    return {
      partida: r[1],
      asignado: asignado,
      ejecutado: ejecutado,
      disponible: asignado - ejecutado,
      porcentaje: asignado > 0 ? (ejecutado / asignado) * 100 : 0,
      periodo: r[5]
    };
  });
}

/**
 * Sincroniza un gasto con el presupuesto correspondiente.
 * Se llama automáticamente al guardar un egreso.
 */
function syncExpenseWithBudget(category, amountUSD, dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Presupuestos');
  const date = new Date(dateStr);
  const periodIdM = getPeriodId(date, 'M');
  const periodIdQ = getPeriodId(date, 'Q');

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const partida = data[i][1];
    const periodoRow = data[i][5];

    // Verificar si coincide la categoría y el periodo (Mensual o Quincenal)
    if (partida === category && (periodoRow === periodIdM || periodoRow === periodIdQ)) {
      const currentEjecutado = Number(data[i][3]) || 0;
      sheet.getRange(i + 1, 4).setValue(currentEjecutado + amountUSD);
      sheet.getRange(i + 1, 5).setValue(data[i][2] - (currentEjecutado + amountUSD));
    }
  }
}
