/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Productos / Servicios
   ════════════════════════════════════════════════════════════════════════════ */

const Products = (() => {
  let _products = [];
  let _sortField = 'Nombre';
  let _sortDir   = 'asc';
  let _filterSearch = '';
  let _filterCat    = '';

  async function render(container) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Productos / Servicios</h1>
            <p class="page-subtitle" id="products-count">Cargando…</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="Products.exportCSV()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
            <button class="btn btn-primary" onclick="Products.openForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo Producto
            </button>
          </div>
        </div>

        <div class="filters-bar">
          <div class="search-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="form-input" placeholder="Buscar producto…"
                   oninput="Products.applyFilter('search', this.value)" />
          </div>
          <select class="filter-select" id="cat-filter" onchange="Products.applyFilter('cat', this.value)">
            <option value="">Todas las categorías</option>
          </select>
        </div>

        <div class="table-wrapper" id="products-table">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await _load();
  }

  async function _load() {
    try {
      _products = await Sheets.readSheet(CONFIG.SHEETS.PRODUCTS, false);

      // Populate categories filter
      const cats = [...new Set(_products.map(p => p['Categoría']).filter(Boolean))].sort();
      const sel  = document.getElementById('cat-filter');
      if (sel) {
        cats.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c; opt.textContent = c;
          sel.appendChild(opt);
        });
      }

      _renderTable();
    } catch(e) {
      const table = document.getElementById('products-table');
      if (table) table.innerHTML = `<div class="empty-state"><p style="color:var(--error)">Error: ${e.message}</p></div>`;
    }
  }

  function _renderTable() {
    let list = _products;
    if (_filterSearch) {
      const s = _filterSearch.toLowerCase();
      list = list.filter(p => ['Nombre','Descripción','Categoría'].some(f => (p[f]||'').toLowerCase().includes(s)));
    }
    if (_filterCat) list = list.filter(p => p['Categoría'] === _filterCat);
    list = Utils.sortBy(list, _sortField, _sortDir);

    const countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = `${list.length} de ${_products.length} productos`;

    const tableEl = document.getElementById('products-table');
    if (!tableEl) return;

    if (!list.length) {
      tableEl.innerHTML = `
        <div class="empty-state" style="padding:50px;">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <h3>Sin productos</h3>
          <p>Agrega productos/servicios para usarlos en las cotizaciones.</p>
          <button class="btn btn-primary" onclick="Products.openForm()" style="margin-top:12px;">Nuevo Producto</button>
        </div>
      `;
      return;
    }

    const sortIcon = (f) => _sortField === f ? (_sortDir === 'asc' ? ' ↑' : ' ↓') : '';

    tableEl.innerHTML = `
      <!-- Desktop Table -->
      <div class="hidden-mobile">
        <table class="data-table">
          <thead>
            <tr>
              <th onclick="Products._sort('Nombre')">Nombre ${sortIcon('Nombre')}</th>
              <th>Descripción</th>
              <th onclick="Products._sort('Categoría')">Categoría ${sortIcon('Categoría')}</th>
              <th onclick="Products._sort('Precio USD')" style="text-align:right;">Precio USD ${sortIcon('Precio USD')}</th>
              <th style="text-align:right;">Costo USD</th>
              <th style="text-align:right;">IVA %</th>
              <th style="width:120px; text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td class="td-bold">${Utils.escapeHtml(p['Nombre'])}</td>
                <td style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${Utils.escapeHtml(p['Descripción']||'')}">
                  ${Utils.escapeHtml(p['Descripción'] || '—')}
                </td>
                <td><span class="badge badge-neutral">${Utils.escapeHtml(p['Categoría'] || 'General')}</span></td>
                <td style="text-align:right; font-weight:700; color:var(--primary-light);">$ ${Utils.formatUSD(p['Precio USD'])}</td>
                <td style="text-align:right; color:var(--text-muted);">$ ${Utils.formatUSD(p['Costo USD'])}</td>
                <td style="text-align:right;">${p['Impuesto %'] || '0'}%</td>
                <td style="text-align:right;">
                  <div class="table-actions" style="justify-content:flex-end; gap:4px;">
                    <button class="btn btn-icon btn-ghost" onclick="Products.openForm('${p['ID']}')" title="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    ${App.isAdmin() ? `
                    <button class="btn btn-icon btn-ghost danger" onclick="Products.deleteItem('${p['ID']}', ${p._rowIndex})" title="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Data List (Cards) -->
      <div class="data-list show-mobile-only">
        ${list.map(p => `
          <div class="mobile-card">
            <div class="mobile-card-header" onclick="Products.openForm('${p['ID']}')">
              <div style="flex:1;">
                <div class="mobile-card-title">${Utils.escapeHtml(p['Nombre'])}</div>
                <div class="mobile-card-sub">${Utils.escapeHtml(p['Categoría'] || 'General')}</div>
              </div>
              <div class="mobile-card-amount">$ ${Utils.formatUSD(p['Precio USD'])}</div>
            </div>
            
            <div class="mobile-card-body" onclick="Products.openForm('${p['ID']}')">
              <div class="mobile-card-info" style="grid-column: span 2;">
                <div class="mobile-card-label">Descripción</div>
                <div class="mobile-card-value">${Utils.escapeHtml(Utils.truncate(p['Descripción']||'—', 80))}</div>
              </div>
              <div class="mobile-card-info">
                <div class="mobile-card-label">Costo</div>
                <div class="mobile-card-value">$ ${Utils.formatUSD(p['Costo USD'])}</div>
              </div>
              <div class="mobile-card-info">
                <div class="mobile-card-label">IVA</div>
                <div class="mobile-card-value">${p['Impuesto %'] || '0'}%</div>
              </div>
            </div>

            <div class="mobile-card-actions">
              <div class="card-footer-lite mobile-card-footer">
                <div class="u-flex-center u-gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <button class="btn btn-sm btn-ghost" onclick="Products.openForm('${p['ID']}')">Editar</button>
                </div>
                ${App.isAdmin() ? `
                <div class="u-flex-center u-gap-1" style="color:var(--error); margin-left:12px;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <button class="btn btn-sm btn-ghost danger" onclick="Products.deleteItem('${p['ID']}')">Eliminar</button>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function _sort(field) {
    if (_sortField === field) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    else { _sortField = field; _sortDir = 'asc'; }
    _renderTable();
  }

  function applyFilter(type, value) {
    if (type === 'search') _filterSearch = value;
    if (type === 'cat')    _filterCat    = value;
    _renderTable();
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
      await _load();
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  function deleteProduct(id) {
    Utils.confirm('¿Eliminar este producto?', async () => {
      try {
        await Sheets.deleteRow(CONFIG.SHEETS.PRODUCTS, id);
        Utils.showToast('Producto eliminado', 'success');
        await _load();
      } catch(e) { Utils.showToast('Error: ' + e.message, 'error'); }
    });
  }

  function exportCSV() {
    Utils.exportToCSV(_products, 'productos-ergoexpress.csv');
  }

  // Public getter for other modules
  function getAll() { return _products; }

  return {
    render, openForm, save,
    deleteItem: deleteProduct,
    applyFilter, _sort,
    exportCSV, getAll
  };
})();
