/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS-FINANCE — Módulo de Productividad y Destajo
   Tracking de tareas, costos laborales y eficiencia de operadores.
   ════════════════════════════════════════════════════════════════════════════ */

const Productivity = (() => {
  let _charts = {};

  async function render(container) {
    if (!container) return;

    container.innerHTML = `
      <div class="fade-in dash-layout-wrapper">
        <div class="dash-header-section">
          <div>
            <h1 class="page-title">Panel de Productividad</h1>
            <p class="page-subtitle">Rendimiento de Operadores y Costos de Destajo</p>
          </div>
          <div class="dash-header-controls">
             <button class="btn btn-secondary btn-icon-only" onclick="Productivity.reload()" title="Sincronizar">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                 <polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.8-6.5L23 10"/>
               </svg>
             </button>
          </div>
        </div>

        <!-- KPIs -->
        <div class="grid-KPIs" id="prod-kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Monto por Pagar (USD)</div>
            <div class="kpi-value" id="kpi-total-usd">—</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Tareas Pendientes</div>
            <div class="kpi-value" id="kpi-pending-tasks">—</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Empleado Estrella</div>
            <div class="kpi-value" id="kpi-top-employee">—</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Costo Proyectado (VES)</div>
            <div class="kpi-value" id="kpi-total-ves">—</div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid-2 dash-charts-row" style="margin-top:24px;">
          <div class="card">
            <div class="card-header">
               <h3 class="card-title">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-right:8px;">
                   <path d="M12 20v-6M6 20V10M18 20V4"/>
                 </svg>
                 Costo por Tipo de Tarea (USD)
               </h3>
            </div>
            <div class="card-body chart-container" style="height:320px;">
              <canvas id="chart-prod-tasks"></canvas>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
               <h3 class="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-right:8px;">
                   <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"/>
                 </svg>
                 Distribución de Carga por Operador
               </h3>
            </div>
            <div class="card-body chart-container" style="height:320px;">
              <canvas id="chart-prod-employees"></canvas>
            </div>
          </div>
        </div>

        <!-- Recent Tasks Table -->
        <div class="card" style="margin-top:24px;">
           <div class="card-header">
             <h3 class="card-title">Últimos Registros de Productividad</h3>
           </div>
           <div class="card-body no-padding overflow-x">
             <table class="data-table" id="prod-recent-table">
               <thead>
                 <tr>
                   <th>Fecha</th>
                   <th>Empleado</th>
                   <th>Tarea</th>
                   <th>Cant.</th>
                   <th>Subtotal USD</th>
                   <th>Estatus</th>
                 </tr>
               </thead>
               <tbody id="prod-recent-body">
                 <tr><td colspan="6" style="text-align:center; padding:40px;">Cargando registros...</td></tr>
               </tbody>
             </table>
           </div>
        </div>
      </div>
    `;

    await _loadData();
  }

  async function _loadData() {
    try {
      // Intentamos cargar Nomina_Detalle, si no existe devolvemos vacio
      let tasks = [];
      try {
        tasks = await Sheets.readSheet('Nomina_Detalle', false);
      } catch(e) {
        console.warn('Hoja Nomina_Detalle no encontrada. ¿Se ejecutó la migración?');
      }

      const rates = await Sheets.readSheet('TasasCambio', false);
      const latestRate = rates && rates.length > 0 ? Utils.toNumber(rates[0]['Tasa Oficial']) : 0;

      // Filter Pending
      const pendingTasks = tasks.filter(t => String(t['Estatus_Pago']).toUpperCase() === 'PENDIENTE');
      const totalUSD = pendingTasks.reduce((sum, t) => sum + Utils.toNumber(t['Subtotal_USD']), 0);
      const totalVES = totalUSD * latestRate;

      // Aggregates
      const byTask = {};
      const byEmployee = {};
      const empCount = {};

      tasks.forEach(t => {
        const type = t['Descripcion_Tarea'] || 'Otros';
        const emp = t['ID_Empleado'] || 'Desconocido';
        const usd = Utils.toNumber(t['Subtotal_USD']);

        byTask[type] = (byTask[type] || 0) + usd;
        byEmployee[emp] = (byEmployee[emp] || 0) + usd;
        empCount[emp] = (empCount[emp] || 0) + 1;
      });

      // Top Employee
      let topEmp = '—';
      let maxUSD = 0;
      for (let e in byEmployee) {
        if (byEmployee[e] > maxUSD) {
          maxUSD = byEmployee[e];
          topEmp = e;
        }
      }

      // Update KPIs (with safety checks for rapid navigation)
      const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      setSafeText('kpi-total-usd', `$${totalUSD.toFixed(2)}`);
      setSafeText('kpi-pending-tasks', pendingTasks.length);
      setSafeText('kpi-top-employee', topEmp);
      setSafeText('kpi-total-ves', `Bs. ${totalVES.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}`);

      _renderCharts(byTask, empCount);
      _renderTable(tasks.slice(0, 15));

    } catch (e) {
      console.error('[Productivity] Error loading data:', e);
      if (typeof Utils !== 'undefined') {
        Utils.showToast('Error al procesar métricas de productividad', 'error');
      }
    }
  }

  function _renderCharts(byTask, empCount) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing
    if (_charts.tasks) _charts.tasks.destroy();
    if (_charts.employees) _charts.employees.destroy();

    const chartColors = ['#0d7377', '#14ffec', '#32e0c4', '#212121', '#eeeeee', '#00adb5'];

    const ctxTask = document.getElementById('chart-prod-tasks').getContext('2d');
    _charts.tasks = new Chart(ctxTask, {
      type: 'bar',
      data: {
        labels: Object.keys(byTask),
        datasets: [{
          label: 'USD por Tarea',
          data: Object.values(byTask),
          backgroundColor: '#0d7377',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });

    const ctxEmp = document.getElementById('chart-prod-employees').getContext('2d');
    _charts.employees = new Chart(ctxEmp, {
      type: 'doughnut',
      data: {
        labels: Object.keys(empCount),
        datasets: [{
          data: Object.values(empCount),
          backgroundColor: chartColors,
          borderWidth: 0,
          hoverOffset: 15
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } }
        },
        cutout: '70%'
      }
    });
  }

  function _renderTable(recent) {
    const body = document.getElementById('prod-recent-body');
    if (!recent || !recent.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">No se encontraron registros de productividad</td></tr>';
      return;
    }

    body.innerHTML = recent.map(t => {
      const estatus = String(t['Estatus_Pago'] || 'PENDIENTE').toUpperCase();
      const badgeClass = estatus === 'PAGADO' ? 'badge-success' : 'badge-warning';
      
      return `
        <tr>
          <td>${t['Fecha'] || '—'}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
               <div class="avatar-mini">${String(t['ID_Empleado']).charAt(0)}</div>
               <strong>${t['ID_Empleado']}</strong>
            </div>
          </td>
          <td>${t['Descripcion_Tarea'] || '—'}</td>
          <td style="text-align:center;">${t['Cantidad']}</td>
          <td style="font-weight:600;">$${Utils.toNumber(t['Subtotal_USD']).toFixed(2)}</td>
          <td>
            <span class="badge ${badgeClass}">${estatus}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  return { 
    render, 
    reload: () => {
      const main = document.getElementById('main-content');
      if (main) render(main);
    } 
  };
})();
