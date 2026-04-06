/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Productos / Servicios
   ════════════════════════════════════════════════════════════════════════════ */

const Products = (() => {
  let _products = [];
  let _filterSearch = '';
  let _filterCat    = '';
  let _currContainer = null;

  async function render(container, force = false) {
    if (container) _currContainer = container;
    const target = _currContainer || document.getElementById('main-content');
    if (!target) return;

    if (force) {
      target.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Actualizando catálogo...</p></div>`;
      await _load(true);
    }

    target.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Productos / Servicios</h1>
            <p class="page-subtitle" id="products-count">Cargando…</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-secondary" onclick="Products.render(null, true)" title="Sincronizar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Sincronizar
            </button>
            <button class="btn btn-primary" onclick="Products.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="hidden-mobile">Nuevo Producto</span>
              <span class="show-mobile-only">Nuevo</span>
            </button>
          </div>
        </div>

        <div class="toolbar-enhanced" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; gap:16px; flex-wrap:wrap;">
          <div style="flex:1; min-width:300px; display:flex; gap:12px;">
            <div class="search-input-wrap" style="flex:1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input class="form-input" placeholder="Buscar producto o servicio…"
                     oninput="Products.applyFilter('search', this.value)" />
            </div>
            <select class="filter-select" id="cat-filter" onchange="Products.applyFilter('cat', this.value)" style="max-width:200px;">
              <option value="">Todas las categorías</option>
            </select>
          </div>
        </div>

        <div id="products-list-container">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <!-- Mobile FAB -->
        <button class="fab show-mobile-only" onclick="Products.openForm()" title="Nuevo Producto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="24" height="24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    `;

    await _load();
  }

  async function _load(force = false) {
    try {
      _products = await Sheets.readSheet(CONFIG.SHEETS.PRODUCTS, force);

      // Populate categories filter
      const cats = [...new Set(_products.map(p => p['Categoría']).filter(Boolean))].sort();
      const sel  = document.getElementById('cat-filter');
      if (sel) {
        sel.innerHTML = '<option value="">Todas las categorías</option>';
        cats.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c; opt.textContent = c;
          sel.appendChild(opt);
        });
      }

      _renderCurrent();
    } catch(e) {
      console.error('[Products] Load error:', e);
      const container = document.getElementById('products-list-container');
      if (container) container.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderCurrent() {
    const wrap = document.getElementById('products-list-container');
    if (!wrap) return;

    let filtered = _products;
    if (_filterSearch) {
      const q = _filterSearch.toLowerCase();
      filtered = filtered.filter(p => 
        String(p['Nombre']).toLowerCase().includes(q) || 
        String(p['SKU']).toLowerCase().includes(q)
      );
    }
    if (_filterCat) {
      filtered = filtered.filter(p => p['Categoría'] === _filterCat);
    }

    const countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = `${filtered.length} productos en catálogo`;

    if (filtered.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">No hay productos que coincidan con la búsqueda.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:100px;">
        ${filtered.map(p => `
          <div class="q-list-card clickable" onclick="Products.openForm('${p['ID']}')">
            <div class="q-list-content">
              <div class="q-list-icon" style="color:var(--primary);">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="q-list-main-info">
                <h3 class="q-list-title">${Utils.escapeHtml(p['Nombre'])}</h3>
                <div class="q-list-sub">${Utils.escapeHtml(p['Categoría'] || 'General')} • SKU: ${p['SKU'] || 'S/N'}</div>
              </div>
            </div>

            <div class="q-list-meta">
              <div class="q-list-status-price">
                <span class="q-list-price">$ ${Utils.formatUSD(p['Precio USD'])}</span>
              </div>
              <div class="q-list-actions">
                <button class="btn btn-icon-sm" onclick="event.stopPropagation(); Products.openForm('${p['ID']}')" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-icon-sm danger-text" onclick="event.stopPropagation(); Products.deleteItem('${p['ID']}')" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function applyFilter(type, value) {
    if (type === 'search') _filterSearch = value;
    if (type === 'cat')    _filterCat    = value;
    _renderCurrent();
  }

  function openForm(id) {
    const product = id ? _products.find(p => p['ID'] === id) : null;
    Utils.showModal({
      title: id ? 'Editar Producto' : 'Nuevo Producto',
      size: 'md',
      content: `
        <form id="product-form">
          <div class="form-grid">
            <div class="form-group full">
              <label class="form-label">Nombre <span class="required">*</span></label>
              <input class="form-input" name="Nombre" required value="${Utils.escapeHtml(product?.['Nombre']||'')}" />
            </div>
            <div class="form-group full">
              <label class="form-label">Descripción</label>
              <textarea class="form-textarea" name="Descripción" style="min-height:80px;">${Utils.escapeHtml(product?.['Descripción']||'')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Categoría</label>
              <input class="form-input" name="Categoría" list="cat-list"
                     value="${Utils.escapeHtml(product?.['Categoría']||'')}" />
              <datalist id="cat-list">
                ${[...(new Set(_products.map(p=>p['Categoría']).filter(Boolean)))].map(c=>`<option value="${c}">`).join('')}
              </datalist>
            </div>
            <div class="form-group">
              <label class="form-label">Precio USD <span class="required">*</span></label>
              <input class="form-input" type="number" min="0" step="0.01" name="Precio USD" required
                     value="${product?.['Precio USD']||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Costo USD</label>
              <input class="form-input" type="number" min="0" step="0.01" name="Costo USD"
                     value="${product?.['Costo USD']||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Impuesto %</label>
              <input class="form-input" type="number" min="0" step="0.01" name="Impuesto %"
                     value="${product?.['Impuesto %']||'0'}" />
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Products.save('${id||''}')">
          ${id ? 'Guardar cambios' : 'Crear producto'}
        </button>
      `
    });
  }

  async function save(id) {
    const data = Utils.getFormData('product-form');
    if (Utils.validateRequired(data, ['Nombre','Precio USD']).length) {
      Utils.showToast('Nombre y precio son requeridos', 'warning'); return;
    }
    try {
      if (id) {
        const p = _products.find(x => x['ID'] === id);
        await Sheets.updateRow(CONFIG.SHEETS.PRODUCTS, id, { ...p, ...data });
        Utils.showToast('Producto actualizado', 'success');
      } else {
        await Sheets.appendRow(CONFIG.SHEETS.PRODUCTS, {
          'ID': Utils.generateId(), ...data
        });
        Utils.showToast('Producto creado', 'success');
      }
      Utils.closeModal();
      await _load(true);
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  function deleteProduct(id) {
    Utils.confirm('¿Eliminar este producto?', async () => {
      try {
        await Sheets.deleteRow(CONFIG.SHEETS.PRODUCTS, id);
        Utils.showToast('Producto eliminado', 'success');
        await _load(true);
      } catch(e) { Utils.showToast('Error: ' + e.message, 'error'); }
    });
  }

  function exportCSV() {
    Utils.exportToCSV(_products, 'productos-ergoexpress.csv');
  }

  return { render, openForm, save, applyFilter, deleteItem: deleteProduct, exportCSV, getAll: () => _products, setView: () => {} };
})();
