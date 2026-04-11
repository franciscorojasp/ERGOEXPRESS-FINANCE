/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS-FINANCE — Centro de Nómina Integral (Payroll Module)
 * v1.0: Frecuencias Flexibles + Notificación Humanizada + PDF
 * ════════════════════════════════════════════════════════════════════════════
 */

const Payroll = (() => {
  let _container = null;
  let _employees = [];
  let _productivity = [];
  let _currentFrequency = 'mensual'; // Default

  async function render(container) {
    _container = container;
    _container.innerHTML = `
      <div class="view-header">
        <div class="header-content">
          <h1 class="view-title">Gestión de Nómina Integral</h1>
          <p class="view-subtitle">Liquidación de sueldos, destajos y pagos por proyecto</p>
        </div>
        <div class="header-actions">
          <div class="select-group">
            <label style="font-size:12px; color:var(--text-secondary); margin-bottom:4px; display:block;">Frecuencia de Pago:</label>
            <select id="payroll-frequency" class="input-field" style="width:180px;">
              <option value="diario">Diario (1/30)</option>
              <option value="semanal">Semanal (1/4)</option>
              <option value="quincenal">Quincenal (1/2)</option>
              <option value="mensual" selected>Mensual (100%)</option>
              <option value="destajo">Solo Destajo / Proyecto</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btn-refresh-payroll">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Recalcular
          </button>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total a Liquidar (USD)</div>
          <div class="kpi-value primary" id="kpi-payroll-total-usd">$ 0.00</div>
          <div class="kpi-trend" id="kpi-payroll-total-ves">Bs. 0,00</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Personal en Nómina</div>
          <div class="kpi-value" id="kpi-payroll-count">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Tareas de Destajo Pendientes</div>
          <div class="kpi-value" id="kpi-payroll-tasks">0</div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <h3 class="card-title">Previsualización de Pagos</h3>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Sueldo Fijo (Base)</th>
                <th>Destajo/Productividad</th>
                <th>Bonos</th>
                <th>Deducciones (Ley)</th>
                <th>Neto a Pagar</th>
                <th style="width:120px;">Acciones</th>
              </tr>
            </thead>
            <tbody id="payroll-table-body">
              <tr><td colspan="7" style="text-align:center; padding:40px;">Cargando motor de nómina...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('payroll-frequency').addEventListener('change', e => {
      _currentFrequency = e.target.value;
      updateTable();
    });

    document.getElementById('btn-refresh-payroll').addEventListener('click', loadData);

    await loadData();
  }

  async function loadData() {
    try {
      Utils.showToast('Calculando nómina integral...', 'info');
      // Fetch employees and productivity details
      const [empResults, prodResults] = await Promise.all([
        Sheets.get('Nomina_Control'),
        Sheets.get('Nomina_Detalle')
      ]);

      _employees = empResults.data || [];
      _productivity = prodResults.data || [];

      updateTable();
    } catch (e) {
      console.error(e);
      Utils.showToast('Error al cargar datos de nómina', 'error');
    }
  }

  function updateTable() {
    const tbody = document.getElementById('payroll-table-body');
    if (_employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">No hay personal registrado en Nomina_Control</td></tr>';
      return;
    }

    const tasa = Utils.toNumber(App.getRate());
    let grandTotalUSD = 0;
    let pendingTasksCount = 0;

    const html = _employees.map(emp => {
      const idEmp = emp.ID_Empleado;
      const sueldoMensualUSD = Utils.toNumber(emp.Sueldo_USD_Base);
      
      // Calculate fraction of fixed salary
      let fixedUSD = 0;
      if (_currentFrequency === 'diario') fixedUSD = sueldoMensualUSD / 30;
      else if (_currentFrequency === 'semanal') fixedUSD = sueldoMensualUSD / 4;
      else if (_currentFrequency === 'quincenal') fixedUSD = sueldoMensualUSD / 2;
      else if (_currentFrequency === 'mensual') fixedUSD = sueldoMensualUSD;
      else fixedUSD = 0; // "Solo Destajo"

      // Calculate accumulated piecework (PENDIENTE)
      const empProd = _productivity.filter(p => String(p.ID_Empleado) === String(idEmp) && p.Estatus_Pago === 'PENDIENTE');
      const destajoUSD = empProd.reduce((sum, p) => sum + Utils.toNumber(p.Subtotal_USD), 0);
      pendingTasksCount += empProd.length;

      // Deductions (Mocking simplified fiscal math for UI)
      const totalBrutoUSD = fixedUSD + destajoUSD;
      const deduccionesUSD = totalBrutoUSD * 0.05; // 5% approx simplified for UI
      const netoUSD = totalBrutoUSD - deduccionesUSD;
      
      grandTotalUSD += netoUSD;

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${emp.Nombre}</div>
            <div style="font-size:11px; color:var(--text-secondary);">ID: ${idEmp}</div>
          </td>
          <td>$ ${Utils.formatUSD(fixedUSD)}</td>
          <td>
            <div style="color:var(--success-color); font-weight:500;">$ ${Utils.formatUSD(destajoUSD)}</div>
            <div style="font-size:11px;">${empProd.length} tareas ptes.</div>
          </td>
          <td>$ 0.00</td>
          <td style="color:var(--error-color);">$ ${Utils.formatUSD(deduccionesUSD)}</td>
          <td style="font-weight:700; color:var(--primary-color);">$ ${Utils.formatUSD(netoUSD)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-icon-sm" onclick="Payroll.previewPaystub('${idEmp}')" title="Ver Recibo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </button>
              <button class="btn btn-icon-sm" style="color:var(--success-color);" onclick="Payroll.executePayment('${idEmp}')" title="Pagar y Notificar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
    
    // Update KPIs
    document.getElementById('kpi-payroll-total-usd').textContent = `$ ${Utils.formatUSD(grandTotalUSD)}`;
    document.getElementById('kpi-payroll-total-ves').textContent = `Bs. ${Utils.formatVES(grandTotalUSD * tasa)}`;
    document.getElementById('kpi-payroll-count').textContent = _employees.length;
    document.getElementById('kpi-payroll-tasks').textContent = pendingTasksCount;
  }

  function _calculateEmpPay(emp) {
    const tasa = Utils.toNumber(App.getRate());
    const sueldoMensualUSD = Utils.toNumber(emp.Sueldo_USD_Base);
    
    let fixedUSD = 0;
    if (_currentFrequency === 'diario') fixedUSD = sueldoMensualUSD / 30;
    else if (_currentFrequency === 'semanal') fixedUSD = sueldoMensualUSD / 4;
    else if (_currentFrequency === 'quincenal') fixedUSD = sueldoMensualUSD / 2;
    else if (_currentFrequency === 'mensual') fixedUSD = sueldoMensualUSD;
    
    const empProd = _productivity.filter(p => String(p.ID_Empleado) === String(emp.ID_Empleado) && p.Estatus_Pago === 'PENDIENTE');
    const destajoUSD = empProd.reduce((sum, p) => sum + Utils.toNumber(p.Subtotal_USD), 0);

    const totalBrutoUSD = fixedUSD + destajoUSD;
    const deduccionesUSD = totalBrutoUSD * 0.05; // Simplificado para demo
    const netoUSD = totalBrutoUSD - deduccionesUSD;

    return { fixedUSD, destajoUSD, tasks: empProd.length, totalBrutoUSD, deduccionesUSD, netoUSD, tasa };
  }

  async function previewPaystub(idEmp) {
    const emp = _employees.find(e => String(e.ID_Empleado) === String(idEmp));
    if (!emp) return;

    const calc = _calculateEmpPay(emp);

    Utils.showModal({
      title: `Recibo de Pago — ${emp.Nombre}`,
      size: 'lg',
      content: `
        <div class="paystub-preview" id="paystub-render">
          <div style="display:flex; justify-content:space-between; border-bottom:2px solid var(--border-color); padding-bottom:15px; margin-bottom:15px;">
            <div>
              <h2 style="margin:0; color:var(--primary-color);">ERGOEXPRESS-FINANCE</h2>
              <p style="font-size:12px; margin:2px 0;">RIF: J-50251246-2</p>
            </div>
            <div style="text-align:right;">
              <p style="font-weight:700; margin:0;">RECIBO DE PAGO</p>
              <p style="font-size:12px; margin:2px 0;">Periodo: ${_currentFrequency.toUpperCase()}</p>
              <p style="font-size:11px; color:var(--text-secondary);">Fecha emisión: ${Utils.formatDate(new Date())}</p>
            </div>
          </div>
          
          <div style="margin-bottom:20px; font-size:14px;">
            <b>Empleado:</b> ${emp.Nombre}<br>
            <b>ID:</b> ${emp.ID_Empleado} | <b>Frecuencia:</b> ${_currentFrequency}
          </div>

          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr style="background:var(--bg-secondary); font-weight:700;">
              <th style="padding:10px; text-align:left;">Concepto</th>
              <th style="padding:10px; text-align:right;">Asignaciones</th>
              <th style="padding:10px; text-align:right;">Deducciones</th>
            </tr>
            <tr>
              <td style="padding:10px; border-bottom:1px solid var(--border-color);">Sueldo Fijo Proporcional</td>
              <td style="padding:10px; border-bottom:1px solid var(--border-color); text-align:right;">$ ${Utils.formatUSD(calc.fixedUSD)}</td>
              <td style="padding:10px; border-bottom:1px solid var(--border-color); text-align:right;">—</td>
            </tr>
            <tr>
              <td style="padding:10px; border-bottom:1px solid var(--border-color);">Productividad (${calc.tasks} tareas)</td>
              <td style="padding:10px; border-bottom:1px solid var(--border-color); text-align:right;">$ ${Utils.formatUSD(calc.destajoUSD)}</td>
              <td style="padding:10px; border-bottom:1px solid var(--border-color); text-align:right;">—</td>
            </tr>
            <tr>
              <td style="padding:10px; border-bottom:1px solid var(--border-color);">Retenciones de Ley (Est.)</td>
              <td style="padding:10px; border-bottom:1px solid var(--border-color); text-align:right;">—</td>
              <td style="padding:10px; border-bottom:1px solid var(--border-color); text-align:right; color:var(--error-color); font-weight:600;">$ ${Utils.formatUSD(calc.deduccionesUSD)}</td>
            </tr>
          </table>

          <div style="background:var(--primary-color); color:white; padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:16px; font-weight:700;">NETO A PAGAR</div>
            <div style="text-align:right;">
              <div style="font-size:24px; font-weight:800;">$ ${Utils.formatUSD(calc.netoUSD)}</div>
              <div style="font-size:12px; opacity:0.9;">Bs. ${Utils.formatVES(calc.netoUSD * calc.tasa)} (Tasa: ${calc.tasa})</div>
            </div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="Payroll.processAndNotify('${idEmp}')">Procesar Pago y Notificar</button>
      `
    });
  }

  async function processAndNotify(idEmp) {
    const emp = _employees.find(e => String(e.ID_Empleado) === String(idEmp));
    if (!emp) return;

    const calc = _calculateEmpPay(emp);

    Utils.confirm(`¿Estás seguro de procesar el pago de ${emp.Nombre}? Se generará un egreso contable de $ ${Utils.formatUSD(calc.netoUSD)} y se enviarán comprobantes por Email/WhatsApp.`, async () => {
      try {
        Utils.closeModal();
        Utils.showToast("Generando reporte y procesando pago...", "info");

        const response = await App.callServer("executePayrollAction", [{
          employeeId: idEmp,
          frequency: _currentFrequency,
          amountUSD: calc.netoUSD,
          phone: emp['Teléfono'] || emp['Telefono'] || '580000000'
        }]);

        if (response.success) {
          Utils.showToast(`Pago procesado para ${emp.Nombre}`, "success");
          
          // Smart WhatsApp Redirection
          const msg = `¡Hola ${emp.Nombre.split(' ')[0]}! 🌟 Esperamos que tengas un excelente día. Te informamos que se ha procesado tu pago de Nómina (${_currentFrequency.toUpperCase()}). Adjunto a tu correo encontrarás el recibo PDF detallado. ¡Gracias por tu gran trabajo!`;
          Utils.smartWhatsApp(response.phone, msg);

          loadData();
        } else {
          Utils.showToast("Error: " + (response.error || "Fallo en el servidor"), "error");
        }
      } catch (e) {
        console.error(e);
        Utils.showToast("Error de conexión al procesar nómina", "error");
      }
    });
  }

  return { render, previewPaystub, executePayment: previewPaystub, processAndNotify };
})();
