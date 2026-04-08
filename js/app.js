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
  let _lastVersion   = localStorage.getItem('crm_app_version') || 'v1345-rev13';


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
    const el = document.getElementById('main-content');
    if (!el) console.warn('[App] Container main-content not found');
    return el;
  }

  // ─── Initialize ───────────────────────────────────────────────────────────
  async function init() {
    // 1. Check stored session (Immediate)
    Auth.init();
    if (!Auth.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    // 2. Setup Router Listener (Early setup)
    window.addEventListener('hashchange', () => {
      const r = window.location.hash.replace('#', '');
      _handleRoute(r || '/dashboard');
    });

    try {
      // 3. User Validation (Required)
      const valid = await Auth.validate().catch(() => false);
      if (!valid) {
        window.location.href = 'login.html';
        return;
      }

      _currentUser = Auth.getUser();
      
      // Inicializar Asistente AI
      // if (typeof AI !== 'undefined') AI.init(); // Desactivado v3.2.5

      // 4. Initial Navigation (Render UI now!)
      const initialHash = window.location.hash.replace('#', '');
      _handleRoute(initialHash || '/dashboard');

      // 5. Background / Non-Blocking Startup Tasks
      _runSecondaryStartup();

    } catch (err) {
      console.error('[App] Init Error:', err);
      // Fallback: If everything fails, try to show the dashboard anyway or redirect
      _handleRoute('/dashboard');
    }
  }

  /**
   * Aplica la actualización del sistema guardando la nueva versión
   * y recargando la página para limpiar caché.
   */
  function applyUpdate(newVersion) {
    localStorage.setItem('crm_app_version', newVersion);
    window.location.reload(true);
  }

  /**
   * Tasks that can run after the initial screen has started rendering
   */
  async function _runSecondaryStartup() {
    try {
      // Verify role and permissions
      await _verifyAndSetupUser();

      // Render user info in header
      _renderUserHeader();

      // Load visual settings
      const theme = localStorage.getItem('crm_theme') || 'dark';
      document.documentElement.classList.remove('theme-light', 'theme-medium', 'light-mode');
      if (theme !== 'dark') {
        document.documentElement.classList.add(`theme-${theme}`);
        if (theme === 'light') document.documentElement.classList.add('light-mode');
      }
      _updateThemeUI(theme);

      const scale = localStorage.getItem('crm_font_scale') || '1';
      setFontScale(scale);

      // Restaurar estado de Sidebar (Persistencia de Excelencia)
      const isCollapsed = localStorage.getItem('crm_sidebar_collapsed') === 'true';
      if (isCollapsed && window.innerWidth >= 768) {
        const shell = document.querySelector('.app-shell');
        const sidebar = document.getElementById('sidebar');
        if (shell) shell.classList.add('sidebar-collapsed');
        if (sidebar) {
          sidebar.classList.add('collapsed');
          const icons = sidebar.querySelectorAll('.icon-collapse, .icon-expand');
          if (icons.length === 2) {
            icons[0].style.display = 'none';
            icons[1].style.display = 'block';
          }
        }
      }

      // Check if daily rate is needed
      _checkDailyRate();

      // Notification polling
      _checkNotifications();
      if (_notifInterval) clearInterval(_notifInterval);
      _notifInterval = setInterval(_checkNotifications, 5 * 60 * 1000);

      // App Update Polling
      _checkAppUpdate();
      setInterval(_checkAppUpdate, 15 * 60 * 1000);

      // Visibility listener
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && _updatePending) {
          showUpdateNotice();
        }
      });

      // Close menus on outside click
      document.addEventListener('click', e => {
        const notifPanel = document.getElementById('notif-panel');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (notifPanel && !e.target.closest('#notif-btn') && !e.target.closest('#notif-panel'))
          notifPanel.style.display = 'none';
        if (userDropdown && !e.target.closest('#user-menu-btn') && !e.target.closest('#user-dropdown'))
          userDropdown.style.display = 'none';
      });

    } catch (e) {
      console.warn('[App] Secondary startup tasks had issues:', e);
    }
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
    // 1. Force remove the loading spinner as soon as the app logic takes over a route
    const appLoading = document.getElementById('app-loading');
    if (appLoading) appLoading.style.display = 'none';

    // 2. Prevent reload-loops: Only reload if the version is pending AND we are 
    // actually navigating away from what we already rendered.
    if (_updatePending && _currentRoute !== route) {
      console.log('[App] New version pending. Reloading for navigation to:', route);
      window.location.reload();
      return;
    }

    _currentRoute = route || '/dashboard';

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
      
      const remote = (data.version || '').trim().toLowerCase();
      const localVer = localStorage.getItem('crm_app_version') || (typeof CONFIG !== 'undefined' ? CONFIG.APP_VERSION : '3.2.6');
      const local    = localVer.trim().toLowerCase();

      // Normalize comparison (ignore "v" prefix if one has it and other doesn't)
      const normRemote = remote.startsWith('v') ? remote.substring(1) : remote;
      const normLocal  = local.startsWith('v')  ? local.substring(1)  : local;

      console.log(`[App] Version Check -> Local: ${local}, Remote: ${remote}`);

      if (normRemote && normRemote !== normLocal) {
        console.log(`[App] Update required: ${remote} != ${local}`);
        _updatePending = true;
        showUpdateNotice(remote, data.description);
      }
    } catch (e) {
      console.warn('[App] Update check failed:', e);
    }
  }

  function showUpdateNotice(newVer, desc) {
    if (document.getElementById('blocking-update-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'blocking-update-overlay';
    overlay.className = 'fade-in';
    overlay.style = `
      position: fixed; inset: 0; background: rgba(10, 17, 24, 0.97);
      backdrop-filter: blur(12px); z-index: 99999;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    
    overlay.innerHTML = `
      <div class="card" style="max-width: 450px; width: 100%; border: 1px solid var(--primary-light); box-shadow: 0 0 50px rgba(14, 165, 233, 0.4); padding: 32px; text-align: center; background: var(--bg-surface);">
        <div style="font-size: 56px; margin-bottom: 24px;">🚀</div>
        <h2 style="font-size: 26px; font-weight: 800; color: white; margin-bottom: 12px; letter-spacing:-0.5px;">Actualización Requerida</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size:15px;">Se ha detectado la versión <b>${newVer}</b> del núcleo Elite 3.0.</p>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 28px; font-size: 13.5px; color: var(--text-muted); text-align: left; border-left: 4px solid var(--primary);">
          ${desc || 'Mejoras críticas de rendimiento y sincronización de datos.'}
        </div>
        <p style="font-size: 14px; font-weight: 700; color: var(--primary-light); margin-bottom: 24px; text-transform:uppercase; letter-spacing:1px;">Es obligatorio actualizar para continuar</p>
        <button class="btn btn-primary btn-lg" onclick="App.applyUpdate('${newVer}')" style="width: 100%; height: 56px; font-weight: 800; font-size: 17px; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
          INSTALAR Y REINICIAR
        </button>
      </div>
    `;
    
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  }

  function applyUpdate(version) {
    if (version) localStorage.setItem('crm_app_version', version);
    window.location.reload(true);
  }

  // ─── Daily Rate Mandatory logic ──────────────────────────────────────────
  async function _checkDailyRate() {
    try {
      const data = await Sheets.readSheet(CONFIG.SHEETS.RATES, false);
      const today = Utils.todayISO();
      const hasToday = data.some(r => String(r['Fecha']).split('T')[0] === today);
      
      if (!hasToday) {
        console.log('[App] Tasa de hoy no encontrada. Iniciando auto-fetch...');
        try {
          const bcv = await API.call('FETCH_BCV_RATE', {});
          if (bcv && bcv.success && bcv.rate) {
            console.log('[App] Auto-fetch exitoso:', bcv.rate);
            await Sheets.appendRow(CONFIG.SHEETS.RATES, {
              ID: Utils.generateId(),
              Fecha: today,
              'Tasa Oficial': bcv.rate,
              Fuente: bcv.source || 'BCV (Auto)'
            });
            Utils.showToast(`Tasa del día automatizada: Bs. ${bcv.rate}`, 'success');
            // Recargar vista actual si estamos en rates
            if (window.location.hash === '#/rates') Rates.render();
            return;
          }
        } catch(scavengeErr) {
          console.warn('[App] Scavenger falló:', scavengeErr.message);
        }
        
        // Si falló el auto-fetch o dio error, mostrar modal bloqueante
        _showBlockingRateModal();
      }
    } catch(e) {
      console.error('[App] Error en verificador de tasa:', e);
    }
  }

  function _showBlockingRateModal() {
    if (document.getElementById('blocking-rate-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'blocking-rate-overlay';
    overlay.className = 'fade-in';
    overlay.style = `
      position: fixed; inset: 0; background: rgba(10, 17, 24, 0.98);
      backdrop-filter: blur(15px); z-index: 99998;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    
    overlay.innerHTML = `
      <div class="card" style="max-width: 420px; width: 100%; border: 1px solid #f59e0b; box-shadow: 0 0 50px rgba(245, 158, 11, 0.2); padding: 36px; text-align: center; background: var(--bg-surface);">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h2 style="font-size: 22px; font-weight: 800; color: white; margin-bottom: 12px; letter-spacing:-0.5px;">Dato Crítico Requerido</h2>
        <p style="color: var(--text-secondary); font-size: 15px; margin-bottom: 28px; line-height:1.5;">La tasa oficial BCV de hoy no ha sido registrada y la consulta automática falló. Por favor, ingrésela manualmente.</p>
        
        <div style="text-align: left; margin-bottom: 32px;">
          <label style="display:block; font-size:11px; font-weight:800; color:var(--text-muted); margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">Valor Oficial (Bs. por 1$)</label>
          <div style="position:relative;">
            <input type="number" id="mandatory-rate-input" step="0.0001" style="width:100%; padding:18px; background:rgba(255,255,255,0.03); border:1.5px solid var(--border); color:white; border-radius:12px; font-size:24px; font-weight:800; text-align:center; outline:none; transition:border-color 0.2s;" placeholder="0.00">
            <div style="position:absolute; left:20px; top:50%; transform:translateY(-50%); font-weight:800; color:var(--text-muted); font-size:18px;">Bs.</div>
          </div>
        </div>

        <button class="btn btn-warning" onclick="App.saveMandatoryRate()" id="save-mandatory-btn" style="width: 100%; height: 56px; font-weight: 800; font-size:16px; color: #000; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);">
          GUARDAR Y EMPEZAR DÍA
        </button>
        <p style="margin-top: 24px; font-size: 12px; color: var(--text-muted);">Consulte el valor oficial en <a href="http://bcv.org.ve" target="_blank" style="color:#0ea5e9; font-weight:800; text-decoration:none;">bcv.org.ve</a></p>
      </div>
    `;
    
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('mandatory-rate-input')?.focus(), 300);
  }

  async function saveMandatoryRate() {
    const input = document.getElementById('mandatory-rate-input');
    const btn   = document.getElementById('save-mandatory-btn');
    const val   = parseFloat(String(input.value).replace(',', '.'));
    
    if (!val || val <= 0) {
      Utils.showToast('Por favor, ingrese un valor de tasa válido.', 'error');
      input.focus();
      input.style.borderColor = '#ef4444';
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span> GUARDANDO...`;

      await Sheets.appendRow(CONFIG.SHEETS.RATES, {
        ID: Utils.generateId(),
        Fecha: Utils.todayISO(),
        'Tasa Oficial': val,
        Fuente: 'Manual (Apertura)'
      });

      Utils.showToast('Tasa del día registrada con éxito.', 'success');
      document.getElementById('blocking-rate-overlay').remove();
      document.body.style.overflow = '';
      if (window.location.hash === '#/rates') Rates.render();
    } catch(e) {
      Utils.showToast('Error de conexión. Intente de nuevo.', 'error');
      btn.disabled = false;
      btn.textContent = 'REINTENTAR';
    }
  }

  // ─── Theme & Currency ───────────────────────────────────────────────────
  function toggleTheme() {
    const themes = ['dark', 'light', 'medium'];
    const current = localStorage.getItem('crm_theme') || 'dark';
    const nextIndex = (themes.indexOf(current) + 1) % themes.length;
    const next = themes[nextIndex];
    
    // Remover todas las clases de tema previas
    document.documentElement.classList.remove('theme-light', 'theme-medium', 'light-mode');
    
    // Aplicar nuevo tema
    if (next !== 'dark') {
      document.documentElement.classList.add(`theme-${next}`);
      if (next === 'light') document.documentElement.classList.add('light-mode'); // Compatibilidad legacy
    }
    
    localStorage.setItem('crm_theme', next);
    _updateThemeUI(next);
  }

  function _updateThemeUI(theme) {
    const sun  = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    const cloud = document.getElementById('theme-icon-cloud');
    
    if (!sun || !moon || !cloud) return;

    // Ocultar todos
    sun.style.display = 'none';
    moon.style.display = 'none';
    cloud.style.display = 'none';

    // Mostrar el correspondiente al SIGUIENTE tema (porque el botón indica qué pasará si haces clic)
    // O mejor: mostrar el tema ACTUAL para que el usuario sepa en qué modo está.
    // El usuario pidió "Sol ➔ Nube ➔ Luna", así que mostraré el icono del tema actual.
    if (theme === 'light') sun.style.display = 'block';
    else if (theme === 'medium') cloud.style.display = 'block';
    else moon.style.display = 'block';
  }

  function toggleCurrency() {
    const current = localStorage.getItem('crm_currency') || 'USD';
    const next    = current === 'USD' ? 'VES' : 'USD';
    localStorage.setItem('crm_currency', next);
    _updateCurrencyUI(next);
    
    const hash = window.location.hash.substring(1) || '/dashboard';
    _handleRoute(hash);
    Utils.showToast(`Moneda cambiada a ${next}`, 'info');
  }

  function _updateCurrencyUI(curr) {
    const usd = document.getElementById('currency-label-usd');
    const ves = document.getElementById('currency-label-ves');
    if (!usd || !ves) return;
    const isUSD = curr === 'USD';
    usd.style.color   = isUSD ? 'var(--primary-light)' : 'var(--text-muted)';
    usd.style.opacity = isUSD ? '1' : '0.5';
    ves.style.color   = isUSD ? 'var(--text-muted)' : 'var(--primary-light)';
    ves.style.opacity = isUSD ? '0.5' : '1';
  }

  function getCurrency() {
    return localStorage.getItem('crm_currency') || 'USD';
  }

  function setFontScale(scale) {
    document.documentElement.style.fontSize = `${scale * 16}px`;
    localStorage.setItem('crm_font_scale', scale);
  }

  function isAdmin() {
    const role = _currentUser?.role || localStorage.getItem('crm_user_role') || _currentRole;
    return role === 'admin';
  }

  function getCurrentUserEmail() {
    return _currentUser?.email || '';
  }

  // ─── Mobile Swipe Gesture (Elite 3.0) ───────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 768) {
      const sidebar   = document.getElementById('sidebar');
      const overlay   = document.getElementById('sidebar-overlay');
      const swipeZone = document.getElementById('swipe-zone');

      let tX = 0, tY = 0, active = false, opening = true;
      const THRESHOLD = 0.5, MIN_SWIPE = 60;

      const _isOpen = () => sidebar?.classList.contains('mobile-open');

      if (swipeZone) {
        swipeZone.addEventListener('touchstart', (e) => {
          if (_isOpen()) return;
          tX = e.touches[0].clientX; tY = e.touches[0].clientY;
          active = true; opening = true;
          if (sidebar) sidebar.style.transition = 'none';
        }, { passive: true });
      }

      if (sidebar) {
        sidebar.addEventListener('touchstart', (e) => {
          if (!_isOpen()) return;
          tX = e.touches[0].clientX; tY = e.touches[0].clientY;
          active = true; opening = false;
          sidebar.style.transition = 'none';
        }, { passive: true });
      }

      document.addEventListener('touchmove', (e) => {
        if (!active || !sidebar) return;
        const dx = e.touches[0].clientX - tX;
        const dy = e.touches[0].clientY - tY;
        if (Math.abs(dy) > Math.abs(dx) * THRESHOLD && Math.abs(dx) < 15) {
          active = false; sidebar.style.transition = ''; return;
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
    // ─── START APP ──────────────────────────────────────────────────────────
    init();

  }); // end DOMContentLoaded

  return {
    navigate, toggleSidebar, closeSidebar,
    toggleNotifications, toggleUserMenu, closeMenus,
    toggleMoreMenu,
    markAllNotifRead, isAdmin, getCurrentUserEmail,
    toggleTheme, toggleCurrency, getCurrency, setFontScale,
    runSetupNow, 
    applyUpdate, showUpdateNotice, saveMandatoryRate
  };
})();
