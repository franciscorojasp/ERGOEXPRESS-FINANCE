/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS-FINANCE — Módulo de Facturación y Documentos Fiscales
   ════════════════════════════════════════════════════════════════════════════ */

const Billing = (() => {
  let _facturas = [];
  let _notasEntrega = [];
  let _ajustes = [];
  let _activeTab = 'facturas'; // facturas, notas_entrega, ajustes

  async function render(container) {
    container.innerHTML = `
      <div class="view-header animate-fade-in">
        <div class="view-header-content">
          <h1 class="view-title">Centro de Gestión Fiscal</h1>
          <p class="view-subtitle">Emisión y control de facturas, notas y despachos</p>
        </div>
        <div class="view-header-actions">
           <button class="btn btn-primary" onclick="Billing.openNewDocumentFlow()">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 5v14M5 12h14"/></svg>
             Emitir Documento
           </button>
        </div>
      </div>

      <div class="view-tabs animate-fade-in" style="margin-top:20px;">
        <button class="tab-btn active" data-tab="facturas" onclick="Billing.switchTab('facturas')">Facturas</button>
        <button class="tab-btn" data-tab="notas_entrega" onclick="Billing.switchTab('notas_entrega')">Notas de Entrega</button>
        <button class="tab-btn" data-tab="ajustes" onclick="Billing.switchTab('ajustes')">Ajustes (NC/ND)</button>
      </div>

      <div id="billing-content" class="animate-fade-in" style="margin-top:24px;">
        <div class="loading-state"><div class="spinner"></div><p>Cargando documentos fiscales...</p></div>
      </div>
    `;

    await _init();
  }

  async function _init() {
    try {
      // Cargar todo en paralelo para mejor UX
      const [f, ne, a] = await Promise.all([
        supabase.from('facturas').select('*, entidades(razon_social, rif)').order('numero', { ascending: false }),
        supabase.from('notas_entrega').select('*, entidades(razon_social, rif)').order('fecha', { ascending: false }),
        supabase.from('documentos_ajuste').select('*, facturas(numero, numero_control)').order('fecha', { ascending: false })
      ]);

      if (f.error) throw f.error;
      if (ne.error) throw ne.error;
      if (a.error) throw a.error;

      _facturas = f.data || [];
      _notasEntrega = ne.data || [];
      _ajustes = a.data || [];

      _renderTabContent();
    } catch (err) {
      console.error('[Billing] Load Error:', err);
      const wrap = document.getElementById('billing-content');
      if (wrap) wrap.innerHTML = `<div class="error-state">Error al cargar registros: ${err.message}</div>`;
    }
  }

  function switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    _renderTabContent();
  }

  function _renderTabContent() {
    const wrap = document.getElementById('billing-content');
    if (!wrap) return;

    if (_activeTab === 'facturas') {
      _renderFacturas(wrap);
    } else if (_activeTab === 'notas_entrega') {
      _renderNotasEntrega(wrap);
    } else {
      _renderAjustes(wrap);
    }
  }

  function _renderFacturas(wrap) {
    if (_facturas.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>No hay facturas emitidas recientemente.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th># Doc / Control</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total USD</th>
              <th>Total VES</th>
              <th>Status</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${_facturas.map(f => `
              <tr>
                <td>
                  <div style="font-weight:700;">FAC-${String(f.numero).padStart(5, '0')}</div>
                  <div style="font-size:11px; color:var(--text-muted)">Control: ${f.numero_control}</div>
                </td>
                <td>${new Date(f.fecha).toLocaleDateString()}</td>
                <td>
                  <div style="font-weight:600">${Utils.escapeHtml(f.entidades?.razon_social || 'Desconocido')}</div>
                  <div style="font-size:10px; color:var(--text-muted)">${f.entidades?.rif || ''}</div>
                </td>
                <td style="font-weight:bold">$ ${Utils.formatUSD(f.total_usd)}</td>
                <td style="color:var(--text-muted)">Bs. ${Utils.formatUSD(f.total_ves)}</td>
                <td><span class="badge status-approved">COMPLETADA</span></td>
                <td style="text-align:right">
                  <button class="btn btn-icon-sm" onclick="Billing.printInvoice('${f.id}')" title="Imprimir PDF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
                  </button>
                  <button class="btn btn-icon-sm" onclick="Billing.openAdjustment('${f.id}')" title="Emitir NC/ND">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderNotasEntrega(wrap) {
    if (_notasEntrega.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>No hay notas de entrega registradas.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th># Nota</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total USD</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${_notasEntrega.map(ne => `
              <tr>
                <td style="font-weight:700;">${ne.numero}</td>
                <td>${new Date(ne.fecha).toLocaleDateString()}</td>
                <td>${Utils.escapeHtml(ne.entidades?.razon_social || 'N/A')}</td>
                <td>$ ${Utils.formatUSD(ne.total_usd)}</td>
                <td style="text-align:right">
                   <button class="btn btn-icon-sm" onclick="Billing.printNE('${ne.id}')">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
                   </button>
                   <button class="btn btn-icon-sm btn-primary" onclick="Billing.convertToInvoice('${ne.id}')" title="Facturar esta NE">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
                   </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderAjustes(wrap) {
    if (_ajustes.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>No hay notas de crédito o débito emitidas.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th># Doc</th>
              <th>Factura Afectada</th>
              <th>Fecha</th>
              <th>Monto USD</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${_ajustes.map(a => `
              <tr>
                <td><span class="badge ${a.tipo === 'credito' ? 'status-approved' : 'status-rejected'}">${a.tipo.toUpperCase()}</span></td>
                <td style="font-weight:700;">${String(a.numero).padStart(5, '0')}</td>
                <td>FAC-${String(a.facturas?.numero || '').padStart(5,'0')} (${a.facturas?.numero_control || ''})</td>
                <td>${new Date(a.fecha).toLocaleDateString()}</td>
                <td style="font-weight:bold">$ ${Utils.formatUSD(a.monto_usd)}</td>
                <td style="text-align:right">
                   <button class="btn btn-icon-sm" onclick="Billing.printAdjustment('${a.id}')">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
                   </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Lógica de Emisión ---

  function openNewDocumentFlow() {
      // Por defecto, dirigir a cotizaciones para iniciar el flujo formal si no hay NE
      Utils.confirm('El flujo recomendado es Cotización -> Nota de Entrega -> Factura. ¿Deseas ir a Cotizaciones para iniciar?', () => {
          App.navigate('/quotations');
      });
  }

  async function openAdjustment(facturaId) {
      const f = _facturas.find(x => x.id === facturaId);
      Utils.showModal({
          title: `Nueva Nota (Ajuste) para FAC-${f.numero}`,
          size: 'md',
          content: `
            <form id="adjustment-form" class="form-grid">
               <div class="form-group full">
                 <label class="form-label">Tipo de Ajuste</label>
                 <select class="form-input" name="tipo">
                    <option value="credito">Nota de Crédito (Resta saldo)</option>
                    <option value="debito">Nota de Débito (Suma saldo)</option>
                 </select>
               </div>
               <div class="form-group full">
                 <label class="form-label">Motivo / Descripción</label>
                 <input type="text" class="form-input" name="motivo" placeholder="Ej. Devolución de mercancia, error en precio..." required>
               </div>
               <div class="form-group">
                 <label class="form-label">Monto USD</label>
                 <input type="number" step="0.01" class="form-input" name="monto_usd" value="${f.total_usd}" required>
               </div>
            </form>
          `,
          footer: `
            <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Billing.saveAdjustment('${facturaId}')">Emitir Nota</button>
          `
      });
  }

  async function saveAdjustment(facturaId) {
      const data = Utils.getFormData('adjustment-form');
      const f = _facturas.find(x => x.id === facturaId);

      try {
          // Obtener proximo numero para el tipo de ajuste
          const seqType = data.tipo === 'credito' ? 'nota_credito' : 'nota_debito';
          const { data: nextNum, error: eSeq } = await supabase.rpc('obtener_proximo_numero', { p_tipo: seqType });
          if (eSeq) throw eSeq;

          const adjustmentObj = {
              tipo: data.tipo,
              numero: nextNum,
              factura_afectada: facturaId,
              motivo: data.motivo,
              monto_usd: parseFloat(data.monto_usd),
              monto_ves: parseFloat(data.monto_usd) * f.tasa_bcv,
              usuario_id: Auth.getUser().id
          };

          const { error: eSave } = await supabase.from('documentos_ajuste').insert(adjustmentObj);
          if (eSave) throw eSave;

          Utils.showToast('Documento de ajuste emitido con éxito', 'success');
          Utils.closeModal();
          _init();
      } catch (err) {
          console.error('[Billing] Adjustment Error:', err);
          Utils.showToast('Error: ' + err.message, 'error');
      }
  }

  async function convertToInvoice(notaEntregaId) {
    const ne = _notasEntrega.find(x => x.id === notaEntregaId);
    if (!ne) return;

    Utils.showModal({
      title: `Facturar Nota de Entrega ${ne.numero}`,
      size: 'md',
      content: `
        <div class="form-grid">
           <div class="form-group full">
             <label class="form-label">Número de Control (Papelería Física)</label>
             <input type="text" id="frm-fac-control" class="form-input" placeholder="Ej. 00-000001" required>
           </div>
           <div class="form-group">
             <label class="form-label">Tasa BCV del día</label>
             <input type="number" id="frm-fac-rate" class="form-input" value="${Quotations.getConfig()?.latestRate || 0}" step="0.01">
           </div>
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Billing.processInvoiceFromNE('${notaEntregaId}')">Generar Factura</button>
      `
    });
  }

  async function processInvoiceFromNE(neId) {
    const ne = _notasEntrega.find(x => x.id === neId);
    const controlNum = document.getElementById('frm-fac-control')?.value;
    const rate = parseFloat(document.getElementById('frm-fac-rate')?.value);

    if (!controlNum) { Utils.showToast('El nro de control es obligatorio', 'warning'); return; }

    try {
      // Obtener siguiente correlativo de factura
      const { data: num, error: eSeq } = await supabase.rpc('obtener_proximo_numero', { p_tipo: 'factura' });
      if (eSeq) throw eSeq;

      const subtotal = ne.total_usd / 1.16; // Asumimos que NE ya incluye IVA si venía de una cotiz con IVA

      const invoice = {
        numero: num,
        numero_control: controlNum,
        cliente_id: ne.cliente_id,
        tasa_bcv: rate,
        subtotal_usd: subtotal,
        iva_usd: ne.total_usd - subtotal,
        total_usd: ne.total_usd,
        total_ves: ne.total_usd * rate,
        items: ne.items,
        usuario_id: Auth.getUser().id
      };

      const { error: eSave } = await supabase.from('facturas').insert(invoice);
      if (eSave) throw eSave;

      await supabase.from('secuencias_fiscales').update({ ultimo_control: controlNum }).eq('tipo', 'factura');

      Utils.showToast('Factura emitida desde Nota de Entrega', 'success');
      Utils.closeModal();
      _init();
      switchTab('facturas');
    } catch (err) {
      Utils.showToast('Error al facturar: ' + err.message, 'error');
    }
  }

  // Stubs para impresión (se implementarán en ReportBuilder)
  function printInvoice(id) { Utils.showToast('Generando Factura PDF...', 'info'); }
  function printNE(id) { Utils.showToast('Generando Nota de Entrega PDF...', 'info'); }
  function printAdjustment(id) { Utils.showToast('Generando Nota de Ajuste PDF...', 'info'); }

  return { render, switchTab, openNewDocumentFlow, openAdjustment, saveAdjustment, convertToInvoice, processInvoiceFromNE, printInvoice, printNE, printAdjustment };
})();
