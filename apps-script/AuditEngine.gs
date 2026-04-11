/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — AuditEngine
 * ════════════════════════════════────────────────────────────────────────────
 */

/**
 * Registra una acción en la hoja de Logs_Auditoria.
 * @param {string} action - 'CREATE', 'UPDATE', 'DELETE'
 * @param {string} table - Nombre de la tabla/hoja
 * @param {string} recordId - ID del registro afectado
 * @param {object} details - Datos adicionales (ej: valores anteriores/nuevos)
 */
function logAction(action, table, recordId, details) {
  try {
    if (table === 'Logs_Auditoria') return; // Evitar recursión infinita
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Logs_Auditoria');
    if (!sheet) return;

    const userEmail = Session.getActiveUser().getEmail() || 'Sistema/API';
    const date = new Date();
    const id = Utilities.getUuid();
    const detailsStr = details ? JSON.stringify(details) : '';

    // Headers: ['ID','Fecha','Usuario_Email','Accion','Tabla','ID_Registro','Detalles']
    sheet.appendRow([id, date, userEmail, action, table, recordId, detailsStr]);
  } catch (e) {
    console.error('Audit Log Error:', e);
  }
}

/**
 * Obtiene los últimos N logs de auditoría.
 */
function getAuditLogs(limit = 100) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Logs_Auditoria');
  if (!sheet) return { success: false, error: 'Hoja de logs no encontrada.' };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, data: [] };

  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 7).getValues();
  
  const logs = values.map(row => ({
    id: row[0],
    fecha: row[1],
    usuario: row[2],
    accion: row[3],
    tabla: row[4],
    recordId: row[5],
    detalles: row[6]
  })).reverse(); // Mas recientes primero

  return { success: true, data: logs };
}
