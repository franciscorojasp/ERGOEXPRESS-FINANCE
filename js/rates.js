/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Tasas de Cambio
   ════════════════════════════════════════════════════════════════════════════ */

const Rates = (() => {
  let _rates = [];
  let _currContainer = null;
  let _chart = null;

  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    target.innerHTML = `
      <div class="fade-in">
        <div class="page-header" style="margin-bottom:24px;">
          <div>
            <h1 class="page-title">Tasas de Cambio</h1>
            <p class="page-subtitle">Indicadores oficiales y tendencia del mercado</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary" onclick="Rates.exportPDF()" title="Exportar Reporte">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span class="hidden-mobile">Reporte PDF</span>
            </button>
            <button class="btn btn-primary" onclick="Rates.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="hidden-mobile">Nueva Tasa</span>
              <span class="show-mobile-only">Nueva</span>
            </button>
          </div>
        </div>

        <!-- Hero Card Group -->
        <div id="rate-hero-row" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px; margin-bottom:32px;">
           <div id="latest-rate-card">
              <div class="loading-spinner"><div class="spinner"></div></div>
           </div>
           <div id="trend-chart-card" class="card card-padded" style="min-height:140px; display:flex; flex-direction:column; justify-content:center;">
              <div class="loading-spinner"><div class="spinner"></div></div>
           </div>
        </div>

        <div class="section-title" style="margin-bottom:16px; font-weight:800; color:var(--text-muted); text-transform:uppercase; font-size:11px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
           Historial de Variación (30 días)
        </div>

        <div id="rates-list-container">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await _load(force);
  }

  async function _load(force = false) {
    try {
      _rates = await Sheets.readSheet(CONFIG.SHEETS.RATES, force);
      // Sort DESC by date
      _rates.sort((a, b) => String(b['Fecha']).localeCompare(String(a['Fecha'])));

      _renderHero();
      _renderTrend();
      _renderHistory();
    } catch(e) {
      console.error('[Rates] Load error:', e);
      const container = document.getElementById('rates-list-container');
      if (container) container.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderHero() {
    const container = document.getElementById('latest-rate-card');
    if (!container) return;

    const latest = _rates[0];
    const previous = _rates[1];
    
    let variance = 0;
    if (latest && previous) {
      const v1 = Utils.toNumber(latest['Tasa Oficial']||0);
      const v2 = Utils.toNumber(previous['Tasa Oficial']||0);
      if (v2 > 0) variance = ((v1 - v2) / v2) * 100;
    }

    container.innerHTML = `
      <div class="card card-padded" style="border-left:5px solid var(--primary); height:100%; display:flex; flex-direction:column; justify-content:center;">
        <div style="font-size:12px; font-weight:800; color:var(--primary-light); text-transform:uppercase; margin-bottom:4px;">Dólar Oficial BCV</div>
        <div style="font-size:42px; font-weight:900; color:#fff; letter-spacing:-1px;">
          <span style="font-size:20px; font-weight:400; color:var(--text-muted); margin-right:4px;">Bs.</span>${Utils.formatVES(latest?.['Tasa Oficial'] || 0)}
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
           <div style="padding:4px 10px; border-radius:6px; font-size:12px; font-weight:800; display:flex; align-items:center; gap:6px; background:${variance >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color:${variance >= 0 ? '#10b981' : '#ef4444'};">
              ${variance >= 0 ? '▲' : '▼'} ${Math.abs(variance).toFixed(2)}%
           </div>
           <div style="font-size:11px; color:var(--text-muted); font-weight:500;">
              Activo al ${Utils.formatDate(latest?.['Fecha'])}
           </div>
        </div>
      </div>
    `;
  }

  function _renderTrend() {
    const container = document.getElementById('trend-chart-card');
    if (!container) return;

    const history = [..._rates].reverse().slice(-15); // Last 15 measurements
    const labels = history.map(r => Utils.formatDate(r['Fecha']));
    const values = history.map(r => Utils.toNumber(r['Tasa Oficial']));

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
         <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Tendencia (15 registros)</span>
         <span style="font-size:10px; color:var(--primary-light); font-weight:600;">Chart.js Live</span>
      </div>
      <div style="flex:1; position:relative; min-height:80px;">
         <canvas id="rate-sparkline"></canvas>
      </div>
    `;

    if (_chart) _chart.destroy();

    const ctx = document.getElementById('rate-sparkline').getContext('2d');
    const isUp = values[values.length-1] >= values[0];
    const color = isUp ? '#10b981' : '#ef4444';

    _chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          borderColor: color,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0, color + '33');
            grad.addColorStop(1, color + '00');
            return grad;
          },
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true, mode: 'index', intersect: false } },
        scales: {
          x: { display: false },
          y: { display: false, grace: '10%' }
        }
      }
    });
  }

  function _renderHistory() {
    const wrap = document.getElementById('rates-list-container');
    if (!wrap) return;

    const history = _rates.slice(0, 30);
    if (history.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">No hay registros históricos.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="card" style="padding:0; overflow:hidden;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Fuente</th>
              <th style="text-align:right;">Tasa Oficial</th>
              <th style="text-align:right;">Variación</th>
              <th style="text-align:center; width:60px;">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${history.map((r, i) => {
              let diff = 0;
              if (i < history.length - 1) {
                diff = Utils.toNumber(r['Tasa Oficial']) - Utils.toNumber(history[i+1]['Tasa Oficial']);
              }
              const trendColor = diff > 0 ? 'var(--error)' : (diff < 0 ? 'var(--success)' : 'var(--text-muted)');
              const trendIcon  = diff > 0 ? '▲' : (diff < 0 ? '▼' : '—');

              return `
                <tr>
                  <td style="font-weight:700; color:var(--text-primary);">${Utils.formatDate(r['Fecha'])}</td>
                  <td><span class="badge badge-ghost" style="font-size:10px;">${r['Fuente'] || 'BCV'}</span></td>
                  <td style="text-align:right; font-weight:800; font-family:var(--font-mono);">Bs. ${Utils.formatVES(r['Tasa Oficial'])}</td>
                  <td style="text-align:right; color:${trendColor}; font-weight:700; font-size:12px;">
                    ${trendIcon} ${Utils.formatVES(Math.abs(diff))}
                  </td>
                  <td style="text-align:center;">
                    <button class="btn btn-icon-sm danger-text" onclick="Rates.delete('${r['ID']}')" title="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:20px; font-size:11px; color:var(--text-muted); text-align:center; opacity:0.6;">
        Mostrando los últimos 30 días de fluctuación cambiaria.
      </div>
    `;
  }

  function openForm() {
    Utils.showModal({
      title: 'Registrar Paridad Cambiaria',
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
                     placeholder="Ej: 60.50" required style="font-size:22px; font-weight:800; color:var(--primary-light);" />
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
        <button class="btn btn-primary" onclick="Rates.save()">Guardar Registro</button>
      `
    });
  }

  async function save() {
    const data = Utils.getFormData('rate-form');
    if (!data['Fecha'] || !data['Tasa Oficial']) {
      Utils.showToast('Datos incompletos', 'warning'); return;
    }
    try {
      Utils.showToast('Guardando...', 'info');
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(),
        'Fecha': data['Fecha'],
        'Tasa Oficial': data['Tasa Oficial'],
        'Fuente': data['Fuente'] || 'BCV'
      });
      Utils.showToast('Tasa registrada exitosamente', 'success');
      Utils.closeModal();
      await _load(true);
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  async function exportPDF() {
    try {
      const latest = _rates[0];
      if (!latest) return Utils.showToast('No hay datos para exportar', 'warning');
      
      Utils.showToast('Generando reporte técnico...', 'info');

      const reportHTML = `
        <div style="margin-bottom:10mm;">
           <div style="background:#f8fafc; border-radius:12px; padding:20px; border-left:6px solid #0d7377;">
              <h3 style="margin:0; font-size:14px; font-weight:800; color:#0d7377; text-transform:uppercase;">Tasa Oficial BCV</h3>
              <div style="font-size:36px; font-weight:900; color:#1e293b; margin:10px 0; letter-spacing:-1px;">
                Bs. ${Utils.formatVES(latest['Tasa Oficial'])}
              </div>
              <div style="font-size:11px; color:#64748b; font-weight:600;">
                Activo para transacciones el ${Utils.formatDateLong(latest['Fecha'])} 
              </div>
           </div>
        </div>

        <h3 style="font-size:14px; font-weight:800; color:#1e293b; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Historial de Fluctuación (30 días)</h3>
        <table style="width:100%; border-collapse:collapse; font-size:10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
           <thead>
              <tr style="background:#0d7377; color:#ffffff; text-align:left;">
                 <th style="padding:12px 15px; border-radius:6px 0 0 6px;">Fecha</th>
                 <th style="padding:12px 15px;">Fuente</th>
                 <th style="padding:12px 15px; text-align:right;">Valor (Bs/$)</th>
                 <th style="padding:12px 15px; text-align:right;">Variación</th>
                 <th style="padding:12px 15px; text-align:center; border-radius:0 6px 6px 0;">Tendencia</th>
              </tr>
           </thead>
           <tbody>
              ${_rates.slice(0, 30).map((r, i) => {
                let diff = 0;
                if (i < _rates.length - 1) {
                  diff = Utils.toNumber(r['Tasa Oficial']) - Utils.toNumber(_rates[i+1]['Tasa Oficial']);
                }
                const trendIcon = diff > 0 ? '▲ Subida' : (diff < 0 ? '▼ Bajada' : '— Estable');
                const trendColor = diff > 0 ? '#ef4444' : (diff < 0 ? '#10b981' : '#64748b');

                return `
                  <tr style="border-bottom:1px solid #e2e8f0; background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
                     <td style="padding:10px 15px; font-weight:700; color:#1e293b;">${Utils.formatDate(r['Fecha'])}</td>
                     <td style="padding:10px 15px; color:#64748b;">${r['Fuente'] || 'BCV'}</td>
                     <td style="padding:10px 15px; text-align:right; font-weight:900; color:#0d7377;">Bs. ${Utils.formatVES(r['Tasa Oficial'])}</td>
                     <td style="padding:10px 15px; text-align:right; font-weight:700; color:${trendColor};">${diff > 0 ? '+' : ''}${Utils.formatVES(diff)}</td>
                     <td style="padding:10px 15px; text-align:center; color:${trendColor}; font-weight:900; font-size:9px;">${trendIcon}</td>
                  </tr>
                `;
              }).join('')}
           </tbody>
        </table>
        <div style="margin-top:15px; font-size:9px; color:#94a3b8; text-align:right; font-style:italic;">
           ErgoExpress CRM v1.2.0 - Reporte generado automáticamente
        </div>
      `;

      await ReportBuilder.generateEliteReport({
        title: 'Reporte de Indicadores de Mercado',
        filename: `Tasa-BCV-${Utils.todayISO()}.pdf`,
        contentHTML: reportHTML
      });

    } catch (e) {
      Utils.showToast('Error al exportar: ' + e.message, 'error');
    }
  }

  function deleteRate(id) {
    Utils.confirm('¿Desea remover este registro histórico?', async () => {
      try {
        Utils.showToast('Eliminando...', 'info');
        await Sheets.deleteRow(CONFIG.SHEETS.RATES, id);
        Utils.showToast('Registro eliminado', 'success');
        await _load(true);
      } catch(e) { 
        Utils.showToast('Error: '+e.message, 'error'); 
      }
    });
  }

  return { render, openForm, save, exportPDF, delete: deleteRate };
})();
