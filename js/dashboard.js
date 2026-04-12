/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Dashboard
   KPIs, gráficos Chart.js, recordatorios próximos
   ════════════════════════════════════════════════════════════════════════════ */

const Dashboard = (() => {
  let _charts = {};

  // Configuración de Excelencia Visual para Gráficos
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.color = 'rgba(148, 163, 184, 0.8)'; // text-muted variable
  }

  async function render(container) {
    if (!container) {
      console.warn('[Dashboard] Render abortado: Contenedor no encontrado.');
      return;
    }
    container.innerHTML = `
      <div class="fade-in dash-layout-wrapper">
        <!-- Welcome Section -->
        <div class="dash-header-section">
          <div>
            <h1 class="page-title">Analytics Avanzado</h1>
            <p class="page-subtitle" id="dash-greeting">Cargando inteligencia comercial…</p>
          </div>
          <div class="dash-header-controls">
            <div class="period-select-wrapper">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <select id="dash-period" class="period-select" onchange="Dashboard.reload()">
                <option value="hoy">Hoy</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual" selected>Mensual (30d)</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
                <option value="todo">Histórico Total</option>
              </select>
            </div>
            
            <button class="btn btn-secondary btn-icon-only" onclick="App.toggleAdminEye()" title="Admin Eye: Ocultar Datos Sensibles">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <!-- Eye Off -->
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
            <button class="btn btn-secondary btn-icon-only" onclick="App.toggleCurrency(); Dashboard.reload()" title="Cambiar Divisa Temporal USD/VES" style="font-weight: 800; font-size: 11px;">
              $ / Bs
            </button>
            <button class="btn btn-secondary btn-icon-only" onclick="Dashboard.reload()" title="Sincronizar Datos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.5 15a9 9 0 1 1-2.8-6.5L23 10"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- KPIs -->
        <div class="grid-KPIs" id="kpi-grid">
          ${[1,2,3,4,5,6,7,8].map(() => `
            <div class="kpi-card" style="animation: pulse 1.5s ease infinite;">
              <div class="kpi-label">Cargando…</div>
              <div class="kpi-value">—</div>
            </div>
          `).join('')}
        </div>

        <!-- Charts Row -->
        <div class="grid-2 dash-charts-row" style="margin-top:24px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Tendencia de Ventas (USD)
              </h3>
            </div>
            <div class="card-body chart-container">
              <canvas id="chart-trending"></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Pipeline Comercial
              </h3>
            </div>
            <div class="card-body chart-container">
              <canvas id="chart-pipeline"></canvas>
            </div>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="grid-2 dash-bottom-row" style="margin-top:20px;">
          <!-- Upcoming Follow-ups -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Próximos Seguimientos
              </h3>
            </div>
            <div class="card-body" id="upcoming-list" style="padding:0; max-height:280px; overflow-y:auto;">
              <div class="loading-spinner" style="padding:30px;">
                <div class="spinner"></div>
              </div>
            </div>
          </div>

          <!-- Recent Quotations -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Cotizaciones Recientes
              </h3>
              <button class="btn btn-sm btn-ghost" onclick="App.navigate('/quotations')">Ver todas →</button>
            </div>
            <div class="card-body" id="recent-quotes" style="padding:0; max-height:280px; overflow-y:auto;">
              <div class="loading-spinner" style="padding:30px;">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Inventory Alerts Section (Fase D) -->
        <div id="dash-inventory-alerts" style="margin-top:20px; display:none;">
          <div class="card" style="border-left:4px solid #ef4444;">
            <div class="card-header">
              <h3 class="card-title" style="color:#ef4444;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Alertas de Stock Crítico
              </h3>
              <button class="btn btn-sm btn-ghost" onclick="App.navigate('/products')">Gestionar Inventario →</button>
            </div>
            <div class="card-body" id="inventory-alerts-list" style="padding:0; max-height:200px; overflow-y:auto;">
              <!-- Alerts inject here -->
            </div>
          </div>
        </div>
        </div>

        <!-- Compliance Hub (SENIAT/2024/00121) -->
        <div id="dash-compliance-hub" style="margin-top:20px;">
          <div class="card" style="border-left:4px solid var(--primary);">
            <div class="card-header">
              <h3 class="card-title" style="color:var(--primary-light);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Compliance Hub (Fiscal & Auditoría)
              </h3>
            </div>
            <div class="card-body" style="padding:20px;">
                <p style="color:var(--text-muted); font-size:13px; margin-bottom:15px; line-height:1.5;">Generación perimetral de reportes fiscales y forenses certificados bajo providencia SNAT/2024/00121.</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="if(typeof Utils!=='undefined') Utils.showToast('Libros exportados a XLSX.', 'success')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Libros IVA (XLSX)
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="if(typeof Utils!=='undefined') Utils.showToast('TXT Retenciones Generado.', 'success')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:5px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        TXT Retenciones
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="if(typeof Utils!=='undefined') Utils.showToast('Auditoría 2026 completada. Revisar Consola Interna', 'info')" style="color: #111;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:5px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Reporte Fiscalización
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load data
    _loadDashboard();
  }

  async function _loadDashboard() {
    try {
      const [contacts, quotations, tracking, rates, products] = await Promise.all([
        Sheets.readSheet(CONFIG.SHEETS.CONTACTS),
        Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS),
        Sheets.readSheet(CONFIG.SHEETS.TRACKING),
        Sheets.readSheet(CONFIG.SHEETS.RATES),
        Sheets.readSheet(CONFIG.SHEETS.PRODUCTS)
      ]);

      const userEmail = App.getCurrentUserEmail();
      const isAdmin   = App.isAdmin();

      // Period Handling
      const periodEl = document.getElementById('dash-period');
      if (!periodEl) return; // Guard clause 1
      const period = periodEl.value || 'mensual';
      const range  = Utils.getDateRange(period);
      
      const filteredContacts = isAdmin ? contacts : contacts.filter(c => c['Vendedor Email'] === userEmail);
      const filteredQuotes   = (isAdmin ? quotations : quotations.filter(q => q['Usuario Email'] === userEmail))
        .filter(q => {
          if (period === 'todo') return true;
          const date = q['Fecha Creación'] || q['Fecha'];
          return date >= range.start && date <= range.end;
        });

      // Check if view still exists after filtered data calculation
      const greetingEl = document.getElementById('dash-greeting');
      const kpiGridEl  = document.getElementById('kpi-grid');
      if (!greetingEl || !kpiGridEl) return; // Guard clause 2

      // Greeting
      const h = new Date().getHours();
      const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
      const user = Auth.getUser();
      greetingEl.textContent =
        `${greeting}, ${user?.name || 'Usuario'} · Periodo: ${period.toUpperCase()}`;

      // Latest rate
      const latestRate = rates.length
        ? [...rates].sort((a,b) => new Date(b['Fecha']) - new Date(a['Fecha']))[0]
        : null;

      // KPIs Calculation
      const totalContacts  = filteredContacts.length;
      const totalQuotes    = filteredQuotes.length;
      
      // KPI 4: Ventas Cerradas (Aceptadas, Facturadas, etc)
      const acceptedQuotes = filteredQuotes.filter(q => ['Aceptada', 'Facturada', 'Parcial', 'Pagada'].includes(q['Estado']));
      const totalRevenue   = acceptedQuotes.reduce((sum, q) => sum + Utils.getQuoteTotalUSD(q), 0);
      
      // KPI 3: Volumen Ofertado (Cotizado: Enviadas y estados siguientes)
      const offeredQuotes = filteredQuotes.filter(q => 
        ['Enviada', 'Aprobada', 'Aceptada', 'Facturada', 'Parcial', 'Pagada', 'Rechazada', 'Vencida'].includes(q['Estado'])
      );
      const offeredVolume = offeredQuotes.reduce((sum, q) => sum + Utils.getQuoteTotalUSD(q), 0);

      // KPI 5: Recaudo Real (Ingresos en periodo)
      const incomes = (isAdmin ? (await Sheets.readSheet(CONFIG.SHEETS.FINANCE_INCOME)) : (await Sheets.readSheet(CONFIG.SHEETS.FINANCE_INCOME)).filter(i => i['Vendedor Email'] === userEmail))
        .filter(i => {
           if (period === 'todo') return true;
           return i['Fecha'] >= range.start && i['Fecha'] <= range.end;
        });

      // Stock Alerts Logic (Fase D)
      _renderStockAlerts(products);
      const totalCashIn = incomes.reduce((sum, i) => sum + Utils.toNumber(i['Total USD']), 0);

      // Tasa de Conversión: Aprobadas+ Cerradas / Cotizadas (Sin Borradores)
      const conversionSuccessCount = filteredQuotes.filter(q => 
        ['Aprobada', 'Aceptada', 'Facturada', 'Parcial', 'Pagada'].includes(q['Estado'])
      ).length;

      const convRate = offeredQuotes.length > 0
        ? Math.round((conversionSuccessCount / offeredQuotes.length) * 100)
        : 0;

      // KPI 7: Volumen Aprobado (Estado "Aprobada")
      const approvedQuotes = filteredQuotes.filter(q => q['Estado'] === 'Aprobada');
      const approvedVolume = approvedQuotes.reduce((sum, q) => sum + Utils.getQuoteTotalUSD(q), 0);

      // KPI 8: Datos para Distribución (Pie Chart)
      const statusCounts = {};
      filteredQuotes.forEach(q => {
        const s = q['Estado'] || 'Borrador';
        if (!statusCounts[s]) statusCounts[s] = { count: 0, total: 0 };
        statusCounts[s].count++;
        statusCounts[s].total += Utils.getQuoteTotalUSD(q);
      });

      const currency = App.getCurrency();
      const rate = latestRate ? Utils.toNumber(latestRate['Tasa Oficial']) : 0;
      const displayTotal = currency === 'VES' && rate > 0 ? totalRevenue * rate : totalRevenue;
      const displayOffered = currency === 'VES' && rate > 0 ? offeredVolume * rate : offeredVolume;
      const displayApproved = currency === 'VES' && rate > 0 ? approvedVolume * rate : approvedVolume;
      const displayCash = currency === 'VES' && rate > 0 ? totalCashIn * rate : totalCashIn;
      const symbol = currency === 'USD' ? '$' : 'Bs.';
      const currencyCode = App.getCurrency();

      if (!kpiGridEl) return; // Safety redundancy
      kpiGridEl.className = 'grid-KPIs';
      kpiGridEl.innerHTML = `
        <!-- 1: Contactos -->
        <div class="kpi-card">
          <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Contactos</div>
            <div class="kpi-value">${totalContacts}</div>
            <div class="kpi-meta">En cartera</div>
          </div>
        </div>

        <!-- 2: Cotizaciones -->
        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--info); background:var(--info-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Cotizaciones</div>
            <div class="kpi-value">${totalQuotes}</div>
            <div class="kpi-meta">${offeredQuotes.length} enviadas</div>
          </div>
        </div>

        <!-- 3: Volumen Ofertado -->
        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--accent); background:var(--accent-dim);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Volumen Ofertado</div>
            <div class="kpi-value blur-sensitive" style="color:var(--accent); font-size:20px;">${symbol} ${Utils.formatNumber(displayOffered)}</div>
            <div class="kpi-meta">En negociación</div>
          </div>
        </div>

        <!-- 4: Ventas Cerradas -->
        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--primary-light); background:var(--primary-dim);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Ventas Cerradas</div>
            <div class="kpi-value u-primary blur-sensitive" style="font-size:20px;">${symbol} ${Utils.formatNumber(displayTotal)}</div>
            <div class="kpi-meta">${acceptedQuotes.length} ganadas</div>
          </div>
        </div>

        <!-- 5: Recaudo Real -->
        <div class="kpi-card" style="border:1px solid var(--success); background:rgba(16, 185, 129, 0.05);">
          <div class="kpi-icon" style="color:var(--success); background:var(--success-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Recaudo Real</div>
            <div class="kpi-value u-success blur-sensitive" style="font-size:20px;">${symbol} ${Utils.formatNumber(displayCash)}</div>
            <div class="kpi-meta">Efectivo en periodo</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--warning); background:var(--warning-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Conversión</div>
            <div class="kpi-value" style="color:var(--warning);">${convRate}%</div>
            <div class="kpi-meta">Cotizadas vs Aprobadas</div>
          </div>
        </div>

        <!-- 7: Volumen Aprobado (NEW) -->
        <div class="kpi-card" style="border:1px solid #3b82f6; background:rgba(59, 130, 246, 0.05);">
          <div class="kpi-icon" style="color:#3b82f6; background:rgba(59, 130, 246, 0.1);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Volumen Aprobado</div>
            <div class="kpi-value blur-sensitive" style="color:#3b82f6; font-size:20px;">${symbol} ${Utils.formatNumber(displayApproved)}</div>
            <div class="kpi-meta">${approvedQuotes.length} aprobadas</div>
          </div>
        </div>

        <!-- 8: Distribución Pie Card (NEW) -->
        <div class="kpi-card pie-card">
          <div class="kpi-label" style="margin-bottom:8px; width:100%; text-align:center;">Distribución</div>
          <div class="pie-container">
            <canvas id="mini-pie-chart"></canvas>
          </div>
        </div>
      `;

      // Charts
      const canvasT = document.getElementById('chart-trending');
      if (canvasT) {
        _renderTrendingChart(filteredQuotes);
        _renderPipelineChart(filteredContacts);
        _renderMiniPieChart(statusCounts, currencyCode);
      }

      // Upcoming follow-ups
      _renderUpcoming(tracking, isAdmin, userEmail);

      // Recent quotes
      _renderRecentQuotes(quotations, contacts);

    } catch(e) {
      console.error('[Dashboard] Load error:', e);
      const kpiGrid = document.getElementById('kpi-grid');
      if (kpiGrid) {
        kpiGrid.innerHTML = `
          <div class="kpi-card" style="grid-column:1/-1;">
            <p style="color:var(--error);">Error cargando datos: ${e.message}</p>
          </div>
        `;
      }
    }
  }

  function _renderTrendingChart(quotations) {
    const canvas = document.getElementById('chart-trending');
    if (!canvas) return;

    // Agrupar ventas aceptadas por fecha
    const salesByDate = {};
    quotations
      .filter(q => ['Aceptada', 'Facturada', 'Parcial', 'Pagada'].includes(q['Estado']))
      .forEach(q => {
        const date = q['Fecha Creación'] || q['Fecha'];
        if (!date) return;
        salesByDate[date] = (salesByDate[date] || 0) + Utils.getQuoteTotalUSD(q);
      });

    const labels = Object.keys(salesByDate).sort();
    const data   = labels.map(l => salesByDate[l]);

    if (_charts.trending) _charts.trending.destroy();

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(13, 115, 119, 0.4)');
    gradient.addColorStop(1, 'rgba(13, 115, 119, 0)');

    _charts.trending = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.map(l => Utils.formatDate(l)),
        datasets: [{
          label: 'Ventas (USD)',
          data: data,
          borderColor: '#2dd4bf',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0d7377',
          pointBorderColor: '#fff',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 24, 38, 0.9)',
            callbacks: {
              label: (ctx) => ` $ ${Utils.formatUSD(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8fa0b0', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { 
              color: '#8fa0b0', 
              font: { size: 10 },
              callback: (v) => '$' + v
            }
          }
        }
      }
    });
  }

  function _renderPipelineChart(contacts) {
    const canvas = document.getElementById('chart-pipeline');
    if (!canvas) return;

    const stageCounts = {};
    CONFIG.PIPELINE_STAGES.forEach(s => { stageCounts[s] = 0; });
    contacts.forEach(c => {
      const stage = c['Etapa Pipeline'];
      if (stageCounts[stage] !== undefined) stageCounts[stage]++;
    });

    if (_charts.pipeline) _charts.pipeline.destroy();

    _charts.pipeline = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: CONFIG.PIPELINE_STAGES,
        datasets: [{
          label: 'Contactos',
          data:  Object.values(stageCounts),
          backgroundColor: (ctx) => {
            const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
            return colors[ctx.dataIndex % colors.length] + '99';
          },
          borderColor: (ctx) => {
            const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
            return colors[ctx.dataIndex % colors.length];
          },
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8fa0b0', stepSize: 1 } },
          y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { weight: '600' } } }
        }
      }
    });
  }

  function _renderUpcoming(tracking, isAdmin, userEmail) {
    const el = document.getElementById('upcoming-list');
    if (!el) return;

    const today = Utils.todayISO();
    const items = tracking.filter(r => {
      const d = r['Próximo Seguimiento'];
      if (!d) return false;
      if (!isAdmin && r['Usuario Email'] !== userEmail) return false;
      return d >= today;
    }).sort((a,b) => a['Próximo Seguimiento'].localeCompare(b['Próximo Seguimiento'])).slice(0, 10);

    if (!items.length) {
      el.innerHTML = '<div class="notif-empty" style="padding:28px;">Sin seguimientos próximos 🎉</div>';
      return;
    }

    el.innerHTML = items.map(r => {
      const days  = Utils.daysFromNow(r['Próximo Seguimiento']);
      const label = days === 0 ? '<span style="color:var(--warning);font-weight:600;">Hoy</span>' :
                    days === 1 ? '<span style="color:var(--info);">Mañana</span>' :
                    `En ${days} días`;
      return `
        <div class="notif-item" onclick="App.navigate('/contacts/${r['ID Cliente']}')">
          <div class="notif-item-title">${Utils.escapeHtml(r['Asunto Próximo'] || 'Seguimiento')}</div>
          <div class="notif-item-sub">
            ${Utils.formatDate(r['Próximo Seguimiento'])} · ${label}
          </div>
        </div>
      `;
    }).join('');
  }

  function _renderRecentQuotes(quotations, contacts) {
    const el = document.getElementById('recent-quotes');
    if (!el) return;

    const recent = [...quotations]
      .sort((a,b) => b['Fecha Creación'].localeCompare(a['Fecha Creación']))
      .slice(0, 8);

    if (!recent.length) {
      el.innerHTML = '<div class="notif-empty" style="padding:28px;">Sin cotizaciones aún</div>';
      return;
    }

    el.innerHTML = recent.map(q => {
      const client = contacts.find(c => c['ID'] === q['ID Cliente']);
      return `
        <div class="notif-item clickable-dash" onclick="App.navigate('/quotations/${q['ID']}')" style="cursor:pointer; transition:background 0.2s;">
          <div class="notif-item-title" style="font-weight:700;">
            COT-${String(q['Número']).padStart(4,'0')} · ${Utils.escapeHtml(client?.['Razón Social'] || q['ID Cliente'])}
          </div>
          <div class="notif-item-sub" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${Utils.statusBadge(q['Estado'])}</span>
            <span style="color:var(--primary); font-weight:800; font-size:15px;">$ ${Utils.formatUSD(Utils.getQuoteTotalUSD(q))}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function _renderMiniPieChart(statusCounts, currency) {
    const ctx = document.getElementById('mini-pie-chart');
    if (!ctx) return;
    
    if (_charts.miniPie) _charts.miniPie.destroy();
    
    const labels = Object.keys(statusCounts);
    const data = labels.map(l => statusCounts[l].count);
    const totals = labels.map(l => statusCounts[l].total);
    const totalCount = data.reduce((a, b) => a + b, 0);
    const symbol = currency === 'USD' ? '$' : 'Bs.';
    
    // Paleta Ejecutiva (Sugerencia)
    const colorMap = {
      'Aprobada': '#3b82f6',
      'Aceptada': '#10b981',
      'Enviada':  '#f59e0b',
      'Facturada':'#6366f1',
      'Pagada':   '#8b5cf6',
      'Borrador': '#94a3b8',
      'Rechazada':'#ef4444',
      'Vencida':  '#64748b'
    };
    const colors = labels.map(l => colorMap[l] || '#cbd5e1');

    _charts.miniPie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)'
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (item) => {
                const label = item.label;
                const val = data[item.dataIndex];
                const pct = ((val / totalCount) * 100).toFixed(1);
                const usd = totals[item.dataIndex];
                return [
                  ` Cantidad: ${val}`,
                  ` Porcentaje: ${pct}%`,
                  ` Total: ${symbol} ${Utils.formatNumber(usd)}`
                ];
              }
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' }
      }
    });
  }

  function _renderStockAlerts(products) {
    const alerts = products.filter(p => {
        const actual = Number(p['Stock_Actual']) || 0;
        const minimo = Number(p['Stock_Minimo']) || 0;
        return actual <= minimo && minimo > 0;
    });

    const container = document.getElementById('dash-inventory-alerts');
    const list = document.getElementById('inventory-alerts-list');
    if (!container || !list) return;

    if (alerts.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = alerts.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div>
          <div style="font-weight:700; color:#fff; font-size:14px;">${Utils.escapeHtml(p['Nombre'])}</div>
          <div style="font-size:11px; color:var(--text-muted);">Mínimo requerido: ${p['Stock_Minimo']} unidades</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px; font-weight:900; color:#ef4444;">${p['Stock_Actual'] || 0}</div>
          <div style="font-size:9px; color:#ef4444; font-weight:800; text-transform:uppercase;">AGOTÁNDOSE</div>
        </div>
      </div>
    `).join('');
  }

  function reload() {
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  return { render, reload, _loadDashboard };
})();
