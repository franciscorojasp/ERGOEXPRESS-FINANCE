/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Pipeline Kanban
   Drag & drop entre etapas con Sortable.js
   ════════════════════════════════════════════════════════════════════════════ */

const Pipeline = (() => {
  let _contacts = [];
  let _quotations = [];
  let _sortables = [];
  let _view = localStorage.getItem('pipeline-view') || 'list'; // 'list' or 'kanban'
  let _stageFilter = 'Todos';
  let _searchQuery = '';

  async function render(container) {
    container.innerHTML = `
      <div class="fade-in leads-container">
        <!-- ── Header ── -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Leads</h1>
            <p class="page-subtitle">Gestión de prospectos para ERGOEXPRESS</p>
          </div>
          <div class="page-actions" style="display:flex; gap:10px;">
            <button class="btn btn-secondary" onclick="Pipeline.migrateOldStages()" title="Actualizar nombres de etapas antiguos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
              Actualizar BD
            </button>
            <button class="btn btn-primary" onclick="Contacts.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nuevo Lead</span>
            </button>
          </div>
        </div>

        <!-- ── Toolbar ── -->
        <div class="leads-toolbar">
          <div class="toolbar-left">
            <div class="search-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="pipeline-search" placeholder="Buscar por nombre, empresa o email..." 
                     oninput="Pipeline.handleSearch(this.value)" />
            </div>
          </div>
          
          <div class="toolbar-right">
            <select class="form-select select-sm" id="pipeline-category-filter" style="width:140px;">
              <option value="Todos">Todos</option>
              <option value="potencial">Potenciales</option>
              <option value="activo">Activos</option>
            </select>

            <div class="view-switcher">
              <button class="switcher-btn ${_view === 'list' ? 'active' : ''}" onclick="Pipeline.setView('list')" title="Vista de Lista">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <span>Lista</span>
              </button>
              <button class="switcher-btn ${_view === 'kanban' ? 'active' : ''}" onclick="Pipeline.setView('kanban')" title="Vista Kanban">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Stage Pills ── -->
        <div class="leads-pills-row" id="leads-pills">
          <button class="lead-pill ${_stageFilter === 'Todos' ? 'active' : ''}" onclick="Pipeline.setStageFilter('Todos')" data-stage="Todos">
            Todos <span class="pill-count" id="count-todos">0</span>
          </button>
          ${CONFIG.PIPELINE_STAGES.map(s => `
            <button class="lead-pill ${_stageFilter === s ? 'active' : ''}" 
                    onclick="Pipeline.setStageFilter('${s}')" 
                    data-stage="${s}">
              ${s} <span class="pill-count" id="count-${Utils.slugify(s)}">0</span>
            </button>
          `).join('')}
        </div>

        <!-- ── Content Area ── -->
        <div id="pipeline-content">
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

      _updateCounts();
      _renderCurrentView();
    } catch(e) {
      const content = document.getElementById('pipeline-content');
      if (content) {
        content.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
      }
    }
  }

  function _updateCounts() {
    // Total count
    const totalEl = document.getElementById('count-todos');
    if (totalEl) totalEl.textContent = _contacts.length;

    // Stage counts
    CONFIG.PIPELINE_STAGES.forEach(stage => {
      const count = _contacts.filter(c => c['Etapa Pipeline'] === stage).length;
      const el = document.getElementById('count-' + Utils.slugify(stage));
      if (el) el.textContent = count;
    });
  }

  function _renderCurrentView() {
    const content = document.getElementById('pipeline-content');
    if (!content) return;

    if (_view === 'kanban') {
      _renderBoard(content);
    } else {
      _renderList(content);
    }
  }

  function _renderList(content) {
    const filtered = _getFilteredContacts();
    
    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="card card-padded" style="min-height:300px; display:flex; align-items:center; justify-content:center;">
          <div class="empty-state">
            <p style="color:var(--text-muted)">No se encontraron leads.</p>
          </div>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="card no-padding overflow-x">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Puntaje</th>
              <th>Estado</th>
              <th>Contacto</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(c => `
              <tr onclick="App.navigate('/contacts/${c['ID']}')" style="cursor:pointer">
                <td>
                  <div class="td-bold">${Utils.escapeHtml(c['Razón Social'])}</div>
                  <div style="font-size:11px; color:var(--text-muted)">${c['RIF'] || 'S/R'}</div>
                </td>
                <td style="font-size:13px">${Utils.escapeHtml(c['Persona Contacto'] || '—')}</td>
                <td>
                  <div class="score-badge">${c['Puntaje'] || '0'}</div>
                </td>
                <td>${Utils.statusBadge(c['Etapa Pipeline'] || 'Nuevo')}</td>
                <td>
                  <div style="font-size:12px">${Utils.escapeHtml(c['Email'] || '—')}</div>
                  <div style="font-size:11px; opacity:0.7">${c['Teléfonos'] || ''}</div>
                </td>
                <td class="text-right">
                  <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); App.navigate('/contacts/${c['ID']}')">Ver</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderBoard(content) {
    // In Kanban view, the stage filter "Todos" means show all columns.
    // If a specific stage is selected, maybe we just highlight it? 
    // Usually Kanban shows everything. We'll follow the standard.
    
    _sortables.forEach(s => s.destroy());
    _sortables = [];

    content.innerHTML = `
      <div class="kanban-board" id="kanban-board-inner">
        ${CONFIG.PIPELINE_STAGES.map(stage => {
          const cards = _contacts.filter(c => c['Etapa Pipeline'] === stage && _matchesSearch(c));
          const usd   = _totalUSD(stage);
          
          return `
            <div class="kanban-col ${stage === _stageFilter ? 'highlighted' : ''}">
              <div class="kanban-col-header">
                <div class="kanban-col-title">
                  <span class="col-dot" style="background:${Utils.stageColor(stage)};"></span>
                  ${stage}
                </div>
                <span class="kanban-count">${cards.length}</span>
              </div>
              ${usd > 0 ? `
                <div class="kanban-col-stats">
                  $ ${Utils.formatUSD(usd)}
                </div>
              ` : ''}
              <div class="kanban-cards" id="col-${Utils.slugify(stage)}" data-stage="${stage}">
                ${cards.map(c => _cardHTML(c)).join('')}
                ${cards.length === 0 ? '<div class="kanban-empty">Sin leads</div>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Init Sortable
    CONFIG.PIPELINE_STAGES.forEach(stage => {
      const el = document.getElementById('col-' + Utils.slugify(stage));
      if (!el) return;
      const sortable = new Sortable(el, {
        group: 'pipeline',
        animation: 200,
        ghostClass: 'kanban-drop-zone',
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
    return `
      <div class="kanban-card elite-card" data-id="${contact['ID']}" onclick="event.stopPropagation(); App.navigate('/contacts/${contact['ID']}')">
        <div class="kanban-card-name">${Utils.escapeHtml(contact['Razón Social'])}</div>
        <div class="kanban-card-sub">${Utils.escapeHtml(contact['Persona Contacto'] || '')}</div>
        <div class="kanban-card-footer">
          <span class="card-rif">${contact['RIF'] || ''}</span>
          ${contact['Puntaje'] ? `<span class="score-badge sm">${contact['Puntaje']}</span>` : ''}
        </div>
      </div>
    `;
  }

  function _getFilteredContacts() {
    return _contacts.filter(c => {
      const matchesStage = (_stageFilter === 'Todos' || c['Etapa Pipeline'] === _stageFilter);
      return matchesStage && _matchesSearch(c);
    });
  }

  function _matchesSearch(c) {
    if (!_searchQuery) return true;
    const q = _searchQuery.toLowerCase();
    return (
      (c['Razón Social'] || '').toLowerCase().includes(q) ||
      (c['Persona Contacto'] || '').toLowerCase().includes(q) ||
      (c['Email'] || '').toLowerCase().includes(q) ||
      (c['RIF'] || '').toLowerCase().includes(q)
    );
  }

  function handleSearch(query) {
    _searchQuery = query;
    _renderCurrentView();
  }

  function setStageFilter(stage) {
    _stageFilter = stage;
    // Update active class on pills
    document.querySelectorAll('.lead-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stage === stage);
    });
    _renderCurrentView();
  }

  function setView(view) {
    _view = view;
    localStorage.setItem('pipeline-view', view);
    // Update buttons
    document.querySelectorAll('.switcher-btn').forEach(btn => {
      btn.classList.toggle('active', btn.innerHTML.includes(view === 'list' ? 'Lista' : 'Kanban'));
    });
    _renderCurrentView();
  }

  function _totalUSD(stage) {
    const stageContacts = _contacts.filter(c => c['Etapa Pipeline'] === stage);
    const ids = new Set(stageContacts.map(c => c['ID']));
    return _quotations
      .filter(q => ids.has(q['ID Cliente']) && ['Enviada','Negociación','Aceptada'].includes(q['Estado']))
      .reduce((sum, q) => sum + Utils.toNumber(q['Total USD']), 0);
  }

  async function _moveContact(contactId, newStage) {
    try {
      const contact = _contacts.find(c => c['ID'] === contactId);
      if (!contact || contact['Etapa Pipeline'] === newStage) return;

      const updated = { ...contact, 'Etapa Pipeline': newStage };
      await Sheets.updateRow(CONFIG.SHEETS.CONTACTS, contactId, updated);
      
      contact['Etapa Pipeline'] = newStage;
      _updateCounts();
      Utils.showToast(`Lead movido a "${newStage}"`, 'success');
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  return { render, reload: _load, handleSearch, setStageFilter, setView };
})();
