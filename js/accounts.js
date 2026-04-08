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
        <div class="module-header fade-in">
          <div>
            <h1 class="module-title">Gestión de Cuentas</h1>
            <p class="module-subtitle">Control centralizado de accesos y perfiles del equipo</p>
          </div>
          <div class="module-actions" style="gap:12px;">
            <button class="btn btn-outline" onclick="Accounts.runMaintenance()" title="Reparar IDs y normalizar estados">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              <span>Reparar Sistema</span>
            </button>
            <button class="btn btn-primary" onclick="Accounts.showAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
              Nuevo Usuario
            </button>
          </div>
        </div>

        <div class="card fade-in" style="margin-bottom:20px; padding:16px;">
          <div style="position:relative;">
            <input type="text" id="account-search" class="form-control" placeholder="Buscar por nombre o email..." 
                   oninput="Accounts.handleSearch(this.value)" style="padding-left:40px; height:48px; border-radius:10px;">
            <div style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--text-muted);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="card fade-in">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Información de Contacto</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style="text-align:right">Acciones</th>
                </tr>
              </thead>
              <tbody id="accounts-list">
                <tr><td colspan="5" style="padding:60px; text-align:center;">
                  <div class="spinner" style="margin:0 auto 15px;"></div>
                  Sincronizando equipo...
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
    try {
      const res = await Sheets.readSheet(CONFIG.SHEETS.USERS);
      _users = res || [];
      _renderList();
    } catch (e) {
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
      <div class="modal-content" style="max-width:400px;">
        <h3 style="margin-bottom:24px; color:white;">Editar Perfil</h3>
        <div class="form-group">
          <label class="form-label">Nombre del Colaborador</label>
          <input type="text" id="edit-acc-name" class="form-control" value="${u.Nombre || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Correo Electrónico</label>
          <input type="email" id="edit-acc-email" class="form-control" value="${u.Email || ''}">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:32px;">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
          <button class="btn btn-primary" onclick="Accounts.saveAccountEdit('${u.ID}', ${u._rowIndex})">Actualizar Datos</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function saveAccountEdit(id, rowIndex) {
    const name = document.getElementById('edit-acc-name').value;
    const email = document.getElementById('edit-acc-email').value;

    try {
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
      <div class="modal-content" style="max-width:450px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <h3 style="margin:0; color:white;">Nuevo Colaborador</h3>
          <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form id="new-user-form" onsubmit="Accounts.registerUser(event)">
          <div class="form-group">
            <label class="form-label">Nombre Completo</label>
            <input type="text" name="Nombre" class="form-control" placeholder="Ej: Francisco Rojas" required>
          </div>
          <div class="form-group">
            <label class="form-label">Correo Corporativo</label>
            <input type="email" name="Email" class="form-control" placeholder="email@ergoexpress.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Rol del Sistema</label>
            <select name="Rol" class="form-control">
              <option value="vendedor">Vendedor Elite</option>
              <option value="admin">Administrador Maestro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña de Acceso</label>
            <input type="password" name="Password" class="form-control" placeholder="Mínimo 6 caracteres" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:32px;">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Descartar</button>
            <button type="submit" class="btn btn-primary">Crear Cuenta</button>
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
