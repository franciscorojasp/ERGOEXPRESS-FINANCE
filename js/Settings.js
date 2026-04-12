/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo Configuración + Usuarios
   Administración de empresa, textos, logo y gestión de usuarios
   ════════════════════════════════════════════════════════════════════════════ */

const Settings = (() => {
  let _config = {};
  let _users  = [];

  async function render(container) {
    if (!App.isAdmin()) {
      container.innerHTML = `
        <div class="empty-state" style="padding:80px;">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3>Acceso restringido</h3>
          <p>Solo los administradores pueden acceder a la configuración.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <h1 class="page-title">Configuración</h1>
        </div>

        <div class="tabs">
          <button class="tab-btn active" onclick="Settings._tab('empresa', this)">🏢 Empresa</button>
          <button class="tab-btn" onclick="Settings._tab('textos', this)">📝 Textos</button>
          <button class="tab-btn" onclick="Settings._tab('usuarios', this)">👥 Usuarios</button>
          <button class="tab-btn" onclick="Settings._tab('auditoria', this)">🛡️ Auditoría</button>
          <button class="tab-btn" onclick="Settings._tab('interfaz', this)">📱 Interfaz</button>
          <button class="tab-btn" onclick="Settings._tab('info', this)">ℹ️ Info</button>
        </div>

        <div id="settings-content">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await _load();
    _renderTab('empresa');
  }

  async function _load() {
    [_config, _users] = await Promise.all([
      Sheets.getAllConfig(),
      Sheets.readSheet(CONFIG.SHEETS.USERS, false)
    ]);
  }

  function _tab(name, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _renderTab(name);
  }

  function _renderTab(name) {
    const c = document.getElementById('settings-content');
    if (!c) return;
    if (name === 'empresa')   _renderEmpresa(c);
    if (name === 'textos')    _renderTextos(c);
    if (name === 'usuarios')  _renderUsuarios(c);
    if (name === 'auditoria') _renderAuditoria(c);
    if (name === 'interfaz')  _renderInterfaz(c);
    if (name === 'info')      _renderInfo(c);
  }

  function _renderInterfaz(c) {
    const scale = getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim() || '1';
    c.innerHTML = `
      <div class="card card-padded">
        <div class="form-section-title">Personalización Visual</div>
        <p style="font-size:var(--font-sm); color:var(--text-muted); margin-bottom:20px;">
          Ajusta el tamaño de la fuente para mejorar la legibilidad o aumentar la densidad de información.
        </p>

        <div class="form-group" style="max-width:400px;">
          <label class="form-label" style="display:flex; justify-content:space-between;">
            Tamaño de la Fuente <span>${Math.round(scale * 100)}%</span>
          </label>
          <input type="range" min="0.8" max="1.2" step="0.05" value="${scale}" 
                 style="width:100%; height:8px; accent-color:var(--primary);"
                 oninput="App.setFontScale(this.value); this.previousElementSibling.querySelector('span').innerText = Math.round(this.value*100) + '%' ">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:8px;">
            <span>Pequeño</span>
            <span>Normal (100%)</span>
            <span>Grande</span>
          </div>
        </div>

        <div style="margin-top:32px;">
          <button class="btn btn-primary" onclick="Utils.showToast('Configuración guardada localmente', 'success')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Guardar Preferencia
          </button>
        </div>
      </div>
    `;
  }

  function _renderEmpresa(c) {
    const f = key => Utils.escapeHtml(_config[key] || '');
    c.innerHTML = `
      <div class="card card-padded">
        <div class="form-section-title">Datos de la Empresa</div>
        <form id="empresa-form">
          <div class="form-grid">
            <div class="form-group full">
              <label class="form-label">Nombre Comercial <span class="required">*</span></label>
              <input class="form-input" name="empresa_nombre" value="${f('empresa_nombre')}" />
            </div>
            <div class="form-group">
              <label class="form-label">RIF</label>
              <input class="form-input" name="empresa_rif" value="${f('empresa_rif')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Ciudad (para cotizaciones)</label>
              <input class="form-input" name="empresa_ciudad" value="${f('empresa_ciudad')}" />
            </div>
            <div class="form-group full">
              <label class="form-label">Lema / Subtítulo</label>
              <input class="form-input" name="empresa_lema" value="${f('empresa_lema')}" />
            </div>
            <div class="form-group full">
              <label class="form-label">Dirección</label>
              <input class="form-input" name="empresa_direccion" value="${f('empresa_direccion')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono 1</label>
              <input class="form-input" name="empresa_telefono1" value="${f('empresa_telefono1')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono 2</label>
              <input class="form-input" name="empresa_telefono2" value="${f('empresa_telefono2')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Email Principal</label>
              <input class="form-input" type="email" name="empresa_email1" value="${f('empresa_email1')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Email Secundario</label>
              <input class="form-input" type="email" name="empresa_email2" value="${f('empresa_email2')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Instagram</label>
              <input class="form-input" name="empresa_instagram" value="${f('empresa_instagram')}" placeholder="@usuario" />
            </div>
            <div class="form-group full">
              <label class="form-label">URL del Logo (URL pública o ruta relativa)</label>
              <input class="form-input" name="empresa_logo_url" value="${f('empresa_logo_url')}" placeholder="https://... o assets/logo.png" />
              <div class="form-hint">El logo se mostrará en las cotizaciones PDF</div>
            </div>
          </div>

          <div class="form-section-title" style="margin-top:20px;">Firma de Cotizaciones</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nombre del Responsable</label>
              <input class="form-input" name="cotizacion_firma_nombre" value="${f('cotizacion_firma_nombre')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Cargo</label>
              <input class="form-input" name="cotizacion_firma_cargo" value="${f('cotizacion_firma_cargo')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Validez por defecto (días)</label>
              <input class="form-input" type="number" name="cotizacion_validez_default" value="${f('cotizacion_validez_default')}" min="1" />
            </div>
          </div>
        </form>

        <div style="display:flex; justify-content:flex-end; margin-top:20px;">
          <button class="btn btn-primary" onclick="Settings.saveEmpresa()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Guardar Configuración
          </button>
        </div>
      </div>
    `;
  }

  function _renderTextos(c) {
    const f = key => Utils.escapeHtml(_config[key] || '');
    c.innerHTML = `
      <div class="card card-padded">
        <div class="form-section-title">Textos por Defecto en Cotizaciones</div>
        <form id="textos-form">
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">Texto introductorio</label>
            <textarea class="form-textarea" name="cotizacion_intro" style="min-height:100px;">${f('cotizacion_intro')}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">Condiciones de Pago</label>
            <textarea class="form-textarea" name="cotizacion_condiciones" style="min-height:200px; font-size:12px;">${f('cotizacion_condiciones')}</textarea>
          </div>
        </form>
        <div style="display:flex; justify-content:flex-end; margin-top:20px;">
          <button class="btn btn-primary" onclick="Settings.saveTextos()">Guardar Textos</button>
        </div>
      </div>
    `;
  }

  function _renderUsuarios(c) {
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Usuarios del CRM (${_users.length}/7)
          </h3>
          <button class="btn btn-sm btn-primary" onclick="Settings.openUserForm()">+ Agregar</button>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${_users.map(u => `
                <tr>
                  <td class="td-bold">${Utils.escapeHtml(u['Nombre'])}</td>
                  <td>${Utils.escapeHtml(u['Email'])}</td>
                  <td>
                    <span class="badge ${u['Rol']==='admin' ? 'badge-primary' : 'badge-neutral'}">
                      ${u['Rol']}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${u['Activo']==='SI' ? 'badge-success' : 'badge-error'}">
                      ${u['Activo']==='SI' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>${Utils.formatDate(u['Fecha Registro'])}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-sm btn-ghost" onclick="Settings.toggleUser('${u['ID']}', '${u['Activo']}')">
                        ${u['Activo']==='SI' ? '🔒 Desactivar' : '🔓 Activar'}
                      </button>
                      <button class="btn btn-sm btn-ghost" onclick="Settings.changeRole('${u['ID']}', '${u['Rol']}')">
                        🔄 Cambiar rol
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          <p class="text-muted text-sm">Máximo 7 usuarios (1 admin + 6 vendedores). Los vendedores inician sesión con su Gmail y aparecen aquí.</p>
        </div>
      </div>
    `;
  }

  async function _renderAuditoria(c) {
    c.innerHTML = `
      <div class="card">
        <div class="card-header" style="justify-content:space-between;">
          <h3 class="card-title">Logs de Auditoría</h3>
          <button class="btn btn-sm btn-ghost" onclick="Settings._renderAuditoria(document.getElementById('settings-content'))">🔄 Refrescar</button>
        </div>
        <div class="card-body" style="padding:0; max-height:600px; overflow-y:auto;">
          <div id="audit-logs-list">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>
        <div class="card-footer">
          <p class="text-muted text-sm">Mostrando los últimos 100 eventos del sistema. Solo visible para personal autorizado.</p>
        </div>
      </div>
    `;

    try {
      const res = await API.call('GET_AUDIT_LOGS', { limit: 100 });
      const list = document.getElementById('audit-logs-list');
      if (!res.success) {
        list.innerHTML = `<div style="padding:20px; color:var(--error);">${res.error}</div>`;
        return;
      }

      if (res.data.length === 0) {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">No hay registros aún.</div>`;
        return;
      }

      list.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Tabla</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody style="font-size:12px;">
            ${res.data.map(l => `
              <tr>
                <td style="white-space:nowrap;">${Utils.formatDate(l.fecha)} ${new Date(l.fecha).toLocaleTimeString()}</td>
                <td><span style="color:var(--primary-light); font-weight:600;">${l.usuario}</span></td>
                <td><span class="badge ${l.accion==='DELETE'?'badge-error':l.accion==='CREATE'?'badge-success':'badge-primary'}">${l.accion}</span></td>
                <td class="td-bold">${l.tabla}</td>
                <td>
                  <div style="font-size:10px; font-family:monospace; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; color:var(--text-muted);" 
                       onclick="Utils.showModal({title:'Detalles de Auditoría', content:'<pre style=\'font-size:11px; white-space:pre-wrap;\'>' + Utils.escapeHtml(JSON.stringify(JSON.parse(l.detalles || '{}'), null, 2)) + '</pre>' })">
                    ${Utils.escapeHtml(l.detalles)}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      document.getElementById('audit-logs-list').innerHTML = `<div style="padding:20px; color:var(--error);">${e.message}</div>`;
    }
  }

  function _renderInfo(c) {
    c.innerHTML = `
      <div class="card card-padded" style="max-width:500px;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="assets/logo.png" style="width:80px; height:80px; object-fit:contain; border-radius:50%; margin-bottom:12px; background:var(--bg-surface); padding:10px; box-shadow:0 8px 20px rgba(0,0,0,0.2);" />
          <h2 style="font-size:20px; font-weight:800; color:var(--primary-light);">ERGOEXPRESS CRM</h2>
          <p class="text-muted text-sm">v${CONFIG.APP_VERSION} — Gestión Comercial Profesional</p>
        </div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Backend</div><div class="info-value">Google Sheets API v4</div></div>
          <div class="info-item"><div class="info-label">Autenticación</div><div class="info-value">Google OAuth 2.0 (GIS)</div></div>
          <div class="info-item"><div class="info-label">PDF</div><div class="info-value">html2canvas + jsPDF</div></div>
          <div class="info-item"><div class="info-label">Charts</div><div class="info-value">Chart.js 4</div></div>
          <div class="info-item"><div class="info-label">Kanban</div><div class="info-value">Sortable.js</div></div>
          <div class="info-item"><div class="info-label">Spreadsheet ID</div><div class="info-value" style="font-size:11px; word-break:break-all;">${localStorage.getItem('crm_spreadsheet_id') || 'No configurado'}</div></div>
        </div>
        <div style="margin-top:20px; text-align:center;">
          <a href="https://docs.google.com/spreadsheets/d/${localStorage.getItem('crm_spreadsheet_id') || ''}" 
             target="_blank" class="btn btn-primary" style="${!localStorage.getItem('crm_spreadsheet_id')?'pointer-events:none;opacity:0.5;':''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Abrir Google Sheet
          </a>
        </div>
      </div>
    `;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function saveEmpresa() {
    const data = Utils.getFormData('empresa-form');
    await _saveMultiple(data);
  }

  async function saveTextos() {
    const data = Utils.getFormData('textos-form');
    await _saveMultiple(data);
  }

  async function _saveMultiple(data) {
    try {
      for (const [key, val] of Object.entries(data)) {
        await Sheets.setConfig(key, val);
        _config[key] = val;
      }
      Utils.showToast('Configuración guardada', 'success');
      Sheets.invalidateAll();
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  // ─── User Management ──────────────────────────────────────────────────────
  function openUserForm() {
    if (_users.length >= 7) {
      Utils.showToast('Máximo 7 usuarios alcanzado', 'warning'); return;
    }
    Utils.showModal({
      title: 'Agregar Usuario',
      size: 'sm',
      content: `
        <form id="user-form">
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label">Email Gmail <span class="required">*</span></label>
            <input class="form-input" type="email" name="Email" required placeholder="usuario@gmail.com" />
            <div class="form-hint">El usuario debe iniciar sesión con este Gmail</div>
          </div>
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label">Nombre completo <span class="required">*</span></label>
            <input class="form-input" name="Nombre" required placeholder="Nombre Apellido" />
          </div>
          <div class="form-group">
            <label class="form-label">Rol</label>
            <select class="form-select" name="Rol">
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Settings.saveUser()">Agregar</button>
      `
    });
  }

  async function saveUser() {
    const data = Utils.getFormData('user-form');
    if (Utils.validateRequired(data, ['Email','Nombre']).length) {
      Utils.showToast('Email y nombre son requeridos', 'warning'); return;
    }
    // Check not duplicate
    if (_users.find(u => u['Email'] === data['Email'])) {
      Utils.showToast('Este email ya está registrado', 'warning'); return;
    }
    try {
      await Sheets.createUser(data['Email'], data['Nombre'], data['Rol']);
      Utils.showToast('Usuario agregado', 'success');
      Utils.closeModal();
      await _load();
      _renderUsuarios(document.getElementById('settings-content'));
    } catch(e) {
      Utils.showToast('Error: ' + e.message, 'error');
    }
  }

  async function toggleUser(id, currentStatus) {
    const user = _users.find(u => u['ID'] === id);
    if (!user) return;
    const newStatus = currentStatus === 'SI' ? 'NO' : 'SI';
    try {
      await Sheets.updateRow(CONFIG.SHEETS.USERS, id, { ...user, 'Activo': newStatus });
      Utils.showToast(`Usuario ${newStatus==='SI'?'activado':'desactivado'}`, 'success');
      await _load();
      _renderUsuarios(document.getElementById('settings-content'));
    } catch(e) { Utils.showToast('Error: '+e.message, 'error'); }
  }

  async function changeRole(id, currentRole) {
    const user = _users.find(u => u['ID'] === id);
    if (!user) return;
    const newRole = currentRole === 'admin' ? 'vendedor' : 'admin';
    Utils.confirm(`¿Cambiar rol de ${user['Nombre']} a ${newRole}?`, async () => {
      try {
        await Sheets.updateRow(CONFIG.SHEETS.USERS, id, { ...user, 'Rol': newRole });
        Utils.showToast(`Rol cambiado a ${newRole}`, 'success');
        await _load();
        _renderUsuarios(document.getElementById('settings-content'));
      } catch(e) { Utils.showToast('Error: '+e.message, 'error'); }
    });
  }

  return {
    render, _tab, saveEmpresa, saveTextos,
    openUserForm, saveUser, toggleUser, changeRole
  };
})();
