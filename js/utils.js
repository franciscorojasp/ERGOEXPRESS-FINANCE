/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Utilidades Globales
   ════════════════════════════════════════════════════════════════════════════ */

const Utils = (() => {

  // ─── ID Generation ─────────────────────────────────────────────────────
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ─── Date Utilities ────────────────────────────────────────────────────
  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Genera una cadena YYYY-MM-DD sin desfases de zona horaria (basado en fecha local)
   */
  function toISODate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    // If it's already an ISO or has a T, don't append T00:00:00
    const finalDateStr = String(dateStr).includes('T') ? dateStr : (dateStr + 'T12:00:00');
    const d = new Date(finalDateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatDateLong(dateStr) {
    if (!dateStr || dateStr === '—') dateStr = new Date().toISOString();
    
    const finalDateStr = String(dateStr).includes('T') ? dateStr : (dateStr + 'T12:00:00');
    const d = new Date(finalDateStr);
    
    if (isNaN(d.getTime())) return String(dateStr);

    const days   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function daysFromNow(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr + 'T00:00:00') - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return daysFromNow(dateStr) < 0;
  }

  /**
   * Retorna un objeto { start, end } (YYYY-MM-DD) basado en un periodo predefinido.
   * Útil para filtrar dashboards y reportes.
   */
  function getDateRange(period) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let start, end = toISODate(now);

    switch (period) {
      case 'hoy':
        start = toISODate(now);
        break;
      case 'semanal': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = toISODate(new Date(now.getFullYear(), now.getMonth(), diff));
        break;
      }
      case 'quincenal': {
        const day = now.getDate();
        if (day <= 15) {
          start = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
          end = toISODate(new Date(now.getFullYear(), now.getMonth(), 15));
        } else {
          start = toISODate(new Date(now.getFullYear(), now.getMonth(), 16));
          // Last day of month
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end = toISODate(lastDay);
        }
        break;
      }
      case 'mensual':
        start = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case 'trimestral': {
        const q = Math.floor(now.getMonth() / 3);
        start = toISODate(new Date(now.getFullYear(), q * 3, 1));
        break;
      }
      case 'semestral': {
        const s = now.getMonth() < 6 ? 0 : 6;
        start = toISODate(new Date(now.getFullYear(), s, 1));
        break;
      }
      case 'anual':
        start = toISODate(new Date(now.getFullYear(), 0, 1));
        break;
      case 'todo':
        start = '2000-01-01';
        break;
      default: // histórico / mensual 30d fallback
        start = toISODate(new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)));
    }
    return { start, end };
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  /**
   * Converte cualquier valor (string de Excel, VES con comas, etc.) a un número JS válido.
   * Hardened version to avoid NaN in calculations.
   */
  function toNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      let s = val.trim();
      
      // Armadura contra basura (si tiene letras de fecha como "Fri", "Feb", etc.)
      if (/[A-Za-z]{2,}/.test(s)) return 0;

      // Limpiar solo lo estrictamente financiero (números, puntos, comas, signo menos)
      s = s.replace(/[^\d.,-]/g, '');
      if (!s) return 0;

      // Caso ideal: número puro JS (ej: "1518.2")
      if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      }

      // Inferir formato basado en la última posición de separadores
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');

      if (lastComma > lastDot) {
        // Formato VE: 1.518,20
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (lastDot > lastComma) {
        // Formato US: 1,518.20
        s = s.replace(/,/g, '');
      } else if (lastComma > -1) {
         // Solo coma: 22,50
         s = s.replace(',', '.');
      }

      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  function round(num, dec = 2) {
    const n = toNumber(num);
    const p = Math.pow(10, dec);
    return Math.round(n * p) / p;
  }

  function getHour(timeStr) {
    if (!timeStr) return -1;
    // Handle HH:MM:SS or HH:MM or Date strings
    const s = String(timeStr).split(':');
    if (s.length < 2 && !String(timeStr).includes('T')) return -1;
    
    if (String(timeStr).includes('T')) {
       return new Date(timeStr).getHours();
    }
    return parseInt(s[0]);
  }

  function normalizeItems(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return normalizeItems(parsed);
      } catch(e) { return []; }
    }
    if (typeof input === 'object' && input !== null) return Object.values(input);
    return [];
  }

  // ─── Currency Utilities ────────────────────────────────────────────────
  function formatUSD(amount) {
    const n = toNumber(amount);
    if (Math.abs(n) > 1e12) return '0.00'; 
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  function formatVES(amount) {
    const n = toNumber(amount);
    if (Math.abs(n) > 1e15) return '0,00';
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  function formatNumber(amount, decimals = 2) {
    const n = toNumber(amount);
    return n.toLocaleString('es-VE', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  }

  function formatPrice(amountUsd, rate = 0) {
    const currency = App.getCurrency();
    const usd = toNumber(amountUsd);
    const r = toNumber(rate);

    // Sanity check: si el resultado es irracionalmente alto (> 100M USD en Bs), 
    // algo está mal con la tasa o el monto.
    if (currency === 'VES' && r > 0) {
      const ves = usd * r;
      if (ves > 1000000000000) { // > 1 Trillón (viejo) - en Digital esto es imposible para $48
         console.warn('[Finance] Valor VES sospechoso:', { usd, r, ves });
      }
      return 'Bs. ' + formatVES(ves);
    }
    return '$ ' + formatUSD(usd);
  }

  function usdToVes(usd, rate) {
    return toNumber(usd) * toNumber(rate);
  }

  /**
   * Valida un RIF de Venezuela (J-XXXXXXXX-X)
   * @param {string} rif 
   * @returns {boolean}
   */
  function validateRIF(rif) {
    if (!rif) return false;
    const regex = /^([VJEGPC])[-]?(\d{8})[-]?(\d)$/i;
    const match = rif.toUpperCase().replace(/\s/g, '').match(regex);
    if (!match) return false;

    const letra = match[1];
    const numero = match[2];
    const digitoVerificador = parseInt(match[3]);

    const letrasMap = { V: 4, E: 8, J: 12, G: 20, C: 24, P: 28 };
    const pesos = [3, 2, 7, 6, 5, 4, 3, 2];
    
    let suma = letrasMap[letra];
    for (let i = 0; i < 8; i++) {
      suma += parseInt(numero[i]) * pesos[i];
    }

    const residuo = suma % 11;
    let resultado = 11 - residuo;
    if (resultado >= 10) resultado = 0;

    return resultado === digitoVerificador;
  }

  /**
   * Formatea un RIF para que siempre tenga el guionado correcto
   */
  function formatRIF(rif) {
    if (!rif) return '';
    const r = rif.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (r.length < 10) return r;
    return `${r[0]}-${r.substring(1, 9)}-${r[9]}`;
  }

  /**
   * Formatea un número para WhatsApp detectando el país desde la dirección
   */
  function formatWhatsApp(phoneRaw, address = '') {
    let phone = String(phoneRaw || '').replace(/\D/g, '');
    if (!phone) return '';

    const addr = String(address || '').toLowerCase();
    let code = '58'; // Default Venezuela
    
    if (addr.includes('colombia')) code = '57';
    else if (addr.includes('panama') || addr.includes('panamá')) code = '507';
    else if (addr.includes('usa') || addr.includes('unidos')) code = '1';
    else if (addr.includes('españa')) code = '34';
    else if (addr.includes('chile')) code = '56';
    else if (addr.includes('argentina')) code = '54';
    else if (addr.includes('peru') || addr.includes('perú')) code = '51';
    else if (addr.includes('ecuador')) code = '593';
    else if (addr.includes('mexico') || addr.includes('méxico')) code = '52';

    // Manejo de prefijos
    if (phone.startsWith('00')) phone = phone.substring(2);
    else if (phone.startsWith('0')) phone = code + phone.substring(1);
    else if (phone.length < 11 && !phone.startsWith(code)) phone = code + phone;
    
    return phone;
  }

  // ─── String Utilities ──────────────────────────────────────────────────
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function truncate(str, maxLen = 40) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  }

  function slugify(str) {
    return (str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ─── Array Utilities ───────────────────────────────────────────────────
  function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key] || 'Sin clasificar';
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {});
  }

  function sortBy(arr, key, dir = 'asc') {
    return [...arr].sort((a, b) => {
      const va = a[key] || '';
      const vb = b[key] || '';
      const cmp = String(va).localeCompare(String(vb), 'es', { numeric: true });
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  // ─── Toast Notifications ───────────────────────────────────────────────
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showModal({ title, content, footer = '', size = 'md', onOpen }) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-${size}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title || ''}</h3>
          <button class="modal-close" onclick="Utils.closeModal()" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    if (onOpen) onOpen(overlay);
    return overlay;
  }

  function closeModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 250);
    }
  }


  // ─── Confirmation Dialog ───────────────────────────────────────────────
  function confirm(message, onConfirm, onCancel) {
    showModal({
      title: 'Confirmar acción',
      content: `<p style="color:var(--text-secondary); font-size:15px;">${escapeHtml(message)}</p>`,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-danger" id="confirm-ok-btn">Confirmar</button>
      `
    });
    setTimeout(() => {
      const btn = document.getElementById('confirm-ok-btn');
      if (btn) {
        btn.onclick = () => {
          closeModal();
          if (onConfirm) onConfirm();
        };
      }
    }, 50);
  }

  // ─── CSV Export ────────────────────────────────────────────────────────
  function exportToCSV(data, filename = 'exportacion.csv') {
    if (!data || data.length === 0) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }

    const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
    const rows = data.map(row =>
      headers.map(h => {
        let v = row[h] || '';
        if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
          v = `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Exportado: ${filename}`, 'success');
  }

  // ─── Auto Correlative Number ───────────────────────────────────────────
  function nextCorrelative(rows, field = 'Número') {
    if (!rows || rows.length === 0) return 1;
    const max = rows.reduce((m, r) => {
      const n = parseInt(r[field]) || 0;
      return n > m ? n : m;
    }, 0);
    return max + 1;
  }

  // ─── Status Badge HTML ─────────────────────────────────────────────────
  function statusBadge(status) {
    const map = {
      // Cotizaciones
      'Borrador':      'badge-neutral',
      'Enviada':       'badge-info',
      'Aceptada':      'badge-success',
      'Facturada':     'badge-primary',
      'Parcial':       'badge-warning',
      'Pagada':        'badge-success', // Podríamos diferenciar con ícono después
      'Rechazada':     'badge-error',
      'Vencida':       'badge-dark',
      
      // Contactos
      'potencial':     'badge-warning',
      'activo':        'badge-success',
      'inactivo':      'badge-neutral',
      
      // Pipeline
      'Nuevo':             'badge-warning',
      'Contactado':        'badge-info',
      'En Negociación':    'badge-primary',
      'Ganado':            'badge-success',
      'Perdido':           'badge-error',

      // Finanzas
      'Recibido':          'badge-success',
      'Pendiente':         'badge-warning',
      'Pagado':            'badge-success',
    };
    const cls = map[status] || 'badge-neutral';
    return `<span class="badge ${cls}">${escapeHtml(status || '—')}</span>`;
  }

  // ─── Browser Notifications ─────────────────────────────────────────────
  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  function sendBrowserNotification(title, body, tag) {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: 'assets/logo.png',
      tag: tag || 'crm-ergoexpress',
      badge: 'assets/logo.png'
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  }

  // ─── Debounce ──────────────────────────────────────────────────────────
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ─── Form Helpers ──────────────────────────────────────────────────────
  function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    return data;
  }

  function setFormData(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;
    Object.entries(data).forEach(([key, val]) => {
      const el = form.elements[key];
      if (el) el.value = val || '';
    });
  }

  function validateRequired(data, fields) {
    const missing = fields.filter(f => !data[f] || String(data[f]).trim() === '');
    return missing;
  }

  // ─── Number format for items ───────────────────────────────────────────
  function parseDecimal(str) {
    return toNumber(str);
  }

  // ─── Color for pipeline stages ─────────────────────────────────────────
  function stageColor(stage) {
    const map = {
      'Nuevo':             '#f59e0b', // Amber/Orange
      'Contactado':        '#3b82f6', // Blue
      'En Negociación':    '#8b5cf6', // Purple
      'Ganado':            '#10b981', // Green
      'Perdido':           '#ef4444', // Red
      'Todos':             '#1f2937', // Dark Gray
    };
    return map[stage] || '#6b7280';
  }

  function stageIcon(stage) {
    const map = {
      'Nuevo':             '✨',
      'Contactado':        '📞',
      'En Negociación':    '🤝',
      'Ganado':            '🏆',
      'Perdido':           '❌',
    };
    return map[stage] || '•';
  }

  // ─── Public API ────────────────────────────────────────────────────────
  return {
    generateId, todayISO, toISODate, formatDate, formatDateTime, formatDateLong,
    getDateRange, daysFromNow, isOverdue, currentYear, toNumber, round, getHour, normalizeItems,
    formatUSD, formatVES, formatPrice, formatNumber, usdToVes, formatWhatsApp,
    capitalize, initials, truncate, slugify, escapeHtml,
    groupBy, sortBy,
    stageColor, stageIcon, statusBadge, nextCorrelative,
    cleanPhone: function(phone) {
      if (!phone) return '';
      return String(phone).replace(/[^\d]/g, '');
    },
    validateRequired: function(data, fields) {
      if (!data) return fields;
      return fields.filter(f => !data[f] || String(data[f]).trim() === '');
    },

    exportToCSV: function(data, filename) {
      if (!data || !data.length) { showToast('No hay datos para exportar', 'warning'); return; }
      const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
      const rows = data.map(row => headers.map(h => {
        let val = String(row[h] || '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(','));
      const csv = '\\uFEFF' + headers.join(',') + '\\n' + rows.join('\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || 'export.csv';
      link.click();
    },

    debounce, getFormData, setFormData,
    showToast, showModal, closeModal, confirm,
    validateRIF, formatRIF,

    // ─── Simple Markdown to HTML ───────────────────────────────────────────
    mdToHtml: (md) => {
      if (!md) return '';
      let html = md
        .replace(/### (.*$)/gim, '<h3 style="margin-top:10px; margin-bottom:5px; font-weight:700; color:var(--primary-light)">$1</h3>')
        .replace(/## (.*$)/gim, '<h2 style="margin-top:12px; margin-bottom:6px; font-weight:800; color:var(--primary-light)">$1</h2>')
        .replace(/# (.*$)/gim, '<h1 style="margin-top:14px; margin-bottom:8px; font-weight:800; color:var(--primary-light)">$1</h1>')
        .replace(/\\*\\*(.*)\\*\\*/gim, '<b>$1</b>')
        .replace(/\\*(.*)\\*/gim, '<i>$1</i>')
        .replace(/\\n/gim, '<br>');
      return html;
    }
  };
})();
