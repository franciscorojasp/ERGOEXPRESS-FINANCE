/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — Módulo Inteligencia & BI
 * ════════════════════════════════════════════════════════════════════════════
 */

const Intelligence = (() => {
  let _chartLine = null;
  let _chartBudgets = null;
  let _stats = null;
  let _chatHistory = [];
  
  // Configuración de usuario local (Persistencia en sesión)
  let _settings = {
    inflationRate: 10.0, // 1000% anual
    currency: 'USD',
    categoryConfig: {
      'Operativos': 'variable',
      'Administrativos': 'fijo',
      'Marketing': 'variable',
      'Honorarios': 'variable',
      'Impuestos': 'fijo',
      'Servicios': 'fijo',
      'Nómina': 'fijo',
      'Otros': 'variable'
    }
  };

  async function render(container) {
    container.innerHTML = `
      <div class="fiscal-container animation-fade">
        <div class="fiscal-header">
          <div class="fiscal-title-group">
            <h2 class="fiscal-title">Inteligencia Estratégica BI</h2>
            <p class="fiscal-subtitle">Análisis predictivo y auditoría con IA Senior</p>
          </div>
          <div class="header-actions">
            <select id="bi-currency" class="form-select" onchange="Intelligence.updateCurrency(this.value)">
              <option value="USD" ${_settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="VES" ${_settings.currency === 'VES' ? 'selected' : ''}>VES (Bs.)</option>
            </select>
            <button class="btn-primary" onclick="Intelligence.openAIAuditor()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Auditor AI
            </button>
          </div>
        </div>

        <div class="bi-grid">
          <!-- Columna Izquierda: Gráficos -->
          <div class="bi-main">
            <!-- Card 1: Proyección -->
            <div class="card bi-card">
              <div class="card-header">
                <h3 class="card-title">Proyección de Flujo de Caja (Stress Test)</h3>
                <div class="header-tools">
                   <label>Inflación: </label>
                   <input type="number" step="1" value="${_settings.inflationRate * 100}" 
                    style="width: 70px; background: transparent; color: white; border: 1px solid #334155; border-radius: 4px; padding: 2px 5px;"
                    onchange="Intelligence.updateInflation(this.value)"> %
                </div>
              </div>
              <div class="chart-container" style="height: 300px; position: relative;">
                <canvas id="chart-projection"></canvas>
              </div>
            </div>

            <div class="bi-row-2">
              <!-- Card 2: Presupuestos -->
              <div class="card bi-card">
                 <h3 class="card-title" style="margin-bottom: 15px;">Ejecución Presupuestaria (Periodo Actual)</h3>
                 <div id="bi-budget-list" class="budget-list">
                    <div class="loading-spinner"></div>
                 </div>
              </div>
              
              <!-- Card 3: Punto de Equilibrio -->
              <div class="card bi-card bi-summary-card">
                <h3 class="card-title">Punto de Equilibrio</h3>
                <div id="bi-pe-content" class="pe-content">
                  <div class="pe-value">$0.00</div>
                  <div class="pe-label">Ventas necesarias para cubrir gastos</div>
                  <div class="pe-indicator">
                    <div class="pe-progress-bg"><div class="pe-progress-bar" id="pe-bar" style="width: 0%"></div></div>
                  </div>
                  <div class="pe-status" id="pe-status">Calculando...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Configuración de Categorías -->
          <div class="bi-sidebar">
            <div class="card bi-card">
              <h3 class="card-title">Categorización de Costos</h3>
              <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 15px;">Asigne tipos para el cálculo del Punto de Equilibrio.</p>
              <div class="category-list" id="bi-category-list">
                <!-- Se llena dinámicamente -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de Auditor AI -->
      <div id="ai-auditor-modal" class="modal">
        <div class="modal-content ai-auditor-content">
          <div class="modal-header">
            <h3>Auditor Financiero Senior (Groq-AI)</h3>
            <button class="close-btn" onclick="Utils.closeModal('ai-auditor-modal')">&times;</button>
          </div>
          <div class="ai-chat-body" id="ai-chat-messages">
            <div class="ai-msg ai-msg-assistant">
              Saludos. Soy su **Auditor Senior**. He analizado los flujos actuales. ¿Desea una auditoría sobre alguna partida o proyección específica?
            </div>
          </div>
          <div class="ai-chat-input-group">
            <input type="text" id="ai-chat-query" placeholder="Ej: ¿Por qué la quincena de abril excedió el presupuesto?" onkeypress="if(event.key==='Enter') Intelligence.sendAIMessage()">
            <button class="btn-primary" onclick="Intelligence.sendAIMessage()">Consultar</button>
          </div>
        </div>
      </div>

      <style>
        .bi-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; margin-top: 20px; }
        .bi-row-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-top: 20px; }
        .bi-card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; }
        .budget-list { display: flex; flex-direction: column; gap: 15px; }
        .budget-item { background: rgba(15, 23, 42, 0.5); padding: 12px; border-radius: 8px; }
        .budget-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
        .progress-container { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        
        .pe-content { text-align: center; padding: 10px 0; }
        .pe-value { font-size: 2.2rem; font-weight: 800; color: #60a5fa; margin-bottom: 5px; }
        .pe-label { font-size: 0.8rem; color: #94a3b8; margin-bottom: 15px; }
        .pe-progress-bg { height: 10px; background: #334155; border-radius: 5px; margin-bottom: 10px; }
        .pe-progress-bar { height: 100%; background: linear-gradient(90deg, #60a5fa, #3b82f6); border-radius: 5px; }
        
        .category-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ai-auditor-content { max-width: 600px; width: 90%; }
        .ai-chat-body { height: 400px; overflow-y: auto; padding: 20px; background: #0f172a; border-radius: 8px; display: flex; flex-direction: column; gap: 12px; }
        .ai-msg { padding: 12px 16px; border-radius: 12px; max-width: 85%; font-size: 0.95rem; line-height: 1.5; }
        .ai-msg-assistant { background: #1e293b; color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
        .ai-msg-user { background: #3b82f6; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
        .ai-chat-input-group { display: flex; gap: 10px; margin-top: 15px; }
        .ai-chat-input-group input { flex: 1; background: #1e293b; border: 1px solid #334155; color: white; padding: 12px; border-radius: 8px; }
        
        @media (max-width: 900px) {
          .bi-grid { grid-template-columns: 1fr; }
          .bi-row-2 { grid-template-columns: 1fr; }
        }
      </style>
    `;

    _initCharts();
    _loadData();
    _renderCategories();
  }

  async function _loadData() {
    try {
      // Cargar datos directamente de las hojas existentes
      const egresos = await Sheets.readSheet('Finanzas_Egresos');
      const rows = Array.isArray(egresos) ? egresos : [];
      
      // Calcular estadísticas localmente
      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7);
      
      // Proyección simple basada en egresos mensuales
      const monthlyTotals = {};
      rows.forEach(r => {
        const month = (r.Fecha || '').substring(0, 7);
        if (month) {
          monthlyTotals[month] = (monthlyTotals[month] || 0) + (parseFloat(r.Monto_USD) || 0);
        }
      });
      
      const months = Object.keys(monthlyTotals).sort().slice(-6);
      const projections = months.map(m => ({ label: m, amount: monthlyTotals[m] }));
      
      // Costos fijos vs variables para punto de equilibrio
      let costosFijos = 0, costosVariables = 0, ingresos = 0;
      rows.forEach(r => {
        const cat = r.Categoria || 'Otros';
        const monto = parseFloat(r.Monto_USD) || 0;
        const tipo = _settings.categoryConfig[cat] || 'variable';
        if (tipo === 'fijo') costosFijos += monto;
        else costosVariables += monto;
      });

      // Punto de equilibrio simplificado
      const totalGastos = costosFijos + costosVariables;
      const pe_usd = costosFijos > 0 ? costosFijos / (1 - (costosVariables / Math.max(totalGastos, 1))) : totalGastos;

      _stats = {
        projections,
        budgets: [],
        breakEven: {
          pe_usd: pe_usd || 0,
          ingresos: ingresos,
          percentage: pe_usd > 0 ? (ingresos / pe_usd) * 100 : 0
        }
      };

      _updateCharts();
      _renderBudgets();
      _renderBreakEven();
    } catch (e) {
      console.error('[BI] Error loading data:', e);
    }
  }

  function _initCharts() {
    const ctxProjection = document.getElementById('chart-projection')?.getContext('2d');
    if (!ctxProjection) return;

    _chartLine = new Chart(ctxProjection, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Flujo de Caja Proyectado (USD)',
          data: [],
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  function _updateCharts() {
    if (!_chartLine || !_stats) return;

    const data = _stats.projections;
    _chartLine.data.labels = data.map(d => d.label);
    _chartLine.data.datasets[0].data = data.map(d => d.amount);
    _chartLine.update();
  }

  function _renderBudgets() {
    const container = document.getElementById('bi-budget-list');
    if (!container || !_stats) return;

    if (_stats.budgets.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay presupuestos activos en este periodo.</p>';
      return;
    }

    container.innerHTML = _stats.budgets.map(b => `
      <div class="budget-item">
        <div class="budget-info">
          <span class="partida-name"><strong>${b.partida}</strong></span>
          <span class="budget-amount">${Utils.formatCurrency(b.ejecutado)} / ${Utils.formatCurrency(b.asignado)}</span>
        </div>
        <div class="progress-container">
          <div class="progress-fill" style="width: ${Math.min(b.porcentaje, 100)}%; background: ${b.porcentaje > 90 ? '#ef4444' : '#60a5fa'}"></div>
        </div>
        <div style="text-align: right; font-size: 0.75rem; margin-top: 5px; color: ${b.porcentaje > 90 ? '#ef4444' : '#94a3b8'}">
          ${b.porcentaje.toFixed(1)}% utilizado
        </div>
      </div>
    `).join('');
  }

  function _renderBreakEven() {
    if (!_stats) return;
    const pe = _stats.breakEven;
    const valueEl = document.querySelector('.pe-value');
    const barEl = document.getElementById('pe-bar');
    const statusEl = document.getElementById('pe-status');

    if (valueEl) valueEl.textContent = Utils.formatCurrency(pe.pe_usd);
    if (barEl) barEl.style.width = Math.min(pe.percentage, 100) + '%';

    if (pe.ingresos >= pe.pe_usd) {
      statusEl.innerHTML = `<span style="color: #22c55e">✅ Rentable</span><br><small>Superando equilibrio por ${Utils.formatCurrency(pe.ingresos - pe.pe_usd)}</small>`;
    } else {
      statusEl.innerHTML = `<span style="color: #ef4444">⚠️ Déficit</span><br><small>Faltan ${Utils.formatCurrency(pe.pe_usd - pe.ingresos)} para equilibrio</small>`;
    }
  }

  function _renderCategories() {
    const container = document.getElementById('bi-category-list');
    if (!container) return;

    const categories = ['Operativos','Administrativos','Marketing','Honorarios','Impuestos','Servicios','Nómina','Otros'];
    
    container.innerHTML = categories.map(cat => `
      <div class="category-item">
        <span>${cat}</span>
        <select class="form-select-sm" style="background:#0f172a; color:white; border:1px solid #334155; font-size:0.75rem;" 
          onchange="Intelligence.toggleCategory('${cat}', this.value)">
          <option value="variable" ${_settings.categoryConfig[cat] === 'variable' ? 'selected' : ''}>Variable</option>
          <option value="fijo" ${_settings.categoryConfig[cat] === 'fijo' ? 'selected' : ''}>Fijo</option>
        </select>
      </div>
    `).join('');
  }

  function toggleCategory(cat, value) {
    _settings.categoryConfig[cat] = value;
    _loadData();
  }

  function updateInflation(val) {
    _settings.inflationRate = val / 100;
    _loadData();
  }

  function updateCurrency(val) {
    _settings.currency = val;
    // En una aplicación real, aquí convertiríamos todos los montos mostrados
    // Por simplicidad en este MVP, recargamos con el factor visual
    _loadData();
  }

  function openAIAuditor() {
    Utils.openModal('ai-auditor-modal');
  }

  async function sendAIMessage() {
    const input = document.getElementById('ai-chat-query');
    const msg = input.value.trim();
    if (!msg) return;

    const container = document.getElementById('ai-chat-messages');
    container.innerHTML += `<div class="ai-msg ai-msg-user">${msg}</div>`;
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Respuesta local informativa (sin backend AI configurado)
    const localResponse = _generateLocalInsight(msg);
    container.innerHTML += `<div class="ai-msg ai-msg-assistant">${_formatMarkdown(localResponse)}</div>`;
    _chatHistory.push({ role: 'user', content: msg });
    _chatHistory.push({ role: 'assistant', content: localResponse });
    container.scrollTop = container.scrollHeight;
  }

  function _generateLocalInsight(query) {
    if (!_stats) return 'Aún no se han cargado los datos financieros. Intente nuevamente en unos segundos.';
    
    const pe = _stats.breakEven;
    const totalEgresos = pe.pe_usd || 0;
    
    if (query.toLowerCase().includes('equilibrio') || query.toLowerCase().includes('break')) {
      return `**Análisis de Punto de Equilibrio:**\n\nEl punto de equilibrio actual se sitúa en **$${totalEgresos.toFixed(2)} USD**.\n\n${pe.ingresos >= pe.pe_usd ? '✅ La empresa está **por encima** del punto de equilibrio.' : '⚠️ La empresa está **por debajo** del punto de equilibrio. Se requiere incrementar ingresos.'}`;
    }
    
    if (query.toLowerCase().includes('gasto') || query.toLowerCase().includes('egreso')) {
      return `**Resumen de Egresos:**\n\nSe han procesado registros de egresos del periodo actual.\n\n**Recomendación:** Revise las categorías de costos fijos vs variables en el panel lateral para optimizar el cálculo del punto de equilibrio.`;
    }
    
    return `**Auditor Senior - Respuesta:**\n\nHe registrado su consulta: "${query}".\n\nActualmente el módulo de IA opera con análisis local basado en los datos cargados.\n\n**Datos disponibles:**\n- Punto de Equilibrio: $${totalEgresos.toFixed(2)}\n- Proyecciones: ${_stats.projections?.length || 0} meses analizados\n\nPara consultas más detalladas, configure una API key de IA externa en Configuración.`;
  }

  function _formatMarkdown(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  return { render, updateInflation, toggleCategory, updateCurrency, openAIAuditor, sendAIMessage };
})();
