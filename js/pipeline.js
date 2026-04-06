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
            <p class="page-subtitle">Gestiona tus prospectos y cierres de venta</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="Pipeline.reload()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.5 15a9 9 0 1 1-2.8-6.5L23 10"/>
              </svg>
              <span class="btn-label">Actualizar</span>
            </button>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div class="card card-padded" style="margin-bottom:20px; padding:12px !important;">
          <div class="search-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" id="pipeline-search" placeholder="Buscar cliente en el pipeline..." oninput="Pipeline.filter(this.value)" />
          </div>
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
      <div class="kanban-card elite-card" data-id="${contact['ID']}"
           onclick="App.navigate('/contacts/${contact['ID']}')">
        <div class="kanban-card-top">
          <div class="kanban-card-name" title="${Utils.escapeHtml(contact['Razón Social'])}">
            ${Utils.escapeHtml(Utils.truncate(contact['Razón Social'], 32))}
          </div>
          ${contact['RIF'] ? `<span class="card-rif">${Utils.escapeHtml(contact['RIF'])}</span>` : ''}
        </div>
        
        <div class="kanban-card-details">
          ${contact['Persona Contacto'] ? `<span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${Utils.escapeHtml(contact['Persona Contacto'])}</span>` : ''}
          ${contact['Estado'] ? `<span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${Utils.escapeHtml(contact['Estado'])}</span>` : ''}
        </div>

        ${lastQuote ? `
          <div class="kanban-card-quote">
            <div class="quote-status">
              ${Utils.statusBadge(lastQuote['Estado'])}
            </div>
            <div class="quote-amount">
              $ ${Utils.formatUSD(lastQuote['Total USD'])}
            </div>
          </div>
        ` : `
          <div class="kanban-card-quote empty">
            <span style="font-size:10px; opacity:0.5;">Sin cotizaciones activas</span>
          </div>
        `}
      </div>
    `;
  }

  function filter(query) {
    const q = query.toLowerCase();
    const cards = document.querySelectorAll('.kanban-card');
    cards.forEach(card => {
      const name = card.querySelector('.kanban-card-name').textContent.toLowerCase();
      const rif  = card.querySelector('.card-rif')?.textContent.toLowerCase() || '';
      if (name.includes(q) || rif.includes(q)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
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

  return { render, reload: _load, switchMobileStage, filter };
})();
