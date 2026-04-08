/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Dashboard
   KPIs, gráficos Chart.js, recordatorios próximos
   ════════════════════════════════════════════════════════════════════════════ */

const Dashboard = (() => {
  let _charts = {};

  async function render(container) {
    if (!container) {
      console.warn('[Dashboard] Render abortado: Contenedor no encontrado.');
      return;
    }
    container.innerHTML = `
      <div class="fade-in">
        <!-- Welcome -->
        <div class="page-header">
          <div>
            <h1 class="page-title">¡Bienvenido al CRM!</h1>
            <p class="page-subtitle" id="dash-greeting">Cargando datos…</p>
          </div>
          <button class="btn btn-secondary" onclick="Dashboard.reload()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.5 15a9 9 0 1 1-2.8-6.5L23 10"/>
            </svg>
            Actualizar
          </button>
        </div>

        <!-- KPIs -->
        <div class="grid-4" id="kpi-grid">
          ${[1,2,3,4].map(() => `
            <div class="kpi-card" style="animation: pulse 1.5s ease infinite;">
              <div class="kpi-label">Cargando…</div>
              <div class="kpi-value">—</div>
            </div>
          `).join('')}
        </div>

        <!-- Charts Row -->
        <div class="grid-2" style="margin-top:24px; gap:20px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M21 3H3v18h18V3z"/><path d="M21 9H3"/><path d="M21 15H3"/>
                  <path d="M12 3v18"/>
                </svg>
                Cotizaciones por Estado
              </h3>
            </div>
            <div class="card-body chart-container">
              <canvas id="chart-quotes"></canvas>
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
        <div class="grid-2" style="margin-top:20px; gap:20px;">
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
    `;

    // Load data
    _loadDashboard();
  }

  async function _loadDashboard() {
    try {
      const [contacts, quotations, tracking, rates] = await Promise.all([
        Sheets.readSheet(CONFIG.SHEETS.CONTACTS),
        Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS),
        Sheets.readSheet(CONFIG.SHEETS.TRACKING),
        Sheets.readSheet(CONFIG.SHEETS.RATES)
      ]);

      const userEmail = App.getCurrentUserEmail();
      const isAdmin   = App.isAdmin();

      const myContacts   = isAdmin ? contacts   : contacts.filter(c => c['Vendedor Email'] === userEmail);
      const myQuotations = isAdmin ? quotations : quotations.filter(q => q['Usuario Email'] === userEmail);

      // Check if view still exists (race condition guard)
      const greetingEl = document.getElementById('dash-greeting');
      if (!greetingEl) return;

      // Greeting
      const h = new Date().getHours();
      const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
      const user = Auth.getUser();
      greetingEl.textContent =
        `${greeting}, ${user?.name || 'Usuario'} · ${Utils.formatDateLong(Utils.todayISO())}`;

      // Latest rate
      const latestRate = rates.length
        ? [...rates].sort((a,b) => new Date(b['Fecha']) - new Date(a['Fecha']))[0]
        : null;

      // KPIs
      const totalContacts  = myContacts.length;
      const activeContacts = myContacts.filter(c => c['Tipo'] === 'activo').length;
      const totalQuotes    = myQuotations.length;
      const acceptedQuotes = myQuotations.filter(q => ['Aceptada', 'Facturada', 'Parcial', 'Pagada'].includes(q['Estado'])).length;
      const totalRevenue   = myQuotations
        .filter(q => ['Aceptada', 'Facturada', 'Parcial', 'Pagada'].includes(q['Estado']))
        .reduce((sum, q) => sum + Utils.toNumber(q['Total USD']), 0);
      const convRate = totalQuotes > 0
        ? Math.round((acceptedQuotes / totalQuotes) * 100)
        : 0;

      const currency = App.getCurrency();
      const rate = latestRate ? Utils.toNumber(latestRate['Tasa Oficial']) : 0;
      const displayTotal = currency === 'VES' && rate > 0 ? totalRevenue * rate : totalRevenue;
      const symbol = currency === 'USD' ? '$' : 'Bs.';

      document.getElementById('kpi-grid').innerHTML = `
        <div class="kpi-card">
          <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Contactos</div>
            <div class="kpi-value">${totalContacts}</div>
            <div class="kpi-meta">${activeContacts} activos</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--info); background:var(--info-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Cotizaciones</div>
            <div class="kpi-value">${totalQuotes}</div>
            <div class="kpi-meta">${acceptedQuotes} aceptadas</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--success); background:var(--success-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Ventas (${currency})</div>
            <div class="kpi-value u-primary">${symbol} ${currency === 'USD' ? Utils.formatUSD(displayTotal) : Utils.formatVES(displayTotal)}</div>
            <div class="kpi-meta">Aceptadas + Facturadas</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color:var(--warning); background:var(--warning-bg);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
          <div class="kpi-content">
            <div class="kpi-label">Conversión</div>
            <div class="kpi-value">${convRate}%</div>
            <div class="kpi-meta">
              ${latestRate ? `BCV: Bs. ${Utils.formatVES(latestRate['Tasa Oficial'])}` : 'Sin tasa'}
            </div>
          </div>
        </div>
      `;

      // Charts
      const c = document.getElementById('chart-quotes');
      if (!c) return;
      _renderQuoteChart(myQuotations);
      _renderPipelineChart(myContacts);

      // Upcoming follow-ups
      _renderUpcoming(tracking, isAdmin, userEmail);

      // Recent quotes
      _renderRecentQuotes(myQuotations, contacts);

    } catch(e) {
      console.error('[Dashboard] Load error:', e);
      document.getElementById('kpi-grid').innerHTML = `
        <div class="kpi-card" style="grid-column:1/-1;">
          <p style="color:var(--error);">Error cargando datos: ${e.message}</p>
        </div>
      `;
    }
  }

  function _renderQuoteChart(quotations) {
    const canvas = document.getElementById('chart-quotes');
    if (!canvas) return;

    const statusCounts = {};
    CONFIG.QUOTE_STATUSES.forEach(s => { statusCounts[s] = 0; });
    quotations.forEach(q => {
      if (statusCounts[q['Estado']] !== undefined) statusCounts[q['Estado']]++;
    });

    if (_charts.quotes) _charts.quotes.destroy();

    _charts.quotes = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#6b7280','#3b82f6','#10b981','#ef4444','#0d7377'],
          borderWidth: 2,
          borderColor: 'rgba(25, 35, 50, 0.8)',
          hoverOffset: 8,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8fa0b0', font: { size: 11, family: 'Inter' }, boxWidth: 10, padding: 15 }
          }
        },
        cutout: '70%',
        animation: { duration: 1500, easing: 'easeOutQuart' }
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
        labels: CONFIG.PIPELINE_STAGES.map(s => s.split(' ')[0] + '…'),
        datasets: [{
          label: 'Contactos',
          data:  Object.values(stageCounts),
          backgroundColor: 'rgba(13, 115, 119, 0.6)',
          borderColor: '#14a8ad',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: '#14a8ad'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 24, 38, 0.9)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => CONFIG.PIPELINE_STAGES[items[0].dataIndex]
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8fa0b0', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8fa0b0', font: { size: 10 }, stepSize: 1 } }
        },
        animation: { duration: 1500, easing: 'easeOutQuart' }
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
            <span style="color:var(--primary); font-weight:800; font-size:15px;">$ ${Utils.formatUSD(q['Total USD'])}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function reload() {
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  return { render, reload };
})();
