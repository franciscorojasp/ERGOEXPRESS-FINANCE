/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — InventoryEngine
 * ════════════════════════════════────────────────────────────────────────────
 */

/**
 * Descuenta stock de la hoja Productos basado en los items de una cotización.
 * @param {string} quotaId - ID de la cotización
 */
function syncStockWithQuota(quotaId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const quotaSheet = ss.getSheetByName('Cotizaciones');
    const productSheet = ss.getSheetByName('Productos');
    
    if (!quotaSheet || !productSheet) return { success: false, error: 'Hojas no encontradas.' };

    // 1. Buscar la cotización
    const qData = quotaSheet.getDataRange().getValues();
    const qCols = qData[0];
    const qRows = qData.slice(1);
    const qIdx = qRows.findIndex(r => r[qCols.indexOf('ID')] === quotaId);
    
    if (qIdx === -1) return { success: false, error: 'Cotización no encontrada.' };
    const quota = qRows[qIdx];
    
    // 1.1 Verificar si ya fue sincronizada
    const sSyncIdx = qCols.indexOf('Stock_Sincronizado');
    if (sSyncIdx !== -1 && quota[sSyncIdx] === 'SI') {
      return { success: true, message: 'El stock ya fue sincronizado previamente para esta cotización.' };
    }

    // 2. Parsear items
    const rawDetail = quota[qCols.indexOf('Detalle JSON')];
    let detail;
    try {
      detail = JSON.parse(rawDetail);
    } catch (e) {
      return { success: false, error: 'Error al parsear detalle de cotización.' };
    }
    
    const items = detail.items || [];
    if (items.length === 0) return { success: true, message: 'No hay items para procesar stock.' };

    // 3. Cargar productos para mapeo
    const pData = productSheet.getDataRange().getValues();
    const pCols = pData[0];
    const pRows = pData.slice(1);
    const sActualIdx = pCols.indexOf('Stock_Actual');
    const pNameIdx = pCols.indexOf('Nombre');
    const pCatIdx = pCols.indexOf('Categoría');

    if (sActualIdx === -1) return { success: false, error: 'La hoja Productos no tiene columna Stock_Actual.' };

    const updates = [];
    const logs = [];

    items.forEach(item => {
      // Buscar producto por Nombre (ya que el CRM actual usa nombres en cotizaciones)
      const pIdx = pRows.findIndex(r => r[pNameIdx] === item.desc);
      
      if (pIdx !== -1) {
        const productRow = pRows[pIdx];
        const categoria = productRow[pCatIdx] || '';
        
        // No descontar si es un Servicio
        if (categoria.toLowerCase().includes('servicio')) {
          logs.push(`Item "${item.desc}" es un servicio, se ignora stock.`);
          return;
        }

        const currentStock = Number(productRow[sActualIdx]) || 0;
        const newStock = currentStock - Number(item.qty);
        
        // Preparar actualización (fila en la hoja = pIdx + 2)
        updates.push({
          row: pIdx + 2,
          col: sActualIdx + 1,
          value: newStock
        });
        
        logs.push(`Item "${item.desc}": Stock ${currentStock} -> ${newStock}`);
      }
    });

    // 4. Aplicar cambios
    updates.forEach(u => {
      productSheet.getRange(u.row, u.col).setValue(u.value);
    });

    // 4.1 Marcar Cotización como sincronizada
    if (sSyncIdx !== -1) {
      quotaSheet.getRange(qIdx + 2, sSyncIdx + 1).setValue('SI');
    }

    // 5. Registrar en Log de Auditoría
    logAction('STOCK_SYINC', 'Productos', quotaId, { 
      message: 'Reducción de stock por cotización pagada',
      results: logs 
    });

    return { success: true, logs: logs };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Retorna lista de productos con stock crítico.
 */
function getAlertasInventario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Productos');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const cols = data[0];
  const actualIdx = cols.indexOf('Stock_Actual');
  const minIdx = cols.indexOf('Stock_Minimo');
  const nameIdx = cols.indexOf('Nombre');

  if (actualIdx === -1 || minIdx === -1) return [];

  return data.slice(1)
    .filter(r => Number(r[actualIdx]) <= Number(r[minIdx]) && Number(r[minIdx]) > 0)
    .map(r => ({
      nombre: r[nameIdx],
      stock: r[actualIdx],
      minimo: r[minIdx]
    }));
}
