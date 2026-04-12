/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS-FINANCE — Módulo Estructura de Costos
   ════════════════════════════════════════════════════════════════════════════ */

const Costs = (() => {
  let _products = [];
  let _costs = [];
  let _filterSearch = '';

  async function render(container) {
    container.innerHTML = `
      <div class="view-header animate-fade-in">
        <div class="view-header-content">
          <h1 class="view-title">Estructura de Costos</h1>
          <p class="view-subtitle">Determinación de precios y márgenes detallados</p>
        </div>
      </div>

      <div class="view-actions animate-fade-in" style="margin-top:20px;">
        <div class="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar producto para costear..." id="costs-search" oninput="Costs.applyFilter(this.value)">
        </div>
      </div>

      <div id="costs-content" class="animate-fade-in">
        <div class="loading-state"><div class="spinner"></div><p>Cargando datos de costos...</p></div>
      </div>
    `;

    await _init();
  }

  async function _init() {
    try {
      const { data: prods, error: e1 } = await supabase.from('productos').select('*').eq('activo', true);
      const { data: costs, error: e2 } = await supabase.from('costos_productos').select('*');

      if (e1 || e2) throw e1 || e2;

      _products = prods || [];
      _costs = costs || [];

      _renderList();
    } catch (err) {
      console.error('[Costs] Load Error:', err);
      const wrap = document.getElementById('costs-content');
      if (wrap) wrap.innerHTML = `<div class="error-state">Error al cargar costos: ${err.message}</div>`;
    }
  }

  function _renderList() {
    const wrap = document.getElementById('costs-content');
    if (!wrap) return;

    let filtered = _products.filter(p => 
      p.nombre.toLowerCase().includes(_filterSearch.toLowerCase()) || 
      (p.codigo && p.codigo.toLowerCase().includes(_filterSearch.toLowerCase()))
    );

    if (filtered.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>No se encontraron productos para los criterios de búsqueda.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-label">Productos Costeados</div>
          <div class="stat-value">${_costs.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pendientes</div>
          <div class="stat-value" style="color: var(--primary);">${_products.length - _costs.length}</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Costo Total</th>
              <th>Precio Venta</th>
              <th>Margen %</th>
              <th>Última Act.</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => {
              const cost = _costs.find(c => c.producto_id === p.id);
              const margin = p.precio_usd > 0 ? ((p.precio_usd - (cost?.costo_total_usd || p.costo_usd)) / p.precio_usd * 100).toFixed(2) : '0.00';
              const marginClass = margin < 20 ? 'status-rejected' : 'status-approved';

              return `
                <tr>
                  <td>
                    <div style="font-weight:700;">${Utils.escapeHtml(p.nombre)}</div>
                    <div style="font-size:11px; color:var(--text-muted)">${p.codigo || 'S/N'}</div>
                  </td>
                  <td>
                    <div style="font-weight:800; color:var(--text-main)">$ ${Utils.formatUSD(cost?.costo_total_usd || p.costo_usd)}</div>
                  </td>
                  <td>
                    <div style="font-weight:800; color:var(--primary)">$ ${Utils.formatUSD(p.precio_usd)}</div>
                  </td>
                  <td>
                    <span class="badge ${marginClass}">${margin}%</span>
                  </td>
                  <td>${cost ? new Date(cost.actualizado_en).toLocaleDateString() : 'N/A'}</td>
                  <td style="text-align:right">
                    <button class="btn btn-sm btn-primary" onclick="Costs.openBreakdown(${p.id})">
                      Gestionar Estructura
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function applyFilter(val) {
    _filterSearch = val;
    _renderList();
  }

  async function openBreakdown(productId) {
    const p = _products.find(x => x.id === productId);
    let cost = _costs.find(c => c.producto_id === productId);

    if (!cost) {
      cost = {
        materiales_usd: 0,
        mano_obra_usd: 0,
        gastos_indirectos_usd: 0,
        comisiones_usd: 0,
        costo_total_usd: p.costo_usd || 0,
        detalles_json: { materials: [], labor: [], indirect: [] }
      };
    }

    Utils.showModal({
      title: `Estructura de Costos: ${p.nombre}`,
      size: 'lg',
      content: `
        <div class="costing-tabs">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
            <div class="form-group">
              <label class="form-label">Precio de Venta Sugerido (USD)</label>
              <input type="number" class="form-input" id="cost-final-price" value="${p.precio_usd}" step="0.01">
              <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">Precio actual en catálogo</p>
            </div>
            <div class="form-group" style="background: var(--surface-dim); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <label class="form-label">Resumen de Costos (Calculado)</label>
              <div style="font-size:24px; font-weight:900; color:var(--text-main)" id="cost-calc-total">$ ${Utils.formatUSD(cost.costo_total_usd)}</div>
              <div id="cost-calc-margin" style="font-weight:700;">Margen: ${p.precio_usd > 0 ? ((p.precio_usd - cost.costo_total_usd)/p.precio_usd*100).toFixed(2) : 0}%</div>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Ingredientes / Materiales (USD)</label>
              <input type="number" class="form-input cost-input-group" data-ref="materiales_usd" value="${cost.materiales_usd}" oninput="Costs.recalculate()">
            </div>
            <div class="form-group">
              <label class="form-label">Mano de Obra Directa (USD)</label>
              <input type="number" class="form-input cost-input-group" data-ref="mano_obra_usd" value="${cost.mano_obra_usd}" oninput="Costs.recalculate()">
            </div>
            <div class="form-group">
              <label class="form-label">Gastos Indirectos / Operativos (USD)</label>
              <input type="number" class="form-input cost-input-group" data-ref="gastos_indirectos_usd" value="${cost.gastos_indirectos_usd}" oninput="Costs.recalculate()">
            </div>
            <div class="form-group">
              <label class="form-label">Comisiones y Otros (USD)</label>
              <input type="number" class="form-input cost-input-group" data-ref="comisiones_usd" value="${cost.comisiones_usd}" oninput="Costs.recalculate()">
            </div>
          </div>

          <div style="margin-top:20px;">
            <label class="form-label">Notas de Composición</label>
            <textarea id="cost-notes" class="form-textarea" placeholder="Ej. 2kg Harina, 1hr de amasado, empaque plástico..." style="min-height:80px;">${cost.detalles_json?.notes || ''}</textarea>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Costs.save('${productId}')">Actualizar Estructura</button>
      `
    });
  }

  function recalculate() {
    const inputs = document.querySelectorAll('.cost-input-group');
    let total = 0;
    inputs.forEach(i => total += parseFloat(i.value || 0));

    const totalEl = document.getElementById('cost-calc-total');
    const marginEl = document.getElementById('cost-calc-margin');
    const price = parseFloat(document.getElementById('cost-final-price').value || 0);

    if (totalEl) totalEl.textContent = `$ ${Utils.formatUSD(total)}`;
    
    if (marginEl && price > 0) {
      const margin = ((price - total) / price * 100).toFixed(2);
      marginEl.textContent = `Margen: ${margin}%`;
      marginEl.style.color = margin < 20 ? 'var(--status-rejected)' : 'var(--status-approved)';
    }
  }

  async function save(productId) {
    const inputs = document.querySelectorAll('.cost-input-group');
    const data = {
      producto_id: parseInt(productId),
      detalles_json: { notes: document.getElementById('cost-notes').value }
    };
    
    let total = 0;
    inputs.forEach(i => {
      const val = parseFloat(i.value || 0);
      data[i.dataset.ref] = val;
      total += val;
    });

    const newPrice = parseFloat(document.getElementById('cost-final-price').value || 0);

    try {
      // 1. Guardar/Upsert Costos
      const { error: e1 } = await supabase.from('costos_productos').upsert(data, { onConflict: 'producto_id' });
      if (e1) throw e1;

      // 2. Sincronizar precio en catálogo de productos si cambió
      const { error: e2 } = await supabase.from('productos').update({ 
        precio_usd: newPrice,
        costo_usd: total, // Costo base simplificado para consultas rápidas
        actualizado_en: new Date().toISOString()
      }).eq('id', productId);
      
      if (e2) throw e2;

      Utils.showToast('Estructura de costos actualizada', 'success');
      Utils.closeModal();
      _init(); // Recargar lista
    } catch (err) {
      console.error('[Costs] Save Error:', err);
      Utils.showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  return { render, applyFilter, openBreakdown, recalculate, save };
})();
