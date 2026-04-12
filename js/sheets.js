/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Capa de Datos (vía Google Apps Script)
   v6.0.0 - Soporte Total: BATCH_READ, retrocompatibilidad y Gestión de Configuración.
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

  // ─── INIT & AUTH HELPERS ──────────────────────────────────────────────────
  async function init() {
    // Función de inicialización requerida por App.js
    return true; 
  }

  async function findUser(email) {
    const rows = await readSheet(CONFIG.SHEETS.USERS);
    return rows.find(r => String(r.Email).toLowerCase() === String(email).toLowerCase()) || null;
  }

  // ─── READ ─────────────────────────────────────────────────────────────────
  async function readSheet(sheetName, useCache = true) {
    if (useCache) {
      const cached = _fromCache(sheetName);
      if (cached) return cached;
    }
    const res = await API.call('READ', { sheet: sheetName });
    return _cached(sheetName, res.data || []);
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

  // Especial para módulos antiguos que esperan { success: true, data: [...] }
  async function get(sheetName) {
    const data = await readSheet(sheetName);
    return { success: true, data: data };
  }

  // ─── APPEND ───────────────────────────────────────────────────────────────
  async function appendRow(sheetName, obj) {
    await API.call('APPEND', { sheet: sheetName, data: obj });
    _invalidate(sheetName);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  async function updateRow(sheetName, id, obj) {
    const payload = { ...obj, ID: id };
    await API.call('UPDATE', { sheet: sheetName, id: id, data: payload });
    _invalidate(sheetName);
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────
  async function deleteRow(sheetName, id) {
    await API.call('DELETE', { sheet: sheetName, id: id });
    _invalidate(sheetName);
  }

  // ─── FIND helpers ─────────────────────────────────────────────────────────
  async function findRow(sheetName, field, value) {
    const rows = await readSheet(sheetName);
    return rows.find(r => String(r[field]) === String(value)) || null;
  }

  async function findRows(sheetName, field, value) {
    const rows = await readSheet(sheetName);
    return rows.filter(r => String(r[field]) === String(value));
  }

  // ─── CONFIG ───────────────────────────────────────────────────────────────
  async function getAllConfig() {
    const rows = await readSheet(CONFIG.SHEETS.CONFIG);
    const obj = {};
    rows.forEach(r => { if(r.Clave) obj[r.Clave] = r.Valor; });
    return obj;
  }

  async function getConfig(key) {
    const rows = await readSheet(CONFIG.SHEETS.CONFIG);
    const row  = rows.find(r => r.Clave === key);
    return row ? row.Valor : null;
  }

  async function setConfig(key, value) {
    await API.call('UPDATE', { 
      sheet: CONFIG.SHEETS.CONFIG, 
      id: key, // El backend debe saber buscar por 'Clave' si pasamos el ID
      data: { 'Clave': key, 'Valor': value } 
    });
    _invalidate(CONFIG.SHEETS.CONFIG);
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────
  async function checkSetup() { return API.call('CHECK_SETUP', {}); }
  async function runSetup() {
    const res = await API.call('SETUP', {});
    invalidateAll();
    return res;
  }

  // ─── Otros ────────────────────────────────────────────────────────────────
  async function nextQuoteNumber() {
    const res = await API.call('GET_NEXT_NUMBER', { sheet: CONFIG.SHEETS.QUOTATIONS });
    return res.next || 1;
  }

  async function latestRate() {
    const rows = await readSheet(CONFIG.SHEETS.RATES, false);
    if (!rows || !rows.length) return null;
    return [...rows].sort((a, b) => String(b.Fecha).localeCompare(String(a.Fecha)))[0];
  }

  async function savePDFToDrive(filename, base64) {
    return API.call('SAVE_PDF_TO_DRIVE', { filename, base64 });
  }

  return {
    init, findUser, getAllConfig,
    get, readSheet, batchRead, appendRow, updateRow, deleteRow,
    findRow, findRows, getConfig, setConfig,
    checkSetup, runSetup,
    nextQuoteNumber, latestRate, savePDFToDrive,
    invalidateAll
  };
})();
