/**
 * ERGOEXPRESS-FINANCE — Motor de Mantenimiento y Respaldo
 * 
 * Este módulo contiene funciones críticas para la gestión del ciclo de vida de los datos,
 * accesibles únicamente por SuperAdministradores.
 */

/**
 * RESET TOTAL DEL SISTEMA (HARD RESET)
 * Limpia todas las tablas de transacciones y entidades, conservando solo la estructura.
 */
function system_hardReset(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToReset = Object.keys(HEADERS).filter(s => s !== 'Usuarios');
  let count = 0;

  sheetsToReset.forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if (sh && sh.getLastRow() > 1) {
      // Limpiar desde la fila 2 hasta el final
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
      count++;
    }
  });

  // Log de auditoría
  logAction('HARD_RESET', 'SYSTEM', 'SUCCESS', { 
    message: "Reinicio total ejecutado por superadmin",
    sheets_affected: count 
  });

  return { 
    success: true, 
    message: `Reinicio total completado. Se limpiaron ${count} hojas de datos.` 
  };
}

/**
 * GENERACIÓN DE RESPALDO (BACKUP)
 * Crea una instantánea de todas las tablas en formato JSON y la guarda en Google Drive.
 */
function system_generateBackup(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backup = {
    version: "4.0",
    timestamp: new Date().toISOString(),
    data: {}
  };

  // Recolectar datos de todas las hojas
  Object.keys(HEADERS).forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if (sh && sh.getLastRow() > 1) {
      backup.data[sheetName] = sh.getDataRange().getValues();
    } else {
      backup.data[sheetName] = [HEADERS[sheetName]];
    }
  });

  // 1. Guardar en Google Drive
  let folder;
  const folderName = "ERGOEXPRESS_BACKUPS";
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  const fileName = `Backup_Finance_${Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd_HHmm")}.json`;
  const file = folder.createFile(fileName, JSON.stringify(backup, null, 2), MimeType.PLAIN_TEXT);

  // 2. Retornar datos para descarga local
  return {
    success: true,
    message: "Respaldo generado correctamente",
    drive_url: file.getUrl(),
    file_name: fileName,
    raw_data: backup // El frontend usará esto para el prompt de descarga local
  };
}
