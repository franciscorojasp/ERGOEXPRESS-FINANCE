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
         <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
               <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Ingresos (${currency})</div>
               <div style="font-size:26px; font-weight:900; color:#fff; margin-top:10px; font-family:var(--font-heading);">${symbol} ${format(displayI)}</div>
            </div>
            <div class="icon-circle" style="background:rgba(59,130,246,0.1); color:#3b82f6;">💰</div>
         </div>
         <div style="font-size:10px; color:#10b981; margin-top:16px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span style="width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
            OK <span style="color:var(--text-muted); font-weight:400; font-family:var(--font-main);">Flujo de caja positivo</span>
         </div>
      </div>

      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
               <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Egresos (${currency})</div>
               <div style="font-size:26px; font-weight:900; color:#fff; margin-top:10px; font-family:var(--font-heading);">${symbol} ${format(displayE)}</div>
            </div>
            <div class="icon-circle" style="background:rgba(239,68,68,0.1); color:#ef4444;">💸</div>
         </div>
         <div style="font-size:10px; color:#ef4444; margin-top:16px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span style="width:6px; height:6px; background:#ef4444; border-radius:50%; box-shadow:0 0 8px #ef4444;"></span>
            CONTROL <span style="color:var(--text-muted); font-weight:400; font-family:var(--font-main);">Gastos operativos</span>
         </div>
      </div>

      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
               <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Balance Neto (${currency})</div>
               <div style="font-size:26px; font-weight:900; color:#fff; margin-top:10px; font-family:var(--font-heading);">${symbol} ${format(displayB)}</div>
            </div>
            <div class="icon-circle" style="background:rgba(16,185,129,0.1); color:#10b981;">📊</div>
         </div>
         <div style="font-size:10px; color:#10b981; margin-top:16px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span style="width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
            RENTABLE <span style="color:var(--text-muted); font-weight:400; font-family:var(--font-main);">Utilidad del periodo</span>
         </div>
      </div>

      <div class="stat-card-finance">
         <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
               <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Pendiente (${currency})</div>
               <div style="font-size:26px; font-weight:900; color:#fff; margin-top:10px; font-family:var(--font-heading);">${symbol} ${format(displayP)}</div>
            </div>
            <div class="icon-circle" style="background:rgba(245,158,11,0.1); color:#f59e0b;">⏳</div>
         </div>
         <div style="font-size:10px; color:#f59e0b; margin-top:16px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <span style="width:6px; height:6px; background:#f59e0b; border-radius:50%; box-shadow:0 0 8px #f59e0b;"></span>
            VIGENTE <span style="color:var(--text-muted); font-weight:400; font-family:var(--font-main);">Cuentas por cobrar</span>
         </div>
      </div>
    `;
  }

  function _getFilteredData(data) {
    if (!data || !data.length) return [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Obtenemos el inicio de la semana (Lunes)
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);

    return data.filter(r => {
      if (!r['Fecha']) return false;
      const refDate = new Date(r['Fecha'] + 'T12:00:00');
      const rYear = refDate.getFullYear();
      const rMonth = refDate.getMonth();
      const rDay = refDate.getDate();

      switch(_filterPeriod) {
        case 'hoy': 
          return rYear === currentYear && rMonth === currentMonth && rDay === currentDay;
        
        case 'semanal':
          return refDate >= startOfWeek && refDate <= now;

        case 'quincenal':
          // Quincena actual: 1-15 o 16-fin
          if (currentDay <= 15) {
            return rYear === currentYear && rMonth === currentMonth && rDay <= 15;
          } else {
            return rYear === currentYear && rMonth === currentMonth && rDay > 15;
          }

        case 'mensual':
          return rYear === currentYear && rMonth === currentMonth;

        case 'trimestral':
          const currentTrim = Math.floor(currentMonth / 3);
          const rTrim = Math.floor(rMonth / 3);
          return rYear === currentYear && rTrim === currentTrim;

        case 'semestral':
          const currentSem = currentMonth < 6 ? 0 : 1;
          const rSem = rMonth < 6 ? 0 : 1;
          return rYear === currentYear && rSem === currentSem;

        case 'anual':
          return rYear === currentYear;

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
                <td class="td-bold">${Utils.escapeHtml(r['ID Cliente'])}</td>
                <td>
                  <div style="font-weight:600;">${Utils.escapeHtml(r['Concepto'])}</div>
                  <div style="font-size:10px; color:var(--text-muted); display:flex; gap:8px;">
                     <span>${r['Banco'] || ''}</span>
                     ${r['Referencia Nº'] ? `<span>• Ref: ${r['Referencia Nº']}</span>` : ''}
                  </div>
                </td>
                <td><span class="badge badge-neutral">${r['Método']}</span></td>
                <td style="text-align:right; font-weight:700; color:var(--primary-light);">$${Utils.formatUSD(r['Total USD'])}</td>
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
                <td class="td-bold">
                  <div>${Utils.escapeHtml(r['Beneficiario'])}</div>
                  ${r['Pagador'] ? `<div style="font-size:10px; color:var(--text-muted); font-weight:400; font-style:italic;">Pagado por: ${r['Pagador']}</div>` : ''}
                </td>
                <td><span class="badge badge-primary">${r['Categoría'] || 'Otros'}</span></td>
                <td>
                  <div style="font-weight:600;">${Utils.escapeHtml(r['Concepto'])}</div>
                  <div style="font-size:10px; color:var(--text-muted); display:flex; gap:8px;">
                     <span>${r['Banco'] || ''}</span>
                     ${r['Referencia Nº'] ? `<span>• Ref: ${r['Referencia Nº']}</span>` : ''}
                  </div>
                </td>
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
    // Historial de pagadores para el datalist
    const pagadores = [...new Set(_expenses.map(e => e['Pagador']).filter(p => !!p))];
    
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
            <div class="form-group">
               <label class="form-label">Banco Emisor</label>
               <select class="form-select" name="Banco">
                  <option value="">-- Seleccionar --</option>
                  ${CONFIG.BANKS.map(b => `<option value="${b}">${b}</option>`).join('')}
               </select>
            </div>
            <div class="form-group">
               <label class="form-label">Referencia Nº</label>
               <input class="form-input" name="Referencia Nº" placeholder="Nº de transferencia" />
            </div>
            <div class="form-group full">
               <label class="form-label">Quién realizó el pago (Pagador)</label>
               <input class="form-input" name="Pagador" list="pagadores-list" placeholder="Nombre de la persona o entidad" />
               <datalist id="pagadores-list">
                  ${pagadores.map(p => `<option value="${Utils.escapeHtml(p)}">`).join('')}
               </datalist>
               <div class="form-hint">Escribe un nuevo nombre o selecciona uno del historial.</div>
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
    const form = document.querySelector('#expense-form');
    if (!form.checkValidity()) return form.reportValidity();

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    
    const tasa = App.getTasaSugerida() || 1;
    const usd  = Utils.toNumber(data['Total USD']);

    const entry = {
      ID: Utils.uuid(),
      Fecha: data.Fecha,
      Beneficiario: data.Beneficiario,
      Categoría: data.Categoría,
      Concepto: data.Concepto,
      Método: data.Método,
      Banco: data.Banco || '',
      'Referencia Nº': data['Referencia Nº'] || '',
      Pagador: data.Pagador || '',
      Tasa: tasa,
      'Total USD': usd,
      'Total VES': usd * tasa,
      Estado: 'Completado',
      'Usuario Email': App.getUser()?.email || 'sistema',
      Referencia: '' 
    };

    Utils.showLoading('Guardando egreso...');
    const res = await Backend.append('Finanzas_Egresos', entry);
    Utils.hideLoading();

    if (res.success) {
      Utils.showToast('Egreso registrado correctamente');
      Utils.closeModal();
      await init(); 
    } else {
      Utils.showToast('Error al guardar: ' + res.error, 'error');
    }
  }

  async function exportPDF() {
    try {
      const filteredInc = _getFilteredData(_income);
      const filteredExp = _getFilteredData(_expenses);
      const totalI = filteredInc.reduce((s, r) => s + Utils.toNumber(r['Total USD']), 0);
      const totalE = filteredExp.reduce((s, r) => s + Utils.toNumber(r['Total USD']), 0);
      const balance = totalI - totalE;

      // Gráfico de torta SVG dinámico
      const totalMov = totalI + totalE;
      let chartHTML = '';
      if (totalMov > 0) {
        const pInc = (totalI / totalMov) * 100;
        const pExp = (totalE / totalMov) * 100;
        const radius = 15.91549430918954; 
        
        chartHTML = `
          <div style="display:flex; align-items:center; gap:40px; margin:25px 0; padding:20px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
            <div style="position:relative; width:120px; height:120px;">
              <svg width="120" height="120" viewBox="0 0 42 42" style="transform: rotate(-90deg);">
                <circle cx="21" cy="21" r="${radius}" fill="transparent" stroke="#ef4444" stroke-width="10"></circle>
                <circle cx="21" cy="21" r="${radius}" fill="transparent" stroke="#3b82f6" stroke-width="10" stroke-dasharray="${pInc} ${pExp}"></circle>
              </svg>
            </div>
            <div style="flex:1;">
               <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:12px; letter-spacing:1px;">Distribución de Capital</div>
               <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                  <span style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700;">
                    <span style="width:10px; height:10px; background:#3b82f6; border-radius:2px;"></span> Ingresos
                  </span>
                  <span style="font-size:12px; font-weight:800; color:#1e293b;">$ ${Utils.formatUSD(totalI)} (${pInc.toFixed(1)}%)</span>
               </div>
               <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700;">
                    <span style="width:10px; height:10px; background:#ef4444; border-radius:2px;"></span> Egresos
                  </span>
                  <span style="font-size:12px; font-weight:800; color:#1e293b;">$ ${Utils.formatUSD(totalE)} (${pExp.toFixed(1)}%)</span>
               </div>
            </div>
          </div>
        `;
      }

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

        ${chartHTML}

        <div style="margin-top:20px; width:100%;">
           <h3 style="font-size:13px; font-weight:800; color:#1e293b; margin-bottom:12px; text-transform:uppercase; border-left:4px solid #3b82f6; padding-left:10px;">Detalle Completo de Ingresos</h3>
           <table style="width:100%; border-spacing:0; border-collapse:collapse; font-size:9px; background:#ffffff;">
              <thead>
                 <tr style="background-color:#3b82f6 !important; color:#ffffff !important; -webkit-print-color-adjust:exact;">
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #2563eb;">Fecha</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #2563eb;">Cliente</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #2563eb;">Concepto / Referencia</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #2563eb;">Método</th>
                    <th style="padding:8px 10px; text-align:right; border-bottom:2px solid #2563eb;">Monto USD</th>
                 </tr>
              </thead>
              <tbody>
                 ${filteredInc.map(r => `
                   <tr style="border-bottom:1px solid #e2e8f0;">
                      <td style="padding:8px 10px;">${Utils.formatDate(r['Fecha'])}</td>
                      <td style="padding:8px 10px; font-weight:700;">${Utils.escapeHtml(r['ID Cliente'])}</td>
                      <td style="padding:8px 10px; color:#64748b;">
                         <div style="font-weight:600; color:#1e293b;">${Utils.escapeHtml(r['Concepto'] || '-')}</div>
                         <div style="font-size:8px;">${r['Banco'] || ''} ${r['Referencia Nº'] ? '• Ref: '+r['Referencia Nº'] : ''}</div>
                      </td>
                      <td style="padding:8px 10px;">${r['Método'] || '-'}</td>
                      <td style="padding:8px 10px; text-align:right; font-weight:800; color:#1e293b;">$ ${Utils.formatUSD(r['Total USD'])}</td>
                   </tr>
                 `).join('')}
                 ${filteredInc.length === 0 ? '<tr><td colspan="5" style="padding:30px; text-align:center; color:#64748b; font-style:italic;">No se encontraron ingresos en este periodo.</td></tr>' : ''}
              </tbody>
           </table>
        </div>

        <div style="margin-top:30px; width:100%;">
           <h3 style="font-size:13px; font-weight:800; color:#1e293b; margin-bottom:12px; text-transform:uppercase; border-left:4px solid #ef4444; padding-left:10px;">Detalle Completo de Egresos</h3>
           <table style="width:100%; border-spacing:0; border-collapse:collapse; font-size:9px; background:#ffffff;">
              <thead>
                 <tr style="background-color:#ef4444 !important; color:#ffffff !important; -webkit-print-color-adjust:exact;">
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #dc2626;">Fecha</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #dc2626;">Beneficiario / Pagador</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #dc2626;">Concepto / Referencia</th>
                    <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #dc2626;">Cat / Método</th>
                    <th style="padding:8px 10px; text-align:right; border-bottom:2px solid #dc2626;">Monto USD</th>
                 </tr>
              </thead>
              <tbody>
                 ${filteredExp.map(r => `
                   <tr style="border-bottom:1px solid #e2e8f0;">
                      <td style="padding:8px 10px;">${Utils.formatDate(r['Fecha'])}</td>
                      <td style="padding:8px 10px;">
                         <div style="font-weight:700; color:#1e293b;">${Utils.escapeHtml(r['Beneficiario'] || '-')}</div>
                         ${r['Pagador'] ? `<div style="font-size:8px; color:#ef4444; font-style:italic;">Pagado por: ${r['Pagador']}</div>` : ''}
                      </td>
                      <td style="padding:8px 10px; color:#64748b;">
                         <div style="font-weight:600; color:#1e293b;">${Utils.escapeHtml(r['Concepto'] || '-')}</div>
                         <div style="font-size:8px;">${r['Banco'] || ''} ${r['Referencia Nº'] ? '• Ref: '+r['Referencia Nº'] : ''}</div>
                      </td>
                      <td style="padding:8px 10px;">
                         <div>${r['Categoría'] || 'Otros'}</div>
                         <div style="font-size:8px; color:#64748b;">${r['Método']}</div>
                      </td>
                      <td style="padding:8px 10px; text-align:right; font-weight:800; color:#1e293b;">$ ${Utils.formatUSD(r['Total USD'])}</td>
                   </tr>
                 `).join('')}
                 ${filteredExp.length === 0 ? '<tr><td colspan="5" style="padding:30px; text-align:center; color:#64748b; font-style:italic;">No se encontraron egresos en este periodo.</td></tr>' : ''}
              </tbody>
           </table>
        </div>
      `;

      await ReportBuilder.generateEliteReport({
        title: `Reporte Financiero (${_filterPeriod.toUpperCase()})`,
        filename: `Reporte-Financiero-${Utils.todayISO()}.pdf`,
        contentHTML: reportHTML
      });

    } catch (e) {
      console.error('[Finances] Error export:', e);
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
