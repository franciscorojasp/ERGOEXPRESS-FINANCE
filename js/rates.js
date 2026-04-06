/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Tasas de Cambio (Elite 3.0)
   ════════════════════════════════════════════════════════════════════════════ */

const Rates = (() => {
  let _rates = [];
  let _currContainer = null;
  let _chart = null;
  let _filterDays = 30;

  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    target.innerHTML = `
      <div class="fade-in rates-premium-view">
        <div class="page-header" style="margin-bottom:24px;">
          <div>
            <h1 class="page-title">Panel de Divisas</h1>
            <p class="page-subtitle">Indicadores oficiales y control de paridad</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary" onclick="Rates.exportPDF()" title="Exportar Reporte">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span class="hidden-mobile">PDF</span>
            </button>
            <button class="btn btn-primary" onclick="Rates.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="hidden-mobile">Nuevo</span>
            </button>
          </div>
        </div>

        <div class="rates-hero-grid">
          <div class="rate-hero-card card">
             <div class="rate-hero-content">
                <div class="rate-hero-label">
                   <span class="icon-pulse">🔥</span> TASA OFICIAL HOY
                </div>
                <div class="rate-hero-main" id="hero-main-value">
                   <span class="currency-symbol">Bs</span> <span class="value-loading">...</span>
                </div>
             </div>
             <div class="rate-hero-chart-container">
                <canvas id="hero-sparkline-canvas"></canvas>
             </div>
             <div class="rate-hero-badge-wrap" id="hero-badge-wrap"></div>
          </div>

          <div class="rate-adjust-card card">
             <div class="adjust-header">
                <h3><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Ajuste de Tasa</h3>
                <div class="adjust-info-trigger" title="Consulte el valor oficial en bcv.org.ve e ingréselo para recalcular el sistema.">
                   <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
             </div>
             <p class="adjust-subtitle">Consultar valor oficial en <a href="http://bcv.org.ve" target="_blank">bcv.org.ve</a> e ingréselo para recalcular el sistema...</p>
             <div class="adjust-input-group">
                <input type="number" id="quick-rate-input" placeholder="Ex: 47,85" step="0.01" />
                <button class="btn-adjust-check" onclick="Rates.quickSave()" title="Aplicar Cambio">
                   <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
             </div>
          </div>
        </div>

        <div class="rates-summary-row" id="rates-summary-row">
           <div class="summary-item card">
              <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg></div>
              <div class="summary-data">
                 <div class="summary-label">MÍNIMO MENSUAL</div>
                 <div class="summary-value" id="stat-min">...</div>
              </div>
           </div>
           <div class="summary-item card">
              <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg></div>
              <div class="summary-data">
                 <div class="summary-label">MÁXIMO MENSUAL</div>
                 <div class="summary-value" id="stat-max">...</div>
              </div>
           </div>
           <div class="summary-item card">
              <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              <div class="summary-data">
                 <div class="summary-label">DÍAS REGISTRADOS</div>
                 <div class="summary-value" id="stat-days">...</div>
              </div>
           </div>
           <div class="summary-item card">
              <div class="summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <div class="summary-data">
                 <div class="summary-label">ESTABILIDAD</div>
                 <div class="summary-value" id="stat-stability">...</div>
              </div>
           </div>
        </div>

        <div class="history-header">
           <h2>Historial de Movimientos</h2>
           <div class="history-filters">
              <button class="filter-chip ${_filterDays === 7 ? 'active' : ''}" onclick="Rates.setFilter(7)">7 Días</button>
              <button class="filter-chip ${_filterDays === 30 ? 'active' : ''}" onclick="Rates.setFilter(30)">30 Días</button>
              <button class="filter-chip ${_filterDays === 90 ? 'active' : ''}" onclick="Rates.setFilter(90)">90 Días</button>
           </div>
        </div>
        <div id="rates-table-container">
           <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>

      <style>
        .rates-premium-view { padding-bottom: 50px; }
        .rates-hero-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .rate-hero-card { 
          position: relative; background: linear-gradient(135deg, #0a1118 0%, #050a0f 100%); 
          min-height: 220px; overflow: hidden; display: flex; flex-direction: column; justify-content: center;
          padding: 30px; border: 1px solid rgba(255,255,255,0.05);
        }
        .rate-hero-content { position: relative; z-index: 2; }
        .rate-hero-label { font-size: 11px; font-weight: 800; color: var(--primary-light); letter-spacing: 1.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .rate-hero-main { font-size: 56px; font-weight: 900; color: #fff; letter-spacing: -2px; }
        .rate-hero-main .currency-symbol { font-size: 24px; font-weight: 400; color: rgba(255,255,255,0.4); margin-right: 8px; }
        .rate-hero-chart-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 100px; z-index: 1; opacity: 0.6; pointer-events:none; }
        .rate-hero-badge-wrap { position: absolute; top: 30px; right: 30px; z-index: 2; text-align: right; }
        .rate-adjust-card { background: #0a1118; padding: 24px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; }
        .adjust-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .adjust-header h3 { font-size: 14px; color: #fff; display: flex; align-items: center; gap: 8px; margin: 0; }
        .adjust-info-trigger { color: var(--text-muted); cursor: help; opacity: 0.6; }
        .adjust-subtitle { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; }
        .adjust-subtitle a { color: var(--primary-light); text-decoration: none; }
        .adjust-input-group { display: flex; gap: 10px; margin-top: auto; }
        .adjust-input-group input { 
          flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 8px; padding: 12px 16px; color: #fff; font-weight: 700; font-size: 16px;
        }
        .btn-adjust-check { 
          background: #3b82f6; color: #fff; border: none; border-radius: 8px; width: 48px; 
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .rates-summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .summary-item { display: flex; align-items: center; gap: 15px; padding: 20px; background: #0a1118; border: 1px solid rgba(255,255,255,0.05); }
        .summary-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
        .summary-label { font-size: 10px; font-weight: 800; color: var(--text-muted); letter-spacing: 0.5px; }
        .summary-value { font-size: 18px; font-weight: 800; color: #fff; }
        .history-filters { display: flex; gap: 8px; }
        .filter-chip { 
          background: rgba(255,255,255,0.05); border: none; padding: 6px 14px; border-radius: 20px; 
          color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .filter-chip.active { background: #0ea5e9; color: #fff; }
        @media (max-width: 900px) {
          .rates-hero-grid { grid-template-columns: 1fr; }
          .rates-summary-row { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 500px) { .rates-summary-row { grid-template-columns: 1fr; } }
      </style>
    `;

    await _load(force);
  }

  async function _load(force = false) {
    try {
      _rates = await Sheets.readSheet(CONFIG.SHEETS.RATES, force);
      _rates.sort((a, b) => String(b['Fecha']).localeCompare(String(a['Fecha'])));
      _renderUI();
    } catch(e) {
      console.error('[Rates] Load error:', e);
      const container = document.getElementById('rates-table-container');
      if (container) container.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderUI() {
    _renderHero();
    _renderSummary();
    _renderTable();
  }

  function _renderHero() {
    const latest = _rates[0];
    const prev   = _rates[1];
    if (!latest) return;
    const valEl = document.getElementById('hero-main-value');
    if (valEl) valEl.innerHTML = `<span class="currency-symbol">Bs</span> ${Utils.formatVES(latest['Tasa Oficial'])}`;
    const badgeWrap = document.getElementById('hero-badge-wrap');
    if (badgeWrap && latest && prev) {
      const vL = Utils.toNumber(latest['Tasa Oficial']);
      const vP = Utils.toNumber(prev['Tasa Oficial']);
      const diffP = ((vL - vP) / vP) * 100;
      const isUp = diffP >= 0;
      badgeWrap.innerHTML = `
        <div style="color:${isUp?'#ef4444':'#10b981'}; font-weight:800; font-size:16px;">${isUp?'▲':'▼'} ${Math.abs(diffP).toFixed(2)}%</div>
        <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-top:2px;">vs. cierre ayer</div>
      `;
    }
    _renderSparkline();
  }

  function _renderSparkline() {
    const canvas = document.getElementById('hero-sparkline-canvas');
    if (!canvas) return;
    const history = [..._rates].reverse().slice(-10);
    const values = history.map(r => Utils.toNumber(r['Tasa Oficial']));
    const labels = history.map(r => r['Fecha']);
    if (_chart) _chart.destroy();
    const isUp = values[values.length-1] >= values[0];
    const color = isUp ? '#0ea5e9' : '#10b981';
    _chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values, borderColor: color, borderWidth: 2, fill: true,
          backgroundColor: (c) => {
            const chart = c.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0, color + '44');
            grad.addColorStop(1, color + '00');
            return grad;
          },
          pointRadius: 0, tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, grace: '20%' } }
      }
    });
  }

  function _renderSummary() {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const mRates = _rates.filter(r => {
      const d = new Date(r['Fecha']);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const vals = mRates.map(r => Utils.toNumber(r['Tasa Oficial']));
    const minVal = vals.length ? Math.min(...vals) : 0;
    const maxVal = vals.length ? Math.max(...vals) : 0;
    let stab = 'Alta';
    if (vals.length > 2) {
      const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
      const std = Math.sqrt(vals.reduce((a,b)=>a+Math.pow(b-mean,2), 0) / vals.length);
      if (std/mean > 0.02) stab = 'Media';
      if (std/mean > 0.05) stab = 'Baja';
    }
    document.getElementById('stat-min').textContent = `Bs ${Utils.formatVES(minVal)}`;
    document.getElementById('stat-max').textContent = `Bs ${Utils.formatVES(maxVal)}`;
    document.getElementById('stat-days').textContent = mRates.length;
    document.getElementById('stat-stability').textContent = stab;
  }

  function _renderTable() {
    const wrap = document.getElementById('rates-table-container');
    if (!wrap) return;
    const filtered = _rates.slice(0, _filterDays);
    const today = Utils.todayISO();
    wrap.innerHTML = `
      <div class="card" style="padding:0; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
        <table class="data-table">
          <thead>
            <tr>
              <th>FECHA DE PUBLICACIÓN</th>
              <th>VALOR BS/$1</th>
              <th>ORIGEN</th>
              <th style="text-align:right;">DINÁMICA</th>
              <th style="text-align:center; width:50px;"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((r, i) => {
              const isActual = r['Fecha'] === today;
              let dynHTML = '—';
              if (i < _rates.length - 1) {
                const nxt = Utils.toNumber(_rates[i+1]['Tasa Oficial']);
                const cur = Utils.toNumber(r['Tasa Oficial']);
                const p = ((cur - nxt) / nxt) * 100;
                if (Math.abs(p) > 0) {
                  const c = p > 0 ? '#ef4444' : '#10b981';
                  dynHTML = `<span style="color:${c}; font-weight:800;">${p>0?'▲':'▼'} ${Math.abs(p).toFixed(2)}%</span>`;
                }
              }
              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="font-weight:700; color:#fff;">${r['Fecha']}</span>
                      ${isActual ? `<span class="badge" style="background:#0ea5e9; color:#fff; font-size:9px;">ACTUAL</span>` : ''}
                    </div>
                  </td>
                  <td style="font-weight:800; color:#fff;">Bs ${Utils.formatVES(r['Tasa Oficial'])}</td>
                  <td><span style="color:var(--text-muted); font-size:12px;">${r['Fuente'] || 'Manual'}</span></td>
                  <td style="text-align:right;">${dynHTML}</td>
                  <td style="text-align:center;">
                    <button class="btn btn-icon-sm danger-text" onclick="Rates.delete('${r['ID']}')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="5" class="text-center">No hay registros</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function quickSave() {
    const inp = document.getElementById('quick-rate-input');
    const val = Utils.toNumber(inp.value);
    if (!val || val <= 0) return Utils.showToast('Ingrese un valor válido', 'warning');
    try {
      Utils.showToast('Actualizando...', 'info');
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(), 'Fecha': Utils.todayISO(),
        'Tasa Oficial': val, 'Fuente': 'Manual'
      });
      localStorage.removeItem('cached_rates');
      Utils.showToast('Sistema actualizado', 'success');
      inp.value = '';
      await _load(true);
    } catch(e) { Utils.showToast('Error: ' + e.message, 'error'); }
  }

  function setFilter(days) { _filterDays = days; _renderTable(); }

  function openForm() {
    Utils.showModal({
      title: 'Registrar Tasa', size: 'sm',
      content: `
        <form id="rate-form">
          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input class="form-input" type="date" name="Fecha" value="${Utils.todayISO()}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Valor (Bs/$)</label>
            <input class="form-input" type="number" name="Tasa Oficial" step="0.01" required />
          </div>
          <div class="form-group">
            <label class="form-label">Fuente</label>
            <input class="form-input" name="Fuente" value="BCV" />
          </div>
        </form>
      `,
      footer: `<button class="btn btn-primary" onclick="Rates.save()">Guardar</button>`
    });
  }

  async function save() {
    const data = Utils.getFormData('rate-form');
    if (!data['Fecha'] || !data['Tasa Oficial']) return Utils.showToast('Incompleto', 'warning');
    try {
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(), 'Fecha': data['Fecha'],
        'Tasa Oficial': data['Tasa Oficial'], 'Fuente': data['Fuente'] || 'Manual'
      });
      Utils.closeModal();
      await _load(true);
    } catch(e) { Utils.showToast(e.message, 'error'); }
  }

  async function exportPDF() {
    const latest = _rates[0];
    if (!latest) return;
    const html = `<div style="background:#f8fafc; padding:20px; border-left:6px solid #0ea5e9;">
                   <h2 style="margin:0; color:#0ea5e9;">Tasa Oficial: Bs ${Utils.formatVES(latest['Tasa Oficial'])}</h2>
                   <p>Fecha: ${latest['Fecha']}</p>
                 </div>`;
    await ReportBuilder.generateEliteReport({ title: 'Reporte de Tasas', filename: 'Tasas.pdf', contentHTML: html });
  }

  function deleteRate(id) {
    Utils.confirm('¿Eliminar registro?', async () => {
      try {
        await Sheets.deleteRow(CONFIG.SHEETS.RATES, id);
        await _load(true);
      } catch(e) { Utils.showToast(e.message, 'error'); }
    });
  }

  return { render, reload: _load, quickSave, setFilter, openForm, save, exportPDF, delete: deleteRate };
})();
