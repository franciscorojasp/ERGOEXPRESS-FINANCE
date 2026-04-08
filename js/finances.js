/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo de Finanzas (Elite 2.0)
   Control de ingresos, egresos, anticipos y balance clínico.
   ════════════════════════════════════════════════════════════════════════════ */

const Finances = (() => {
  let _income = [];
  let _expenses = [];
  let _quotes = [];
  let _contacts = [];
  let _filterPeriod = 'mensual';
  let _activeTab = 'resumen';

  async function render(container) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header" style="justify-content:space-between; align-items:flex-start;">
          <div>
            <h1 class="page-title">Finanzas</h1>
            <p class="text-muted text-xs">Control de ingresos, honorarios y balance clínico</p>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-ghost" onclick="Finances.exportPDF()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Exportar PDF
            </button>
            <button class="btn btn-secondary" onclick="Finances.openExpenseForm()">+ Crear Egreso</button>
            <button class="btn btn-primary" onclick="Finances.openIncomeForm()" style="background:linear-gradient(90deg, #3b82f6, #3b82f6aa); border:none; box-shadow:0 0 15px rgba(59,130,246,0.3);">+ Nuevo Ingreso</button>
          </div>
        </div>

        <!-- Period Filter -->
        <div class="card card-padded" style="margin-bottom:24px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);">
           <div style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Periodo de Reporte</div>
            <div class="btn-group">
              ${['hoy','semanal','quincenal','mensual','trimestral','semestral','anual'].map(p => `
                <button class="btn btn-sm ${_filterPeriod === p ? 'btn-primary' : 'btn-ghost'}" onclick="Finances.setPeriod('${p}')" style="text-transform:uppercase; font-size:10px; font-weight:700;">${p}</button>
              `).join('')}
            </div>
        </div>

        <!-- Metric Cards -->
        <div class="finance-grid" id="finance-metrics">
           <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <!-- Tab Navigation -->
        <div class="tabs-alt" style="margin-top:32px; display:flex; gap:24px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0;">
           <button class="tab-alt-btn ${_activeTab === 'resumen'?'active':''}" onclick="Finances.setTab('resumen')">📊 RESUMEN</button>
           <button class="tab-alt-btn ${_activeTab === 'ingresos'?'active':''}" onclick="Finances.setTab('ingresos')">💰 INGRESOS</button>
           <button class="tab-alt-btn ${_activeTab === 'egresos'?'active':''}" onclick="Finances.setTab('egresos')">💸 EGRESOS</button>
        </div>

        <div id="finance-tab-content" style="margin-top:24px;">
           <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await _load();
    _renderMetrics();
    _renderActiveTab();
  }

  async function _load() {
    const data = await Sheets.batchRead([
      CONFIG.SHEETS.FINANCE_INCOME, 
      CONFIG.SHEETS.FINANCE_EXPENSE,
      CONFIG.SHEETS.QUOTATIONS,
      CONFIG.SHEETS.CONTACTS
    ]);
    _income = data[CONFIG.SHEETS.FINANCE_INCOME] || [];
    _expenses = data[CONFIG.SHEETS.FINANCE_EXPENSE] || [];
    _quotes = data[CONFIG.SHEETS.QUOTATIONS] || [];
    _contacts = data[CONFIG.SHEETS.CONTACTS] || [];
  }

  async function _renderMetrics() {
    const metricsDiv = document.getElementById('finance-metrics');
    if (!metricsDiv) return;

    const currency = App.getCurrency();
    const rateRow = await Sheets.latestRate();
    const rate = rateRow ? Utils.toNumber(rateRow['Tasa Oficial']) : 0;
    const symbol = currency === 'USD' ? '$' : 'Bs.';

    const fIncome = _getFilteredData(_income);
    const fExpenses = _getFilteredData(_expenses);

    const totalIUSD = fIncome.reduce((sum, r) => sum + Utils.toNumber(r['Total USD']), 0);
    const totalEUSD = fExpenses.reduce((sum, r) => sum + Utils.toNumber(r['Total USD']), 0);
    const pendingUSD = _calculateTotalPending(fIncome); // Pass filtered income to calculate real pending

    const displayI = currency === 'VES' ? totalIUSD * rate : totalIUSD;
    const displayE = currency === 'VES' ? totalEUSD * rate : totalEUSD;
    const displayB = displayI - displayE;
    const displayP = currency === 'VES' ? pendingUSD * rate : pendingUSD;

    const format = (val) => currency === 'USD' ? Utils.formatUSD(val) : Utils.formatVES(val);

    metricsDiv.innerHTML = `
      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Ingresos (${currency})</div>
            <div class="icon-circle" style="background:#3b82f622; color:#3b82f6;">💰</div>
         </div>
         <div style="font-size:28px; font-weight:800; color:#fff; margin-top:8px;">${symbol} ${format(displayI)}</div>
         <div style="font-size:10px; color:#10b981; margin-top:8px; font-weight:700;">OK <span style="color:var(--text-muted); font-weight:400;">Flujo de caja</span></div>
      </div>
      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Egresos (${currency})</div>
            <div class="icon-circle" style="background:#ef444422; color:#ef4444;">💸</div>
         </div>
         <div style="font-size:28px; font-weight:800; color:#fff; margin-top:8px;">${symbol} ${format(displayE)}</div>
         <div style="font-size:10px; color:#ef4444; margin-top:8px; font-weight:700;">Control <span style="color:var(--text-muted); font-weight:400;">Gastos operativos</span></div>
      </div>
      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Balance Neto (${currency})</div>
            <div class="icon-circle" style="background:#10b98122; color:#10b981;">📊</div>
         </div>
         <div style="font-size:28px; font-weight:800; color:#fff; margin-top:8px;">${symbol} ${format(displayB)}</div>
         <div style="font-size:10px; color:#10b981; margin-top:8px; font-weight:700;">OK <span style="color:var(--text-muted); font-weight:400;">Rentabilidad</span></div>
      </div>
      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Pendiente (${currency})</div>
            <div class="icon-circle" style="background:#f59e0b22; color:#f59e0b;">⏳</div>
         </div>
         <div style="font-size:28px; font-weight:800; color:#fff; margin-top:8px;">${symbol} ${format(displayP)}</div>
         <div style="font-size:10px; color:#f59e0b; margin-top:8px; font-weight:700;">Vigente <span style="color:var(--text-muted); font-weight:400;">Cuentas por cobrar</span></div>
      </div>
    `;
  }

  function _getFilteredData(data) {
    if (!data || !data.length) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return data.filter(r => {
      if (!r['Fecha']) return false;
      const refDate = new Date(r['Fecha'] + 'T12:00:00');
      const diffDays = (today - refDate) / (1000 * 60 * 60 * 24);
      
      switch(_filterPeriod) {
        case 'hoy':       return diffDays >= -0.5 && diffDays <= 0.5;
        case 'semanal':   return diffDays <= 7;
        case 'quincenal': return diffDays <= 15;
        case 'mensual':   return diffDays <= 30;
        case 'trimestral': return diffDays <= 90;
        case 'semestral': return diffDays <= 180;
        case 'anual':      return diffDays <= 365;
        default: return true;
      }
    });
  }

  function _calculateTotalPending(filteredIncome) {
    // We only calculate pending for quotes that fall in the current period and are not yet fully paid
    return _quotes.reduce((sum, q) => {
      if (['Aceptada', 'Parcial'].includes(q['Estado'])) {
          const totalVal = Utils.toNumber(q['Total USD']);
          // Use the WHOLE income history to check if a quote is paid, not just the filtered one
          const paid = _income.filter(i => i['ID Cotización'] === q['ID']).reduce((s, i) => s + Utils.toNumber(i['Total USD']), 0);
          const balance = totalVal - paid;
          if (balance > 0) return sum + balance;
      }
      return sum;
    }, 0);
  }

  function _renderActiveTab() {
    const c = document.getElementById('finance-tab-content');
    if (!c) return;

    if (_activeTab === 'resumen') _renderResumen(c);
    if (_activeTab === 'ingresos') _renderIngresos(c);
    if (_activeTab === 'egresos') _renderEgresos(c);
  }

  function _renderResumen(c) {
    c.innerHTML = `
      <div class="finance-summary-layout">
         <div class="card" style="flex:2; min-height:300px; padding:24px;">
            <h3 style="font-size:14px; margin-bottom:20px;">💳 Por método de pago</h3>
            <div style="height:250px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
               Sin movimientos en este periodo
            </div>
         </div>
         <div class="card" style="flex:1; padding:24px;">
            <h3 style="font-size:14px; margin-bottom:20px;">🔗 Distribución por beneficiario</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
               ${_renderBeneficiaryList()}
            </div>
         </div>
      </div>
    `;
  }

  function _renderBeneficiaryList() {
    const items = [
      { label: 'Empresa (Operativos)', desc: 'Gastos operativos y utilidad', value: 0, icon: '🏢' },
      { label: 'Profesional (Honorarios)', desc: 'Honorarios por servicios médicos', value: 0, icon: '👤' },
      { label: 'Foráneos (Comisiones)', desc: 'Comisiones a referidores externos', value: 0, icon: '🌍' }
    ];
    return items.map(it => `
      <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
         <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:20px;">${it.icon}</div>
            <div>
               <div style="font-size:12px; font-weight:700; color:#fff;">${it.label}</div>
               <div style="font-size:10px; color:var(--text-muted);">${it.desc}</div>
            </div>
         </div>
         <div style="font-size:14px; font-weight:800; color:var(--primary-light);">$${it.value.toFixed(2)}</div>
      </div>
    `).join('');
  }

  function _renderIngresos(c) {
    const list = _getFilteredData(_income);
    c.innerHTML = `
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Concepto</th>
              <th>Método</th>
              <th style="text-align:right;">Monto USD</th>
              <th style="text-align:right;">Monto VES</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map(r => `
              <tr>
                <td>${Utils.formatDate(r['Fecha'])}</td>
                <td><small>${Utils.escapeHtml(r['ID Cliente'])}</small></td>
                <td>${Utils.escapeHtml(r['Concepto'])}</td>
                <td><span class="badge badge-neutral">${r['Método']}</span></td>
                <td style="text-align:right; font-weight:700;">$${Utils.formatUSD(r['Total USD'])}</td>
                <td style="text-align:right; color:var(--text-muted); font-size:11px;">Bs ${Utils.formatVES(r['Total VES'])}</td>
                <td><span class="badge badge-success">Recibido</span></td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="text-center py-4 text-muted">No hay ingresos registrados en este periodo</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderEgresos(c) {
    const list = _getFilteredData(_expenses);
    c.innerHTML = `
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Beneficiario</th>
              <th>Categoría</th>
              <th>Concepto</th>
              <th style="text-align:right;">Total USD</th>
              <th>Método</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map(r => `
              <tr>
                <td>${Utils.formatDate(r['Fecha'])}</td>
                <td class="td-bold">${Utils.escapeHtml(r['Beneficiario'])}</td>
                <td><span class="badge badge-primary">${r['Categoría'] || 'Otros'}</span></td>
                <td>${Utils.escapeHtml(r['Concepto'])}</td>
                <td style="text-align:right; font-weight:800; color:var(--error);">$${Utils.formatUSD(r['Total USD'])}</td>
                <td><span class="badge badge-neutral">${r['Método']}</span></td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">No hay egresos registrados en este periodo</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── Forms ────────────────────────────────────────────────────────────────

  function openIncomeForm() {
    Utils.showModal({
      title: 'Registrar Nuevo Ingreso',
      content: `
        <form id="income-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-input" name="Fecha" value="${Utils.todayISO()}" />
            </div>
            <div class="form-group">
              <label class="form-label">Método de Pago</label>
              <select class="form-select" name="Método">
                 ${CONFIG.PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group full">
               <label class="form-label">Vincular Cotización (Opcional)</label>
               <select class="form-select" name="ID Cotización" onchange="Finances._onQuoteSelect(this.value)">
                  <option value="">-- No vinculada (Cobro independiente) --</option>
                  ${_quotes.filter(q => ['Aceptada','Parcial'].includes(q['Estado'])).map(q => `
                    <option value="${q['ID']}">COT-${q['Número']} | ${q['ID Cliente']} ($${q['Total USD']})</option>
                  `).join('')}
               </select>
               <div id="quote-info-box" class="form-hint"></div>
            </div>
            <div class="form-group full">
              <label class="form-label">Concepto / Descripción <span class="required">*</span></label>
              <input class="form-input" name="Concepto" required placeholder="Ej: Abono 60% inicial - Servicio X" />
            </div>
            <div class="form-group">
               <label class="form-label">Monto USD <span class="required">*</span></label>
               <input type="number" step="0.01" class="form-input" name="Total USD" id="income-usd-input" value="0.00" oninput="Finances._recalcAll(this.value)" />
            </div>
            <div class="form-group">
               <label class="form-label">Tasa Cambio</label>
               <input type="number" step="0.01" class="form-input" name="Tasa" id="income-rate-input" oninput="Finances._recalcAll()" />
            </div>
            <div class="form-group">
               <label class="form-label">Monto VES</label>
               <input type="text" class="form-input" name="Total VES" id="income-ves-output" readonly style="background:var(--bg-card); opacity:0.7;" />
            </div>
            <div class="form-group">
               <label class="form-label">Banco Emisor</label>
               <select class="form-select" name="Banco">
                  <option value="">-- Seleccionar Banco --</option>
                  ${CONFIG.BANKS.map(b => `<option value="${b}">${b}</option>`).join('')}
               </select>
            </div>
            <div class="form-group">
               <label class="form-label">Referencia Nº</label>
               <input class="form-input" name="Referencia Nº" placeholder="Ej: 123456" />
            </div>
            <div class="form-group full">
               <label class="form-label">Observaciones Adicionales</label>
               <input class="form-input" name="Referencia" placeholder="Notas internas sobre el pago" />
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Finances.saveIncome()">Guardar Pago</button>
      `
    });

    // Auto-load latest rate
    Sheets.latestRate().then(r => {
      const input = document.getElementById('income-rate-input');
      if (input && r) input.value = r['Tasa Oficial'];
    });
  }

  function _recalcAll() {
    const usdVal = Utils.toNumber(document.getElementById('income-usd-input')?.value || 0);
    const rate = Utils.toNumber(document.getElementById('income-rate-input')?.value || 0);
    
    // Recalc VES
    const ves = usdVal * rate;
    const out = document.getElementById('income-ves-output');
    if (out) out.value = Utils.formatVES(ves);

    // Recalc Quote Info if selected
    const quoteId = document.querySelector('[name="ID Cotización"]')?.value;
    if (quoteId) _onQuoteSelect(quoteId);
  }

  function _onQuoteSelect(id) {
    const q = _quotes.find(x => x['ID'] === id);
    const box = document.getElementById('quote-info-box');
    if (!q) { box.innerHTML = ''; return; }

    const inputUsd = Utils.toNumber(document.getElementById('income-usd-input')?.value || 0);
    const paid = _income.filter(i => i['ID Cotización'] === id).reduce((s, i) => s + Utils.toNumber(i['Total USD']), 0);
    const totalQuote = Utils.toNumber(q['Total USD']);
    const currentBalance = totalQuote - paid;
    const newBalance = currentBalance - inputUsd;
    const coverage = totalQuote > 0 ? (inputUsd / totalQuote) * 100 : 0;
    
    let alertClass = 'info';
    let coverageText = `Este pago cubre el <b>${coverage.toFixed(1)}%</b> del total.`;
    
    if (newBalance <= 0.01) {
       alertClass = 'success';
       coverageText = `✅ Con este pago la cotización queda <b>TOTALMENTE PAGADA</b>.`;
    } else if (inputUsd > 0) {
       alertClass = 'warning';
       coverageText = `⚠️ Este pago es <b>PARCIAL</b> (${coverage.toFixed(1)}%). Restarán $${Utils.formatUSD(newBalance)} por cobrar.`;
    }

    box.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid rgba(255,255,255,0.05); border-left:4px solid ${alertClass === 'success'?'#10b981':'#3b82f6'}; border-radius:8px; padding:12px; margin-top:10px;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-muted);">Estado de Cuenta COT-${q['Número']}</span>
            <span style="font-size:12px; font-weight:800; color:#fff;">Saldo Hoy: $${Utils.formatUSD(currentBalance)}</span>
         </div>
         <div style="font-size:13px; color:#e2e8f0; line-height:1.4;">${coverageText}</div>
         <div style="margin-top:10px; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
            <div style="width:${Math.min(100, ((paid + inputUsd) / totalQuote) * 100).toFixed(0)}%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981);"></div>
         </div>
         <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:10px; color:var(--text-muted); font-weight:600;">
            <span>TOTAL: $${Utils.formatUSD(totalQuote)}</span>
            <span>RESTANTE: $${Utils.formatUSD(Math.max(0, newBalance))}</span>
         </div>
      </div>
    `;
  }

  async function saveIncome() {
    const data = Utils.getFormData('income-form');
    if (Utils.validateRequired(data, ['Concepto','Total USD']).length) {
       Utils.showToast('Introduzca el concepto y monto', 'warning'); return;
    }

    try {
      Utils.showToast('Procesando ingreso...', 'info');
      const usd = Utils.toNumber(data['Total USD']);
      const rate = Utils.toNumber(data['Tasa']);
      const entry = {
        'ID': Utils.generateId(),
        ...data,
        'Total VES': usd * rate,
        'Estado': 'Recibido',
        'Vendedor Email': App.getCurrentUserEmail() || 'staff'
      };

      await Sheets.appendRow(CONFIG.SHEETS.FINANCE_INCOME, entry);

      // Handle Quote logic
      if (data['ID Cotización']) {
         await _updateQuoteStatus(data['ID Cotización'], usd);
      }

      Utils.showToast('Pago registrado exitosamente', 'success');
      Utils.closeModal();
      await render(document.getElementById('main-content'));
    } catch(e) { 
      console.error(e); 
      Utils.showToast('Error: ' + e.message, 'error'); 
    }
  }

  async function _updateQuoteStatus(quoteId) {
     const q = _quotes.find(x => x['ID'] === quoteId);
     if (!q) return;

     // Fetch fresh data to be sure
     const incomeRows = await Sheets.readSheet(CONFIG.SHEETS.FINANCE_INCOME, false);
     const totalPaidNow = incomeRows.filter(i => i['ID Cotización'] === quoteId && i['Estado'] !== 'Anulado').reduce((s, i) => s + Utils.toNumber(i['Total USD']), 0);
     const totalQuote = Utils.toNumber(q['Total USD']);

     let newStatus = 'Parcial';
     if (totalPaidNow >= totalQuote - 0.05) { // Threshold for minor rounding differences
         newStatus = 'Pagada';
     } else if (totalPaidNow <= 0) {
         newStatus = 'Aceptada'; // or whatever it was before
     }

     await Sheets.updateRow(CONFIG.SHEETS.QUOTATIONS, quoteId, { ...q, 'Estado': newStatus });
  }

  function openExpenseForm() {
    Utils.showModal({
      title: 'Registrar Nuevo Egreso',
      content: `
        <form id="expense-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-input" name="Fecha" value="${Utils.todayISO()}" />
            </div>
            <div class="form-group">
              <label class="form-label">Categoría</label>
              <select class="form-select" name="Categoría">
                 ${CONFIG.EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group full">
              <label class="form-label">Beneficiario <span class="required">*</span></label>
              <input class="form-input" name="Beneficiario" required placeholder="Proveedor, Cooperado o Especialista" />
            </div>
            <div class="form-group full">
              <label class="form-label">Concepto <span class="required">*</span></label>
              <input class="form-input" name="Concepto" required placeholder="Ej: Pago de alquiler oficina" />
            </div>
            <div class="form-group">
               <label class="form-label">Monto (USD) <span class="required">*</span></label>
               <input type="number" step="0.01" class="form-input" name="Total USD" required value="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Método</label>
              <select class="form-select" name="Método">
                 ${CONFIG.PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
              </select>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Finances.saveExpense()" style="background:var(--error); border-color:var(--error);">Registrar Egreso</button>
      `
    });
  }

  async function saveExpense() {
    const data = Utils.getFormData('expense-form');
    if (Utils.validateRequired(data, ['Beneficiario','Concepto','Total USD']).length) {
       Utils.showToast('Introduzca los campos requeridos', 'warning'); return;
    }

    try {
      Utils.showToast('Procesando egreso...', 'info');
      const entry = {
        'ID': Utils.generateId(),
        ...data,
        'Estado': 'Pagado',
        'Usuario Email': App.getCurrentUserEmail() || 'staff'
      };
      await Sheets.appendRow(CONFIG.SHEETS.FINANCE_EXPENSE, entry);
      Utils.showToast('Egreso registrado', 'success');
      Utils.closeModal();
      await render(document.getElementById('main-content'));
    } catch(e) { Utils.showToast('Error: ' + e.message, 'error'); }
  }

  async function exportPDF() {
    try {
      const config = await Sheets.getAllConfig();
      const filteredInc = _getFilteredData(_income);
      const filteredExp = _getFilteredData(_expenses);
      const totalI = filteredInc.reduce((s, r) => s + Utils.toNumber(r['Total USD']), 0);
      const totalE = filteredExp.reduce((s, r) => s + Utils.toNumber(r['Total USD']), 0);
      const balance = totalI - totalE;

      const reportHTML = `
        <div style="margin-bottom:8mm; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center;">
           <div>
              <div style="font-size:10px; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Balance del Periodo</div>
              <div style="font-size:28px; font-weight:900; color:#1e293b; margin-top:4px;">$ ${Utils.formatUSD(balance)}</div>
           </div>
           <div style="text-align:right;">
              <div style="font-size:11px; color:#10b981; font-weight:700;">▲ Ingresos: $ ${Utils.formatUSD(totalI)}</div>
              <div style="font-size:11px; color:#ef4444; font-weight:700; margin-top:4px;">▼ Egresos: $ ${Utils.formatUSD(totalE)}</div>
           </div>
        </div>

        <h3 style="font-size:13px; font-weight:800; color:#1e293b; margin-bottom:10px; text-transform:uppercase; border-left:4px solid #3b82f6; padding-left:10px;">Detalle de Ingresos</h3>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px; margin-bottom:10mm;">
           <thead>
              <tr style="background:#3b82f6; color:#ffffff; text-align:left;">
                 <th style="padding:6px 10px; border-radius:4px 0 0 4px;">Fecha</th>
                 <th style="padding:6px 10px;">Cliente</th>
                 <th style="padding:6px 10px;">Concepto</th>
                 <th style="padding:6px 10px; text-align:right; border-radius:0 4px 4px 0;">Monto USD</th>
              </tr>
           </thead>
           <tbody>
              ${filteredInc.map(r => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                   <td style="padding:6px 10px;">${Utils.formatDate(r['Fecha'])}</td>
                   <td style="padding:6px 10px; font-weight:700;">${Utils.escapeHtml(r['ID Cliente'])}</td>
                   <td style="padding:6px 10px; color:#64748b;">${Utils.escapeHtml(r['Concepto'])}</td>
                   <td style="padding:6px 10px; text-align:right; font-weight:800; color:#1e293b;">$ ${Utils.formatUSD(r['Total USD'])}</td>
                </tr>
              `).join('')}
           </tbody>
        </table>

        <h3 style="font-size:13px; font-weight:800; color:#1e293b; margin-bottom:10px; text-transform:uppercase; border-left:4px solid #ef4444; padding-left:10px;">Detalle de Egresos</h3>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px;">
           <thead>
              <tr style="background:#ef4444; color:#ffffff; text-align:left;">
                 <th style="padding:6px 10px; border-radius:4px 0 0 4px;">Fecha</th>
                 <th style="padding:6px 10px;">Beneficiario</th>
                 <th style="padding:6px 10px;">Categoría</th>
                 <th style="padding:6px 10px; text-align:right; border-radius:0 4px 4px 0;">Monto USD</th>
              </tr>
           </thead>
           <tbody>
              ${filteredExp.map(r => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                   <td style="padding:6px 10px;">${Utils.formatDate(r['Fecha'])}</td>
                   <td style="padding:6px 10px; font-weight:700;">${Utils.escapeHtml(r['Beneficiario'])}</td>
                   <td style="padding:6px 10px; color:#64748b;">${Utils.escapeHtml(r['Categoría'])}</td>
                   <td style="padding:6px 10px; text-align:right; font-weight:800; color:#ef4444;">$ ${Utils.formatUSD(r['Total USD'])}</td>
                </tr>
              `).join('')}
           </tbody>
        </table>
      `;

      await ReportBuilder.generateEliteReport({
        title: `Reporte Financiero (${_filterPeriod.toUpperCase()})`,
        filename: `Reporte-Financiero-${Utils.todayISO()}.pdf`,
        contentHTML: reportHTML
      });

    } catch (e) {
      Utils.showToast('Error al exportar finanzas: ' + e.message, 'error');
    }
  }

  return {
    render, setPeriod: (p) => { _filterPeriod = p; render(document.getElementById('main-content')); },
    setTab: (t) => { _activeTab = t; _renderActiveTab(); },
    openIncomeForm, openExpenseForm, saveIncome, saveExpense, exportPDF,
    _recalcAll, _onQuoteSelect
  };
})();
