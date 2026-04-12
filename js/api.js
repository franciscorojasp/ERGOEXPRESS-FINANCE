/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — API (comunicación con Google Apps Script)
   Todas las llamadas al backend pasan por este módulo.
   ════════════════════════════════════════════════════════════════════════════ */

const API = (() => {

  async function call(action, params = {}) {
    const url = CONFIG.APPS_SCRIPT_URL;

    if (!url || url.includes('PEGA_AQUÍ')) {
      throw new Error('Configura APPS_SCRIPT_URL en config.js antes de continuar.');
    }

    const body = JSON.stringify({
      apiKey: CONFIG.API_KEY,
      token:  localStorage.getItem('crm_token') || '',
      action,
      ...params
    });

    // ▸ Content-Type: text/plain evita el preflight CORS en Apps Script
    try {
      const res = await fetch(url, {
        method:   'POST',
        headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        redirect: 'follow'
      });

      if (!res.ok) {
        console.error(`[API ERROR] HTTP ${res.status}: ${res.statusText}`, { url, action });
        throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[API ERROR] Failed to parse JSON response:', text);
        throw new Error('La respuesta del servidor no es un JSON válido.');
      }

      // Si el token expiró, limpiar sesión y redirigir
      if (!data.success && (data.error === 'UNAUTHORIZED' || data.error === 'TOKEN_EXPIRED')) {
        console.warn('[API] Session expired or unauthorized');
        localStorage.clear();
        if (!window.location.href.includes('index.html')) {
          window.location.href = 'index.html';
        }
        throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      }

      if (!data.success && data.rate === undefined) {
        console.error('[API ERROR] Backend reported failure:', data.error, { action });
        throw new Error(data.error || 'Error desconocido del servidor');
      }

      // Normalizar para que devuelva success:true si entró por data.rate
      if (data.rate !== undefined && data.success === undefined) {
        data.success = true;
      }

      return data;
    } catch (err) {
      console.error('[API FATAL]', err);
      throw err;
    }
  }

  async function callVercel(endpoint, params = {}, method = 'GET') {
    const baseUrl = CONFIG.API_VERCEL_URL;
    const token = localStorage.getItem('crm_token'); // Supabase JWT

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    if (method === 'GET' && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    } else if (method !== 'GET') {
      options.body = JSON.stringify(params);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Error API Vercel: ${res.status}`);
    }

    return data;
  }

  return { call, callVercel };
})();
