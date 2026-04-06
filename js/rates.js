/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Tasas de Cambio — DASHBOARD V2.0
   ════════════════════════════════════════════════════════════════════════════ */

const Rates = (() => {
  let _rates = [];
  let _chart = null;
  let _filterMonth = 'all'; // format YYYY-MM

  async function render(container) {
    container.innerHTML = `
      <div class="fade-in rate-dashboard">
        <!-- Header -->
        <div class="page-header" style="margin-bottom:0;">
          <div>
            <h1 class="page-title" style="font-size:32px;">Tasa BCV</h1>
            <p class="page-subtitle">Consola de Gestión y Tendencia Cambiaria</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="Rates.exportPDF()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right:8px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar Reporte
            </button>
          </div>
        </div>

        <!-- Hero Row: Current Rate + Adjustment -->
        <div class="rate-hero-row" id="hero-main-card">
           <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <!-- Stats Row -->
        <div id="stats-row" class="stats-grid-4"></div>

        <!-- History Section -->
        <div class="history-section">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 style="font-size:18px; font-weight:700;">Historial de Movimientos</h3>
              <div class="btn-group">
                 <button class="btn btn-xs btn-ghost active">30 Días</button>
                 <button class="btn btn-xs btn-ghost">90 Días</button>
              </div>
           </div>
           <div class="card" id="rates-table-container" style="padding:0; overflow:hidden;">
              <div class="loading-spinner"><div class="spinner"></div></div>
           </div>
        </div>
      </div>
    `;

    await _load();
  }

  async function _load() {
    try {
      _rates = await Sheets.readSheet(CONFIG.SHEETS.RATES, false);
      const sorted = [..._rates].sort((a,b) => b['Fecha'].localeCompare(a['Fecha']));
      
      const metrics = _calculateMetrics(sorted);
      
      _renderHeroCard(sorted);
      _renderStatsRow(metrics);
      _renderTable(sorted);
      
    } catch(e) {
      console.error('[Rates] Load error:', e);
    }
  }

  function _calculateMetrics(data) {
    const now = new Date();
    const thisMonth = now.toISOString().substring(0, 7);
    const monthData = data.filter(r => r['Fecha'].startsWith(thisMonth));
    
    const values = monthData.map(r => Utils.toNumber(r['Tasa Oficial']));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    
    // Stability logic: standard deviation or count?
    // Let's use count and a mock stability for now as per screenshot
    return {
      min,
      max,
      days: monthData.length,
      stability: monthData.length > 5 ? 'Alta' : 'Media'
    };
  }

  function _updateFilterOptions(data) {
    const selector = document.getElementById('rates-month-filter');
    if (!selector) return;
    
    // Extract unique months from dates
    const months = [...new Set(data.map(r => r['Fecha'].substring(0, 7)))].sort().reverse();
    
    selector.innerHTML = '<option value="all">Todo el Historial</option>' + 
      months.map(m => {
        const [y, mm] = m.split('-');
        const name = new Date(y, parseInt(mm)-1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
        return `<option value="${m}" ${_filterMonth === m ? 'selected' : ''}>${name}</option>`;
      }).join('');
  }

  function _renderHeroCard(data) {
    const container = document.getElementById('hero-main-card');
    if (!container) return;

    const latest = data[0];
    const previous = data[1];
    
    let variance = 0;
    if (latest && previous) {
      const v1 = Utils.toNumber(latest['Tasa Oficial']||0);
      const v2 = Utils.toNumber(previous['Tasa Oficial']||0);
      if (v2 > 0) variance = ((v1 - v2) / v2) * 100;
    }

    container.innerHTML = `
      <div class="rate-card-main">
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px;">
             <span style="font-size:14px; color:var(--primary-light);">🔥</span>
             <span style="font-size:10px; font-weight:900; color:var(--primary-light); text-transform:uppercase; letter-spacing:1.5px;">Tasa Oficial Hoy</span>
          </div>
          <div class="rate-value-large">
             <span style="font-size:20px; font-weight:400; color:var(--text-muted); margin-right:4px;">Bs</span>${Utils.formatVES(latest['Tasa Oficial'])}
          </div>
          <div style="display:flex; align-items:center; gap:12px; margin-top:20px;">
             <div class="trend-indicator ${variance >= 0 ? 'trend-up' : 'trend-down'}">
                ${variance >= 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>'}
                ${Math.abs(variance).toFixed(2)}%
             </div>
             <span style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">vs. cierre ayer</span>
          </div>
        </div>
        <div class="rate-sparkline-container">
           <canvas id="rates-sparkline"></canvas>
        </div>
      </div>
    `;

    // Render Sparkline (Wrapped in try-catch to prevent blocking table)
    try {
      _renderSparkline(data.slice(0, 10).reverse());
    } catch (err) {
      console.warn('[Rates] Sparkline error:', err);
    }
  }

  function _renderSparkline(chartData) {
    const ctx = document.getElementById('rates-sparkline');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map(r => r['Fecha']),
        datasets: [{
          data: chartData.map(r => Utils.toNumber(r['Tasa Oficial'])),
          borderColor: '#2dd4bf',
          borderWidth: 3,
          fill: true,
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2dd4bf',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { 
          x: { display: false }, 
          y: { 
            display: false,
            // Add a bit of padding to the min/max or it looks clipped
            suggestedMin: Math.min(...chartData.map(r => Utils.toNumber(r['Tasa Oficial']))) * 0.999,
            suggestedMax: Math.max(...chartData.map(r => Utils.toNumber(r['Tasa Oficial']))) * 1.001
          } 
        }
      }
    });
  }

  function _renderStatsRow(metrics) {
    const container = document.getElementById('stats-row');
    if (!container) return;

    const stats = [
      { label: 'Mínimo Mensual', value: `Bs ${Utils.formatVES(metrics.min)}`, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' },
      { label: 'Máximo Mensual', value: `Bs ${Utils.formatVES(metrics.max)}`, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="12" y1="20" x2="12" y2="10"/><polyline points="18 16 12 10 6 16"/><line x1="12" y1="4" x2="12" y2="4"/></svg>' },
      { label: 'Días Registrados', value: metrics.days, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
      { label: 'Estabilidad', value: metrics.stability, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' }
    ];

    container.innerHTML = stats.map(s => `
      <div class="stat-tile">
         <div class="stat-icon-box">${s.icon}</div>
         <div>
            <div style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">${s.label}</div>
            <div style="font-size:16px; font-weight:800; color:#fff;">${s.value}</div>
         </div>
      </div>
    `).join('');
  }

  function _renderChart(data) {
    // Deprecated for now in favor of sparkline, but keeping the name if needed
  }

  function _renderTable(data) {
    const container = document.getElementById('rates-table-container');
    if (!container) return;

    // 1. Filtrar solo filas con datos reales y ordenar DESC
    const valid = data.filter(r => r['Fecha'] && r['Tasa Oficial']);
    const sorted = [...valid].sort((a, b) => String(b['Fecha']).localeCompare(String(a['Fecha'])));

    // 2. Tomar los últimos 30 días para no saturar
    const history = sorted.slice(0, 30);

    if (history.length === 0) {
      container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">No hay historial registrado.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(255,255,255,0.03); text-align:left;">
            <th style="padding:14px 20px; font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800;">Fecha</th>
            <th style="padding:14px 20px; font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800;">Tasa Oficial</th>
            <th style="padding:14px 20px; font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:800;">Fuente</th>
          </tr>
        </thead>
        <tbody>
          ${history.map((r, i) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:14px 20px; font-weight:600;">
                 <div style="display:flex; align-items:center; gap:8px;">
                    ${r['Fecha']}
                    ${i === 0 ? '<span class="at-badge">Actual</span>' : ''}
                 </div>
              </td>
              <td style="padding:14px 20px; font-weight:800; color:#fff; font-size:15px;">
                 Bs ${Utils.formatVES(r['Tasa Oficial'])}
              </td>
              <td style="padding:14px 20px; color:var(--text-muted); font-size:13px;">
                 ${Utils.escapeHtml(r['Fuente'] || 'BCV')}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function filter(month) {
    _filterMonth = month;
    _renderTable(_rates);
  }

  function openForm() {
    Utils.showModal({
      title: 'Registrar Tasa oficial BCV',
      size: 'sm',
      content: `
        <form id="rate-form">
          <div class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-group">
              <label class="form-label">Fecha Efectiva <span class="required">*</span></label>
              <input class="form-input" type="date" name="Fecha" value="${Utils.todayISO()}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Tasa Oficial (Bs./$) <span class="required">*</span></label>
              <input class="form-input" type="number" name="Tasa Oficial" min="0" step="0.01" 
                     placeholder="Ej: 60.50" required />
            </div>
            <div class="form-group">
              <label class="form-label">Fuente / Observación</label>
              <input class="form-input" name="Fuente" value="BCV" />
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Rates.save()">Guardar</button>
      `
    });
  }

  async function saveQuick() {
    const input = document.getElementById('quick-rate-input');
    const value = Utils.toNumber(input.value);
    
    if (!value || value <= 0) {
      Utils.showToast('Ingrese un valor válido de tasa', 'warning');
      return;
    }

    try {
      Utils.showToast('Guardando tasa...', 'info');
      const newRate = {
        'ID': Utils.generateId(),
        'Fecha': Utils.todayISO(),
        'Tasa Oficial': value,
        'Fuente': 'Manual'
      };
      
      await Sheets.appendRow(CONFIG.SHEETS.RATES, newRate);
      Utils.showToast('Tasa actualizada exitosamente', 'success');
      input.value = '';
      await _load();
      
    } catch(e) {
      Utils.showToast('Error al guardar: ' + e.message, 'error');
    }
  }

  async function exportPDF() {
    try {
      const latest = _rates[0];
      if (!latest) return Utils.showToast('No hay datos para exportar', 'warning');

      const config = await Sheets.getAllConfig();
      const colorPrimary = '#0d7377';
      const colorText = '#1e293b';

      const stats = _calculateMetrics(_rates);

      // Creamos el HTML interno para el reporte
      const reportHTML = `
        <div style="margin-bottom:10mm;">
           <div style="background:#f8fafc; border-radius:8px; padding:15px; border-left:5px solid ${colorPrimary};">
              <h3 style="margin:0; font-size:14px; font-weight:800; color:${colorPrimary}; text-transform:uppercase;">Valor del Mercado Hoy</h3>
              <div style="font-size:32px; font-weight:900; color:${colorText}; margin:8px 0;">
                Bs. ${Utils.formatVES(latest['Tasa Oficial'])}
              </div>
              <div style="font-size:11px; color:${colorText}; font-weight:500;">
                Última actualización: ${Utils.formatDate(latest['Fecha'])} 
              </div>
           </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:10mm;">
           <div style="border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center;">
              <div style="font-size:9px; color:#64748b; font-weight:700; text-transform:uppercase;">Mínimo Mensual</div>
              <div style="font-size:14px; font-weight:800; color:${colorText}; margin-top:4px;">Bs. ${Utils.formatVES(stats.min)}</div>
           </div>
           <div style="border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center;">
              <div style="font-size:9px; color:#64748b; font-weight:700; text-transform:uppercase;">Máximo Mensual</div>
              <div style="font-size:14px; font-weight:800; color:${colorText}; margin-top:4px;">Bs. ${Utils.formatVES(stats.max)}</div>
           </div>
           <div style="border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center;">
              <div style="font-size:9px; color:#64748b; font-weight:700; text-transform:uppercase;">Días Registrados</div>
              <div style="font-size:14px; font-weight:800; color:${colorText}; margin-top:4px;">${stats.days}</div>
           </div>
        </div>

        <h3 style="font-size:13px; font-weight:800; color:${colorText}; margin-bottom:4px; text-transform:uppercase;">Historial de Fluctuación (30 días)</h3>
        <table style="width:100%; border-collapse:collapse; font-size:10px;">
           <thead>
              <tr style="background:${colorPrimary}; color:#ffffff; text-align:left;">
                 <th style="padding:8px 10px; border-radius:4px 0 0 4px;">Fecha</th>
                 <th style="padding:8px 10px; text-align:right;">Tasa Oficial</th>
                 <th style="padding:8px 10px; text-align:right;">Variación Bs.</th>
                 <th style="padding:8px 10px; text-align:center; border-radius:0 4px 4px 0;">Tendencia</th>
              </tr>
           </thead>
           <tbody>
              ${_rates.slice(0, 30).map((r, i) => {
                let diff = 0;
                if (i < _rates.length - 1) {
                  diff = Utils.toNumber(r['Tasa Oficial']) - Utils.toNumber(_rates[i+1]['Tasa Oficial']);
                }
                const trendIcon = diff > 0 ? '▲' : (diff < 0 ? '▼' : '—');
                const trendColor = diff > 0 ? '#ef4444' : (diff < 0 ? '#10b981' : '#94a3b8');

                return `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                     <td style="padding:8px 10px; font-weight:600;">${Utils.formatDate(r['Fecha'])}</td>
                     <td style="padding:8px 10px; text-align:right; font-weight:800; color:${colorPrimary};">Bs. ${Utils.formatVES(r['Tasa Oficial'])}</td>
                     <td style="padding:8px 10px; text-align:right; font-weight:700; color:${trendColor};">${diff > 0 ? '+' : ''}${Utils.formatVES(diff)}</td>
                     <td style="padding:8px 10px; text-align:center; color:${trendColor}; font-weight:900;">${trendIcon}</td>
                  </tr>
                `;
              }).join('')}
           </tbody>
        </table>
      `;

      await ReportBuilder.generateEliteReport({
        title: 'Reporte de Indicadores de Mercado',
        filename: `Tasa-BCV-${Utils.todayISO()}.pdf`,
        contentHTML: reportHTML
      });

    } catch (e) {
      Utils.showToast('Error al exportar reporte: ' + e.message, 'error');
    }
  }

  async function save() {
    const data = Utils.getFormData('rate-form');
    if (!data['Fecha'] || !data['Tasa Oficial']) {
      Utils.showToast('Datos incompletos', 'warning'); return;
    }
    try {
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(),
        'Fecha': data['Fecha'],
        'Tasa Oficial': data['Tasa Oficial'],
        'Fuente': data['Fuente'] || 'BCV'
      });
      Utils.showToast('Tasa registrada', 'success');
      Utils.closeModal();
      await _load();
    } catch(e) {
      Utils.showToast('Error al guardar: ' + e.message, 'error');
    }
  }

  function deleteRate(id, rowIndex) {
    Utils.confirm('¿Seguro de remover este registro?', async () => {
      try {
        await Sheets.deleteRow(CONFIG.SHEETS.RATES, id);
        Utils.showToast('Tasa removida', 'success');
        await _load();
      } catch(e) { 
        Utils.showToast('Error: '+e.message, 'error'); 
      }
    });
  }

  return {
    render, openForm, save, saveQuick, exportPDF,
    delete: deleteRate,
    filter: (m) => { _filterMonth = m; _renderTable(_rates); }
  };
})();
