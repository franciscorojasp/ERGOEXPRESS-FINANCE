/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Tasas de Cambio
   ════════════════════════════════════════════════════════════════════════════ */

const Rates = (() => {
  let _rates = [];
  let _currContainer = null;

  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    target.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Tasas de Cambio</h1>
            <p class="page-subtitle">Gestión de Tasa Oficial BCV y Tendencia</p>
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

        <!-- Hero Card (Latest Rate) -->
        <div id="rate-hero-container" style="margin-bottom:32px;">
           <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <div class="section-title" style="margin-bottom:16px; font-weight:700; color:var(--text-muted); text-transform:uppercase; font-size:12px; letter-spacing:1px;">
          Historial de Movimientos (30 días)
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
      _renderCurrent();
    } catch(e) {
      console.error('[Rates] Load error:', e);
      const container = document.getElementById('rates-list-container');
      if (container) container.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderHero() {
    const container = document.getElementById('rate-hero-container');
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
      <div class="q-list-card" style="padding:24px; border-left:4px solid var(--primary);">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div>
            <div style="font-size:12px; font-weight:800; color:var(--primary); text-transform:uppercase; margin-bottom:8px;">Tasa Oficial Hoy</div>
            <div style="font-size:36px; font-weight:800; color:#fff;">
              <span style="font-size:20px; font-weight:400; color:var(--text-muted);">Bs.</span> ${Utils.formatVES(latest?.['Tasa Oficial'] || 0)}
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
               <div class="trend-indicator ${variance >= 0 ? 'trend-up' : 'trend-down'}" style="padding:4px 8px; border-radius:4px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:4px; background:${variance >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color:${variance >= 0 ? '#10b981' : '#ef4444'};">
                  ${variance >= 0 ? '▲' : '▼'} ${Math.abs(variance).toFixed(2)}%
               </div>
               <span style="font-size:11px; color:var(--text-muted);">vs anterior</span>
            </div>
          </div>
          <div class="hidden-mobile" style="text-align:right;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Última Actualización</div>
            <div style="font-size:14px; font-weight:600;">${Utils.formatDate(latest?.['Fecha'])}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${latest?.['Fuente'] || 'BCV'}</div>
          </div>
        </div>
      </div>
    `;
  }

  function _renderCurrent() {
    const wrap = document.getElementById('rates-list-container');
    if (!wrap) return;

    const history = _rates.slice(0, 30);

    if (history.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">No hay registros históricos.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; padding-bottom:100px;">
        ${history.map((r, i) => {
          let diff = 0;
          if (i < history.length - 1) {
            diff = Utils.toNumber(r['Tasa Oficial']) - Utils.toNumber(history[i+1]['Tasa Oficial']);
          }
          const trendColor = diff > 0 ? '#ef4444' : (diff < 0 ? '#10b981' : 'var(--text-muted)');
          
          return `
            <div class="q-list-card" style="padding:16px;">
              <div class="q-list-content">
                <div class="q-list-icon" style="color:var(--text-muted);">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div class="q-list-main-info">
                  <h3 class="q-list-title" style="font-size:14px;">${Utils.formatDate(r['Fecha'])}</h3>
                  <div class="q-list-sub">${r['Fuente'] || 'BCV'}</div>
                </div>
              </div>

              <div class="q-list-meta" style="flex-direction:row; align-items:center; gap:20px;">
                <div style="text-align:right;">
                  <div style="font-size:16px; font-weight:800; color:#fff;">Bs. ${Utils.formatVES(r['Tasa Oficial'])}</div>
                  <div style="font-size:11px; color:${trendColor}; font-weight:700;">
                    ${diff > 0 ? '+' : ''}${Utils.formatVES(diff)}
                  </div>
                </div>
                <div class="q-list-actions">
                  <button class="btn btn-icon-sm danger-text" onclick="Rates.delete('${r['ID']}')" title="Eliminar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
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
      await _load(true);
    } catch(e) {
      Utils.showToast('Error al guardar: ' + e.message, 'error');
    }
  }

  async function exportPDF() {
    try {
      const latest = _rates[0];
      if (!latest) return Utils.showToast('No hay datos para exportar', 'warning');
      
      Utils.showToast('Generando reporte PDF...', 'info');

      const reportHTML = `
        <div style="margin-bottom:10mm;">
           <div style="background:#f8fafc; border-radius:8px; padding:15px; border-left:5px solid #0d7377;">
              <h3 style="margin:0; font-size:14px; font-weight:800; color:#0d7377; text-transform:uppercase;">Valor del Mercado Hoy</h3>
              <div style="font-size:32px; font-weight:900; color:#1e293b; margin:8px 0;">
                Bs. ${Utils.formatVES(latest['Tasa Oficial'])}
              </div>
              <div style="font-size:11px; color:#1e293b; font-weight:500;">
                Última actualización: ${Utils.formatDate(latest['Fecha'])} 
              </div>
           </div>
        </div>

        <h3 style="font-size:13px; font-weight:800; color:#1e293b; margin-bottom:4px; text-transform:uppercase;">Historial de Fluctuación (30 días)</h3>
        <table style="width:100%; border-collapse:collapse; font-size:10px;">
           <thead>
              <tr style="background:#0d7377; color:#ffffff; text-align:left;">
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
                     <td style="padding:8px 10px; text-align:right; font-weight:800; color:#0d7377;">Bs. ${Utils.formatVES(r['Tasa Oficial'])}</td>
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

  function deleteRate(id) {
    Utils.confirm('¿Seguro de remover este registro?', async () => {
      try {
        await Sheets.deleteRow(CONFIG.SHEETS.RATES, id);
        Utils.showToast('Tasa removida', 'success');
        await _load(true);
      } catch(e) { 
        Utils.showToast('Error: '+e.message, 'error'); 
      }
    });
  }

  return { render, openForm, save, exportPDF, delete: deleteRate };
})();
