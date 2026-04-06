/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Contactos / Clientes
   CRUD completo, detalle con historial y pipeline
   ════════════════════════════════════════════════════════════════════════════ */

const Contacts = (() => {
  let _contacts = [];
  let _tracking = [];
  let _products = [];
  let _sortField = 'Item';
  let _sortDir   = 'asc';
  let _view      = localStorage.getItem('contacts_view') || 'list';
  let _filters   = { search: '', tipo: '', estado: '', etapa: '' };
  let _sortables = [];
  let _currContainer = null;

  // ─── List View ────────────────────────────────────────────────────────────
  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    if (force) {
      target.innerHTML = `<div class="loading-spinner" style="margin:100px auto;"><div class="spinner"></div><p>Sincronizando con Google Sheets...</p></div>`;
      await _loadContacts();
    }

    target.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Contactos</h1>
            <p class="page-subtitle" id="contacts-count">Cargando…</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary" onclick="Contacts.render(null, true)" title="Sincronizar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Sincronizar
            </button>

            <button class="btn btn-primary" onclick="Contacts.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="hidden-mobile">Nuevo Contacto</span>
              <span class="show-mobile-only">Nuevo</span>
            </button>
          </div>
        </div>

        <!-- Filters (Optimizado para móvil) -->
        <div class="filters-bar">
          <div class="search-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="form-input" id="contact-search" placeholder="Buscar contacto o RIF…"
                   oninput="Contacts.applyFilter('search', this.value)" />
          </div>
          <select class="filter-select hidden-mobile" onchange="Contacts.applyFilter('tipo', this.value)">
            <option value="">Todos los tipos</option>
            ${CONFIG.CONTACT_TYPES.map(t => `<option value="${t}">${Utils.capitalize(t)}</option>`).join('')}
          </select>
        </div>

        <!-- Table / Grid Container -->
        <div id="contacts-table-wrap" style="min-height: 200px;">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <!-- Mobile FAB -->
        <button class="fab show-mobile-only" onclick="Contacts.openForm()" title="Nuevo Contacto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="24" height="24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    `;
    await _loadContacts();
  }

  async function _loadContacts() {
    try {
      _contacts = await Sheets.readSheet(CONFIG.SHEETS.CONTACTS, false);
      
      // Safety check: Is the contacts screen still active?
      if (!document.getElementById('contacts-table-wrap')) return;

      if (!App.isAdmin()) {
        const email = App.getCurrentUserEmail();
        _contacts = _contacts.filter(c => c['Vendedor Email'] === email);
      }
      
      _renderCurrentView();
    } catch(e) {
      console.error('[Contacts] Load error:', e);
      const wrap = document.getElementById('contacts-table-wrap');
      if (wrap) wrap.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderCurrentView() {
    const wrap = document.getElementById('contacts-table-wrap');
    if (!wrap) return;

    const filtered = _applyFilters(_contacts);
    const countEl = document.getElementById('contacts-count');
    if (countEl) countEl.textContent = `${filtered.length} contactos encontrados`;

    if (filtered.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">No se encontraron contactos con los filtros actuales.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:100px;">
        ${filtered.map(c => {
          const stage = c['Etapa Pipeline'] || 'Nuevo';
          return `
            <div class="q-list-card clickable" onclick="Contacts.renderDetail(null, '${c['ID']}')">
              <div class="q-list-content">
                <div class="q-list-icon" style="color:var(--primary);">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="q-list-main-info">
                  <h3 class="q-list-title">${Utils.escapeHtml(c['Razón Social'])}</h3>
                  <div class="q-list-sub">
                    ${Utils.escapeHtml(c['Persona Contacto'] || 'Sin contacto')} • ${c['RIF'] || 'S/RIF'}
                  </div>
                </div>
              </div>

              <div class="q-list-meta">
                <div class="q-list-status-price">
                  <span class="q-list-status" style="background:rgba(13, 115, 119, 0.1); color:var(--primary);">${stage}</span>
                </div>
                <div class="q-list-actions">
                  <button class="btn btn-icon-sm" style="color:#25D366;" onclick="event.stopPropagation(); window.open('https://wa.me/${Utils.cleanPhone(c['Teléfonos'])}', '_blank')" title="WhatsApp">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 7.454c-1.893 0-3.748-.511-5.361-1.477l-.385-.228-3.991 1.047 1.065-3.893-.25-.398a10.038 10.038 0 0 1-1.531-5.312c0-5.54 4.51-10.05 10.05-10.05 2.684 0 5.207 1.046 7.104 2.943a10.003 10.003 0 0 1 2.943 7.106c0 5.54-4.51 10.05-10.05 10.05m0-21.782c-6.475 0-11.732 5.257-11.732 11.73 0 2.07.541 4.091 1.565 5.885l-1.666 6.085 6.223-1.632a11.705 11.705 0 0 0 5.61 1.444c6.473 0 11.731-5.257 11.731-11.73 0-3.136-1.22-6.084-3.436-8.301-2.215-2.216-5.163-3.435-8.295-3.435\"/></svg>
                  </button>
                  <div style="width:1px; height:16px; background:var(--border-light); margin:0 4px;"></div>
                  <button class="btn btn-icon-sm" onclick="event.stopPropagation(); Contacts.openForm('${c['ID']}')" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-icon-sm danger-text" onclick="event.stopPropagation(); Contacts.deleteContact('${c['ID']}')" title="Eliminar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function _applyFilters(list) {
    const { search, tipo, estado, etapa } = _filters;
    return list.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        const matches = ['Razón Social','RIF','Email','Persona Contacto','Teléfonos']
          .some(f => String(c[f] || '').toLowerCase().includes(s));
        if (!matches) return false;
      }
      if (tipo  && c['Tipo'] !== tipo)           return false;
      if (estado && c['Estado'] !== estado)       return false;
      if (etapa  && c['Etapa Pipeline'] !== etapa) return false;
      return true;
    });
  }

  function applyFilter(key, value) {
    _filters[key] = value;
    _renderCurrentView();
  }

  function sortBy(field) {
    if (_sortField === field) {
      _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _sortField = field;
      _sortDir   = 'asc';
    }
    _renderCurrentView();
  }

  // ─── Contact Form ─────────────────────────────────────────────────────────
  async function openForm(id) {
    let contact = null;
    if (id) {
      contact = _contacts.find(c => c['ID'] === id);
    }

    const title = id ? 'Editar Contacto' : 'Nuevo Contacto';

    Utils.showModal({
      title,
      size: 'lg',
      content: `
        <form id="contact-form">
          <div class="form-section">
            <div class="form-section-title">Datos de la Empresa</div>
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">Razón Social <span class="required">*</span></label>
                <input class="form-input" name="Razón Social" required
                       value="${Utils.escapeHtml(contact?.['Razón Social'] || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">RIF</label>
                <input class="form-input" name="RIF" placeholder="J-XXXXXXXX-X"
                       value="${Utils.escapeHtml(contact?.['RIF'] || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo <span class="required">*</span></label>
                <select class="form-select" name="Tipo">
                  ${CONFIG.CONTACT_TYPES.map(t => `
                    <option value="${t}" ${contact?.['Tipo'] === t ? 'selected' : ''}>${Utils.capitalize(t)}</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Persona de Contacto</div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Persona Contacto</label>
                <input class="form-input" name="Persona Contacto"
                       value="${Utils.escapeHtml(contact?.['Persona Contacto'] || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Teléfonos</label>
                <input class="form-input" name="Teléfonos" placeholder="+58 424-XXXXXXX"
                       value="${Utils.escapeHtml(contact?.['Teléfonos'] || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" name="Email"
                       value="${Utils.escapeHtml(contact?.['Email'] || '')}" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Ubicación</div>
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">Dirección</label>
                <input class="form-input" name="Dirección"
                       value="${Utils.escapeHtml(contact?.['Dirección'] || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Estado (Venezuela)</label>
                <select class="form-select" name="Estado">
                  <option value="">Seleccionar…</option>
                  ${CONFIG.VE_STATES.map(s => `
                    <option value="${s}" ${contact?.['Estado'] === s ? 'selected' : ''}>${s}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Etapa Pipeline</label>
                <select class="form-select" name="Etapa Pipeline">
                  <option value="">Sin etapa</option>
                  ${CONFIG.PIPELINE_STAGES.map(s => `
                    <option value="${s}" ${contact?.['Etapa Pipeline'] === s ? 'selected' : ''}>${s}</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-title">Notas Internas</div>
            <div class="form-group">
              <textarea class="form-textarea" name="Notas" placeholder="Información adicional…">${Utils.escapeHtml(contact?.['Notas'] || '')}</textarea>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Contacts.saveForm('${id || ''}')">
          ${id ? 'Guardar cambios' : 'Crear contacto'}
        </button>
      `
    });
  }

  async function saveForm(id) {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });

    const missing = Utils.validateRequired(data, ['Razón Social']);
    if (missing.length) {
      Utils.showToast('Completa la Razón Social', 'warning');
      return;
    }

    try {
      if (id) {
        // Update existing
        const contact = _contacts.find(c => c['ID'] === id);
        if (!contact) throw new Error('Contacto no encontrado');
        const updated = { ...contact, ...data };
        await Sheets.updateRow(CONFIG.SHEETS.CONTACTS, id, updated);
        Utils.showToast('Contacto actualizado', 'success');
      } else {
        // New contact
        const itemNum = await Sheets.nextItemNumber();
        const newContact = {
          'Item': itemNum,
          'ID': Utils.generateId(),
          ...data,
          'Fecha Registro': Utils.todayISO(),
          'Vendedor Email': App.getCurrentUserEmail()
        };
        await Sheets.appendRow(CONFIG.SHEETS.CONTACTS, newContact);
        Utils.showToast('Contacto creado exitosamente', 'success');
      }

      Utils.closeModal();
      await _loadContacts();
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  function deleteContact(id) {
    Utils.confirm(
      '¿Eliminar este contacto? Esta acción no se puede deshacer.',
      async () => {
        try {
          await Sheets.deleteRow(CONFIG.SHEETS.CONTACTS, id);
          Utils.showToast('Contacto eliminado', 'success');
          await _loadContacts();
        } catch(e) {
          Utils.showToast('Error: ' + e.message, 'error');
        }
      }
    );
  }

  // ─── Detail View ──────────────────────────────────────────────────────────
  async function renderDetail(container, id) {
    container = container || document.getElementById('main-content');
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header" style="margin-bottom:20px;">
           <div style="display:flex; align-items:center; gap:12px;">
             <button class="btn btn-ghost btn-icon" onclick="App.navigate('/contacts')" title="Volver">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
             </button>
             <div>
               <h1 class="page-title" id="detail-name">Cargando Ficha...</h1>
               <p class="page-subtitle" id="detail-rif">Preparando indicadores maestros</p>
             </div>
           </div>
           <div class="page-actions" id="detail-actions"></div>
        </div>

        <div id="detail-spinner" class="loading-spinner" style="margin:60px auto;"><div class="spinner"></div></div>
        
        <div id="detail-content" style="display:none;">
           <!-- Top Dashboard -->
           <div class="client-dashboard" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:24px;">
              <!-- ID Card -->
              <div class="card card-padded" style="border-left:4px solid var(--primary);">
                 <div style="display:flex; gap:16px; align-items:center;">
                    <div id="client-avatar" style="width:56px; height:56px; border-radius:12px; background:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; color:var(--primary-light);">—</div>
                    <div>
                       <div id="client-type-badge"></div>
                       <div id="client-since" style="font-size:11px; color:var(--text-muted); margin-top:4px;">Registrado el: —</div>
                    </div>
                 </div>
              </div>

              <!-- Metrics -->
              <div class="card card-padded">
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div>
                       <div style="font-size:9px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Facturado Total</div>
                       <div id="m-total-quote" style="font-size:18px; font-weight:900; color:var(--success);">$ 0.00</div>
                    </div>
                    <div>
                       <div style="font-size:9px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Saldo Pendiente</div>
                       <div id="m-pending" style="font-size:18px; font-weight:900; color:var(--error);">$ 0.00</div>
                    </div>
                 </div>
              </div>

              <!-- Quick Actions -->
              <div class="card card-padded" style="background:rgba(13, 115, 119, 0.05);">
                 <div style="display:flex; justify-content:space-around; align-items:center; height:100%;">
                    <button id="cta-whatsapp" class="btn btn-icon btn-ghost" style="color:#25D366;" title="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 7.454c-1.893 0-3.748-.511-5.361-1.477l-.385-.228-3.991 1.047 1.065-3.893-.25-.398a10.038 10.038 0 0 1-1.531-5.312c0-5.54 4.51-10.05 10.05-10.05 2.684 0 5.207 1.046 7.104 2.943a10.003 10.003 0 0 1 2.943 7.106c0 5.54-4.51 10.05-10.05 10.05m0-21.782c-6.475 0-11.732 5.257-11.732 11.73 0 2.07.541 4.091 1.565 5.885l-1.666 6.085 6.223-1.632a11.705 11.705 0 0 0 5.61 1.444c6.473 0 11.731-5.257 11.731-11.73 0-3.136-1.22-6.084-3.436-8.301-2.215-2.216-5.163-3.435-8.295-3.435"/></svg></button>
                    <button id="cta-call" class="btn btn-icon btn-ghost" style="color:var(--primary-light);" title="Llamar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                    <button id="cta-map" class="btn btn-icon btn-ghost" style="color:var(--secondary);" title="Mapa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></button>
                 </div>
              </div>
           </div>

           <!-- Navigation Tabs -->
           <div class="tabs-group" style="margin-bottom:20px; border-bottom:1px solid var(--border);">
              <button class="tab-btn active" onclick="Contacts.switchTab('history', this)">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                 Interacciones
              </button>
              <button class="tab-btn" onclick="Contacts.switchTab('quotes', this)">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                 Presupuestos
              </button>
              <button class="tab-btn" onclick="Contacts.switchTab('profile', this)">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 Perfil Legal
              </button>
           </div>

           <!-- Content Panels -->
           <div id="tab-history" class="tab-panel active">
              <div class="u-flex-between" style="margin-bottom:16px;">
                 <h3 style="font-size:16px; font-weight:800; color:var(--text-primary);">Línea de Tiempo</h3>
                 <button class="btn btn-sm btn-ghost" onclick="Contacts.openInteractionForm('${id}')">+ Registrar Nota</button>
              </div>
              <div id="section-history"></div>
           </div>

           <div id="tab-quotes" class="tab-panel" style="display:none;">
              <div class="u-flex-between" style="margin-bottom:16px;">
                 <h3 style="font-size:16px; font-weight:800; color:var(--text-primary);">Cotizaciones Enviadas</h3>
                 <button class="btn btn-sm btn-primary" onclick="Quotations.openForm()">+ Nueva Cotización</button>
              </div>
              <div id="section-quotes"></div>
           </div>

           <div id="tab-profile" class="tab-panel" style="display:none;">
              <div class="card card-padded" style="border:1px dashed var(--border);">
                 <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:24px;">
                    <div><label style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Razón Social</label><p id="p-legal-name" style="font-weight:700;">—</p></div>
                    <div><label style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">RIF Especial</label><p id="p-legal-rif" style="font-weight:700;">—</p></div>
                    <div><label style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Ubicación Estado</label><p id="p-legal-state" style="font-weight:700;">—</p></div>
                    <div><label style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Email Corporativo</label><p id="p-legal-email" style="font-weight:700;">—</p></div>
                    <div style="grid-column: 1 / -1;"><label style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Dirección Fiscal</label><p id="p-legal-address" style="font-weight:700;">—</p></div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    `;

    try {
      const [allContacts, allTracking, allQuotes] = await Promise.all([
        Sheets.readSheet(CONFIG.SHEETS.CONTACTS, false),
        Sheets.readSheet(CONFIG.SHEETS.TRACKING, false),
        Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS, false)
      ]);

      const contact = allContacts.find(c => String(c.ID || '').trim() === String(id || '').trim());

      if (!contact) {
         container.innerHTML = `<div class="empty-state">Cliente no encontrado</div>`;
         return;
      }

      document.getElementById('detail-name').textContent = contact['Razón Social'];
      document.getElementById('detail-rif').textContent  = 'Registro ID: ' + (contact['RIF'] || 'S/R');
      document.getElementById('client-avatar').textContent = Utils.initials(contact['Razón Social']);
      document.getElementById('client-type-badge').innerHTML = Utils.statusBadge(contact['Tipo']);
      
      const dateEl = document.getElementById('client-since');
      if (dateEl) dateEl.textContent = 'Desde: ' + Utils.formatDate(contact['Fecha Registro'] || '');
      
      document.getElementById('p-legal-name').textContent = contact['Razón Social'];
      document.getElementById('p-legal-rif').textContent  = contact['RIF'] || 'No disponible';
      document.getElementById('p-legal-state').textContent = contact['Estado'] || 'General';
      document.getElementById('p-legal-email').textContent = contact['Email'] || 'Sin correo';
      document.getElementById('p-legal-address').textContent = contact['Dirección'] || 'No registrada';

      const myQuotes = allQuotes.filter(q => String(q['ID Cliente']) === String(id));
      const totalQuote = myQuotes.reduce((sum, q) => sum + Utils.toNumber(q['Total USD']), 0);
      
      const allIncome = await Sheets.readSheet(CONFIG.SHEETS.FINANCE_INCOME, false);
      const myIncome = allIncome.filter(i => String(i['ID Cliente']) === String(id));
      const totalPaid = myIncome.reduce((sum, i) => sum + Utils.toNumber(i['Total USD']), 0);
      const pending = totalQuote - totalPaid;

      document.getElementById('m-total-quote').textContent = '$ ' + Utils.formatUSD(totalQuote);
      document.getElementById('m-pending').textContent = '$ ' + Utils.formatUSD(pending > 0 ? pending : 0);

      const phoneRaw = contact['Teléfonos'] || '';
      const whatsapp = Utils.formatWhatsApp(phoneRaw, contact['Dirección']);
      const phoneOnly = String(phoneRaw).replace(/\D/g, '');

      if (whatsapp) document.getElementById('cta-whatsapp').onclick = () => window.open(`https://api.whatsapp.com/send?phone=${whatsapp}`, '_blank');
      if (phoneOnly) document.getElementById('cta-call').onclick = () => window.location.href = `tel:${phoneOnly}`;
      const address = contact['Dirección'];
      if (address) document.getElementById('cta-map').onclick = () => window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank');

      document.getElementById('section-history').innerHTML = _renderTimeline(allTracking.filter(t => String(t['ID Cliente']) === String(id)));
      document.getElementById('section-quotes').innerHTML = _renderContactQuotes(myQuotes);

      document.getElementById('detail-actions').innerHTML = `
        <button class="btn btn-primary" onclick="Quotations.openForm({ clientId: '${id}' })">Nuevo Presupuesto</button>
        <button class="btn btn-ghost btn-icon" onclick="Contacts.openForm('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      `;

      document.getElementById('detail-spinner').style.display = 'none';
      document.getElementById('detail-content').style.display = 'block';
    } catch(e) {
      console.error(e);
      document.getElementById('detail-spinner').innerHTML = `<p style="color:var(--error)">Error cargando ficha: ${e.message}</p>`;
    }
  }

  function _renderContactQuotes(quotes) {
    if (!quotes.length) return '<div class="empty-state">No hay presupuestos registrados.</div>';
    return `
      <table class="data-table">
        <thead>
           <tr>
             <th># Propuesta</th>
             <th>Fecha</th>
             <th>Etapa</th>
             <th style="text-align:right;">Monto USD</th>
             <th>Acciones</th>
           </tr>
        </thead>
        <tbody>
           ${quotes.map(q => `
             <tr>
               <td class="td-bold">#ERGOX-${String(q['Número']).padStart(4,'0')}</td>
               <td>${Utils.formatDate(q['Fecha'])}</td>
               <td>${Utils.statusBadge(q['Estado'])}</td>
               <td style="text-align:right; font-weight:700;">$ ${Utils.formatUSD(q['Total USD'])}</td>
               <td>
                  <button class="btn btn-icon btn-ghost" onclick="App.navigate('/quotations/${q['ID']}')">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
               </td>
             </tr>
           `).join('')}
        </tbody>
      </table>
    `;
  }

  function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + tabName).style.display = 'block';
  }

  function _renderTimeline(items) {
    if (!items.length) return '<div class="empty-state" style="padding:40px;"><p class="u-muted">No hay interacciones registradas.</p></div>';
    const sorted = [...items].sort((a,b) => b['Fecha'].localeCompare(a['Fecha']));
    const typeEmoji = { nota:'📝', llamada:'📞', email:'✉️', reunión:'🤝', visita:'🏢' };
    return `<div class="timeline-enterprise">
      ${sorted.map(t => `
        <div class="timeline-card">
          <div class="timeline-card-header">
            <span class="timeline-card-type"><span style="margin-right:6px;">${typeEmoji[t['Tipo']] || '•'}</span> ${t['Tipo']}</span>
            <span class="timeline-card-date">${Utils.formatDate(t['Fecha'])}</span>
          </div>
          <div class="timeline-card-desc">${Utils.escapeHtml(t['Descripción'] || '')}</div>
          ${t['Próximo Seguimiento'] ? `
            <div class="card-footer-lite" style="margin-top:10px; border-color:rgba(245,158,11,0.2);">
              <div class="u-flex-center u-gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="color:var(--warning)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span style="font-size:10px; font-weight:700; color:var(--warning);">SEGUIMIENTO: ${Utils.formatDate(t['Próximo Seguimiento'])}</span>
              </div>
              <span style="font-size:10px; font-style:italic;">${Utils.escapeHtml(t['Asunto Próximo'] || '')}</span>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>`;
  }

  function openInteractionForm(contactId) {
    Utils.showModal({
      title: 'Registrar Interacción',
      size: 'md',
      content: `
        <form id="interaction-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Tipo <span class="required">*</span></label>
              <select class="form-select" name="Tipo">
                ${CONFIG.INTERACTION_TYPES.map(t => `<option value="${t}">${Utils.capitalize(t)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha <span class="required">*</span></label>
              <input class="form-input" type="date" name="Fecha" value="${Utils.todayISO()}" required />
            </div>
            <div class="form-group full">
              <label class="form-label">Descripción <span class="required">*</span></label>
              <textarea class="form-textarea" name="Descripción" required placeholder="Describe la interacción…"></textarea>
            </div>
            <div class="form-section-title full" style="margin:0;">Próximo Seguimiento (opcional)</div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input class="form-input" type="date" name="Próximo Seguimiento" />
            </div>
            <div class="form-group">
              <label class="form-label">Asunto / Tema</label>
              <input class="form-input" name="Asunto Próximo" placeholder="Ej: Llamada de seguimiento" />
            </div>
            <div class="form-group">
              <label class="form-label">Etapa Pipeline</label>
              <select class="form-select" name="Etapa Pipeline">
                <option value="">Sin cambio</option>
                ${CONFIG.PIPELINE_STAGES.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Contacts.saveInteraction('${contactId}')">Guardar</button>
      `
    });
  }

  async function saveInteraction(contactId) {
    const data = Utils.getFormData('interaction-form');
    const missing = Utils.validateRequired(data, ['Tipo','Fecha','Descripción']);
    if (missing.length) {
      Utils.showToast('Completa los campos requeridos', 'warning');
      return;
    }

    try {
      const row = {
        'ID': Utils.generateId(),
        'ID Cliente': contactId,
        'Fecha': data['Fecha'],
        'Tipo': data['Tipo'],
        'Descripción': data['Descripción'],
        'Próximo Seguimiento': data['Próximo Seguimiento'] || '',
        'Asunto Próximo': data['Asunto Próximo'] || '',
        'Etapa Pipeline': data['Etapa Pipeline'] || '',
        'Fecha Cambio Etapa': data['Etapa Pipeline'] ? Utils.todayISO() : '',
        'Usuario Email': App.getCurrentUserEmail()
      };

      await Sheets.appendRow(CONFIG.SHEETS.TRACKING, row);

      if (data['Etapa Pipeline']) {
        const contact = _contacts.find(c => c['ID'] === contactId);
        if (contact) {
          const updated = { ...contact, 'Etapa Pipeline': data['Etapa Pipeline'] };
          await Sheets.updateRow(CONFIG.SHEETS.CONTACTS, contact._rowIndex, updated);
        }
      }

      Utils.showToast('Interacción registrada', 'success');
      Utils.closeModal();
      renderDetail(document.getElementById('main-content'), contactId);
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  function exportCSV() {
    const visible = _applyFilters(_contacts);
    Utils.exportToCSV(visible, 'contactos-ergoexpress.csv');
  }

  return {
    render, renderDetail, openForm, saveForm,
    deleteContact,
    applyFilter, sortBy,
    openInteractionForm, saveInteraction,
    exportCSV,
    updateField: async (id, field, value) => {
      try {
        Utils.showToast('Actualizando...', 'info');
        await Sheets.updateRow(CONFIG.SHEETS.CONTACTS, id, { [field]: value });
        const c = _contacts.find(x => x['ID'] === id);
        if (c) c[field] = value;
        Utils.showToast('Actualizado correctamente', 'success');
        _renderCurrentView();
      } catch(e) {
        Utils.showToast('Error: ' + e.message, 'error');
      }
    }
  };
})();
