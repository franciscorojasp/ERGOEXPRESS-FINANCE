/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Pipeline Kanban
   Drag & drop entre etapas con Sortable.js
   ════════════════════════════════════════════════════════════════════════════ */

const Pipeline = (() => {
  let _contacts = [];
  let _quotations = [];
  let _sortables = [];
  let _currentMobileStage = CONFIG.PIPELINE_STAGES[0];

  async function render(container) {
    _currentMobileStage = CONFIG.PIPELINE_STAGES[0];
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Pipeline Comercial</h1>
            <p class="page-subtitle">Arrastra los clientes entre etapas para actualizar su estado</p>
          </div>
          <button class="btn btn-secondary" onclick="Pipeline.reload()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.5 15a9 9 0 1 1-2.8-6.5L23 10"/>
            </svg>
            Actualizar
          </button>
        </div>

        <!-- Stats row -->
        <div class="grid-5" id="pipeline-stats" style="display:flex; gap:10px; margin-bottom:20px; overflow-x:auto;">
        <!-- Mobile Stage Selector -->
        <div class="kanban-mobile-tabs show-mobile-only" id="kanban-mobile-tabs">
          ${CONFIG.PIPELINE_STAGES.map(s => `
            <div class="kanban-tab ${s === _currentMobileStage ? 'active' : ''}" 
                 onclick="Pipeline.switchMobileStage('${s}', this)">
              ${s}
            </div>
          `).join('')}
        </div>

        <!-- Kanban Board -->
        <div class="kanban-board" id="kanban-board">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await _load();
  }

  async function _load() {
    try {
      [_contacts, _quotations] = await Promise.all([
        Sheets.readSheet(CONFIG.SHEETS.CONTACTS, false),
        Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS)
      ]);

      if (!App.isAdmin()) {
        const email = App.getCurrentUserEmail();
        _contacts = _contacts.filter(c => c['Vendedor Email'] === email);
      }

      _renderBoard();
    } catch(e) {
      document.getElementById('kanban-board').innerHTML =
        `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderBoard() {
    // Update stats
    CONFIG.PIPELINE_STAGES.forEach(stage => {
      const count = _contacts.filter(c => c['Etapa Pipeline'] === stage).length;
      const el    = document.getElementById('stat-' + Utils.slugify(stage));
      if (el) el.querySelector('.kpi-value').textContent = count;
    });

    // Group contacts by stage
    const byStage = {};
    CONFIG.PIPELINE_STAGES.forEach(s => { byStage[s] = []; });
    _contacts.forEach(c => {
      const stage = c['Etapa Pipeline'] || 'Primer contacto';
      if (byStage[stage]) byStage[stage].push(c);
      else byStage['Primer contacto'].push(c);
    });

    // Destroy previous sortables
    _sortables.forEach(s => s.destroy());
    _sortables = [];

    const board = document.getElementById('kanban-board');
    board.innerHTML = CONFIG.PIPELINE_STAGES.map(stage => {
      const cards = byStage[stage] || [];
      const usd   = _totalUSD(stage);
      const isActive = stage === _currentMobileStage;

      return `
        <div class="kanban-col ${isActive ? 'active' : ''}" id="col-container-${Utils.slugify(stage)}">
          <div class="kanban-col-header">
            <div class="kanban-col-title">
              <span class="col-dot" style="background:${Utils.stageColor(stage)};"></span>
              ${stage}
            </div>
            <span class="kanban-count">${cards.length}</span>
          </div>
          ${usd > 0 ? `
            <div style="padding:6px 14px; font-size:11px; color:var(--primary-light); border-bottom:1px solid var(--border);">
              $ ${Utils.formatUSD(usd)} en cotizaciones
            </div>
          ` : ''}
          <div class="kanban-cards" id="col-${Utils.slugify(stage)}" data-stage="${stage}">
            ${cards.map(c => _cardHTML(c)).join('')}
            ${cards.length === 0 ? '<div class="kanban-card" style="opacity:0.4; pointer-events:none; text-align:center; font-size:12px; color:var(--text-muted);">Sin clientes</div>' : ''}
          </div>
        </div>
      `;
    }).join('');

    // Initialize Sortable on each column
    CONFIG.PIPELINE_STAGES.forEach(stage => {
      const el = document.getElementById('col-' + Utils.slugify(stage));
      if (!el) return;

      const sortable = new Sortable(el, {
        group: 'pipeline',
        animation: 200,
        ghostClass: 'kanban-drop-zone',
        dragClass: 'dragging',
        onAdd: async (evt) => {
          const contactId = evt.item.dataset.id;
          const newStage  = evt.to.dataset.stage;
          await _moveContact(contactId, newStage);
        }
      });
      _sortables.push(sortable);
    });
  }

  function _cardHTML(contact) {
    const myQuotes = _quotations.filter(q => q['ID Cliente'] === contact['ID']);
    const lastQuote = myQuotes.length
      ? [...myQuotes].sort((a,b) => b['Fecha'].localeCompare(a['Fecha']))[0]
      : null;

    return `
      <div class="kanban-card" data-id="${contact['ID']}"
           onclick="App.navigate('/contacts/${contact['ID']}')">
        <div class="kanban-card-name" title="${Utils.escapeHtml(contact['Razón Social'])}">
          ${Utils.escapeHtml(Utils.truncate(contact['Razón Social'], 28))}
        </div>
        <div class="kanban-card-meta">
          ${contact['RIF'] ? `<span>RIF: ${Utils.escapeHtml(contact['RIF'])}</span>` : ''}
          ${contact['Persona Contacto'] ? `<span>👤 ${Utils.escapeHtml(contact['Persona Contacto'])}</span>` : ''}
          ${contact['Estado'] ? `<span>📍 ${Utils.escapeHtml(contact['Estado'])}</span>` : ''}
          ${lastQuote ? `
            <div style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border); display:flex; justify-content:space-between;">
              <span style="font-size:10px;">${Utils.statusBadge(lastQuote['Estado'])}</span>
              <span style="font-size:11px; font-weight:600; color:var(--primary-light);">
                $ ${Utils.formatUSD(lastQuote['Total USD'])}
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function _totalUSD(stage) {
    const stageContacts = _contacts.filter(c => c['Etapa Pipeline'] === stage);
    const ids = new Set(stageContacts.map(c => c['ID']));
    return _quotations
      .filter(q => ids.has(q['ID Cliente']) && ['Enviada','Negociación','Aceptada'].includes(q['Estado']))
      .reduce((sum, q) => sum + Utils.parseDecimal(q['Total USD']), 0);
  }

  async function _moveContact(contactId, newStage) {
    try {
      const contact = _contacts.find(c => c['ID'] === contactId);
      if (!contact || contact['Etapa Pipeline'] === newStage) return;

      const updated = { ...contact, 'Etapa Pipeline': newStage };
      await Sheets.updateRow(CONFIG.SHEETS.CONTACTS, contactId, updated);

      // Log interaction
      await Sheets.appendRow(CONFIG.SHEETS.TRACKING, {
        'ID': Utils.generateId(),
        'ID Cliente': contactId,
        'Fecha': Utils.todayISO(),
        'Tipo': 'nota',
        'Descripción': `Pipeline: movido a "${newStage}"`,
        'Próximo Seguimiento': '',
        'Asunto Próximo': '',
        'Etapa Pipeline': newStage,
        'Fecha Cambio Etapa': Utils.todayISO(),
        'Usuario Email': App.getCurrentUserEmail()
      });

      contact['Etapa Pipeline'] = newStage;
      _renderBoard();
      Utils.showToast(`Movido a "${newStage}"`, 'success');
    } catch(e) {
      Utils.showToast('Error al mover: ' + e.message, 'error');
    }
  }

  function reload() {
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function switchMobileStage(stage, btn) {
    _currentMobileStage = stage;
    
    // Update tabs
    document.querySelectorAll('.kanban-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Update columns
    document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('col-container-' + Utils.slugify(stage));
    if (target) target.classList.add('active');
    
    // Scroll tab into view
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  return { render, reload: _load, switchMobileStage };
})();
