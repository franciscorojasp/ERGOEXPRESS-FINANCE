/**
 * ERGOEXPRESS CRM — Módulo de Gestión de Cuentas (Premium Edition)
 */

const Accounts = (() => {
  let _users = [];
  let _isSaving = false;
  let _searchTerm = '';

  async function render(container) {
    if (typeof App !== 'undefined' && !App.isAdmin()) {
      Utils.showToast('Acceso denegado: Se requiere perfil administrador', 'error');
      App.navigate('/dashboard');
      return;
    }

    try {
      container.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h1 class="page-title">Gestión de <span>Cuentas</span></h1>
            <p class="page-subtitle">Control administrativo de accesos y perfiles del equipo</p>
          </div>
          <div class="page-actions">
            <button class="header-btn header-btn-wide" onclick="Accounts.runMaintenance()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Reparar Sistema
            </button>
            <button class="btn btn-primary" onclick="Accounts.showAddModal()" style="height:44px; padding:0 24px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="margin-right:8px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
              Nuevo Usuario
            </button>
          </div>
        </div>

        <div class="card fade-in" style="margin-bottom:24px;">
          <div style="padding:16px;">
            <div style="position:relative; width:100%; max-width:500px;">
              <input type="text" id="account-search" class="form-input" placeholder="Filtrar por nombre o correo..." 
                     oninput="Accounts.handleSearch(this.value)" style="padding-left:42px; height:48px;">
              <div style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div class="card fade-in">
          <div class="table-wrapper" style="width:100%; overflow-x:auto;">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="padding:16px;">Colaborador</th>
                  <th>Credenciales</th>
                  <th>Nivel de Acceso</th>
                  <th>Estado</th>
                  <th style="text-align:right; padding-right:16px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="accounts-list">
                <tr><td colspan="5" style="padding:100px 20px; text-align:center;">
                  <div class="spinner" style="margin:0 auto 20px;"></div>
                  <div style="color:var(--text-secondary); font-weight:600;">Sincronizando perfiles de seguridad...</div>
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      loadUsers();
    } catch (e) {
      console.error('[Accounts] Error:', e);
    }
  }

  async function loadUsers() {
    const list = document.getElementById('accounts-list');
    try {
      const res = await Sheets.readSheet(CONFIG.SHEETS.USERS);
      _users = res || [];
      _renderList();
    } catch (e) {
      console.error('[Accounts] Load error:', e);
      if (list) {
        list.innerHTML = `<tr><td colspan="5" style="padding:60px; text-align:center; color:var(--error);">
          <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
          <strong>Error de conexión</strong><br>
          No se pudo sincronizar la base de usuarios. Reintente en unos momentos.
        </td></tr>`;
      }
      Utils.showToast('Error al conectar con el servidor', 'error');
    }
  }

  function handleSearch(val) {
    _searchTerm = val.toLowerCase().trim();
    _renderList();
  }

  function _renderList() {
    const list = document.getElementById('accounts-list');
    if (!list) return;

    const filtered = _users.filter(u => {
      const name = String(u.Nombre || '').toLowerCase();
      const email = String(u.Email || '').toLowerCase();
      return name.includes(_searchTerm) || email.includes(_searchTerm);
    });

    if (filtered.length === 0) {
      list.innerHTML = `<tr><td colspan="5" style="padding:60px; text-align:center; color:var(--text-muted);">
        ${_searchTerm ? 'No se encontraron usuarios para esta búsqueda' : 'No hay usuarios registrados'}
      </td></tr>`;
      return;
    }

    list.innerHTML = filtered.map(u => {
      const isActive = String(u.Activo || '').toUpperCase() === 'SI';
      const role = String(u.Rol || 'vendedor').toLowerCase();
      const isAdmin = role === 'admin';
      
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="avatar-sm" style="background:var(--bg-tertiary); color:var(--primary); width:38px; height:38px; font-weight:700; font-size:14px;">
                ${Utils.initials(u.Nombre)}
              </div>
              <div>
                <div style="font-weight:700; color:white;">${u.Nombre || 'Sin Nombre'}</div>
                <div style="font-size:11px; color:var(--text-muted);">ID: ${u.ID || '<span style="color:#ef4444">FALTANTE</span>'}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <div style="font-size:13px; color:var(--text-secondary); font-family:monospace;">${u.Email}</div>
              <div style="font-size:11px; color:var(--text-muted);">Registrado: ${u['Fecha Registro'] || '—'}</div>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${isAdmin ? 'badge-primary' : 'badge-secondary'}" style="min-width:70px; text-align:center;">
                ${isAdmin ? 'ADMIN' : 'VENDEDOR'}
              </span>
              <button class="btn-icon-sm" onclick="Accounts.toggleRole('${u.ID}', '${u.Rol}', ${u._rowIndex})" title="Cambiar Rol">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5 5v-5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5-5v5h-5"/>
                </svg>
              </button>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="status-indicator ${isActive ? 'status-active' : 'status-inactive'}"></span>
                <span style="font-size:13px; font-weight:600; color:${isActive ? 'var(--success)' : 'var(--text-muted)'};">
                  ${isActive ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <button class="btn-icon-sm" onclick="Accounts.toggleStatus('${u.ID}', '${u.Activo}', ${u._rowIndex})" title="${isActive ? 'Desactivar' : 'Activar'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </td>
          <td style="text-align:right;">
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button class="btn-icon" onclick="Accounts.editUser('${u.ID}')" title="Editar Perfil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon" style="color:#ef4444;" onclick="Accounts.deleteAccount('${u.ID}', '${u.Email}', ${u._rowIndex})" title="Eliminar Permanente">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function toggleStatus(id, currentStatus, rowIndex) {
    if (_isSaving) return;
    const newStatus = String(currentStatus).toUpperCase() === 'SI' ? 'NO' : 'SI';
    try {
      _isSaving = true;
      Utils.showToast('Actualizando estado...', 'info');
      await Sheets.updateRow(CONFIG.SHEETS.USERS, rowIndex, { Activo: newStatus, ID: id });
      Utils.showToast(`Usuario ${newStatus === 'SI' ? 'Activado' : 'Desactivado'}`, 'success');
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al actualizar el estado', 'error');
    } finally { _isSaving = false; }
  }

  async function toggleRole(id, currentRole, rowIndex) {
    if (_isSaving) return;
    const newRole = String(currentRole).toLowerCase() === 'admin' ? 'vendedor' : 'admin';
    try {
      _isSaving = true;
      await Sheets.updateRow(CONFIG.SHEETS.USERS, rowIndex, { Rol: newRole, ID: id });
      Utils.showToast(`Rol cambiado a ${newRole}`, 'success');
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al cambiar el rol', 'error');
    } finally { _isSaving = false; }
  }

  async function deleteAccount(id, email, rowIndex) {
    if (email === App.getCurrentUserEmail()) {
      Utils.showToast('No puedes eliminar tu propia cuenta administrativa', 'warning');
      return;
    }

    const confirm1 = confirm(`¿Estás SEGURO de eliminar definitivamente la cuenta de ${email}?`);
    if (!confirm1) return;
    
    const confirm2 = confirm(`⚠️ ACCIÓN IRREVERSIBLE: Se perderá el acceso para este usuario. ¿Confirmar eliminación final?`);
    if (!confirm2) return;

    try {
      _isSaving = true;
      await Sheets.deleteRow(CONFIG.SHEETS.USERS, rowIndex);
      Utils.showToast('Cuenta eliminada del sistema', 'success');
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al eliminar la cuenta', 'error');
    } finally { _isSaving = false; }
  }

  async function runMaintenance() {
    try {
      Utils.showToast('Ejecutando mantenimiento de base de datos...', 'info');
      const res = await API.call('RUN_MAINTENANCE', {});
      if (res.success) {
        Utils.showToast('Mantenimiento completado: IDs y estados reparados', 'success');
        loadUsers();
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      Utils.showToast('Error en mantenimiento: ' + e.message, 'error');
    }
  }

  function editUser(id) {
    const u = _users.find(x => x.ID === id);
    if (!u) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay fade-in';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:550px; padding:0; overflow:hidden; border-radius:20px; border:1px solid var(--border); background: var(--bg-modal);">
        <div style="background:rgba(255,255,255,0.03); padding:28px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0; color:white; font-size:1.4rem; font-weight:800; letter-spacing:-0.5px;">Editar Colaborador</h3>
            <p style="margin:4px 0 0; font-size:13px; color:var(--text-muted);">Actualice la información de perfil del usuario</p>
          </div>
          <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()" style="background:rgba(255,255,255,0.05);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div style="padding:32px;">
          <div style="display:grid; grid-template-columns: 1fr; gap:24px;">
            <div class="form-group">
              <label class="form-label" style="font-weight:700; color:white; margin-bottom:10px; display:block; font-size:14px;">Nombre del Colaborador</label>
              <input type="text" id="edit-acc-name" class="form-input" value="${u.Nombre || ''}" style="height:52px; font-size:16px; background:rgba(255,255,255,0.02);">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-weight:700; color:white; margin-bottom:10px; display:block; font-size:14px;">Correo Electrónico</label>
              <input type="email" id="edit-acc-email" class="form-input" value="${u.Email || ''}" style="height:52px; font-size:16px; background:rgba(255,255,255,0.02);">
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:16px; margin-top:40px; padding-top:20px; border-top:1px solid var(--border);">
            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()" style="height:48px; min-width:120px;">Cancelar</button>
            <button class="btn btn-primary" onclick="Accounts.saveAccountEdit('${u.ID}', ${u._rowIndex})" style="height:48px; min-width:160px; font-weight:800; box-shadow: 0 4px 15px var(--primary-dim);">Guardar Cambios</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function saveAccountEdit(id, rowIndex) {
    const name = document.getElementById('edit-acc-name').value;
    const email = document.getElementById('edit-acc-email').value;

    try {
      Utils.showToast('Guardando cambios...', 'info');
      await Sheets.updateRow(CONFIG.SHEETS.USERS, rowIndex, { Nombre: name, Email: email, ID: id });
      Utils.showToast('Perfil actualizado correctamente', 'success');
      document.querySelector('.modal-overlay').remove();
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al guardar cambios', 'error');
    }
  }

  function showAddModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay fade-in';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:650px; padding:0; overflow:hidden; border-radius:24px; border:1px solid rgba(255,255,255,0.1); background: var(--bg-modal); box-shadow: 0 30px 60px rgba(0,0,0,0.6);">
        <div style="background:rgba(255,255,255,0.02); padding:32px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0; color:white; font-size:1.6rem; font-weight:800; letter-spacing:-0.5px;">Nuevo Colaborador</h3>
            <p style="margin:6px 0 0; font-size:14px; color:var(--text-muted);">Configure los accesos para un nuevo miembro del equipo</p>
          </div>
          <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()" style="background:rgba(255,255,255,0.05); border-radius:12px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form id="new-user-form" onsubmit="Accounts.registerUser(event)" style="padding:40px;">
          <div style="display:flex; flex-direction:column; gap:32px;">
            <div class="form-group">
              <label class="form-label" style="font-weight:700; color:white; margin-bottom:12px; display:block; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Nombre Completo del Usuario</label>
              <input type="text" name="Nombre" class="form-input" placeholder="Ej: Francisco Rojas" required style="height:56px; font-size:16px; background:rgba(255,255,255,0.03);">
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
              <div class="form-group">
                <label class="form-label" style="font-weight:700; color:white; margin-bottom:12px; display:block; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Correo Electrónico</label>
                <input type="email" name="Email" class="form-input" placeholder="email@ergoexpress.com" required style="height:56px; font-size:16px; background:rgba(255,255,255,0.03);">
              </div>
              
              <div class="form-group">
                <label class="form-label" style="font-weight:700; color:white; margin-bottom:12px; display:block; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Rol en el Sistema</label>
                <select name="Rol" class="form-select" style="height:56px; font-size:16px; background:rgba(255,255,255,0.03); color:white;">
                  <option value="vendedor" style="background:#0a0f25;">Vendedor Elite</option>
                  <option value="admin" style="background:#0a0f25;">Administrador Maestro</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" style="font-weight:700; color:white; margin-bottom:12px; display:block; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Establecer Contraseña de Acceso</label>
              <input type="password" name="Password" class="form-input" placeholder="••••••••" required style="height:56px; font-size:16px; background:rgba(255,255,255,0.03);">
              <div style="margin-top:12px; display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--warning);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style="font-size:12px; color:var(--text-muted); font-weight:500;">La contraseña será encriptada automáticamente de forma segura.</span>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:16px; margin-top:40px; padding-top:24px; border-top:1px solid var(--border);">
            <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()" style="height:52px; min-width:140px; font-weight:600;">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="height:52px; min-width:200px; font-weight:800; font-size:16px; box-shadow: 0 10px 20px var(--primary-dim);">Finalizar Registro</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function registerUser(e) {
    e.preventDefault();
    if (_isSaving) return;
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.ID = Utils.generateId();
    data.Activo = 'SI';
    data['Fecha Registro'] = Utils.todayISO();

    try {
      _isSaving = true;
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creando...';
      await Sheets.appendRow(CONFIG.SHEETS.USERS, data);
      Utils.showToast('Usuario creado con éxito', 'success');
      document.querySelector('.modal-overlay').remove();
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al registrar cuenta', 'error');
    } finally { _isSaving = false; }
  }

  return {
    render, loadUsers, handleSearch,
    toggleStatus, toggleRole, deleteAccount, runMaintenance,
    editUser, saveAccountEdit, showAddModal, registerUser
  };
})();

window.Accounts = Accounts;
