/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Tasas de Cambio (Elite 3.0)
   ════════════════════════════════════════════════════════════════════════════ */

const Rates = (() => {
  let _rates = [];
  let _currContainer = null;
  let _chart = null;
  let _filterDays = 7;

  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    target.innerHTML = `
      <div class="fade-in rates-premium-view">
        <div class="page-header" style="margin-bottom:32px; align-items: flex-start;">
          <div>
            <h1 class="page-title" style="font-size: 32px; letter-spacing: -1px; margin-bottom: 4px;">Tasa BCV</h1>
            <p class="page-subtitle" style="font-weight: 600; opacity: 0.8;">Consola de Gestión y Tendencia Cambiaria</p>
          </div>
          <div class="page-header-actions" style="margin-top: 8px;">
            <button class="btn btn-secondary" onclick="Rates.exportPDF()" title="Exportar Reporte" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 8px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>

        <div class="rates-hero-grid" style="margin-bottom: 32px;">
          <div class="rate-hero-card card" style="border-radius: 16px; min-height: 240px;">
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

          <div class="rate-adjust-card card" style="border-radius: 16px; background: rgba(10, 17, 24, 0.6); backdrop-filter: blur(10px);">
             <div class="adjust-header">
                <h3 style="font-weight: 800; letter-spacing: 0.5px;">
                   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ff8c42" stroke-width="3" style="margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 
                   Ajuste de Tasa
                </h3>
             </div>
             <p class="adjust-subtitle">Consulte el valor oficial en <a href="http://bcv.org.ve" target="_blank" style="color: #0ea5e9; font-weight: 700;">bcv.org.ve</a> e ingréselo para recalcular el sistema...</p>
             <div class="adjust-input-group">
                <input type="number" id="quick-rate-input" placeholder="Ex: 47,85" step="0.01" />
                <button class="btn-adjust-check" onclick="Rates.quickSave()" title="Aplicar Cambio" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                   <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
             </div>
          </div>
        </div>

        <div class="rates-summary-row" id="rates-summary-row" style="margin-bottom: 40px;">
           <div class="summary-item card" style="border-radius: 12px; padding: 16px 20px;">
              <div class="summary-icon" style="background: rgba(239, 68, 68, 0.05); color: #ef4444;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 18l-9.5-9.5-5 5L1 6"/><polyline points="17 18 23 18 23 12"/></svg>
              </div>
              <div class="summary-data">
                 <div class="summary-label">MÍNIMO MENSUAL</div>
                 <div class="summary-value" id="stat-min" style="font-size: 16px;">...</div>
              </div>
           </div>
           <div class="summary-item card" style="border-radius: 12px; padding: 16px 20px;">
              <div class="summary-icon" style="background: rgba(59, 130, 246, 0.05); color: #3b82f6;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <div class="summary-data">
                 <div class="summary-label">MÁXIMO MENSUAL</div>
                 <div class="summary-value" id="stat-max" style="font-size: 16px;">...</div>
              </div>
           </div>
           <div class="summary-item card" style="border-radius: 12px; padding: 16px 20px;">
              <div class="summary-icon" style="background: rgba(16, 185, 129, 0.05); color: #10b981;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="summary-data">
                 <div class="summary-label">DÍAS REGISTRADOS</div>
                 <div class="summary-value" id="stat-days" style="font-size: 16px;">...</div>
              </div>
           </div>
           <div class="summary-item card" style="border-radius: 12px; padding: 16px 20px;">
              <div class="summary-icon" style="background: rgba(245, 158, 11, 0.05); color: #f59e0b;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              </div>
              <div class="summary-data">
                 <div class="summary-label">ESTABILIDAD</div>
                 <div class="summary-value" id="stat-stability" style="font-size: 16px;">...</div>
              </div>
           </div>
        </div>

        <div class="history-header" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
           <h2 style="font-size: 18px; font-weight: 800; letter-spacing: -0.5px;">Historial de Movimientos</h2>
           <div class="history-filters" style="background: rgba(255,255,255,0.03); padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
              <button class="filter-chip ${_filterDays === 7 ? 'active' : ''}" onclick="Rates.setFilter(7)" style="border-radius: 8px;">7 Días</button>
              <button class="filter-chip ${_filterDays === 30 ? 'active' : ''}" onclick="Rates.setFilter(30)" style="border-radius: 8px;">30 Días</button>
              <button class="filter-chip ${_filterDays === 90 ? 'active' : ''}" onclick="Rates.setFilter(90)" style="border-radius: 8px;">90 Días</button>
           </div>
        </div>
        <div id="rates-table-container" style="min-height: 300px; border: 1px solid rgba(255,255,255,0.03); border-radius: 16px;">
           <div class="loading-spinner" style="margin: 80px auto;"><div class="spinner"></div></div>
        </div>
      </div>

      <style>
        .rates-premium-view { padding-bottom: 50px; }
        .rates-hero-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        .rate-hero-card { 
          position: relative; background: linear-gradient(135deg, #0a1118 0%, #050a0f 100%); 
          min-height: 220px; overflow: hidden; display: flex; flex-direction: column; justify-content: center;
          padding: 40px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .rate-hero-content { position: relative; z-index: 2; }
        .rate-hero-label { font-size: 10px; font-weight: 900; color: #ff8c42; letter-spacing: 2px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; }
        .rate-hero-main { font-size: 64px; font-weight: 900; color: #fff; letter-spacing: -3px; line-height: 1; }
        .rate-hero-main .currency-symbol { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.3); margin-right: 4px; vertical-align: top; margin-top: 10px; display: inline-block; }
        .rate-hero-chart-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 120px; z-index: 1; opacity: 0.8; pointer-events:none; }
        .rate-hero-badge-wrap { position: absolute; top: 40px; right: 40px; z-index: 2; text-align: right; }
        
        .rate-adjust-card { padding: 32px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; }
        .adjust-header { margin-bottom: 16px; }
        .adjust-header h3 { font-size: 15px; color: #fff; display: flex; align-items: center; gap: 8px; margin: 0; }
        .adjust-subtitle { font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; }
        .adjust-input-group { display: flex; gap: 12px; margin-top: auto; }
        .adjust-input-group input { 
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 10px; padding: 14px 18px; color: #fff; font-weight: 800; font-size: 18px; outline: none;
          transition: all 0.2s;
        }
        .adjust-input-group input:focus { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
        .btn-adjust-check { 
          transition: transform 0.2s, background 0.2s; 
        }
        .btn-adjust-check:hover { transform: scale(1.05); background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important; }
        .btn-adjust-check:active { transform: scale(0.95); }
        
        .rates-summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .summary-item { display: flex; align-items: center; gap: 16px; background: #0a1118; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s; }
        .summary-item:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }
        .summary-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .summary-label { font-size: 9px; font-weight: 800; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 2px; }
        .summary-value { color: #fff; font-weight: 900; }
        
        .filter-chip { 
          background: transparent; border: none; padding: 6px 16px; color: var(--text-muted); 
          font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s;
        }
        .filter-chip.active { background: #0ea5e9; color: #fff; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); }

        /* Table Styling */
        .rates-premium-table-wrap { 
           background: #070c12; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); 
           overflow: hidden; margin-top: 10px; min-height: 400px; display: block;
        }
        .rates-premium-table { width: 100%; border-collapse: collapse; }
        .rates-premium-table th { 
          text-align: left; padding: 16px 24px; font-size: 10px; font-weight: 800; color: var(--text-muted); 
          letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.03);
          background: rgba(255,255,255,0.01);
        }
        .rates-premium-table td { padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; vertical-align: middle; }
        .rates-premium-table tr:last-child td { border-bottom: none; }
        .rates-premium-table tr:hover td { background: rgba(255,255,255,0.01); }
        
        .badge-actual { background: #0ea5e9; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; }

        @media (max-width: 1024px) {
          .rates-hero-grid { grid-template-columns: 1fr; }
          .rates-summary-row { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .rates-summary-row { grid-template-columns: 1fr; }
          .rate-hero-main { font-size: 48px; }
          .rate-hero-card { padding: 24px; }
        }
      </style>
    `;

    await _load(force);
  }

  async function _load(force = false) {
    try {
      _rates = await Sheets.readSheet(CONFIG.SHEETS.RATES, force);
      if (!Array.isArray(_rates)) _rates = [];

      _rates.reverse();

      _rates.sort((a, b) => {
        const parseDate = (d) => {
          if (!d) return 0;
          if (d instanceof Date) return d.getTime();
          const s = String(d).trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();
          const partsSl = s.split('/');
          if (partsSl.length === 3) return new Date(partsSl[2], partsSl[1]-1, partsSl[0]).getTime();
          const t = new Date(s).getTime();
          return isNaN(t) ? 0 : t;
        };
        return parseDate(b['Fecha']) - parseDate(a['Fecha']);
      });

      _renderUI();
    } catch(e) {
      console.error('[Rates] Load error:', e);
      const container = document.getElementById('rates-table-container');
      if (container) container.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center;"><p style="color:var(--error)">Error crítico: ${e.message}</p></div>`;
    }
  }

  function _renderUI() {
    _renderHero();
    _renderSummary();
    
    setTimeout(() => {
      _renderTable();
      _renderSparkline();
    }, 100);
  }

  function _renderHero() {
    const latest = _rates[0];
    const prev   = _rates[1];
    if (!latest) return;
    
    const valEl = document.getElementById('hero-main-value');
    if (valEl) {
       valEl.innerHTML = `<span class="currency-symbol">Bs</span>${Utils.formatVES(latest['Tasa Oficial'])}`;
    }
    
    const badgeWrap = document.getElementById('hero-badge-wrap');
    if (badgeWrap && prev) {
      const vL = Utils.toNumber(latest['Tasa Oficial']);
      const vP = Utils.toNumber(prev['Tasa Oficial']);
      const diffP = ((vL - vP) / vP) * 100;
      const isUp = diffP > 0;
      const Arrow = isUp ? '▲' : (diffP < 0 ? '▼' : '');
      const color = isUp ? '#ef4444' : (diffP < 0 ? '#10b981' : 'var(--text-muted)');
      
      badgeWrap.innerHTML = `
        <div style="color:${color}; font-weight:900; font-size:18px; letter-spacing:-0.5px;">${Arrow} ${Math.abs(diffP).toFixed(2)}%</div>
        <div style="font-size:9px; color:var(--text-muted); font-weight:800; text-transform:uppercase; margin-top:2px; letter-spacing:0.5px;">vs. cierre ayer</div>
      `;
    }
  }

  function _renderSparkline() {
    const canvas = document.getElementById('hero-sparkline-canvas');
    if (!canvas) return;
    const history = [..._rates].reverse().slice(-15);
    const values = history.map(r => Utils.toNumber(r['Tasa Oficial']));
    const labels = history.map(r => r['Fecha']);
    if (_chart) _chart.destroy();
    
    const isUp = values.length > 1 ? values[values.length-1] >= values[0] : true;
    const color = isUp ? '#0ea5e9' : '#10b981';

    _chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values, borderColor: color, borderWidth: 3, fill: true,
          backgroundColor: (c) => {
            const chart = c.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0, color + '55');
            grad.addColorStop(1, color + '00');
            return grad;
          },
          pointRadius: 0, tension: 0.35, borderCapStyle: 'round'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { 
          x: { display: false }, 
          y: { 
            display: false, 
            grace: '15%',
            min: Math.min(...values) * 0.999,
            max: Math.max(...values) * 1.001
          } 
        }
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
      const cv = std/mean;
      if (cv > 0.01) stab = 'Media';
      if (cv > 0.03) stab = 'Baja';
    }
    document.getElementById('stat-min').textContent = `Bs ${Utils.formatVES(minVal)}`;
    document.getElementById('stat-max').textContent = `Bs ${Utils.formatVES(maxVal)}`;
    document.getElementById('stat-days').textContent = mRates.length;
    document.getElementById('stat-stability').textContent = stab;
  }

  function _renderTable() {
    const wrap = document.getElementById('rates-table-container');
    if (!wrap) return;
    
    wrap.innerHTML = '';

    try {
      if (!_rates || _rates.length === 0) {
        const empty = document.createElement('div');
        empty.style = 'padding:60px; text-align:center; color:rgba(255,255,255,0.3); background:#0a1118; border:1px solid rgba(255,255,255,0.05); border-radius:16px;';
        empty.textContent = 'No se encontraron registros de tasas.';
        wrap.appendChild(empty);
        return;
      }

      const filtered = _rates.slice(0, _filterDays);
      const today = Utils.todayISO();

      const listContainer = document.createElement('div');
      listContainer.style = 'display:flex !important; flex-direction:column !important; background:#070c12 !important; border:1px solid rgba(255,255,255,0.05) !important; border-radius:16px; overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);';
      
      const header = document.createElement('div');
      header.style = 'display:flex; padding:16px 24px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05); color:#64748b; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px;';
      header.innerHTML = `
        <div style="flex:2;">Fecha de Publicación</div>
        <div style="flex:1.5;">Valor Tasa Oficial</div>
        <div style="flex:1;">Fuente</div>
        <div style="flex:1; text-align:right;">Dinámica</div>
      `;
      listContainer.appendChild(header);

      filtered.forEach((r, i) => {
        try {
          const isActual = (r['Fecha'] === today) || (i === 0);
          const row = document.createElement('div');
          row.style = 'display:flex; align-items:center; padding:18px 24px; border-bottom:1px solid rgba(255,255,255,0.02); transition:all 0.2s;';
          
          row.onmouseover = () => {
            row.style.background = 'rgba(255,255,255,0.01)';
            row.style.paddingLeft = '28px';
          };
          row.onmouseout = () => {
            row.style.background = 'transparent';
            row.style.paddingLeft = '24px';
          };

          const colDate = document.createElement('div');
          colDate.style = 'flex:2; display:flex; align-items:center; gap:10px;';
          colDate.innerHTML = `
            <span style="color:#ffffff !important; font-weight:700; font-size:14px; letter-spacing:-0.2px;">${r['Fecha'] || '—'}</span>
            ${isActual ? '<span style="background:#0ea5e9; color:#fff; font-size:8px; font-weight:900; padding:2px 6px; border-radius:4px; letter-spacing:0.5px;">ACTUAL</span>' : ''}
          `;
          row.appendChild(colDate);

          const colValue = document.createElement('div');
          colValue.style = 'flex:1.5; display:flex; align-items:center; gap:8px;';
          const vesVal = Utils.formatVES(r['Tasa Oficial']) || '0,00';
          colValue.innerHTML = `
            <span style="color:#334155; font-weight:700; font-size:12px;">Bs</span>
            <span style="color:#ffffff !important; font-weight:900; font-size:18px; letter-spacing:-0.5px;">${vesVal}</span>
          `;
          row.appendChild(colValue);

          const colSource = document.createElement('div');
          colSource.style = 'flex:1; color:rgba(255,255,255,0.3); font-size:12px; font-weight:600;';
          colSource.textContent = r['Fuente'] || 'BCV';
          row.appendChild(colSource);

          const colDyn = document.createElement('div');
          colDyn.style = 'flex:1; text-align:right; font-weight:900; font-size:13px; letter-spacing:0.2px;';
          
          if (i < _rates.length - 1) {
            const nextVal = Utils.toNumber(_rates[i+1]['Tasa Oficial']);
            const currVal = Utils.toNumber(r['Tasa Oficial']);
            if (nextVal > 0) {
              const p = ((currVal - nextVal) / nextVal) * 100;
              if (Math.abs(p) > 0.001) {
                const color = p > 0 ? '#f43f5e' : '#10b981';
                const icon = p > 0 ? '▲' : '▼';
                colDyn.style.color = color;
                colDyn.textContent = `${icon} ${Math.abs(p).toFixed(2)}%`;
              } else {
                colDyn.style.color = 'rgba(255,255,255,0.05)';
                colDyn.textContent = '—';
              }
            }
          } else {
            colDyn.style.color = 'rgba(255,255,255,0.05)';
            colDyn.textContent = '—';
          }
          row.appendChild(colDyn);

          listContainer.appendChild(row);
        } catch(e) { console.error(e); }
      });

      wrap.appendChild(listContainer);
    } catch(err) {
      console.error('Render error:', err);
    }
  }

  async function quickSave() {
    const inp = document.getElementById('quick-rate-input');
    if (!inp) return;
    const valStr = inp.value.replace(',', '.');
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) return Utils.showToast('Ingrese un valor numérico válido', 'warning');
    
    try {
      Utils.showToast('Actualizando sistema...', 'info');
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(), 
        'Fecha': Utils.todayISO(),
        'Tasa Oficial': val, 
        'Fuente': 'Manual'
      });
      
      localStorage.removeItem('cached_rates');
      Utils.showToast('Tasa actualizada correctamente', 'success');
      inp.value = '';
      await _load(true);
    } catch(e) { 
      console.error('[Rates] quickSave error:', e);
      Utils.showToast('Error al actualizar: ' + e.message, 'error'); 
    }
  }

  function setFilter(days) { 
    _filterDays = days; 
    _renderTable(); 
    
    document.querySelectorAll('.history-filters .filter-chip').forEach(btn => {
      const btnText = btn.textContent.toLowerCase();
      if (btnText.includes(days.toString())) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function openForm() {
    Utils.showModal({
      title: 'Registrar Tasa Histórica', size: 'sm',
      content: `
        <form id="rate-form">
          <div class="form-group">
            <label class="form-label">Fecha del Registro</label>
            <input class="form-input" type="date" name="Fecha" value="${Utils.todayISO()}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Valor Oficial (Bs/$)</label>
            <input class="form-input" type="number" name="Tasa Oficial" step="0.01" required placeholder="0,00" />
          </div>
          <div class="form-group">
            <label class="form-label">Origen / Fuente</label>
            <input class="form-input" name="Fuente" value="BCV" />
          </div>
        </form>
      `,
      footer: `<button class="btn btn-primary" onclick="Rates.save()">Guardar Registro</button>`
    });
  }

  async function save() {
    const data = Utils.getFormData('rate-form');
    if (!data['Fecha'] || !data['Tasa Oficial']) return Utils.showToast('Por favor complete los campos requeridos', 'warning');
    try {
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(), 'Fecha': data['Fecha'],
        'Tasa Oficial': parseFloat(data['Tasa Oficial']), 'Fuente': data['Fuente'] || 'Manual'
      });
      Utils.closeModal();
      Utils.showToast('Registro guardado', 'success');
      await _load(true);
    } catch(e) { Utils.showToast(e.message, 'error'); }
  }

  async function exportPDF() {
    const latest = _rates[0];
    if (!latest) return Utils.showToast('No hay datos para exportar', 'warning');
    
    // 1. Calcular estadísticas para el reporte
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
      const cv = std/mean;
      if (cv > 0.01) stab = 'Media';
      if (cv > 0.03) stab = 'Baja';
    }

    // 2. Filtrar historial según selección actual
    const history = _rates.slice(0, _filterDays);
    
    const html = `
      <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 10px; width: 100%; box-sizing: border-box;">
        
        <div style="text-align: center; margin-bottom: 20px;">
           <h1 style="color: #0d7377; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase;">Reporte de Paridad Cambiaria</h1>
           <p style="color: #64748b; font-size: 11px; font-weight: 700; margin-top: 4px;">Análisis de Tendencia — ErgoExpress Inteligencia</p>
        </div>
        
        <!-- Bloque Tasa Actual (Compacto) -->
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; text-align: center;">
           <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">Tasa de Referencia Actual</div>
           <div style="font-size: 32px; margin: 5px 0; color: #0d7377; font-weight: 900;">Bs ${Utils.formatVES(latest['Tasa Oficial'])}</div>
           <div style="display: inline-block; background: #0ea5e9; color: #fff; font-size: 8px; font-weight: 900; padding: 3px 10px; border-radius: 20px;">VIGENTE: ${latest['Fecha']}</div>
        </div>

        <!-- Indicadores (KPIs) con FLEXBOX (Evitando Tables por compatibilidad de motor PDF) -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
           <div style="flex: 1; background: #fff; border: 1px solid #e2e8f0; padding: 12px 5px; border-radius: 10px; text-align: center; margin: 0 4px;">
              <div style="font-size: 8px; font-weight: 800; color: #64748b; margin-bottom: 4px;">MÍNIMO MENSUAL</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Bs ${Utils.formatVES(minVal)}</div>
           </div>
           <div style="flex: 1; background: #fff; border: 1px solid #e2e8f0; padding: 12px 5px; border-radius: 10px; text-align: center; margin: 0 4px;">
              <div style="font-size: 8px; font-weight: 800; color: #64748b; margin-bottom: 4px;">MÁXIMO MENSUAL</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Bs ${Utils.formatVES(maxVal)}</div>
           </div>
           <div style="flex: 1; background: #fff; border: 1px solid #e2e8f0; padding: 12px 5px; border-radius: 10px; text-align: center; margin: 0 4px;">
              <div style="font-size: 8px; font-weight: 800; color: #64748b; margin-bottom: 4px;">DÍAS TRACKING</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${mRates.length}</div>
           </div>
           <div style="flex: 1; background: #fff; border: 1px solid #e2e8f0; padding: 12px 5px; border-radius: 10px; text-align: center; margin: 0 4px;">
              <div style="font-size: 8px; font-weight: 800; color: #64748b; margin-bottom: 4px;">ESTABILIDAD</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${stab}</div>
           </div>
        </div>

        <!-- Historial con ESTRUCTURA FLEX (Evitando Tables por compatibilidad de motor PDF) -->
        <h3 style="font-size: 12px; font-weight: 900; margin-bottom: 12px; color: #0f172a; border-left: 4px solid #0d7377; padding-left: 10px;">Historial de Movimientos (${history.length} días)</h3>
        
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <!-- Header de Historial -->
          <div style="display: flex; background: #f1f5f9; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; font-weight: 800; color: #64748b;">
            <div style="width: 25%;">FECHA</div>
            <div style="width: 35%;">VALOR TASA</div>
            <div style="width: 20%;">FUENTE</div>
            <div style="width: 20%; text-align: right;">DINÁMICA</div>
          </div>
          
          <!-- Lista de Registros -->
          ${history.map((r, i) => {
            let diffHTML = '<span style="color:#d1d5db">—</span>';
            if (i < history.length - 1) {
              const nextVal = Utils.toNumber(history[i+1]['Tasa Oficial']);
              const currVal = Utils.toNumber(r['Tasa Oficial']);
              if (nextVal > 0) {
                const p = ((currVal - nextVal) / nextVal) * 100;
                if (Math.abs(p) > 0.001) {
                  const color = p > 0 ? '#ef4444' : '#22c55e';
                  diffHTML = `<span style="color: ${color}; font-weight: 800;">${p > 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(2)}%</span>`;
                }
              }
            }
            return `
              <div style="display: flex; padding: 12px; border-bottom: 1px solid #f1f5f9; align-items: center; background: #ffffff;">
                <div style="width: 25%; font-size: 11px; font-weight: 700;">${r['Fecha']}</div>
                <div style="width: 35%; font-size: 14px; font-weight: 900; color: #0d7377;">Bs ${Utils.formatVES(r['Tasa Oficial'])}</div>
                <div style="width: 20%; font-size: 10px; color: #64748b;">${r['Fuente'] || 'BCV'}</div>
                <div style="width: 20%; text-align: right; font-size: 11px;">${diffHTML}</div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="margin-top: 30px; font-size: 8px; color: #94a3b8; text-align: justify; line-height: 1.5; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
          * Este reporte refleja el comportamiento del mercado cambiario para propósitos de análisis interno. 
          Los valores mostrados corresponden a la Tasa Oficial del Banco Central de Venezuela (BCV) o ajustes manuales realizados por la administración.
        </div>
      </div>
    `;
    await ReportBuilder.generateEliteReport({ 
      title: 'Reporte de Tasas BCV', 
      filename: `Reporte_Tasas_${Utils.todayISO()}.pdf`, 
      contentHTML: html 
    });
  }

  function deleteRate(id) {
    Utils.confirm('¿Desea eliminar este registro de la base de datos?', async () => {
      try {
        await Sheets.deleteRow(CONFIG.SHEETS.RATES, id);
        Utils.showToast('Registro eliminado', 'success');
        await _load(true);
      } catch(e) { Utils.showToast(e.message, 'error'); }
    });
  }

  return { render, reload: _load, quickSave, setFilter, openForm, save, exportPDF, delete: deleteRate };
})();
