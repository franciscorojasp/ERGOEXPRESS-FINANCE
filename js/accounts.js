/**
 * ERGOEXPRESS CRM — Módulo de Gestión de Cuentas (Admin Only)
 */

const Accounts = (() => {
  let _users = [];
  let _isSaving = false;

  async function render(container) {
    if (typeof App !== 'undefined' && !App.isAdmin()) {
      Utils.showToast('Acceso denegado: Se requiere perfil administrador', 'error');
      App.navigate('/dashboard');
      return;
    }

    try {
      container.innerHTML = `
        <div class="module-header">
          <div>
            <h1 class="module-title">Gestión de Cuentas</h1>
            <p class="module-subtitle">Administra los accesos y roles del equipo</p>
          </div>
          <div class="module-actions">
            <button class="btn btn-primary" onclick="window.Accounts.showAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
              Nuevo Usuario
            </button>
          </div>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="data-table" id="accounts-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th style="text-align:right">Acciones</th>
                </tr>
              </thead>
              <tbody id="accounts-list">
                <tr><td colspan="6" style="padding:40px; text-align:center; color:var(--text-secondary);">
                  <div class="spinner" style="margin: 0 auto 10px;"></div>
                  Cargando equipo...
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      loadUsers();
    } catch (e) {
      console.error('[Accounts] Error en render:', e);
      if (container) {
        container.innerHTML = `<div class="alert alert-error">Error crítico al cargar el módulo: ${e.message}</div>`;
      }
    }
  }

  async function loadUsers() {
    try {
      const res = await Sheets.readSheet(CONFIG.SHEETS.USERS);
      _users = res || [];
      _renderList();
    } catch (e) {
      Utils.showToast('Error al cargar usuarios', 'error');
    }
  }

  function _renderList() {
    const list = document.getElementById('accounts-list');
    if (!list) return;

    if (_users.length === 0) {
      list.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center;">No hay usuarios registrados</td></tr>';
      return;
    }

    list.innerHTML = _users.map(u => {
      const isAdminFlag = u.Rol === 'admin';
      const isActive = u.Activo === 'SI';
      
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="avatar-sm" style="background:var(--bg-tertiary); color:var(--text-primary); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:12px;">
                ${Utils.initials(u.Nombre)}
              </div>
              <span style="font-weight:500;">${u.Nombre}</span>
            </div>
          </td>
          <td><code style="font-size:12px; opacity:0.8;">${u.Email}</code></td>
          <td>
            <span class="badge ${isAdminFlag ? 'badge-primary' : 'badge-secondary'}" style="text-transform:uppercase; font-size:10px;">
              ${u.Rol}
            </span>
          </td>
          <td>
            <span class="status-indicator ${isActive ? 'status-active' : 'status-inactive'}"></span>
            <span style="font-size:13px;">${isActive ? 'Activo' : 'Inactivo'}</span>
          </td>
          <td style="font-size:12px; opacity:0.7;">${u['Fecha Registro'] || '—'}</td>
          <td style="text-align:right;">
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button class="btn-icon" onclick="Accounts.toggleStatus('${u.ID}', '${u.Activo}', ${u._rowIndex})" title="${isActive ? 'Desactivar' : 'Activar'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  ${isActive ? '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>' : '<path d="M5 12h14M12 5v14"/>'}
                </svg>
              </button>
              <button class="btn-icon" onclick="Accounts.editUser('${u.ID}')" title="Editar Rol">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
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
    const newStatus = currentStatus === 'SI' ? 'NO' : 'SI';
    const actionText = newStatus === 'SI' ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro de que desea ${actionText} este usuario?`)) return;

    try {
      _isSaving = true;
      await Sheets.updateRow(CONFIG.SHEETS.USERS, rowIndex, { Activo: newStatus, ID: id });
      Utils.showToast(`Usuario ${newStatus === 'SI' ? 'activado' : 'desactivado'}`, 'success');
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al actualizar estado', 'error');
    } finally {
      _isSaving = false;
    }
  }

  function editUser(id) {
    const u = _users.find(x => x.ID === id);
    if (!u) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px;">
        <h3 style="margin-bottom:20px;">Editar Usuario</h3>
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input type="text" class="form-control" value="${u.Nombre}" readonly disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="text" class="form-control" value="${u.Email}" readonly disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Rol del Usuario</label>
          <select id="edit-user-rol" class="form-control">
            <option value="vendedor" ${u.Rol === 'vendedor' ? 'selected' : ''}>Vendedor</option>
            <option value="admin" ${u.Rol === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="Accounts.saveEdit('${u.ID}', ${u._rowIndex})">Guardar Cambios</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function saveEdit(id, rowIndex) {
    const rol = document.getElementById('edit-user-rol').value;
    
    try {
      await Sheets.updateRow(CONFIG.SHEETS.USERS, rowIndex, { Rol: rol, ID: id });
      Utils.showToast('Usuario actualizado', 'success');
      document.querySelector('.modal-overlay').remove();
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al actualizar rol', 'error');
    }
  }

  function showAddModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:450px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <h3 style="margin:0;">Nuevo Usuario</h3>
          <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form id="new-user-form" onsubmit="Accounts.registerUser(event)">
          <div class="form-group">
            <label class="form-label">Nombre Completo</label>
            <input type="text" name="Nombre" class="form-control" placeholder="Ej: Juan Pérez" required>
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" name="Email" class="form-control" placeholder="ejemplo@correo.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Rol Inicial</label>
            <select name="Rol" class="form-control">
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input type="password" name="Password" class="form-control" placeholder="Contraseña temporal" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Registrar Usuario</button>
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
    
    // Add missing fields
    data.ID = Utils.generateId();
    data.Activo = 'SI';
    data['Fecha Registro'] = Utils.todayISO();

    try {
      _isSaving = true;
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Registrando...';

      await Sheets.appendRow(CONFIG.SHEETS.USERS, data);
      Utils.showToast('Usuario registrado exitosamente', 'success');
      document.querySelector('.modal-overlay').remove();
      loadUsers();
    } catch (e) {
      Utils.showToast('Error al registrar usuario', 'error');
    } finally {
      _isSaving = false;
    }
  }

  return {
    render,
    loadUsers,
    toggleStatus,
    editUser,
    saveEdit,
    showAddModal,
    registerUser
  };
})();

// Exportar globalmente para eventos HTML onclick
window.Accounts = Accounts;
