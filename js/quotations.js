/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Cotizaciones (Arquitectura World-Class "Canvas")
   Diseño inspirado en Stripe/Notion. Flujo continuo y sin interrupciones.
   ════════════════════════════════════════════════════════════════════════════ */

const Quotations = (() => {

  // ─── STATE MANAGEMENT (El mismo core sólido) ──────────────────────────────
  const State = {
    quotes: [], contacts: [], products: [], config: {}, rate: 0,
    editor: { id: null, items: [], currency: 'usd' },
    view: localStorage.getItem('quotes_view') || 'list'
  };
  let _container = null;
  let _sortables = [];

  // ─── INICIALIZACIÓN ───────────────────────────────────────────────────────
  async function render(container, force = false) {
    if (container) _container = container;
    const target = _container || document.getElementById('main-content');
    if (!target) return;

    if (force) {
      target.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Sincronizando con Google Cloud...</p></div>`;
      // No explicit load needed here if we call setView later, 
      // but let's ensure we refresh data.
      await Promise.all([Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS), Sheets.readSheet(CONFIG.SHEETS.CONTACTS)]);
    }

    target.innerHTML = `
      <div class="fade-in" style="max-width:1200px; margin:0 auto; padding:20px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
          <div>
            <h1 style="font-size:32px; font-weight:800; letter-spacing:-1px; color:var(--text-primary); margin:0;">Cotizaciones</h1>
            <p style="color:var(--text-muted); font-size:15px; margin-top:4px;">Cierre de negocios y acuerdos comerciales.</p>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-secondary" onclick="Quotations.render(null, true)" title="Sincronizar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Sincronizar
            </button>
            <button class="btn btn-primary hidden-mobile" style="border-radius:12px; padding:12px 24px; font-weight:700; font-size:14px;" onclick="Quotations.renderForm()">
              + Nuevo
            </button>
          </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; gap:16px; flex-wrap:wrap;">
          <div style="flex:1; min-width:280px; background:var(--bg-surface); border:1px solid var(--border-light); border-radius:16px; padding:8px; display:flex; align-items:center; gap:12px; box-shadow:0 4px 20px rgba(0,0,0,0.02);">
            <svg style="margin-left:12px; color:var(--text-muted);" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="q-search" style="flex:1; background:transparent; border:none; outline:none; font-size:15px; color:var(--text-primary); padding:10px 0;" placeholder="Buscar cliente, número o estado..." oninput="Quotations.renderCurrentView()" autocomplete="off" />
          </div>
          
        </div>

        <div id="q-list-container" style="display:flex; flex-direction:column; gap:12px;">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <!-- Mobile FAB -->
        <button class="fab show-mobile-only" onclick="Quotations.renderForm()" title="Nuevo Presupuesto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="24" height="24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    `;

    try {
      const parts = await Promise.all([
        Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS),
        Sheets.readSheet(CONFIG.SHEETS.CONTACTS),
        Sheets.readSheet(CONFIG.SHEETS.PRODUCTS),
        Sheets.getAllConfig(),
        Sheets.latestRate()
      ]);
      State.quotes = parts[0]; State.contacts = parts[1]; State.products = parts[2];
      State.config = parts[3]; State.rate = parts[4] ? Utils.toNumber(parts[4]['Tasa Oficial']) : 0;
      
      renderCurrentView();
    } catch (e) {
      const listEnv = document.getElementById('q-list-container');
      if (listEnv) listEnv.innerHTML = `<div style="color:var(--error); padding:20px;">Fallo crítico de red: ${e.message}</div>`;
    }
  }

  function renderCurrentView() {
    renderList();
  }

  // ─── LISTA (TIPO STRIPE DASHBOARD) ───────────────────────────────────────
  function renderList() {
    const listDiv = document.getElementById('q-list-container');
    const searchVal = document.getElementById('q-search')?.value.toLowerCase() || '';
    if (!listDiv) return;

    let filtered = State.quotes.filter(q => {
      const cName = (State.contacts.find(x => x['ID'] === q['ID Cliente'])?.['Razón Social'] || '').toLowerCase();
      return String(q['Número']).includes(searchVal) || cName.includes(searchVal) || (q['Estado']||'').toLowerCase().includes(searchVal);
    });

    if (!filtered.length) {
      listDiv.innerHTML = `<div style="text-align:center; padding:60px; color:var(--text-muted);">Sin resultados.</div>`;
      return;
    }

    filtered.sort((a,b) => b['Número'] - a['Número']);

    listDiv.innerHTML = filtered.map(q => {
      const client = State.contacts.find(c => c['ID'] === q['ID Cliente']);
      const st = q['Estado'] || 'Borrador';
      
      // Colores de estado (Estabilizados)
      let bdgBg = 'rgba(148, 163, 184, 0.1)'; let bdgCol = '#94a3b8';
      if(st === 'Aprobada') { bdgBg = 'rgba(16, 185, 129, 0.1)'; bdgCol = '#10b981'; }
      if(st === 'Enviada') { bdgBg = 'rgba(13, 115, 119, 0.1)'; bdgCol = 'var(--primary)'; }
      if(st === 'Rechazada') { bdgBg = 'rgba(244, 63, 94, 0.1)'; bdgCol = '#f43f5e'; }

      return `
        <div class="q-list-card clickable" onclick="Quotations.renderDetail(null, '${q['ID']}')">
          <div class="q-list-content">
            <div class="q-list-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div class="q-list-main-info">
              <h3 class="q-list-title">${Utils.escapeHtml(client?.['Razón Social'] || 'Desconocido')}</h3>
              <div class="q-list-sub">ERGOX-${String(q['Número']).padStart(6,'0')} • ${Utils.formatDate(q['Fecha'])}</div>
            </div>
          </div>

          <div class="q-list-meta">
            <div class="q-list-status-price">
              <span class="q-list-status" style="background:${bdgBg}; color:${bdgCol};">${st}</span>
              <div class="q-list-price">$${Utils.formatUSD(q['Total USD'])}</div>
            </div>
            
            <div class="q-list-actions">
               <!-- Comunicación -->
               <button class="btn btn-icon-sm" style="color:#25D366;" onclick="event.stopPropagation(); QuoteBuilder.shareByWhatsApp('${q['ID']}')" title="WhatsApp">
                 <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 7.454c-1.893 0-3.748-.511-5.361-1.477l-.385-.228-3.991 1.047 1.065-3.893-.25-.398a10.038 10.038 0 0 1-1.531-5.312c0-5.54 4.51-10.05 10.05-10.05 2.684 0 5.207 1.046 7.104 2.943a10.003 10.003 0 0 1 2.943 7.106c0 5.54-4.51 10.05-10.05 10.05m0-21.782c-6.475 0-11.732 5.257-11.732 11.73 0 2.07.541 4.091 1.565 5.885l-1.666 6.085 6.223-1.632a11.705 11.705 0 0 0 5.61 1.444c6.473 0 11.731-5.257 11.731-11.73 0-3.136-1.22-6.084-3.436-8.301-2.215-2.216-5.163-3.435-8.295-3.435\"/></svg>
               </button>
               <button class="btn btn-icon-sm" style="color:#4285F4;" onclick="event.stopPropagation(); QuoteBuilder.shareByEmail('${q['ID']}')" title="Email">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
               </button>
               <button class="btn btn-icon-sm" onclick="event.stopPropagation(); QuoteBuilder.downloadPDF('${q['ID']}')" title="PDF">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               </button>

               <div style="width:1px; height:16px; background:var(--border-light); margin:0 4px;"></div>

               <button class="btn btn-icon-sm" onclick="event.stopPropagation(); Quotations.renderForm('${q['ID']}')" title="Editar">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
               </button>
               <button class="btn btn-icon-sm danger-text" onclick="event.stopPropagation(); Quotations.deleteForm('${q['ID']}')" title="Eliminar">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
               </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderForm(quoteId = null) {
    State.editor.id = quoteId;
    let quote = null;
    
    if (quoteId) {
      quote = State.quotes.find(x => x['ID'] === quoteId);
      if (quote) {
        let detail = {};
        try {
          const rawDetail = quote['Detalle JSON'];
          if (typeof rawDetail === 'string' && rawDetail.trim() !== '') {
            detail = JSON.parse(rawDetail);
            if (typeof detail === 'string') detail = JSON.parse(detail);
          } else if (typeof rawDetail === 'object' && rawDetail !== null) {
            detail = rawDetail;
          }
        } catch(e) { console.error('Error parseando detalle JSON:', e); }
        
        State.editor.items = Utils.normalizeItems(detail.items);
        State.editor.currency = detail.currencyMode || 'usd';
      } else {
        State.editor.items = [{ id: Utils.generateId(), desc: '', qty: 1, price: 0 }];
        State.editor.currency = 'usd';
      }
    } else {
      State.editor.items = [{ id: Utils.generateId(), desc: '', qty: 1, price: 0 }];
      State.editor.currency = 'usd';
    }

    _container.innerHTML = `
      <style>
        .q-canvas-header { font-size:42px; font-weight:900; letter-spacing:-1.5px; }
        .q-grid-params { display:grid; grid-template-columns: 1fr 1fr; gap:32px; }
        .q-row-item { display:flex; gap:16px; align-items:center; }
        .q-col-desc { flex: 1; min-width:200px; }
        .q-col-qty { width: 100px; }
        .q-col-price { width: 140px; }
        .q-col-sub { width: 140px; }
        .q-headers-desktop { display: flex; }
        
        @media (max-width: 768px) {
          .q-canvas-header { font-size:28px; }
          .q-grid-params { grid-template-columns: 1fr; gap:16px; margin-bottom:30px!important; }
          .q-headers-desktop { display: none!important; }
          .q-row-item { flex-direction:column; align-items:flex-start; padding:16px 0!important; border-bottom:1px solid var(--border-light); gap:8px!important; }
          .q-col-desc, .q-col-qty, .q-col-price, .q-col-sub { width: 100%!important; }
          .q-col-qty input { text-align: left!important; }
          .q-col-price input { text-align: left!important; }
          .q-col-sub { text-align: right!important; padding-right:0!important; font-size:20px!important; }
          .q-btn-delete { align-self: flex-end; margin-top:-30px; }
          .hide-mobile { display: none !important; }
          @media (min-width: 600px) { .hide-mobile { display: inline-block !important; } }
        }
      </style>
      <div class="fade-in" style="max-width:1000px; margin:0 auto; padding-bottom:80px; padding-left:16px; padding-right:16px;">
        
        <!-- Header Flotante -->
        <div style="position:sticky; top:0; background:rgba(var(--bg-base-rgb), 0.8); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); z-index:100; padding:16px 0; border-bottom:1px solid var(--border-light); margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-icon" style="background:transparent; border:none; color:var(--text-muted);" onclick="Quotations.render(document.getElementById('main-content'))">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Cotización Comercial</span>
          </div>
          <button id="btn-save-quote" class="btn btn-primary" style="padding:10px 16px; border-radius:12px; font-weight:700;" onclick="Quotations.saveForm()">Guardar</button>
        </div>

        <!-- Parámetros Invisibles (Sin bordes toscos) -->
        <h1 class="q-canvas-header" style="color:var(--text-primary); margin-bottom:30px; outline:none; cursor:text;">${quote ? 'ERGOX-'+String(quote['Número']).padStart(6,'0') : 'Borrador Comercial'}</h1>

        <div class="q-grid-params" style="margin-bottom:40px;">
          <div>
            <label style="display:block; font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Cliente Principal</label>
            <select id="frm-client" class="form-select" style="width:100%; border:none; border-bottom:2px solid var(--border-light); background:transparent; padding:8px 0; font-size:18px; font-weight:600; color:var(--text-primary); outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-light)'">
              <option value="" style="color:gray;">Selecciona un cliente...</option>
              ${State.contacts.map(c => `<option value="${c['ID']}" ${quote?.['ID Cliente']===c['ID'] ? 'selected':''}>${Utils.escapeHtml(c['Razón Social'])}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:24px;">
            <div style="flex:1;">
               <label style="display:block; font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Fecha</label>
               <input id="frm-date" type="date" value="${quote ? quote['Fecha'] : Utils.todayISO()}" style="width:100%; border:none; border-bottom:2px solid var(--border-light); background:transparent; padding:8px 0; font-size:16px; font-weight:600; color:var(--text-primary); outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-light)'" />
            </div>
            <div class="frm-group no-shrink" style="flex:1;">
            <label class="frm-label">Moneda Impresión</label>
            <select id="frm-curr" class="frm-input">
              <option value="usd" ${cCode==='usd'?'selected':''}>USD (Dólares)</option>
              <option value="ves" ${cCode==='ves'?'selected':''}>VES (Bolívares)</option>
            </select>
          </div>

          <div class="frm-group no-shrink" style="flex:1; display:flex; align-items:flex-end;">
            <label class="frm-label" style="display:flex; align-items:center; cursor:pointer; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; border:1px solid var(--border-light); width:100%; height:42px;">
              <input type="checkbox" id="frm-tax" style="margin-right:10px; width:18px; height:18px; accent-color:var(--primary);" ${detail.applyTax?'checked':''}>
              <span style="font-size:13px; font-weight:600;">Aplicar IVA (16%)</span>
            </label>
          </div>
          </div>
        </div>

        <!-- LINEAS DE NEGOCIO (CANVAS GRID) -->
        <div style="margin-bottom:40px;">
          <!-- Grid Header -->
          <div class="q-headers-desktop" style="display:flex; gap:16px; align-items:center; border-bottom:2px solid var(--border-light); padding-bottom:12px; margin-bottom:16px; font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">
            <div class="q-col-desc">Descriptor del Bien o Servicio</div>
            <div class="q-col-qty" style="text-align:center;">Unidades</div>
            <div class="q-col-price" style="text-align:right;">Precio U.</div>
            <div class="q-col-sub" style="text-align:right;">Monto Neto</div>
            <div style="width:30px;"></div>
          </div>

          <!-- Items Flex Container -->
          <div id="grid-tbody" style="display:flex; flex-direction:column; gap:6px;">
            <!-- DOM Renderizado dinámicamente -->
          </div>

          <!-- Totales Flotantes -->
          <div style="display:flex; justify-content:flex-end; padding-top:24px; margin-top:24px; border-top:1px solid var(--border-light);">
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
              <span style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; margin-bottom:4px;">Inversión Total</span>
              <span id="grid-grand-total" style="font-size:36px; @media(min-width:768px){font-size:48px;} font-weight:900; letter-spacing:-2px; color:var(--primary); line-height:1; transition:color 0.3s ease;">$0.00</span>
            </div>
          </div>
        </div>

        <!-- TEXTOS FINALES -->
        <div>
           <label style="display:block; font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Párrafo de Introducción Comercial</label>
           <textarea id="frm-intro" style="width:100%; border:none; background:var(--bg-surface); border-radius:12px; padding:20px; font-size:15px; font-family:var(--font); color:var(--text-secondary); line-height:1.6; outline:none; resize:vertical; min-height:120px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">${Utils.escapeHtml(quote ? JSON.parse(quote['Detalle JSON']||'{}').intro : (State.config['cotizacion_intro']||''))}</textarea>
        </div>

        <!-- Datalist Autocomplete Fantasma -->
        <datalist id="sys-products-list">${State.products.map(p => `<option value="${Utils.escapeHtml(p['Nombre'])}">`).join('')}</datalist>
      </div>
    `;

    container.innerHTML = html;

    // Listeners para recálculo inmediato
    document.getElementById('frm-tax').addEventListener('change', _recalculateGrandTotal);
    document.getElementById('frm-curr').addEventListener('change', _recalculateGrandTotal);

    const tbody = document.getElementById('grid-tbody');
    if (tbody) {
      State.editor.items.forEach((it) => _injectRowDOM(tbody, it));
      _ensureEmptyRowExists();
      _recalculateGrandTotal();
    }
  }

  function _injectRowDOM(tbody, itemData) {
    if (!itemData.id) itemData.id = Utils.generateId();
    
    const row = document.createElement('div');
    row.id = `row-${itemData.id}`;
    row.className = 'q-row-item';
    row.style.position = 'relative';

    // Inputs estilo Notion: sin borde hasta el focus.
    row.innerHTML = `
      <div class="q-col-desc">
        <label class="show-mobile-only" style="font-size:10px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Descripción</label>
        <input type="text" list="sys-products-list" placeholder="Escribe el producto o servicio..." value="${Utils.escapeHtml(itemData.desc)}" data-field="desc" style="width:100%; background:transparent; border:none; font-size:16px; font-weight:600; color:var(--text-primary); padding:10px 8px; outline:none; border-radius:8px; transition:background 0.2s;" autocomplete="off" />
      </div>
      <div class="q-col-qty">
        <label class="show-mobile-only" style="font-size:10px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Cantidad</label>
        <input type="text" inputmode="decimal" value="${itemData.qty}" data-field="qty" style="width:100%; background:transparent; border:none; font-size:16px; font-weight:700; color:var(--text-primary); padding:10px 8px; outline:none; text-align:center; border-radius:8px; transition:background 0.2s;" />
      </div>
      <div class="q-col-price" style="position:relative;">
        <label class="show-mobile-only" style="font-size:10px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Precio U.</label>
        <span class="hidden-mobile" style="position:absolute; left:12px; top:13px; color:var(--text-muted); font-size:14px; font-weight:800;">$</span>
        <input type="text" inputmode="decimal" value="${Utils.formatNumber(itemData.price)}" data-field="price" style="width:100%; background:transparent; border:none; font-size:16px; font-weight:700; color:var(--text-primary); padding:10px 8px 10px 8px; outline:none; text-align:right; border-radius:8px; transition:background 0.2s;" />
      </div>
      <div class="q-col-sub" style="padding-right:8px;">
        <span style="font-size:18px; font-weight:800; color:var(--text-primary);" id="sub-${itemData.id}">$0.00</span>
      </div>
      <div class="q-btn-delete" style="width:30px; text-align:center;">
        <button class="btn-icon" data-action="delete" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; opacity:0.6; transition:all 0.2s;"><svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    `;

    const iDesc = row.querySelector('[data-field="desc"]');
    const iQty = row.querySelector('[data-field="qty"]');
    const iPrice = row.querySelector('[data-field="price"]');
    const bDel = row.querySelector('[data-action="delete"]');

    // Estilo Focus Flotante (Glass UI)
    const inputs = [iDesc, iQty, iPrice];
    inputs.forEach(i => {
      i.addEventListener('focus', () => i.style.background = 'var(--bg-surface)');
      i.addEventListener('blur', () => i.style.background = 'transparent');
    });

    row.addEventListener('mouseover', () => bDel.style.opacity = '1');
    row.addEventListener('mouseout', () => bDel.style.opacity = '0.3');
    bDel.addEventListener('mouseover', () => bDel.style.color = 'var(--error)');
    bDel.addEventListener('mouseout', () => bDel.style.color = 'var(--text-muted)');

    const updateRowState = () => {
      itemData.desc = iDesc.value;
      itemData.qty = Utils.toNumber(iQty.value);
      itemData.price = Utils.toNumber(iPrice.value);
      const rowSub = itemData.qty * itemData.price;
      const subEl = row.querySelector(`#sub-${itemData.id}`);
      if (subEl) {
        subEl.textContent = `$${Utils.formatUSD(rowSub)}`;
        subEl.style.color = rowSub > 0 ? 'var(--primary)' : 'var(--text-primary)';
      }
      _recalculateGrandTotal();
    };

    iDesc.addEventListener('input', (e) => {
      const val = e.target.value;
      const found = State.products.find(p => p['Nombre'] === val);
      if (found) { iPrice.value = found['Precio USD']; iQty.value = 1; }
      updateRowState();
      _ensureEmptyRowExists();
    });

    iQty.addEventListener('input', updateRowState);
    iPrice.addEventListener('input', updateRowState);
    
    bDel.addEventListener('click', () => {
      if (State.editor.items.length === 1 && !iDesc.value) return; // Don't delete last empty row
      State.editor.items = State.editor.items.filter(i => i.id !== itemData.id);
      row.remove();
      _ensureEmptyRowExists();
      _recalculateGrandTotal();
    });

    tbody.appendChild(row);
    updateRowState();
  }

  function _ensureEmptyRowExists() {
    const lastItem = State.editor.items[State.editor.items.length - 1];
    if (!lastItem || lastItem.desc.trim() !== '') {
      const newItem = { id: Utils.generateId(), desc: '', qty: 1, price: 0 };
      State.editor.items.push(newItem);
      _injectRowDOM(document.getElementById('grid-tbody'), newItem);
    }
  }

  function _recalculateGrandTotal() {
    const net = Utils.round(State.editor.items.reduce((s, it) => s + (Utils.toNumber(it.qty) * Utils.toNumber(it.price)), 0));
    const applyTax = document.getElementById('frm-tax')?.checked || false;
    const tax = applyTax ? Utils.round(net * 0.16) : 0;
    const total = Utils.round(net + tax);

    const g = document.getElementById('grid-grand-total');
    if (g) {
      if (applyTax) {
        g.innerHTML = `
          <div style="font-size:12px; font-weight:400; color:var(--text-muted); text-align:right;">Subtotal: $${Utils.formatUSD(net)}</div>
          <div style="font-size:12px; font-weight:400; color:var(--text-muted); text-align:right;">IVA (16%): $${Utils.formatUSD(tax)}</div>
          <div style="margin-top:4px;">$${Utils.formatUSD(total)}</div>
        `;
      } else {
        g.textContent = `$${Utils.formatUSD(net)}`;
      }
      g.style.color = total > 0 ? 'var(--success)' : 'var(--primary)';
    }
  }

  // ─── GUARDAR DATOS ────────────────────────────────────────────────────────
  async function saveForm() {
    const btn = document.getElementById('btn-save-quote');
    const clientId = document.getElementById('frm-client').value;
    const date = document.getElementById('frm-date').value;
    
    if (!clientId) { Utils.showToast('Debes seleccionar un cliente.', 'error'); return; }

    // Limpiar filas vacías (Silent clean)
    const validItems = State.editor.items.filter(it => it.desc.trim() !== '' && it.qty > 0);
    if (!validItems.length) { Utils.showToast('Agrega al menos un ítem al contrato.', 'error'); return; }

    const totalUSD = Utils.round(validItems.reduce((s, it) => s + (it.qty * it.price), 0));
    
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span> Obteniendo Red...`;
    btn.disabled = true;

    try {
      const num = await Sheets.nextQuoteNumber();
      const currCode = document.getElementById('frm-curr').value || 'usd';
      
      const payload = {
        'ID': State.editor.id || Utils.generateId(),
        'Número': State.editor.id ? State.quotes.find(x => x['ID']===State.editor.id)['Número'] : num,
        'Fecha': date,
        'ID Cliente': clientId,
        'Validez Días': 5,
        'Estado': State.editor.id ? State.quotes.find(x => x['ID']===State.editor.id)['Estado'] : 'Borrador',
        'Total USD': Utils.round(totalNet + (applyTax ? totalNet * 0.16 : 0)),
        'Total VES': Utils.round((totalNet + (applyTax ? totalNet * 0.16 : 0)) * State.rate),
        'Detalle JSON': JSON.stringify({
          items: validItems,
          intro: document.getElementById('frm-intro').value,
          currencyMode: currCode,
          applyTax: applyTax,
          rate: State.rate
        }),
        'Notas': '',
        'Usuario Email': App.getCurrentUserEmail() || '',
        'Fecha Creación': new Date().toISOString()
      };

      if (State.editor.id) await Sheets.updateRow(CONFIG.SHEETS.QUOTATIONS, State.editor.id, payload);
      else await Sheets.appendRow(CONFIG.SHEETS.QUOTATIONS, payload);

      Utils.showToast('Documento Asegurado. Generando Vista...', 'success');
      
      // Actualizar estado local para visualización inmediata si red fue exitosa
      const existingIdx = State.quotes.findIndex(q => q['ID'] === payload['ID']);
      if (existingIdx >= 0) State.quotes[existingIdx] = payload;
      else State.quotes.push(payload);
      
      renderDetail(_container, payload['ID']);

    } catch (e) {
      Utils.showToast('Error: ' + e.message, 'error');
      btn.innerHTML = 'Guardar Cambios';
      btn.disabled = false;
    }
  }

  async function updateStatus(id, newStatus) {
    const quote = State.quotes.find(q => q['ID'] === id);
    if (!quote) return;
    if (quote['Estado'] === newStatus) return;

    try {
      Utils.showToast(`Cambiando a ${newStatus}...`, 'info');
      await Sheets.updateRow(CONFIG.SHEETS.QUOTATIONS, id, { 'Estado': newStatus });
      quote['Estado'] = newStatus;
      
      // Si estamos viendo el detalle de esta misma cotización, refrescar vista
      if (document.getElementById('q-detail-marker')?.value === id) {
        renderDetail(_container, id);
      } else {
        renderCurrentView();
      }
      Utils.showToast(`Estado actualizado a ${newStatus}`, 'success');
    } catch (e) {
      Utils.showToast('Error al actualizar estado: ' + e.message, 'error');
    }
  }

  function renderBoard() {
    try {
      const listDiv = document.getElementById('q-list-container');
      if (!listDiv) return;

      _sortables.forEach(s => s.destroy());
      _sortables = [];

      const searchVal = document.getElementById('q-search')?.value.toLowerCase() || '';
      const filtered = State.quotes.filter(q => {
        const cName = (State.contacts.find(x => x['ID'] === q['ID Cliente'])?.['Razón Social'] || '').toLowerCase();
        return String(q['Número']).includes(searchVal) || cName.includes(searchVal) || (q['Estado']||'').toLowerCase().includes(searchVal);
      });

      const lanes = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Facturada'];
      
      listDiv.innerHTML = `
        <div class="kanban-board" id="quotes-kanban">
          ${lanes.map(lane => {
            const cards = filtered.filter(q => (q['Estado'] || 'Borrador') === lane);
            const total = cards.reduce((s, q) => s + Utils.toNumber(q['Total USD']), 0);
            return `
              <div class="kanban-col">
                <div class="kanban-col-header">
                  <div class="kanban-col-title">${lane}</div>
                  <span class="kanban-count">${cards.length}</span>
                </div>
                <div class="kanban-col-stats">$ ${Utils.formatUSD(total)}</div>
                <div class="kanban-cards" id="col-quotes-${Utils.slugify(lane)}" data-status="${lane}">
                  ${cards.map(q => _qCardHTML(q)).join('')}
                  ${cards.length === 0 ? '<div class="kanban-empty">Sin cotizaciones</div>' : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Init Sortable
      lanes.forEach(lane => {
        const el = document.getElementById('col-quotes-' + Utils.slugify(lane));
        if (!el || typeof Sortable === 'undefined') return;
        _sortables.push(new Sortable(el, {
          group: 'quotes-status',
          animation: 200,
          ghostClass: 'kanban-drop-zone',
          onAdd: async (evt) => {
            const quoteId = evt.item.dataset.id;
            const newStatus = evt.to.dataset.status;
            await Quotations.updateStatus(quoteId, newStatus);
          }
        }));
      });
    } catch (err) {
      console.error("Board crash:", err);
      const listDiv = document.getElementById('q-list-container');
      if (listDiv) listDiv.innerHTML = `<div style="padding:20px; color:var(--error);">Error al cargar Tablero: ${err.message}</div>`;
    }
  }

  function _qCardHTML(q) {
    const client = State.contacts.find(c => c['ID'] === q['ID Cliente']);
    const st = q['Estado'] || 'Borrador';
    
    let tagClass = 'tag-muted';
    if(st === 'Aprobada') tagClass = 'tag-success';
    if(st === 'Enviada') tagClass = 'tag-warning';

    return `
      <div class="kanban-card quote-kanban-card" data-id="${q['ID']}" onclick="Quotations.renderDetail(null, '${q['ID']}')">
        <div class="kanban-card-header">
          <div class="kanban-card-title">${Utils.escapeHtml(client?.['Razón Social'] || 'Desconocido')}</div>
          <div class="kanban-card-subtitle">ERGOX-${String(q['Número']).padStart(6,'0')}</div>
        </div>
        <div class="kanban-card-body">
          <div class="kanban-card-price">$ ${Utils.formatUSD(q['Total USD'])}</div>
          <div class="kanban-card-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${Utils.formatDate(q['Fecha'])}
          </div>
        </div>
        <div class="kanban-card-footer">
          <span class="kanban-tag ${tagClass}">${st}</span>
          <div class="kanban-card-actions">
             <button class="btn-icon-sm" style="color:#25D366;" onclick="event.stopPropagation(); QuoteBuilder.shareByWhatsApp('${q['ID']}')">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 7.454c-1.893 0-3.748-.511-5.361-1.477l-.385-.228-3.991 1.047 1.065-3.893-.25-.398a10.038 10.038 0 0 1-1.531-5.312c0-5.54 4.51-10.05 10.05-10.05 2.684 0 5.207 1.046 7.104 2.943a10.003 10.003 0 0 1 2.943 7.106c0 5.54-4.51 10.05-10.05 10.05m0-21.782c-6.475 0-11.732 5.257-11.732 11.73 0 2.07.541 4.091 1.565 5.885l-1.666 6.085 6.223-1.632a11.705 11.705 0 0 0 5.61 1.444c6.473 0 11.731-5.257 11.731-11.73 0-3.136-1.22-6.084-3.436-8.301-2.215-2.216-5.163-3.435-8.295-3.435\"/></svg>
             </button>
             <button class="btn-icon-sm" style="color:#4285F4;" onclick="event.stopPropagation(); QuoteBuilder.shareByEmail('${q['ID']}')">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
             </button>
             <button class="btn-icon-sm" onclick="event.stopPropagation(); Quotations.renderForm('${q['ID']}')">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
             </button>
          </div>
        </div>
      </div>
    `;
  }

  function setView(view) {
    State.view = view;
    localStorage.setItem('quotes_view', view);
    render(_container);
  }

  // ─── VISTA EJECUTIVA (READONLY) ─────────────────────────────────────────
  async function renderDetail(container, id) {
    if (container) _container = container;
    
    // Si no hay datos, cargar antes de renderizar (Acceso directo desde Dashboard)
    if (!State.quotes.length) {
      if (_container) _container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p style="margin-top:12px; font-size:13px; color:var(--text-muted);">Localizando documento...</p></div>`;
      try {
        const parts = await Promise.all([
          Sheets.readSheet(CONFIG.SHEETS.QUOTATIONS),
          Sheets.readSheet(CONFIG.SHEETS.CONTACTS),
          Sheets.readSheet(CONFIG.SHEETS.PRODUCTS),
          Sheets.getAllConfig(),
          Sheets.latestRate()
        ]);
        State.quotes = parts[0]; State.contacts = parts[1]; State.products = parts[2];
        State.config = parts[3]; State.rate = parts[4] ? Utils.toNumber(parts[4]['Tasa Oficial']) : 0;
      } catch (e) {
        if (_container) _container.innerHTML = `<div style="color:var(--error); padding:20px;">Error al cargar datos para el detalle: ${e.message}</div>`;
        return;
      }
    }

    const q = State.quotes.find(x => x['ID'] === id);
    if (!q) {
      if (_container) _container.innerHTML = `<div style="text-align:center; padding:60px; color:var(--text-muted);">Documento no encontrado o eliminado.</div>`;
      return;
    }

    const c = State.contacts.find(x => x['ID'] === q['ID Cliente']);
    const detail = JSON.parse(q['Detalle JSON'] || '{}');
    const items = Utils.normalizeItems(detail.items);
    const sumUsd = Utils.toNumber(q['Total USD']);
    const status = q['Estado'] || 'Borrador';

    // Colores de estado
    let stBg = 'rgba(148, 163, 184, 0.15)'; let stCol = '#64748b';
    if(status === 'Aprobada') { stBg = 'rgba(16, 185, 129, 0.15)'; stCol = '#10b981'; }
    if(status === 'Enviada') { stBg = 'rgba(13, 115, 119, 0.15)'; stCol = 'var(--primary)'; }
    if(status === 'Rechazada') { stBg = 'rgba(244, 63, 94, 0.15)'; stCol = '#f43f5e'; }

    _container.innerHTML = `
      <style>
        .q-det-hdr { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; flex-wrap:wrap; gap:20px; }
        .q-det-hdr-left { order:1; }
        .q-det-hdr-right { order:2; text-align:right; }
        .q-det-grid { display:flex; padding:16px 24px; background:rgba(0,0,0,0.02); border-bottom:1px solid var(--border-light); font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; }
        .q-row-item-det { display:flex; padding:20px 24px; align-items:center; }
        .q-col-desc-det { flex:1; font-size:16px; font-weight:600; color:var(--text-primary); }
        .q-col-qty-det { width:100px; text-align:center; font-size:16px; font-weight:600; color:var(--text-muted); }
        .q-col-price-det { width:140px; text-align:right; font-size:16px; font-weight:600; color:var(--text-muted); }
        .q-col-sub-det { width:140px; text-align:right; font-size:18px; font-weight:800; color:var(--primary); }
        
        @media (max-width: 768px) {
          .q-det-hdr { flex-direction:column; align-items:flex-start; }
          .q-det-hdr-right { text-align:left; order:3; margin-top:20px; }
          .q-det-grid { display: none!important; }
          .q-row-item-det { flex-direction:column; align-items:flex-start; gap:8px; padding:16px; }
          .q-col-desc-det { font-size:15px; }
          .q-col-qty-det, .q-col-price-det, .q-col-sub-det { width:100%; text-align:left; }
          .q-col-qty-det::before { content: "Cant: "; font-size:12px; }
          .q-col-price-det::before { content: "P.U. ($): "; font-size:12px; }
          .q-col-sub-det { text-align:right; margin-top:10px; font-size:20px; }
          .hide-mobile { display: none !important; }
          @media (min-width: 600px) { .hide-mobile { display: inline-block !important; } }
        }
      </style>
      
      <input type="hidden" id="q-detail-marker" value="${id}" />
      <div class="fade-in" style="max-width:1000px; margin:0 auto; padding-bottom:80px; padding-left:16px; padding-right:16px;">
        
        <!-- Header Flotante -->
        <div style="position:sticky; top:0; background:rgba(var(--bg-base-rgb), 0.8); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); z-index:100; padding:16px 0; border-bottom:1px solid var(--border-light); margin-bottom:30px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-icon" style="background:transparent; border:none; color:var(--text-muted);" onclick="Quotations.render(document.getElementById('main-content'))">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <span style="background:${stBg}; color:${stCol}; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${status}</span>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
             <!-- Eliminar (Discreto) -->
             <button class="btn btn-icon" style="background:transparent; color:var(--error); margin-right:8px;" title="Eliminar Cotización" onclick="Quotations.deleteForm('${q['ID']}')">
               <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
             </button>

             <!-- Acciones Principales -->
             <button class="btn" style="background:var(--bg-dark); color:var(--text-primary); border:1px solid var(--border-light); font-weight:700;" onclick="Quotations.renderForm('${q['ID']}')">Modificar</button>
             
             <div style="height:24px; width:1px; background:var(--border-light); margin:0 4px;"></div>

             <!-- Métodos de Envío -->
             <button class="btn btn-primary" style="background-color:#25D366; border-color:#25D366; font-weight:700; display:flex; align-items:center; gap:8px;" onclick="QuoteBuilder.shareByWhatsApp('${q['ID']}')">
               <svg viewBox="0 0 24 24" width="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 7.454c-1.893 0-3.748-.511-5.361-1.477l-.385-.228-3.991 1.047 1.065-3.893-.25-.398a10.038 10.038 0 0 1-1.531-5.312c0-5.54 4.51-10.05 10.05-10.05 2.684 0 5.207 1.046 7.104 2.943a10.003 10.003 0 0 1 2.943 7.106c0 5.54-4.51 10.05-10.05 10.05m0-21.782c-6.475 0-11.732 5.257-11.732 11.73 0 2.07.541 4.091 1.565 5.885l-1.666 6.085 6.223-1.632a11.705 11.705 0 0 0 5.61 1.444c6.473 0 11.731-5.257 11.731-11.73 0-3.136-1.22-6.084-3.436-8.301-2.215-2.216-5.163-3.435-8.295-3.435\"/></svg>
               WhatsApp
             </button>

             <button class="btn btn-primary" style="background-color:#4285F4; border-color:#4285F4; font-weight:700;" onclick="QuoteBuilder.shareByEmail('${q['ID']}')">
               <svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
             </button>

             <button class="btn" style="background:var(--bg-surface); border:1px solid var(--border-light); color:var(--text-primary); font-weight:700;" onclick="QuoteBuilder.downloadPDF('${q['ID']}')">
               <svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             </button>
          </div>
        </div>

        <div class="q-det-hdr">
          <div class="q-det-hdr-left">
            <div style="font-size:12px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">Cliente Oficial</div>
            <h1 style="font-size:36px; @media(min-width:768px){font-size:42px;} font-weight:900; letter-spacing:-1.5px; color:var(--text-primary); line-height:1.1; margin:0 0 12px 0;">${Utils.escapeHtml(c?.['Razón Social'] || 'N/A')}</h1>
            <div style="font-size:16px; color:var(--text-muted); font-weight:500;">ERGOX-${String(q['Número']).padStart(6,'0')} • ${Utils.formatDateLong(q['Fecha'])}</div>
          </div>
          <div class="q-det-hdr-right">
             <div style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">Monto Cerrado</div>
             <div style="font-size:48px; @media(min-width:768px){font-size:56px;} font-weight:900; letter-spacing:-2px; color:var(--success); line-height:1;">$${Utils.formatUSD(sumUsd)}</div>
             
             <!-- Gestión de Estado Pro -->
             <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
                ${status !== 'Aprobada' ? `<button class="btn" style="font-size:11px; padding:6px 12px; border:1px solid #10b981; color:#10b981; background:transparent; font-weight:700;" onclick="Quotations.updateStatus('${q['ID']}', 'Aprobada')">Aprobar</button>` : ''}
                ${status !== 'Rechazada' ? `<button class="btn" style="font-size:11px; padding:6px 12px; border:1px solid #f43f5e; color:#f43f5e; background:transparent; font-weight:700;" onclick="Quotations.updateStatus('${q['ID']}', 'Rechazada')">Rechazar</button>` : ''}
                ${status !== 'Borrador' ? `<button class="btn" style="font-size:11px; padding:6px 12px; border:1px solid var(--text-muted); color:var(--text-muted); background:transparent; font-weight:700;" onclick="Quotations.updateStatus('${q['ID']}', 'Borrador')">Reset</button>` : ''}
             </div>
          </div>
        </div>

        <!-- ITEMS GRID (READONLY) -->
        <div style="margin-bottom:60px; border:1px solid var(--border-light); border-radius:16px; overflow:hidden; background:var(--bg-surface); box-shadow:0 10px 30px rgba(0,0,0,0.02);">
          <div class="q-det-grid">
            <div style="flex:1;">Descriptor del Bien o Servicio</div>
            <div style="width:100px; text-align:center;">Unidades</div>
            <div style="width:140px; text-align:right;">Precio U.</div>
            <div style="width:140px; text-align:right;">Subtotal</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:0;">
            ${items.map((it, idx) => `
              <div class="q-row-item-det" style="border-bottom: ${idx === items.length-1 ? 'none' : '1px solid var(--border-light)'};">
                <div class="q-col-desc-det">${Utils.escapeHtml(it.desc)}</div>
                <div class="q-col-qty-det">${it.qty}</div>
                <div class="q-col-price-det">$${Utils.formatUSD(it.price)}</div>
                <div class="q-col-sub-det">$${Utils.formatUSD(it.qty * it.price)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ─── ELIMINAR COTIZACIÓN ────────────────────────────────────────────────
  async function deleteForm(id) {
    if (!await Utils.confirm('¿Estás seguro de que deseas eliminar permanentemente esta cotización y sacarla de los registros financieros?')) return;
    
    Utils.showToast('Destruyendo documento...', 'info');
    try {
      await Sheets.deleteRow(CONFIG.SHEETS.QUOTATIONS, id);
      State.quotes = State.quotes.filter(q => q['ID'] !== id);
      render(document.getElementById('main-content'));
      Utils.showToast('Documento eliminado exitosamente.', 'success');
    } catch (e) {
      Utils.showToast('Error al eliminar: ' + e.message, 'error');
    }
  }

  // ─── EXPOSICIÓN DE API ──────────────────────────────────────────────────
  return {
    render, renderList, renderForm, saveForm, renderDetail, deleteForm, updateStatus,
    renderCurrentView,
    getQuotation: (id) => State.quotes.find(x => x['ID']===id),
    getContacts: () => State.contacts,
    getConfig: () => State.config,
    exportData: () => Utils.exportToCSV(State.quotes, 'Export_Cotizaciones.csv')
  };
})();
