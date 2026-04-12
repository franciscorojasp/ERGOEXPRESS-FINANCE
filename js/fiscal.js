/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS FINANCE — Centro Fiscal y Tributario (fiscal.js)
   v2.0: Automatización SENIAT 2026 + Exportación XML/TXT + Calendario SPE
   ════════════════════════════════════════════════════════════════════════════ */

const Fiscal = (() => {
  let _container = null;
  let _stats = null;
  let _activeTab = 'iva';
  let _currentPeriod = Utils.todayISO().substring(0, 7); // YYYY-MM

  // Calendario SPE 2026 (Gaceta Oficial N° 43.283)
  const FISCAL_CALENDAR_2026 = {
    "1": ["2026-01-20","2026-02-05","2026-02-20","2026-03-05","2026-03-20","2026-04-06","2026-04-20","2026-05-06","2026-05-20","2026-06-05","2026-06-22","2026-07-06"],
    "2": ["2026-01-21","2026-02-06","2026-02-21","2026-03-06","2026-03-23","2026-04-07","2026-04-21","2026-05-07","2026-05-21","2026-06-08","2026-06-23","2026-07-07"],
    "3": ["2026-01-22","2026-02-09","2026-02-23","2026-03-09","2026-03-24","2026-04-08","2026-04-22","2026-05-08","2026-05-22","2026-06-09","2026-06-24","2026-07-08"],
    "4": ["2026-01-23","2026-02-10","2026-02-24","2026-03-10","2026-03-25","2026-04-09","2026-04-23","2026-05-11","2026-05-25","2026-06-10","2026-06-25","2026-07-09"],
    "5": ["2026-01-26","2026-02-11","2026-02-25","2026-03-11","2026-03-26","2026-04-10","2026-04-24","2026-05-12","2026-05-26","2026-06-11","2026-06-26","2026-07-10"],
    "6": ["2026-01-27","2026-02-12","2026-02-26","2026-03-12","2026-03-27","2026-04-13","2026-04-27","2026-05-13","2026-05-27","2026-06-12","2026-06-29","2026-07-13"],
    "7": ["2026-01-28","2026-02-13","2026-02-27","2026-03-13","2026-03-30","2026-04-14","2026-04-28","2026-05-14","2026-05-28","2026-06-15","2026-06-30","2026-07-14"],
    "8": ["2026-01-29","2026-02-18","2026-03-02","2026-03-18","2026-03-31","2026-04-15","2026-04-29","2026-05-15","2026-06-01","2026-06-16","2026-07-01","2026-07-15"],
    "9": ["2026-01-30","2026-02-19","2026-03-03","2026-03-19","2026-04-01","2026-04-16","2026-04-30","2026-05-18","2026-06-02","2026-06-17","2026-07-02","2026-07-16"],
    "0": ["2026-01-08","2026-02-04","2026-02-19","2026-03-04","2026-03-19","2026-04-01","2026-04-16","2026-04-30","2026-06-03","2026-06-18","2026-07-03","2026-07-17"]
  };

  /**
   * Helper: Convierte cualquier valor de fecha a string YYYY-MM-DD de forma segura
   */
  function _safeDate(val) {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return String(val).split('T')[0];
  }

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
      // Calcular KPIs del calendario SPE
      const config = await Sheets.getAllConfig().catch(() => ({}));
      const rif = config?.empresa_rif || 'J-50251246-2';
      const ultimoDigito = rif.split('-').pop() || '2';
      const fechas = FISCAL_CALENDAR_2026[ultimoDigito] || [];
      const hoy = new Date();

      let proximoVenc = null;
      let diasRestantes = 'N/A';
      for (const f of fechas) {
        const d = new Date(f + 'T23:59:59');
        if (d >= hoy) {
          proximoVenc = f;
          diasRestantes = Math.ceil((d - hoy) / (1000 * 60 * 60 * 24));
          break;
        }
      }

      const estatus = typeof diasRestantes === 'number'
        ? (diasRestantes <= 3 ? 'URGENTE' : (diasRestantes <= 7 ? 'PENDIENTE' : 'AL DÍA'))
        : 'N/A';

      const colorClass = estatus === 'URGENTE' ? 'status-red' : (estatus === 'PENDIENTE' ? 'status-yellow' : 'status-green');

      const kpisEl = document.getElementById('fiscal-kpis');
      if (kpisEl) kpisEl.innerHTML = `
        <div class="kpi-card ${colorClass}" style="min-width:200px;">
           <span class="kpi-label">Próximo Vencimiento</span>
           <span class="kpi-value">${proximoVenc ? Utils.formatDate(proximoVenc) : 'No definido'}</span>
           <span class="kpi-trend">${typeof diasRestantes === 'number' ? diasRestantes + ' días · ' + estatus : 'Configure RIF'}</span>
        </div>
        <div class="kpi-card">
           <span class="kpi-label">RIF</span>
           <span class="kpi-value" style="font-size:1rem;">${rif}</span>
        </div>
      `;

      // Renderizar contenido según Tab
      _renderContent();
    } catch (e) {
      console.error('[Fiscal] Error loading data:', e);
      Utils.showToast('Error cargando datos fiscales: ' + e.message, 'error');
    }
  }

  async function _renderContent() {
    const tableEl = document.getElementById('fiscal-main-table');
    const actionsEl = document.getElementById('fiscal-actions');
    if (!tableEl || !actionsEl) return;
    
    if (_activeTab === 'iva') {
      actionsEl.innerHTML = `
        <button class="btn-secondary" onclick="Fiscal.exportIVA('xml')"><i class="icon-xml"></i> Exportar XML (Mass)</button>
        <button class="btn-secondary" onclick="Fiscal.exportIVA('txt')"><i class="icon-txt"></i> Exportar TXT (Relación)</button>
      `;
      
      try {
        const rows = await Sheets.readSheet('Finanzas_Egresos');
        const filtered = (rows || []).filter(r => {
          const fecha = _safeDate(r.Fecha || r['Fecha']);
          return fecha.startsWith(_currentPeriod) && Number(r.Retencion_IVA || r['Retencion_IVA']) > 0;
        });
        
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
                     <div class="font-bold">${Utils.escapeHtml(r.Beneficiario || r['Beneficiario'] || '—')}</div>
                     <div class="text-xs text-muted">RIF: ${Utils.escapeHtml(r.RIF || r['RIF'] || 'N/A')}</div>
                  </td>
                  <td>
                     <div>#${Utils.escapeHtml(String(r['Referencia Nº'] || '—'))}</div>
                     <div class="text-xs text-muted">Ctrl: ${Utils.escapeHtml(r.Nro_Control_Factura || r['Nro_Control_Factura'] || '—')}</div>
                  </td>
                  <td>${Utils.formatCurrency(r.Base_Imponible_VES || r['Base_Imponible_VES'] || 0, 'VES')}</td>
                  <td>${Utils.formatCurrency(r.IVA_VES || r['IVA_VES'] || 0, 'VES')}</td>
                  <td class="text-highlight">${Utils.formatCurrency(r.Retencion_IVA || r['Retencion_IVA'] || 0, 'VES')}</td>
                  <td>
                    <button class="btn-icon" onclick="Fiscal.generateVoucher('${r.ID || r['ID']}', 'iva')" title="Generar Comprobante">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } catch (e) {
        tableEl.innerHTML = `<div class="empty-state"><p>Error cargando retenciones: ${e.message}</p></div>`;
      }

    } else if (_activeTab === 'islr') {
      // ── TAB ISLR ──────────────────────────────────────────────────────────
      actionsEl.innerHTML = `
        <button class="btn-secondary" onclick="Fiscal.exportISLR()"><i class="icon-txt"></i> Exportar TXT ISLR</button>
      `;
      
      try {
        const rows = await Sheets.readSheet('Finanzas_Egresos');
        const filtered = (rows || []).filter(r => {
          const fecha = _safeDate(r.Fecha || r['Fecha']);
          return fecha.startsWith(_currentPeriod) && Number(r.Retencion_ISLR || r['Retencion_ISLR']) > 0;
        });
        
        if (!filtered.length) {
          tableEl.innerHTML = `
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40" style="color:var(--text-muted); margin-bottom:12px;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>No hay retenciones de ISLR en el periodo ${_currentPeriod}.</p>
              <p class="text-xs text-muted">Las retenciones ISLR se registran desde Finanzas → Egresos con el campo "Retencion_ISLR".</p>
            </div>`;
          return;
        }

        tableEl.innerHTML = `
          <table class="elite-table">
            <thead>
              <tr>
                <th>Beneficiario / RIF</th>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Base Imponible (VES)</th>
                <th>% Retención</th>
                <th>ISLR Retenido (VES)</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(r => {
                const base = Number(r.Base_Imponible_VES || r['Base_Imponible_VES'] || 0);
                const retenido = Number(r.Retencion_ISLR || r['Retencion_ISLR'] || 0);
                const pct = base > 0 ? ((retenido / base) * 100).toFixed(2) : '—';
                return `
                <tr>
                  <td>
                    <div class="font-bold">${Utils.escapeHtml(r.Beneficiario || r['Beneficiario'] || '—')}</div>
                    <div class="text-xs text-muted">RIF: ${Utils.escapeHtml(r.RIF || r['RIF'] || 'N/A')}</div>
                  </td>
                  <td>#${Utils.escapeHtml(String(r['Referencia Nº'] || '—'))}</td>
                  <td>${Utils.formatDate(_safeDate(r.Fecha || r['Fecha']))}</td>
                  <td>${Utils.formatCurrency(base, 'VES')}</td>
                  <td>${pct}%</td>
                  <td class="text-highlight">${Utils.formatCurrency(retenido, 'VES')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        `;
      } catch (e) {
        tableEl.innerHTML = `<div class="empty-state"><p>Error cargando retenciones ISLR: ${e.message}</p></div>`;
      }

    } else if (_activeTab === 'calendar') {
      // ── TAB CALENDARIO SPE ────────────────────────────────────────────────
      actionsEl.innerHTML = `<span class="badge badge-info">Vista Informativa SENIAT 2026</span>`;
      
      const config = await Sheets.getAllConfig().catch(() => ({}));
      const rif = config?.empresa_rif || 'J-50251246-2';
      const ultimoDigito = rif.split('-').pop() || '2';
      const fechas = FISCAL_CALENDAR_2026[ultimoDigito] || [];
      const hoy = new Date();

      if (!fechas.length) {
        tableEl.innerHTML = `<div class="empty-state"><p>Configure su RIF en Ajustes para cargar las fechas de vencimiento automáticamente.</p></div>`;
        return;
      }

      const meses = {};
      fechas.forEach(f => {
        const m = f.substring(0, 7);
        if (!meses[m]) meses[m] = [];
        meses[m].push(f);
      });

      tableEl.innerHTML = `
        <div class="calendar-spe-grid" style="display:grid; gap:12px;">
          <div class="info-banner" style="background:rgba(13,115,119,0.1); border:1px solid rgba(13,115,119,0.3); border-radius:12px; padding:16px; margin-bottom:8px;">
            <h3 style="color:var(--primary-light); margin:0 0 6px 0; font-size:15px;">📅 Calendario de Obligaciones 2026</h3>
            <p style="color:var(--text-muted); font-size:13px; margin:0;">RIF: <strong style="color:white;">${rif}</strong> · Terminal: <strong style="color:var(--primary-light);">${ultimoDigito}</strong> · Gaceta Oficial N° 43.283</p>
          </div>
          <table class="elite-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Fechas de Vencimiento</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(meses).map(([mes, fList]) => {
                const allPast = fList.every(f => new Date(f + 'T23:59:59') < hoy);
                const hasPending = fList.some(f => new Date(f + 'T23:59:59') >= hoy);
                const statusColor = allPast ? '#10b981' : '#f59e0b';
                const statusLabel = allPast ? '✓ Cumplido' : '⏳ Pendiente';
                return `
                <tr>
                  <td style="font-weight:700;">${mes}</td>
                  <td>
                    ${fList.map(f => {
                      const isPast = new Date(f + 'T23:59:59') < hoy;
                      const isToday = f === Utils.todayISO();
                      const style = isToday ? 'background:#f59e0b; color:#000; font-weight:800;' : (isPast ? 'opacity:0.5; text-decoration:line-through;' : 'color:var(--primary-light); font-weight:600;');
                      return `<span style="display:inline-block; padding:3px 8px; margin:2px; border-radius:6px; font-size:12px; border:1px solid rgba(255,255,255,0.1); ${style}">${Utils.formatDate(f)}</span>`;
                    }).join(' ')}
                  </td>
                  <td><span style="color:${statusColor}; font-weight:700; font-size:12px;">${statusLabel}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
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

  /**
   * Exporta retenciones IVA localmente (no depende del backend)
   */
  async function exportIVA(format) {
    Utils.showToast(`Generando archivo ${format.toUpperCase()}...`, 'info');
    
    try {
      const rows = await Sheets.readSheet('Finanzas_Egresos');
      const config = await Sheets.getAllConfig().catch(() => ({}));
      const rifEmpresa = (config?.empresa_rif || 'J-50251246-2').replace(/-/g, '');
      const [anio, mes] = _currentPeriod.split('-');

      const filtered = (rows || []).filter(r => {
        const fecha = _safeDate(r.Fecha || r['Fecha']);
        return fecha.startsWith(_currentPeriod) && Number(r.Retencion_IVA || r['Retencion_IVA']) > 0;
      });

      if (!filtered.length) {
        Utils.showToast('No hay retenciones de IVA en el periodo seleccionado.', 'warning');
        return;
      }

      let content = '';

      if (format === 'xml') {
        content = '<?xml version="1.0" encoding="UTF-8"?>\n';
        content += `<RelacionRetencionesIVA rifAgente="${rifEmpresa}" periodo="${anio}${mes}">\n`;
        filtered.forEach(r => {
          const rif = String(r.RIF || r['RIF'] || '').replace(/-/g, '');
          const base = Number(r.Base_Imponible_VES || r['Base_Imponible_VES'] || 0);
          const iva = Number(r.IVA_VES || r['IVA_VES'] || 0);
          const retenido = Number(r.Retencion_IVA || r['Retencion_IVA'] || 0);
          content += `  <DetalleRetencion>\n`;
          content += `    <RifRetenido>${rif}</RifRetenido>\n`;
          content += `    <NumeroFactura>${r['Referencia Nº'] || '000'}</NumeroFactura>\n`;
          content += `    <NumeroControl>${r.Nro_Control_Factura || r['Nro_Control_Factura'] || '00ABC'}</NumeroControl>\n`;
          content += `    <FechaOperacion>${_safeDate(r.Fecha || r['Fecha'])}</FechaOperacion>\n`;
          content += `    <TipoOperacion>01</TipoOperacion>\n`;
          content += `    <TipoDocumento>01</TipoDocumento>\n`;
          content += `    <BaseImponible>${base.toFixed(2)}</BaseImponible>\n`;
          content += `    <Alicuota>16.00</Alicuota>\n`;
          content += `    <MontoRetenido>${retenido.toFixed(2)}</MontoRetenido>\n`;
          content += `  </DetalleRetencion>\n`;
        });
        content += `</RelacionRetencionesIVA>`;
      } else {
        // Formato TXT Pipe para SENIAT
        filtered.forEach(r => {
          const rif = String(r.RIF || r['RIF'] || '').replace(/-/g, '');
          const base = Number(r.Base_Imponible_VES || r['Base_Imponible_VES'] || 0);
          const iva = Number(r.IVA_VES || r['IVA_VES'] || 0);
          const retenido = Number(r.Retencion_IVA || r['Retencion_IVA'] || 0);
          content += `${rifEmpresa}|${rif}|${r['Referencia Nº'] || '000'}|${r.Nro_Control_Factura || r['Nro_Control_Factura'] || '00ABC'}|${base.toFixed(2)}|${iva.toFixed(2)}|${retenido.toFixed(2)}|${_safeDate(r.Fecha || r['Fecha'])}|01|16.00\n`;
        });
      }

      // Descargar archivo
      const mimeType = format === 'xml' ? 'text/xml' : 'text/plain';
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Retenciones_IVA_${_currentPeriod}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      Utils.showToast(`Archivo ${format.toUpperCase()} descargado con éxito`, 'success');
    } catch (e) {
      Utils.showToast('Error generando archivo: ' + e.message, 'error');
    }
  }

  /**
   * Exporta retenciones ISLR localmente
   */
  async function exportISLR() {
    Utils.showToast('Generando TXT ISLR...', 'info');
    
    try {
      const rows = await Sheets.readSheet('Finanzas_Egresos');
      const config = await Sheets.getAllConfig().catch(() => ({}));
      const rifEmpresa = (config?.empresa_rif || 'J-50251246-2').replace(/-/g, '');

      const filtered = (rows || []).filter(r => {
        const fecha = _safeDate(r.Fecha || r['Fecha']);
        return fecha.startsWith(_currentPeriod) && Number(r.Retencion_ISLR || r['Retencion_ISLR']) > 0;
      });

      if (!filtered.length) {
        Utils.showToast('No hay retenciones de ISLR en el periodo seleccionado.', 'warning');
        return;
      }

      let txt = '';
      filtered.forEach(r => {
        const rif = String(r.RIF || r['RIF'] || '').replace(/-/g, '');
        const base = Number(r.Base_Imponible_VES || r['Base_Imponible_VES'] || 0);
        const retenido = Number(r.Retencion_ISLR || r['Retencion_ISLR'] || 0);
        txt += `${rifEmpresa}|${rif}|${r['Referencia Nº'] || '000'}|${_safeDate(r.Fecha || r['Fecha'])}|${base.toFixed(2)}|${retenido.toFixed(2)}\n`;
      });

      const blob = new Blob([txt], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Retenciones_ISLR_${_currentPeriod}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      Utils.showToast('Archivo TXT ISLR descargado con éxito', 'success');
    } catch (e) {
      Utils.showToast('Error generando archivo ISLR: ' + e.message, 'error');
    }
  }

  async function generateVoucher(id, type) {
    try {
      Utils.showToast('Generando comprobante oficial...', 'info');
      const egresos = await Sheets.readSheet('Finanzas_Egresos');
      const data = egresos.find(e => (e.ID || e['ID']) === id);
      
      if (!data) {
        Utils.showToast('Registro no encontrado.', 'error');
        return;
      }

      const config = await Sheets.getAllConfig().catch(() => ({}));
      const qrData = `SENIAT|${type.toUpperCase()}|${config.empresa_rif || 'J-50251246-2'}|${data.RIF || ''}|${data['Referencia Nº'] || ''}|${data.Retencion_IVA || data.Retencion_ISLR || 0}`;
      
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
              <td style="border:1px solid #ddd; padding:5px;">${config.empresa_nombre || 'ERGOEXPRESS, C.A.'}</td>
              <td style="border:1px solid #ddd; padding:5px;">${config.empresa_rif || 'J-50251246-2'}</td>
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
              <td style="border:1px solid #000; padding:8px;">${Utils.formatDate(_safeDate(data.Fecha || data['Fecha']))}</td>
              <td style="border:1px solid #000; padding:8px;">${data['Referencia Nº'] || '—'}</td>
              <td style="border:1px solid #000; padding:8px;">${data.Nro_Control_Factura || data['Nro_Control_Factura'] || 'N/A'}</td>
              <td style="border:1px solid #000; padding:8px;">${Utils.formatCurrency(data.Base_Imponible_VES || data['Base_Imponible_VES'] || 0, 'VES')}</td>
              <td style="border:1px solid #000; padding:8px;">16%</td>
              <td style="border:1px solid #000; padding:8px;">${Utils.formatCurrency(data.IVA_VES || data['IVA_VES'] || 0, 'VES')}</td>
              <td style="border:1px solid #000; padding:8px; font-weight:bold; background:#eee;">${Utils.formatCurrency(data.Retencion_IVA || data['Retencion_IVA'] || 0, 'VES')}</td>
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

      if (typeof ReportBuilder !== 'undefined' && ReportBuilder.generateEliteReport) {
        await ReportBuilder.generateEliteReport({
          title: `COMPROBANTE DE RETENCIÓN ${type.toUpperCase()}`,
          filename: `Retencion_${id.substring(0,8)}.pdf`,
          contentHTML: html,
          orientation: 'p'
        });
      } else {
        // Fallback: abrir en nueva ventana para impresión
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Comprobante de Retención</title></head><body>${html}</body></html>`);
        win.document.close();
        win.print();
      }
    } catch (e) {
      Utils.showToast('Error al generar comprobante: ' + e.message, 'error');
    }
  }

  return { render, setTab, setPeriod, exportIVA, exportISLR, generateVoucher };
})();
