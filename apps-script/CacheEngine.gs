/**
 * CacheEngine.gs - Motor de Caché y Optimización de Rendimiento
 * Implementa: Caché para lecturas frecuentes, Locks para concurrencia
 */

// ─── CONFIGURACIÓN DE CACHÉ ──────────────────────────────────────────────────

const CACHE_TTL_DEFAULT = 300; // 5 minutos en segundos
const CACHE_TTL_LONG = 1800;   // 30 minutos para datos estáticos
const CACHE_PREFIX = 'ergo_cache_';

// ─── FUNCIONES DE CACHÉ ──────────────────────────────────────────────────────

/**
 * Obtiene datos del caché si existen y no están expirados
 * @param {string} key - Clave única para el caché
 * @returns {any|null} Datos almacenados o null si no existe/expiró
 */
function getCachedData(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_PREFIX + key);
    
    if (cached) {
      const data = JSON.parse(cached);
      // Verificar si no ha expirado
      if (data.expiresAt > Date.now()) {
        return data.value;
      } else {
        // Eliminar dato expirado
        cache.remove(CACHE_PREFIX + key);
      }
    }
    return null;
  } catch (e) {
    Logger.log('Error leyendo caché: ' + e.message);
    return null;
  }
}

/**
 * Almacena datos en el caché con TTL especificado
 * @param {string} key - Clave única para el caché
 * @param {any} value - Datos a almacenar
 * @param {number} ttlSeconds - Tiempo de vida en segundos (default: 300)
 */
function setCachedData(key, value, ttlSeconds = CACHE_TTL_DEFAULT) {
  try {
    const cache = CacheService.getScriptCache();
    const data = {
      value: value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now()
    };
    
    // Apps Script CacheService tiene límite de 100KB por entrada
    const serialized = JSON.stringify(data);
    if (serialized.length < 100000) {
      cache.put(CACHE_PREFIX + key, serialized, ttlSeconds);
    } else {
      Logger.log('Dato demasiado grande para caché: ' + key);
    }
  } catch (e) {
    Logger.log('Error escribiendo caché: ' + e.message);
  }
}

/**
 * Invalida una entrada específica del caché
 * @param {string} key - Clave a invalidar
 */
function invalidateCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(CACHE_PREFIX + key);
  } catch (e) {
    Logger.log('Error invalidando caché: ' + e.message);
  }
}

/**
 * Invalida múltiples entradas que coincidan con un patrón
 * @param {string} pattern - Patrón a buscar (ej: 'read_Contactos')
 */
function invalidateCacheByPattern(pattern) {
  // Nota: CacheService no soporta listado de claves
  // Esta función es para uso futuro con PropertyService si se requiere
  Logger.log('Invalidando caché con patrón: ' + pattern);
}

/**
 * Limpia todo el caché (usar con precaución)
 */
function clearAllCache() {
  Logger.log('Limpiando todo el caché - operación costosa');
  // No hay método directo para limpiar todo, se debe conocer las claves
}

// ─── WRAPPERS PARA OPERACIONES CRUD CON CACHÉ ────────────────────────────────

/**
 * Lee datos con caché automático
 * @param {string} sheetName - Nombre de la hoja
 * @param {boolean} forceRefresh - Forzar actualización ignorando caché
 * @returns {any} Datos de la hoja
 */
function readWithCache(sheetName, forceRefresh = false) {
  const cacheKey = `read_${sheetName}`;
  
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Leer directamente de Sheets
  const ss = getSS();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) {
    setCachedData(cacheKey, [], CACHE_TTL_DEFAULT);
    return [];
  }
  
  const headers = data[0];
  const rows = data.slice(1).map((r, i) => {
    let o = { _rowIndex: i + 2 };
    headers.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  });
  
  // Guardar en caché
  setCachedData(cacheKey, rows, CACHE_TTL_DEFAULT);
  
  return rows;
}

/**
 * Invalida el caché tras una escritura
 * @param {string} sheetName - Nombre de la hoja modificada
 */
function invalidateOnWrite(sheetName) {
  invalidateCache(`read_${sheetName}`);
  invalidateCache(`batch_${sheetName}`);
  Logger.log('Caché invalidado para hoja: ' + sheetName);
}

// ─── LOCKS PARA CONCURRENCIA ─────────────────────────────────────────────────

/**
 * Ejecuta una operación crítica con lock para evitar condiciones de carrera
 * @param {Function} operation - Función a ejecutar
 * @param {string} lockName - Nombre del lock (ej: 'write_Finanzas')
 * @param {number} timeoutMs - Timeout en milisegundos (default: 10000)
 * @returns {any} Resultado de la operación
 */
function executeWithLock(operation, lockName, timeoutMs = 10000) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(timeoutMs);
    return operation();
  } catch (e) {
    if (e.message === 'Timeout exception') {
      throw new Error('Operación bloqueada: otro proceso está ejecutando. Reintente en unos segundos.');
    }
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Wrapper para operaciones de escritura con lock automático
 * @param {string} sheetName - Hoja a modificar
 * @param {Function} writeOperation - Función de escritura
 */
function safeWrite(sheetName, writeOperation) {
  return executeWithLock(() => {
    const result = writeOperation();
    invalidateOnWrite(sheetName);
    return result;
  }, `write_${sheetName}`);
}

// ─── OPTIMIZACIÓN DE LECTURAS ────────────────────────────────────────────────

/**
 * Lee un rango específico en lugar de toda la hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {number} startRow - Fila inicial (1-based)
 * @param {number} numRows - Número de filas a leer
 * @param {number} startCol - Columna inicial (1-based, default: 1)
 * @param {number} numCols - Número de columnas (default: todas)
 * @returns {Array<Array<any>>} Datos del rango
 */
function readRange(sheetName, startRow, numRows, startCol = 1, numCols = null) {
  const ss = getSS();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Hoja no existe: ' + sheetName);
  
  if (numCols === null) {
    numCols = sh.getLastColumn() - startCol + 1;
  }
  
  return sh.getRange(startRow, startCol, numRows, numCols).getValues();
}

/**
 * Lee solo las últimas N filas de una hoja (útil para logs recientes)
 * @param {string} sheetName - Nombre de la hoja
 * @param {number} lastNRows - Número de filas finales a leer
 * @returns {Array<any>} Últimas filas como objetos
 */
function readLastRows(sheetName, lastNRows) {
  const ss = getSS();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Hoja no existe: ' + sheetName);
  
  const totalRows = sh.getLastRow();
  if (totalRows <= 1) return [];
  
  const startRow = Math.max(2, totalRows - lastNRows + 1);
  const numRows = totalRows - startRow + 1;
  
  const data = sh.getRange(startRow, 1, numRows, sh.getLastColumn()).getValues();
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  
  return data.map((r, i) => {
    let o = { _rowIndex: startRow + i };
    headers.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  });
}

// ─── BATCH OPERATIONS ────────────────────────────────────────────────────────

/**
 * Escribe múltiples filas eficientemente usando batch operations
 * @param {string} sheetName - Nombre de la hoja
 * @param {Array<Array<any>>} rows - Filas a escribir
 */
function batchAppend(sheetName, rows) {
  return safeWrite(sheetName, () => {
    const ss = getSS();
    const sh = ss.getSheetByName(sheetName);
    if (!sh) throw new Error('Hoja no existe: ' + sheetName);
    
    if (rows.length === 0) return { success: true, count: 0 };
    
    const startRow = sh.getLastRow() + 1;
    sh.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    
    AuditEngine.log('BATCH_CREATE', 'System', `Añadió ${rows.length} registros a ${sheetName}`, '');
    
    return { success: true, count: rows.length };
  });
}

/**
 * Actualiza múltiples registros eficientemente
 * @param {string} sheetName - Nombre de la hoja
 * @param {Array<Object>} updates - Array de {rowIndex, data}
 */
function batchUpdate(sheetName, updates) {
  return safeWrite(sheetName, () => {
    const ss = getSS();
    const sh = ss.getSheetByName(sheetName);
    if (!sh) throw new Error('Hoja no existe: ' + sheetName);
    
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    
    updates.forEach(update => {
      Object.keys(update.data).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sh.getRange(update.rowIndex, colIdx + 1).setValue(update.data[key]);
        }
      });
    });
    
    AuditEngine.log('BATCH_UPDATE', 'System', `Actualizó ${updates.length} registros en ${sheetName}`, '');
    
    return { success: true, count: updates.length };
  });
}
