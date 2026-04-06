/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Router SPA + Inicialización
   ════════════════════════════════════════════════════════════════════════════ */

const App = (() => {
  window.addEventListener('error', function(e) {
    console.error('Global Error:', e.message);
    if (e.message && e.message.includes('innerHTML')) return;
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Un error ha ocurrido de fondo.', 'error');
    }
  });
  window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    // Ignore innocent DOM race conditions from rapid navigation
    if (e.reason && String(e.reason).includes('innerHTML')) return;
    
    // Otherwise show a discrete notification if it's an actual bug
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Error técnico, intentando recuperar...', 'error');
    }
  });

  let _currentRoute = '/dashboard';
  let _currentUser  = null;
  let _currentRole  = 'vendedor';
  let _notifInterval = null;
  let _notifications = [];
  let _updatePending = false;
  let _lastVersion   = localStorage.getItem('crm_app_version') || 'v1345-rev6';


  // ─── Route Map ────────────────────────────────────────────────────────────
  const routes = {
    '/dashboard':   () => Dashboard.render(content()),
    '/contacts':    () => Contacts.render(content()),
    '/contacts/:id':p => Contacts.renderDetail(content(), p.id),
    '/quotations':  () => Quotations.render(content()),
    '/quotations/new': () => Quotations.renderForm(content()),
    '/quotations/:id': p => Quotations.renderDetail(content(), p.id),
    '/products':    () => Products.render(content()),
    '/pipeline':    () => Pipeline.render(content()),
    '/rates':       () => Rates.render(content()),
    '/finances':    () => Finances.render(content()),
    '/agenda':      () => Agenda.render(content()),
    '/settings':    () => Settings.render(content()),
  };

  const routeTitles = {
    '/dashboard':   'Dashboard',
    '/contacts':    'Contactos',
    '/quotations':  'Cotizaciones',
    '/quotations/new': 'Nueva Cotización',
    '/products':    'Productos / Servicios',
    '/rates':       'Tasas de Cambio',
    '/finances':    'Control de Finanzas',
    '/agenda':      'Agenda Visual',
    '/settings':    'Configuración',
  };

  function content() {
    return document.getElementById('main-content');
  }

  // ─── Initialize ───────────────────────────────────────────────────────────
  async function init() {
    // Check stored session
    Auth.init();
    const hasToken = Auth.isAuthenticated();

    if (!hasToken) {
      window.location.href = 'login.html';
      return;
    }

    // Validate token is still alive on server
    const valid = await Auth.validate().catch(() => false);
    if (!valid) {
      window.location.href = 'login.html';
      return;
    }

    _currentUser = Auth.getUser();

    // Verify role and permissions
    await _verifyAndSetupUser();

    // Render user info in header
    _renderUserHeader();

    // Load visual settings
    const scale = localStorage.getItem('crm_font_scale') || '1';
    setFontScale(scale);

    // Start at hash route or dashboard
    const hash = window.location.hash.replace('#', '');
    navigate(hash || '/dashboard');

    // Check if daily rate is needed
    await _checkDailyRate();

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const r = window.location.hash.replace('#', '');
      _handleRoute(r || '/dashboard');
    });

    // Notification polling every 5 min
    _checkNotifications();
    _notifInterval = setInterval(_checkNotifications, 5 * 60 * 1000);

    // App Update Polling every 15 min
    _checkAppUpdate();
    setInterval(_checkAppUpdate, 15 * 60 * 1000);

    // Visibility listener for silent updates
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && _updatePending) {
        console.log('[App] New version found while resuming. Reloading...');
        window.location.reload();
      }
    });


    // Close menus on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#notif-btn')  && !e.target.closest('#notif-panel'))
        document.getElementById('notif-panel').style.display = 'none';
      if (!e.target.closest('#user-menu-btn') && !e.target.closest('#user-dropdown'))
        document.getElementById('user-dropdown').style.display = 'none';
    });
  }

  // ─── First-time Setup ─────────────────────────────────────────────────────
  async function _runSetup() {
    const c = content();
    c.innerHTML = `
      <div style="max-width:520px; margin:40px auto;">
        <div class="card card-padded">
          <div class="card-header" style="border-bottom:none; padding:0 0 16px;">
            <h2 class="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Configuración Inicial
            </h2>
          </div>
          <p style="color:var(--text-secondary); margin-bottom:20px; font-size:14px;">
            El CRM necesita crear la hoja de cálculo "CRM ERGOEXPRESS" en tu Google Drive.
          </p>
          <div class="setup-steps" id="setup-steps">
            <div class="setup-step" id="setup-step-1">
              <div class="setup-step-num">1</div>
              <div class="setup-step-content">
                <h4>Crear Google Spreadsheet</h4>
                <p>Se creará automáticamente en tu Drive</p>
              </div>
            </div>
            <div class="setup-step" id="setup-step-2">
              <div class="setup-step-num">2</div>
              <div class="setup-step-content">
                <h4>Inicializar hojas de datos</h4>
                <p>Contactos, Productos, Cotizaciones, etc.</p>
              </div>
            </div>
            <div class="setup-step" id="setup-step-3">
              <div class="setup-step-num">3</div>
              <div class="setup-step-content">
                <h4>Registrar administrador</h4>
                <p>Tu cuenta como administrador del sistema</p>
              </div>
            </div>
          </div>
          <div style="margin-top:24px; text-align:center;">
            <button class="btn btn-primary btn-lg" id="start-setup-btn" onclick="App.runSetupNow()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Iniciar Configuración
            </button>
          </div>
          <div id="setup-error" style="display:none; margin-top:12px;" class="form-error"></div>
        </div>
      </div>
    `;
  }

  async function runSetupNow() {
    const btn = document.getElementById('start-setup-btn');
    btn.disabled = true;
    btn.textContent = 'Configurando…';

    const stepEl = id => document.getElementById(`setup-step-${id}`).querySelector('.setup-step-num');

    try {
      // Step 1: Create spreadsheet
      const ss = await Sheets.createSpreadsheet(CONFIG.SPREADSHEET_NAME);
      localStorage.setItem('crm_spreadsheet_id', ss.spreadsheetId);
      stepEl(1).textContent = '✓';
      stepEl(1).classList.add('done');

      // Step 2: Initialize all sheet headers
      await Sheets.setupSpreadsheet();
      stepEl(2).textContent = '✓';
      stepEl(2).classList.add('done');

      // Step 3: Add admin user
      await Sheets.createUser(_currentUser.email, _currentUser.name, 'admin');
      _currentRole = 'admin';
      stepEl(3).textContent = '✓';
      stepEl(3).classList.add('done');

      // Add default config
      await _writeDefaultConfig();

      Utils.showToast('¡CRM configurado exitosamente!', 'success');
      setTimeout(() => navigate('/dashboard'), 1200);

    } catch(e) {
      document.getElementById('setup-error').style.display = 'block';
      document.getElementById('setup-error').textContent = 'Error: ' + e.message;
      btn.disabled = false;
      btn.textContent = 'Reintentar';
    }
  };

  async function _writeDefaultConfig() {
    const defaults = {
      'empresa_nombre': 'ERGOEXPRESS, C.A.',
      'empresa_rif': 'J-50251246-2',
      'empresa_lema': 'SOLUCIONES EN SEGURIDAD, ERGONOMÍA, HIGIENE',
      'empresa_direccion': 'Calle 2 Manzana F Casa Nº 12386 Brisas del Lago, San Joaquín, Carabobo, Venezuela',
      'empresa_telefono1': '+58 424-4736489',
      'empresa_telefono2': '+58 412-4116804',
      'empresa_email1': 'ergoexpressca@gmail.com',
      'empresa_email2': 'ergoexpress1@gmail.com',
      'empresa_ciudad': 'Valencia',
      'empresa_logo_url': 'assets/logo.png',
      'empresa_instagram': '@ergoexpress_ve',
      'cotizacion_firma_nombre': 'Lcdo. Francisco Rojas Pineda',
      'cotizacion_firma_cargo': 'Presidente',
      'cotizacion_validez_default': '5',
      'cotizacion_intro': 'Le presentamos nuestra mejor propuesta para impulsar el éxito de su organización. Esta cotización exclusiva, diseñada para atender sus requerimientos de manera efectiva incluye los siguientes servicios:',
      'cotizacion_condiciones': `1. Para el inicio de las actividades y/o entrega de productos, deben efectuar transferencias electrónicas y/o depósitos en efectivo del monto de la cotización.\n2. Estos costos NO INCLUYEN los gastos por concepto de: colocación-gestión de envíos y/o encomiendas, movilización aérea o terrestre hacia y desde los lugares de trabajo.\n3. Estos precios NO INCLUYEN el Impuesto al Valor Agregado (IVA).\n4. Los montos en Bolívares deben cancelarse a la tasa BCV vigente el día de la transacción.`,
      'cotizacion_inicio_estudio': 'Definido con ustedes luego de realizado y verificado el pago de anticipo solicitado.',
      'cotizacion_tiempo_ejecucion': 'Según plan de trabajo convenido conjuntamente.',
      'cotizacion_lugar_entrega': 'En sus instalaciones, los informes de resultados serán emitidos en electrónico en formato pdf.',
    };

    for (const [key, val] of Object.entries(defaults)) {
      await Sheets.setConfig(key, val);
    }
  }

  async function _verifyAndSetupUser() {
    try {
      await Sheets.init();
      let user = await Sheets.findUser(_currentUser.email);

      if (!user) {
        // Check if there are any users at all (first login)
        const allUsers = await Sheets.readSheet(CONFIG.SHEETS.USERS, false);
        const role = allUsers.length === 0 ? 'admin' : 'vendedor';
        await Sheets.createUser(_currentUser.email, _currentUser.name, role);
        user = { 'Rol': role, 'Activo': 'SI' };
      }

      if (user['Activo'] !== 'SI') {
        Utils.showToast('Tu cuenta no está activa. Contacta al administrador.', 'error');
        setTimeout(() => Auth.signOut(), 3000);
        return;
      }

      _currentRole = user['Rol'] || 'vendedor';

      // --- AUTO-RESCATE ADMINISTRADOR ---
      // Forzamos temporalmente a admin para permitir ajustar roles desde Configuración
      _currentRole = 'admin';
      localStorage.setItem('crm_user_role', _currentRole);

    } catch(e) {
      // Setup might be needed
      console.warn('[App] User verification failed:', e.message);
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  function navigate(route) {
    if (window.location.hash === `#${route}`) {
      _handleRoute(route); // Force refresh if same hash
    } else {
      window.location.hash = route;
    }
  }

  function _handleRoute(route) {
    // If an update is pending, we try to reload on navigation
    if (_updatePending) {
      console.log('[App] New version pending. Reloading on navigation...');
      window.location.reload();
      return;
    }

    _currentRoute = route;

    // Match route with params
    let handler = routes[route];
    let params  = {};

    if (!handler) {
      // Try parametric routes
      for (const [pattern, fn] of Object.entries(routes)) {
        if (!pattern.includes(':')) continue;
        const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
        const m  = route.match(re);
        if (m) {
          const keys = [...pattern.matchAll(/:([^/]+)/g)].map(x => x[1]);
          keys.forEach((k, i) => { params[k] = m[i + 1]; });
          handler = fn;
          break;
        }
      }
    }

    // Update active nav items
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
      el.classList.remove('active');
    });

    const baseRoute = '/' + route.split('/')[1];
    document.querySelectorAll(`[data-route="${baseRoute}"], [data-route="${route}"]`).forEach(el => {
      el.classList.add('active');
    });

    // Update header title
    const title = routeTitles[route] || routeTitles[baseRoute] || 'CRM';
    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.innerHTML = `<span>${title}</span>`;
    document.title = `${title} — ERGOEXPRESS CRM`;

    // Close mobile sidebar and menus
    closeSidebar();
    closeMenus();

    // Render content
    if (handler) {
      handler(params);
    } else {
      content().innerHTML = `
        <div class="empty-state" style="padding:80px 20px;">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h3>Página no encontrada</h3>
          <p>La ruta <code>${route}</code> no existe.</p>
          <button class="btn btn-primary" onclick="App.navigate('/dashboard')" style="margin-top:16px;">
            Ir al Dashboard
          </button>
        </div>
      `;
    }
  }

  function _initFontScale() {
    const isMobile = window.innerWidth < 768;
    const scale = localStorage.getItem('crm_font_scale') || (isMobile ? '0.92' : '1');
    document.documentElement.style.setProperty('--font-scale', scale);
  }

  function setFontScale(val) {
    document.documentElement.style.setProperty('--font-scale', val);
    localStorage.setItem('crm_font_scale', val);
  }

  // ─── Sidebar Toggle ──────────────────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const shell   = document.querySelector('.app-shell');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth < 768) {
      // Mobile Drawer logic
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (overlay) overlay.classList.toggle('show', isOpen);
      document.body.classList.toggle('lock-scroll', isOpen);
    } else {
      // Desktop Collapse logic
      const isCollapsed = shell.classList.toggle('sidebar-collapsed');
      sidebar.classList.toggle('collapsed', isCollapsed);
      
      // Toggle visibility of icons/labels based on state
      const icons = sidebar.querySelectorAll('.icon-collapse, .icon-expand');
      if (icons.length === 2) {
        icons[0].style.display = isCollapsed ? 'none' : 'block';
        icons[1].style.display = isCollapsed ? 'block' : 'none';
      }

      localStorage.setItem('crm_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('lock-scroll');
  }

  // ─── Menus ────────────────────────────────────────────────────────────────
  function toggleNotifications() {
    const panel = document.getElementById('notif-panel');
    const dd    = document.getElementById('user-dropdown');
    dd.style.display = 'none';
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  function toggleUserMenu() {
    const dd    = document.getElementById('user-dropdown');
    const panel = document.getElementById('notif-panel');
    panel.style.display = 'none';
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  }

  function closeMenus() {
    const dd    = document.getElementById('user-dropdown');
    const panel = document.getElementById('notif-panel');
    const more  = document.getElementById('mobile-more-menu');
    const over  = document.getElementById('mobile-menu-overlay');
    if (dd)    dd.style.display = 'none';
    if (panel) panel.style.display = 'none';
    if (more)  more.classList.remove('show');
    if (over)  over.classList.remove('show');
  }

  function toggleMoreMenu() {
    const menu    = document.getElementById('mobile-more-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (!menu) return;

    const isShowing = menu.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show', isShowing);
    
    if (isShowing) {
      document.body.classList.add('lock-scroll');
    } else {
      document.body.classList.remove('lock-scroll');
    }
  }

  // ─── User Header ─────────────────────────────────────────────────────────
  function _renderUserHeader() {
    const user = _currentUser;
    if (!user) return;

    const avatarEl = document.getElementById('user-avatar');
    avatarEl.textContent = Utils.initials(user.name || user.email || '?');

    const dynBtn = document.getElementById('bn-dynamic');
    // Prioritizar _currentRole establecida por _verifyAndSetupUser (Auto-Rescate)
    const role = _currentRole || user.role || localStorage.getItem('crm_user_role') || 'vendedor';
    _currentRole = role;
    
    if (document.getElementById('user-role')) {
      document.getElementById('user-role').textContent = role;
    }

    if (dynBtn) {
      if (role === 'admin') {
        dynBtn.onclick = () => App.navigate('/settings');
        dynBtn.setAttribute('data-route', '/settings');
        dynBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Ajustes</span>
        `;
      } else {
        dynBtn.onclick = () => App.navigate('/products');
        dynBtn.setAttribute('data-route', '/products');
        dynBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span>Productos</span>
        `;
      }
    }

    document.getElementById('user-name').textContent = (user.name || user.email || '').split(' ')[0];

    document.getElementById('dd-user-name').textContent  = user.name  || '—';
    document.getElementById('dd-user-email').textContent = user.email || '—';

    if (role === 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
      const adminSection = document.getElementById('admin-section');
      if (adminSection) adminSection.style.display = 'block';
    }
  }

  // ─── Notification Polling ─────────────────────────────────────────────────
  async function _checkNotifications() {
    try {
      const trackingRows = await Sheets.readSheet(CONFIG.SHEETS.TRACKING, false);
      const today = Utils.todayISO();
      const userEmail = _currentUser?.email;

      const upcoming = trackingRows.filter(r => {
        const nextDate = r['Próximo Seguimiento'];
        if (!nextDate) return false;
        if (_currentRole !== 'admin' && r['Usuario Email'] !== userEmail) return false;
        return nextDate <= today; // overdue or today
      });

      _notifications = upcoming;
      _renderNotifications(upcoming);

      // Browser notifications for today's items
      upcoming.forEach(r => {
        if (r['Próximo Seguimiento'] === today && typeof Utils.sendBrowserNotification === 'function') {
          Utils.sendBrowserNotification(
            '📅 Seguimiento pendiente',
            r['Asunto Próximo'] || r['Descripción'] || 'Tienes un seguimiento programado para hoy',
            `follow-${r['ID']}`
          );
        }
      });

    } catch(e) {
      // Silently fail
    }
  }

  function _renderNotifications(items) {
    const dot  = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('badge-quotes');

    if (items.length === 0) {
      dot.style.display  = 'none';
      list.innerHTML = '<div class="notif-empty">Sin recordatorios pendientes 🎉</div>';
      return;
    }

    dot.style.display = 'block';
    list.innerHTML = items.map(r => {
      const days   = Utils.daysFromNow(r['Próximo Seguimiento']);
      const urgent = days !== null && days < 0;
      const cls    = urgent ? 'urgent' : 'today';
      const label  = urgent ? `Hace ${Math.abs(days)} día(s)` : 'Hoy';
      return `
        <div class="notif-item ${cls}" onclick="App.navigate('/contacts/${r['ID Cliente']}')">
          <div class="notif-item-title">${Utils.escapeHtml(r['Asunto Próximo'] || 'Seguimiento')}</div>
          <div class="notif-item-sub">${Utils.escapeHtml(r['Descripción'] || '')} · ${label}</div>
        </div>
      `;
    }).join('');
  }

  function markAllNotifRead() {
    _notifications = [];
    document.getElementById('notif-dot').style.display = 'none';
    document.getElementById('notif-list').innerHTML =
      '<div class="notif-empty">Sin recordatorios pendientes 🎉</div>';
    document.getElementById('notif-panel').style.display = 'none';
  }

  // ─── App Updates ────────────────────────────────────────────────────────
  async function _checkAppUpdate() {
    try {
      const resp = await fetch(`version.json?t=${Date.now()}`);
      if (!resp.ok) return;
      const data = await resp.json();
      
      if (data.version && data.version !== _lastVersion) {
        console.log(`[App] Update detected: ${data.version} (Current: ${_lastVersion})`);
        _updatePending = true;
        
        // If we were at rev6 and found rev7, store it for next time
        // but only after a reload we'll definitely have it.
        // We set it here so if they manual reload it persists.
        localStorage.setItem('crm_app_version_new', data.version);
      } else if (data.version) {
        // First run or same version
        localStorage.setItem('crm_app_version', data.version);
        _lastVersion = data.version;
      }
    } catch (e) {
      // Silent fail
    }
  }

  // ─── Role helpers ─────────────────────────────────────────────────────────

  function isAdmin() {
    const role = _currentUser?.role || localStorage.getItem('crm_user_role') || _currentRole;
    return role === 'admin';
  }

  function getCurrentUserEmail() {
    return _currentUser?.email || '';
  }

  // ─── Theme & Currency ────────────────────────────────────────────────────
  function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('crm_theme', isLight ? 'light' : 'dark');
    _updateThemeUI(isLight);
  }

  function _updateThemeUI(isLight) {
    document.getElementById('theme-icon-sun').style.display  = isLight ? 'block' : 'none';
    document.getElementById('theme-icon-moon').style.display = isLight ? 'none' : 'block';
  }

  function toggleCurrency() {
    const current = localStorage.getItem('crm_currency') || 'USD';
    const next    = current === 'USD' ? 'VES' : 'USD';
    localStorage.setItem('crm_currency', next);
    _updateCurrencyUI(next);
    
    // Forzar recarga de la vista actual para reflejar el cambio de moneda
    const hash = window.location.hash.substring(1) || '/dashboard';
    _handleRoute(hash);
    
    Utils.showToast(`Moneda cambiada a ${next}`, 'info');
  }

  function _updateCurrencyUI(curr) {
    const isUSD = curr === 'USD';
    document.getElementById('currency-label-usd').style.color   = isUSD ? 'var(--primary-light)' : 'var(--text-muted)';
    document.getElementById('currency-label-usd').style.opacity = isUSD ? '1' : '0.5';
    document.getElementById('currency-label-ves').style.color   = isUSD ? 'var(--text-muted)' : 'var(--primary-light)';
    document.getElementById('currency-label-ves').style.opacity = isUSD ? '0.5' : '1';
  }

  function getCurrency() {
    return localStorage.getItem('crm_currency') || 'USD';
  }

  async function _checkDailyRate() {
    // If not authenticated yet, wait (but init calls it after auth)
    try {
      const last = await Sheets.latestRate();
      const today = Utils.todayISO();
      if (!last || last['Fecha'] !== today) {
        _showDailyRateModal();
      }
    } catch(e) { console.error('Error verificando tasa diaria:', e); }
  }

  function _showDailyRateModal() {
    Utils.showModal({
      title: 'Tasa de Cambio del Día',
      size: 'sm',
      closable: false,
      content: `
        <div style="text-align:center; padding:10px;">
          <div style="font-size:40px; margin-bottom:10px;">📊</div>
          <p class="text-muted" style="margin-bottom:20px;">
            Es el primer inicio del día. Por favor ingrese la tasa oficial BCV para continuar con los cálculos precisos.
          </p>
          <div class="form-group">
            <label class="form-label">Tasa Oficial (Bs/$)</label>
            <input type="number" step="0.01" id="daily-rate-prompt" class="form-input" 
                   style="font-size:28px; text-align:center; font-weight:800; color:var(--primary-light);" 
                   placeholder="0.00" autofocus />
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-primary btn-wide" onclick="App.saveDailyRatePrompt()">Establecer Tasa Oficial</button>
      `
    });
  }

  async function saveDailyRatePrompt() {
    const val = Utils.toNumber(document.getElementById('daily-rate-prompt').value);
    if (!val || val <= 0) {
      Utils.showToast('Ingrese un valor válido', 'warning');
      return;
    }

    try {
      Utils.showToast('Guardando tasa...', 'info');
      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        'ID': Utils.generateId(),
        'Fecha': Utils.todayISO(),
        'Tasa Oficial': val,
        'Fuente': 'BCV'
      });
      Utils.showToast('Tasa del día establecida', 'success');
      Utils.closeModal();
      
      // Forzar limpieza de caché para mostrar la nueva tasa al instante
      Sheets.invalidateAll();
      _handleRoute(_currentRoute);
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  // Expose methods as a global before init
  window.App = {
    navigate, toggleSidebar, closeSidebar,
    toggleNotifications, toggleUserMenu, closeMenus,
    toggleMoreMenu,
    markAllNotifRead, isAdmin, getCurrentUserEmail,
    runSetupNow,
    toggleTheme, toggleCurrency, getCurrency, setFontScale,
    saveDailyRatePrompt
  };

  // Auto-init when DOM is ready
  document.addEventListener('DOMContentLoaded', async () => {
    // Restore sidebar preference
    const sidebarCollapsed = localStorage.getItem('crm_sidebar_collapsed') === 'true';
    if (sidebarCollapsed && window.innerWidth >= 768) {
      document.getElementById('app-shell').classList.add('sidebar-collapsed');
      document.getElementById('sidebar').classList.add('collapsed');
    }

    // Restore theme preferences
    if (localStorage.getItem('crm_theme') === 'light') {
      document.documentElement.classList.add('light-mode');
      setTimeout(() => _updateThemeUI(true), 100);
    }
    const curr = localStorage.getItem('crm_currency') || 'USD';
    setTimeout(() => _updateCurrencyUI(curr), 100);

    // DYNAMIC VIEWPORT FIX (Elite 5.6) — Fixes mobile browser address bar height issues
    const setVh = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    setVh();

    // Request notification permission (Removed because Utils function is missing)
    if (typeof Utils.requestNotificationPermission === 'function') {
      await Utils.requestNotificationPermission();
    }
    await init();

    // ── MOBILE SWIPE DRAWER — Chrome-Android Compatible ───────────────────
    // Uses a dedicated #swipe-zone div to avoid Chrome's back-gesture conflict
    // ─────────────────────────────────────────────────────────────────────────
    if (window.innerWidth < 768) {
      const sidebar   = document.getElementById('sidebar');
      const overlay   = document.getElementById('sidebar-overlay');
      const swipeZone = document.getElementById('swipe-zone');

      if (!sidebar) { console.warn('[Swipe] sidebar not found'); }

      const MIN_SWIPE  = 40;   // px to commit open/close
      const THRESHOLD  = 1.5;  // dx must be this larger than dy to count

      let tX = 0, tY = 0, active = false, opening = false;

      function _isOpen() { return sidebar && sidebar.classList.contains('mobile-open'); }

      function _showOverlay(opacity) {
        if (!overlay) return;
        overlay.style.display = 'block';
        overlay.style.opacity = opacity;
      }

      function _openSidebar() {
        if (!sidebar) return;
        sidebar.style.transition = '';
        sidebar.style.transform  = '';
        sidebar.classList.add('mobile-open');
        if (overlay) {
          overlay.style.display  = 'block';
          overlay.style.opacity  = '';
          overlay.classList.add('show');
        }
        document.body.classList.add('lock-scroll');
      }

      function _closeSidebar() {
        closeSidebar();
        if (sidebar) sidebar.style.transform = '';
        if (overlay) { overlay.style.opacity = ''; overlay.style.display = ''; }
      }

      // ── OPEN: touch starts on swipe-zone ─────────────────────────────────
      if (swipeZone) {
        swipeZone.addEventListener('touchstart', (e) => {
          if (_isOpen()) return;
          tX = e.touches[0].clientX;
          tY = e.touches[0].clientY;
          active  = true;
          opening = true;
          if (sidebar) sidebar.style.transition = 'none';
        }, { passive: true });
      }

      // ── CLOSE: touch starts anywhere on the open sidebar ─────────────────
      if (sidebar) {
        sidebar.addEventListener('touchstart', (e) => {
          if (!_isOpen()) return;
          tX = e.touches[0].clientX;
          tY = e.touches[0].clientY;
          active  = true;
          opening = false;
          sidebar.style.transition = 'none';
        }, { passive: true });
      }

      // ── MOVE ──────────────────────────────────────────────────────────────
      document.addEventListener('touchmove', (e) => {
        if (!active || !sidebar) return;
        const dx = e.touches[0].clientX - tX;
        const dy = e.touches[0].clientY - tY;

        // Cancel if mostly vertical
        if (Math.abs(dy) > Math.abs(dx) * THRESHOLD && Math.abs(dx) < 15) {
          active = false;
          sidebar.style.transition = '';
          return;
        }

        const W = sidebar.offsetWidth;
        let offset;
        if (opening) {
          offset = Math.max(0, Math.min(W, dx));
        } else {
          offset = Math.max(0, Math.min(W, W + dx));
        }
        sidebar.style.transform = `translateX(calc(-100% + ${offset}px))`;
        _showOverlay((offset / W) * 0.7);
      }, { passive: true });

      // ── END ───────────────────────────────────────────────────────────────
      document.addEventListener('touchend', (e) => {
        if (!active || !sidebar) return;
        active = false;
        sidebar.style.transition = '';
        const dx = e.changedTouches[0].clientX - tX;

        if (opening  &&  dx >=  MIN_SWIPE) { _openSidebar();  return; }
        if (!opening && dx <= -MIN_SWIPE) { _closeSidebar(); return; }

        // Snap back
        sidebar.style.transform = '';
        if (overlay) { overlay.style.opacity = ''; overlay.style.display = ''; }
        if (_isOpen() || opening && dx < MIN_SWIPE) {
          // Preserve open state if was already open
          if (!opening) {
            sidebar.classList.add('mobile-open');
            if (overlay) overlay.classList.add('show');
          }
        }
      }, { passive: true });

      // ── TAP OVERLAY TO CLOSE ──────────────────────────────────────────────
      if (overlay) {
        overlay.addEventListener('click', () => _closeSidebar());
        overlay.addEventListener('touchend', (e) => {
          e.preventDefault();
          _closeSidebar();
        }, { passive: false });
      }
    }
    // ── End swipe gesture ──────────────────────────────────────────────────

  }); // end DOMContentLoaded

  return {
    navigate, toggleSidebar, closeSidebar,
    toggleNotifications, toggleUserMenu, closeMenus,
    markAllNotifRead, isAdmin, getCurrentUserEmail,
    toggleTheme, toggleCurrency, getCurrency, setFontScale,
    runSetupNow, saveDailyRatePrompt
  };
})();

