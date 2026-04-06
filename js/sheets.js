/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Capa de Datos (vía Google Apps Script)
   Mantiene la misma interfaz pública que antes, pero llama al Apps Script.
   ════════════════════════════════════════════════════════════════════════════ */

const Sheets = (() => {
  // ─── Caché en memoria (30 s) ──────────────────────────────────────────────
  const _cache = {};
  const TTL    = 30_000;

  function _cached(key, data) {
    _cache[key] = { data, ts: Date.now() };
    return data;
  }

  function _fromCache(key) {
    const c = _cache[key];
    return (c && Date.now() - c.ts < TTL) ? c.data : null;
  }

  function _invalidate(key) { delete _cache[key]; }

  function invalidateAll() { Object.keys(_cache).forEach(k => delete _cache[k]); }

  // ─── READ ─────────────────────────────────────────────────────────────────
  async function readSheet(sheetName, useCache = true) {
    if (useCache) {
      const cached = _fromCache(sheetName);
      if (cached) return cached;
    }
    const res = await API.call('READ', { sheet: sheetName });
    return _cached(sheetName, res.data);
  }

  async function batchRead(sheetNames) {
    try {
      const missing = sheetNames.filter(n => !_fromCache(n));
      if (missing.length) {
        const res = await API.call('BATCH_READ', { sheets: missing });
        const data = res.data || {};
        missing.forEach(n => _cached(n, data[n] || []));
      }
      return Object.fromEntries(sheetNames.map(n => [n, _fromCache(n) || []]));
    } catch (e) {
      console.error('[Sheets] Error en batchRead:', e);
      return Object.fromEntries(sheetNames.map(n => [n, []]));
    }
  }

  // ─── APPEND ───────────────────────────────────────────────────────────────
  async function appendRow(sheetName, obj) {
    await API.call('APPEND', { sheet: sheetName, data: obj });
    _invalidate(sheetName);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  async function updateRow(sheetName, id, obj) {
    try {
      // 1. Fetch fresh data to get the current true rowIndex for this ID
      const rows = await readSheet(sheetName, false);
      const target = rows.find(r => String(r['ID']).trim() === String(id).trim());
      if (!target) {
        console.error(`[Sheets] ID no encontrado: "${id}" en hoja: ${sheetName}`, rows);
        throw new Error(`Registro no encontrado para actualización: ${id}`);
      }

      console.log(`[Sheets] Actualizando ${sheetName} ID:${id} en fila:${target._rowIndex}`);
      // Incluimos el ID en el payload por seguridad para el backend
      const payload = { ...obj, ID: id };
      await API.call('UPDATE', { sheet: sheetName, rowIndex: target._rowIndex, data: payload });
      _invalidate(sheetName);
    } catch (e) {
      console.error('[Sheets] Error en updateRow:', e);
      throw e;
    }
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────
  async function deleteRow(sheetName, id) {
    // 1. Fetch fresh data to get the current true rowIndex for this ID
    const rows = await readSheet(sheetName, false);
    const target = rows.find(r => r['ID'] === id);
    if (!target) throw new Error('Registro no encontrado para eliminación: ' + id);

    await API.call('DELETE', { sheet: sheetName, rowIndex: target._rowIndex });
    _invalidate(sheetName);
  }

  // ─── FIND helpers ─────────────────────────────────────────────────────────
  async function findRow(sheetName, field, value) {
    const rows = await readSheet(sheetName);
    return rows.find(r => r[field] === String(value)) || null;
  }

  async function findRows(sheetName, field, value) {
    const rows = await readSheet(sheetName);
    return rows.filter(r => r[field] === String(value));
  }

  // ─── SETUP (primer inicio) ────────────────────────────────────────────────
  async function init() { /* no-op: no necesitamos IDs numéricos de hojas */ }

  async function checkSetup() {
    return API.call('CHECK_SETUP', {});
  }

  async function runSetup() {
    const res = await API.call('SETUP', {});
    invalidateAll();
    return res;
  }

  async function createAdmin(email, name, password) {
    const res = await API.call('CREATE_ADMIN', { email, name, password });
    _invalidate(CONFIG.SHEETS.USERS);
    return res;
  }

  // ─── CONFIG key/value helpers ─────────────────────────────────────────────
  async function getConfig(key) {
    const rows = await readSheet(CONFIG.SHEETS.CONFIG);
    const row  = rows.find(r => r['Clave'] === key);
    return row ? row['Valor'] : null;
  }

  async function setConfig(key, value) {
    const rows = await readSheet(CONFIG.SHEETS.CONFIG, false);
    const existing = rows.find(r => r['Clave'] === key);
    if (existing) {
      await API.call('UPDATE', { 
        sheet: CONFIG.SHEETS.CONFIG, 
        rowIndex: existing._rowIndex, 
        data: { 'Clave': key, 'Valor': value } 
      });
    } else {
      await appendRow(CONFIG.SHEETS.CONFIG, { 'Clave': key, 'Valor': value });
    }
    _invalidate(CONFIG.SHEETS.CONFIG);
  }

  async function getAllConfig() {
    const rows = await readSheet(CONFIG.SHEETS.CONFIG);
    const cfg  = {};
    rows.forEach(r => { cfg[r['Clave']] = r['Valor']; });
    return cfg;
  }

  // ─── User helpers ─────────────────────────────────────────────────────────
  async function findUser(email) {
    return findRow(CONFIG.SHEETS.USERS, 'Email', email);
  }

  async function createUser(email, name, role = 'vendedor', password = '') {
    const existing = await findUser(email);
    if (existing) return existing;
    const user = {
      'ID': Utils.generateId(), 'Email': email, 'Nombre': name,
      'Rol': role, 'Activo': 'SI',
      'Fecha Registro': Utils.todayISO(), 'Password': password
    };
    await appendRow(CONFIG.SHEETS.USERS, user);
    return user;
  }

  // ─── Next numbers (ATOMIC) ───────────────────────────────────────────────
  async function nextQuoteNumber() {
    const res = await API.call('GET_NEXT_NUMBER', { sheet: CONFIG.SHEETS.QUOTATIONS });
    return res.next || 1;
  }

  // ─── PDF Share (Drive) ────────────────────────────────────────────────────
  async function savePDFToDrive(filename, base64) {
    return API.call('SAVE_PDF_TO_DRIVE', { filename, base64 });
  }

  // ─── Google Calendar Sync ─────────────────────────────────────────────────
  async function syncToCalendar(data) {
    return API.call('SYNC_TO_CALENDAR', { data });
  }

  // ─── Latest exchange rate ─────────────────────────────────────────────────
  async function latestRate() {
    const rows = await readSheet(CONFIG.SHEETS.RATES, false);
    if (!rows || !rows.length) return null;
    return [...rows].sort((a, b) => b['Fecha'].localeCompare(a['Fecha']))[0];
  }

  return {
    init, checkSetup, runSetup, createAdmin,
    readSheet, batchRead, appendRow, updateRow, deleteRow,
    findRow, findRows,
    getConfig, setConfig, getAllConfig,
    findUser, createUser,
    nextQuoteNumber, latestRate,
    savePDFToDrive,
    invalidateAll
  };
})();
