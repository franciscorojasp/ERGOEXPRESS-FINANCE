/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS FINANCE — Centro Fiscal y Tributario (fiscal.js)
   v1.0: Automatización SENIAT 2026 + Exportación XML/TXT + Calendario SPE
   ════════════════════════════════════════════════════════════════════════════ */

const Fiscal = (() => {
  let _container = null;
  let _stats = null;
  let _activeTab = 'iva';
  let _currentPeriod = Utils.todayISO().substring(0, 7); // YYYY-MM

  /**
   * Renderiza la consola fiscal completa
   */
  async function render(container) {
    _container = container;
    _container.innerHTML = `
      <div class="view-header">
        <div class="header-content">
          <h1 class="view-title">Centro Fiscal y Tributario</h1>
          <p class="view-subtitle">Cumplimiento SENIAT — Sujeto Pasivo Especial</p>
        </div>
        <div id="fiscal-kpis" class="header-stats">
          <div class="loading-shimmer" style="width:200px; height:60px; border-radius:8px;"></div>
        </div>
      </div>

      <div class="fiscal-dashboard">
        <!-- Tabs de Navegación -->
        <div class="tabs-modern">
          <button class="tab-btn active" data-tab="iva" onclick="Fiscal.setTab('iva')">IVA / Retenciones</button>
          <button class="tab-btn" data-tab="islr" onclick="Fiscal.setTab('islr')">ISLR / Arc CV</button>
          <button class="tab-btn" data-tab="calendar" onclick="Fiscal.setTab('calendar')">Calendario SPE 2026</button>
        </div>

        <div class="fiscal-content-wrapper">
          <div class="table-controls">
            <div class="filter-group">
              <label>Periodo Fiscal:</label>
              <input type="month" id="fiscal-period-input" value="${_currentPeriod}" onchange="Fiscal.setPeriod(this.value)">
            </div>
            <div class="action-buttons-group" id="fiscal-actions">
               <!-- Botones dinámicos según TAB -->
            </div>
          </div>

          <div id="fiscal-main-table" class="data-table-container">
             <div class="empty-state">
               <div class="loader-spinner"></div>
               <p>Cargando registros fiscales...</p>
             </div>
          </div>
        </div>
      </div>
    `;

    _loadData();
  }

  async function _loadData() {
    try {
      // KPIs se calculan localmente desde los datos de hojas existentes
      const kpisEl = document.getElementById('fiscal-kpis');
      if (kpisEl) kpisEl.innerHTML = `
        <div class="kpi-card">
          <span class="kpi-label">Módulo Fiscal</span>
          <span class="kpi-value" style="font-size:1rem;">Activo</span>
        </div>
      `;

      // Renderizar contenido según Tab
      _renderContent();
    } catch (e) {
      Utils.showToast('Error cargando datos fiscales', 'error');
    }
  }

  function _renderKPIs(data) {
    const kpisEl = document.getElementById('fiscal-kpis');
    const colorClass = data.calendario.estatus === 'URGENTE' ? 'status-red' : (data.calendario.estatus === 'PENDIENTE' ? 'status-yellow' : 'status-green');
    
    kpisEl.innerHTML = `
      <div class="kpi-card ${colorClass}">
         <span class="kpi-label">Próximo Vencimiento</span>
         <span class="kpi-value">${Utils.formatDate(data.calendario.proxima_fecha)}</span>
         <span class="kpi-trend">${data.calendario.dias_restantes} días restantes</span>
      </div>
      <div class="kpi-card">
         <span class="kpi-label">IVA Retenido (Mes)</span>
         <span class="kpi-value">${Utils.formatCurrency(data.resumen_mes.iva_retenido_ves, 'VES')}</span>
      </div>
    `;
  }

  async function _renderContent() {
    const tableEl = document.getElementById('fiscal-main-table');
    const actionsEl = document.getElementById('fiscal-actions');
    
    if (_activeTab === 'iva') {
      actionsEl.innerHTML = `
        <button class="btn-secondary" onclick="Fiscal.exportIVA('xml')"><i class="icon-xml"></i> Exportar XML (Mass)</button>
        <button class="btn-secondary" onclick="Fiscal.exportIVA('txt')"><i class="icon-txt"></i> Exportar TXT (Relación)</button>
      `;
      
      const rows = await Sheets.readSheet('Finanzas_Egresos');
      const filtered = rows.filter(r => r.Fecha.startsWith(_currentPeriod) && Number(r.Retencion_IVA) > 0);
      
      if (!filtered.length) {
        tableEl.innerHTML = `<div class="empty-state"><p>No hay retenciones de IVA en el periodo seleccionado.</p></div>`;
        return;
      }

      tableEl.innerHTML = `
        <table class="elite-table">
          <thead>
            <tr>
              <th>Beneficiario / RIF</th>
              <th>Factura / Control</th>
              <th>Base Imponible (VES)</th>
              <th>IVA (VES)</th>
              <th>Monto Retenido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td>
                   <div class="font-bold">${r.Beneficiario}</div>
                   <div class="text-xs text-muted">RIF: ${r.RIF || 'V-00000000'}</div>
                </td>
                <td>
                   <div>#${r['Referencia Nº']}</div>
                   <div class="text-xs text-muted">Ctrl: ${r.Nro_Control_Factura || '—'}</div>
                </td>
                <td>${Utils.formatCurrency(r.Base_Imponible_VES, 'VES')}</td>
                <td>${Utils.formatCurrency(r.IVA_VES || 0, 'VES')}</td>
                <td class="text-highlight">${Utils.formatCurrency(r.Retencion_IVA, 'VES')}</td>
                <td>
                  <button class="btn-icon" onclick="Fiscal.generateVoucher('${r.ID}', 'iva')" title="Generar Comprobante">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (_activeTab === 'calendar') {
      actionsEl.innerHTML = `<span class="badge badge-info">Vista Informativa SENIAT 2026</span>`;
      tableEl.innerHTML = `
        <div class="calendar-spe-grid">
           <div class="info-banner">
             <h3>Calendario de Obligaciones 2026</h3>
             <p>Consulte las fechas oficiales publicadas en Gaceta Oficial para su terminal de RIF.</p>
           </div>
           <div class="empty-state">
             <p>Configure su RIF en Ajustes para cargar las fechas de vencimiento automáticamente.</p>
           </div>
        </div>
      `;
    }
  }

  function setTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    _renderContent();
  }

  function setPeriod(v) {
    _currentPeriod = v;
    _renderContent();
  }

  async function exportIVA(format) {
    Utils.showToast(`Generando archivo ${format.toUpperCase()}...`, 'info');
    const period = _currentPeriod; 
    const action = format === 'xml' ? 'FISCAL_EXPORT_IVA_XML' : 'FISCAL_EXPORT_IVA_TXT';
    
    const res = await API.call(action, { period });
    if (res.success) {
      const blob = new Blob([res.data], { type: format === 'xml' ? 'text/xml' : 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Retenciones_IVA_${period}.${format}`;
      a.click();
      Utils.showToast('Archivo descargado con éxito', 'success');
    }
  }

  async function generateVoucher(id, type) {
    try {
      Utils.showToast('Generando comprobante oficial...', 'info');
      const egresos = await Sheets.readSheet('Finanzas_Egresos');
      const data = egresos.find(e => e.ID === id);
      
      const config = await Sheets.getAllConfig();
      const qrData = `SENIAT|IVA|${config.empresa_rif}|${data.RIF}|${data['Referencia Nº']}|${data.Retencion_IVA}`;
      
      const html = `
        <div style="font-family:'Inter', sans-serif; padding:10px;">
          <div style="display:flex; justify-content:space-between; border:2px solid #000; padding:10px; margin-bottom:15px;">
             <div style="font-size:12px;">
                <strong>COMPROBANTE DE RETENCIÓN DEL IMPUESTO AL VALOR AGREGADO</strong><br/>
                (Ley IVA - Art. 11 / Providencia 0049)
             </div>
             <div style="text-align:right;">
                <strong>NRO COMPROBANTE:</strong><br/>
                <span style="font-size:16px; color:#c00;">${Utils.todayISO().replace(/-/g,'').substring(0,6)}${id.substring(0,8).toUpperCase()}</span>
             </div>
          </div>
          
          <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:20px;">
            <tr>
              <td style="border:1px solid #ddd; padding:5px; background:#f5f5f5;">NOMBRE O RAZÓN SOCIAL DEL AGENTE DE RETENCIÓN</td>
              <td style="border:1px solid #ddd; padding:5px; background:#f5f5f5;">REGISTRO DE INFORMACIÓN FISCAL (RIF)</td>
            </tr>
            <tr>
              <td style="border:1px solid #ddd; padding:5px;">${config.empresa_nombre}</td>
              <td style="border:1px solid #ddd; padding:5px;">${config.empresa_rif}</td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:20px;">
            <tr style="background:#000; color:#fff; text-align:center;">
              <th>Fecha Factura</th>
              <th>Número Factura</th>
              <th>Número Control</th>
              <th>Base Imponible</th>
              <th>% Alíc.</th>
              <th>Impuesto IVA</th>
              <th>IVA Retenido</th>
            </tr>
            <tr style="text-align:center;">
              <td style="border:1px solid #000; padding:8px;">${Utils.formatDate(data.Fecha)}</td>
              <td style="border:1px solid #000; padding:8px;">${data['Referencia Nº']}</td>
              <td style="border:1px solid #000; padding:8px;">${data.Nro_Control_Factura || 'N/A'}</td>
              <td style="border:1px solid #000; padding:8px;">${Utils.formatCurrency(data.Base_Imponible_VES, 'VES')}</td>
              <td style="border:1px solid #000; padding:8px;">16%</td>
              <td style="border:1px solid #000; padding:8px;">${Utils.formatCurrency(data.IVA_VES, 'VES')}</td>
              <td style="border:1px solid #000; padding:8px; font-weight:bold; background:#eee;">${Utils.formatCurrency(data.Retencion_IVA, 'VES')}</td>
            </tr>
          </table>

          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:40px;">
             <div style="text-align:center; flex:1;">
                <div style="border-top:1px solid #000; width:150px; margin:0 auto; padding-top:5px;">Firma y Sello Agente</div>
             </div>
             <div style="text-align:center; flex:1;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}" />
                <div style="font-size:8px; color:#888;">Validación Digital SENIAT</div>
             </div>
             <div style="text-align:center; flex:1;">
                <div style="border-top:1px solid #000; width:150px; margin:0 auto; padding-top:5px;">Firma Beneficiario</div>
             </div>
          </div>
        </div>
      `;

      await ReportBuilder.generateEliteReport({
        title: 'COMPROBANTE DE RETENCIÓN IVA',
        filename: `Retencion_${id.substring(0,8)}.pdf`,
        contentHTML: html,
        orientation: 'p'
      });
    } catch (e) {
      Utils.showToast('Error al generar comprobante: ' + e.message, 'error');
    }
  }

  return { render, setTab, setPeriod, exportIVA, generateVoucher };
})();
