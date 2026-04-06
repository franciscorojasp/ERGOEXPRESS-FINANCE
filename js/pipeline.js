/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Pipeline (Leads)
   ════════════════════════════════════════════════════════════════════════════ */

const Pipeline = (() => {
  let _contacts = [];
  let _stageFilter = 'Todos';
  let _searchQuery = '';
  let _currContainer = null;

  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    target.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Pipeline de Leads</h1>
            <p class="page-subtitle" id="pipeline-count">Cargando prospectos…</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary" onclick="Pipeline.render(null, true)" title="Sincronizar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Sincronizar
            </button>
            <button class="btn btn-primary" onclick="Contacts.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="hidden-mobile">Nuevo Lead</span>
              <span class="show-mobile-only">Nuevo</span>
            </button>
          </div>
        </div>

        <!-- Stage Pills -->
        <div class="leads-pills-row" id="leads-pills" style="margin-bottom:24px;">
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

        <div class="toolbar-enhanced" style="margin-bottom:24px;">
          <div class="search-input-wrap" style="max-width:400px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="form-input" placeholder="Buscar por nombre, empresa o email..."
                   oninput="Pipeline.handleSearch(this.value)" />
          </div>
        </div>

        <div id="pipeline-list-container">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await _load(force);
  }

  async function _load(force = false) {
    try {
      _contacts = await Sheets.readSheet(CONFIG.SHEETS.CONTACTS, force);
      
      if (!App.isAdmin()) {
        const email = App.getCurrentUserEmail();
        _contacts = _contacts.filter(c => c['Vendedor Email'] === email);
      }

      _updateCounts();
      _renderCurrent();
    } catch(e) {
      console.error('[Pipeline] Load error:', e);
      const container = document.getElementById('pipeline-list-container');
      if (container) container.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _updateCounts() {
    const totalEl = document.getElementById('count-todos');
    if (totalEl) totalEl.textContent = _contacts.length;

    CONFIG.PIPELINE_STAGES.forEach(stage => {
      const count = _contacts.filter(c => c['Etapa Pipeline'] === stage).length;
      const el = document.getElementById('count-' + Utils.slugify(stage));
      if (el) el.textContent = count;
    });
  }

  function _renderCurrent() {
    const wrap = document.getElementById('pipeline-list-container');
    if (!wrap) return;

    const filtered = _contacts.filter(c => {
      const matchesStage = (_stageFilter === 'Todos' || c['Etapa Pipeline'] === _stageFilter);
      const q = _searchQuery.toLowerCase();
      const matchesSearch = !q || [c['Razón Social'], c['Persona Contacto'], c['Email']].some(f => String(f||'').toLowerCase().includes(q));
      return matchesStage && matchesSearch;
    });

    const countEl = document.getElementById('pipeline-count');
    if (countEl) countEl.textContent = `${filtered.length} prospectos en esta etapa`;

    if (filtered.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">No hay leads en esta selección.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:100px;">
        ${filtered.map(c => `
          <div class="q-list-card clickable" onclick="App.navigate('/contacts/${c['ID']}')">
            <div class="q-list-content">
              <div class="q-list-icon" style="color:${Utils.stageColor(c['Etapa Pipeline'])};">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
              </div>
              <div class="q-list-main-info">
                <h3 class="q-list-title">${Utils.escapeHtml(c['Razón Social'])}</h3>
                <div class="q-list-sub">${Utils.escapeHtml(c['Persona Contacto'] || 'Sin contacto')} • ${Utils.escapeHtml(c['Email'] || 'Sin email')}</div>
              </div>
            </div>

            <div class="q-list-meta">
              <div class="q-list-status-price">
                <span class="status-badge" style="background:${Utils.stageColor(c['Etapa Pipeline']) + '20'}; color:${Utils.stageColor(c['Etapa Pipeline'])}; border:1px solid ${Utils.stageColor(c['Etapa Pipeline']) + '40'};">
                  ${c['Etapa Pipeline'] || 'Nuevo'}
                </span>
                ${c['Puntaje'] ? `<span class="score-badge sm">${c['Puntaje']}</span>` : ''}
              </div>
              <div class="q-list-actions">
                <select class="form-select select-sm" style="width:auto; min-width:120px;" 
                        onclick="event.stopPropagation()"
                        onchange="Pipeline.changeStage('${c['ID']}', this.value)">
                  <option value="" disabled selected>Cambiar Etapa...</option>
                  ${CONFIG.PIPELINE_STAGES.map(s => `<option value="${s}" ${c['Etapa Pipeline']===s?'disabled':''}>${s}</option>`).join('')}
                </select>
                <button class="btn btn-icon-sm" title="Ver Detalles">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function setStageFilter(stage) {
    _stageFilter = stage;
    document.querySelectorAll('.lead-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stage === stage);
    });
    _renderCurrent();
  }

  function handleSearch(query) {
    _searchQuery = query;
    _renderCurrent();
  }

  async function changeStage(id, newStage) {
    if (!newStage) return;
    
    const selects = document.querySelectorAll(`select[onchange*="${id}"]`);
    selects.forEach(s => s.disabled = true);

    try {
      const contact = _contacts.find(c => c['ID'] === id);
      if (!contact) throw new Error('Contacto no encontrado en memoria.');

      const updated = { ...contact, 'Etapa Pipeline': newStage };
      await Sheets.updateRow(CONFIG.SHEETS.CONTACTS, id, updated);
      
      Utils.showToast(`Lead movido a ${newStage}`, 'success');
      await _load(true);
    } catch(e) {
      console.error('[Pipeline] Error cambiando etapa:', e);
      Utils.showToast('Error: ' + e.message, 'error');
      selects.forEach(s => s.disabled = false);
    }
  }

  return { render, reload: _load, handleSearch, setStageFilter, changeStage, setView: () => {} };
})();
