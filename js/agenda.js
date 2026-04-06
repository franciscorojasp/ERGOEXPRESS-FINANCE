/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo de Agenda Visual
   Calendario Semanal para citas, instalaciones y seguimiento
   ════════════════════════════════════════════════════════════════════════════ */

const Agenda = (() => {
  let _appointments = [];
  let _contacts = [];
  let _viewType = 'global'; // or 'personal'
  let _currentWeekStart = null;
  async function render(container) {
    if (!_currentWeekStart) {
      _currentWeekStart = _getMonday(new Date());
    }

    // Show initial loading
    container.innerHTML = `<div class="loading-spinner" style="margin-top:100px;"><div class="spinner"></div></div>`;
    
    // 1. Data load MUST happen before rendering to avoid empty lists
    await _load();

    // 2. Full render
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header" style="justify-content:space-between;">
          <h1 class="page-title">Agenda</h1>
          <div style="display:flex; gap:12px; align-items:center;">
             <select class="form-select form-select-sm" id="agenda-visibility" onchange="Agenda.setView(this.value)" style="width:140px; background:rgba(255,255,255,0.05);">
                <option value="global">🌎 Agenda Global</option>
                <option value="personal">👤 Mi Agenda</option>
             </select>
             <div class="btn-group">
                <button class="btn btn-sm btn-ghost" onclick="Agenda.prevWeek()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg></button>
                <button class="btn btn-sm btn-ghost" onclick="Agenda.goToday()">Hoy</button>
                <button class="btn btn-sm btn-ghost" onclick="Agenda.nextWeek()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg></button>
             </div>
             <button class="btn btn-primary" onclick="Agenda.openAppointmentForm()">+ Nueva Cita</button>
          </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
           <div class="agenda-container" id="agenda-grid">
              <div class="loading-spinner"><div class="spinner"></div></div>
           </div>
        </div>
      </div>
    `;

    _renderGrid();
  }

  async function _load() {
    const data = await Sheets.batchRead([CONFIG.SHEETS.AGENDA, CONFIG.SHEETS.CONTACTS]);
    _appointments = data[CONFIG.SHEETS.AGENDA] || [];
    let contacts  = data[CONFIG.SHEETS.CONTACTS] || [];

    // Filter contacts based on user role (just like the Contacts module)
    if (!App.isAdmin()) {
      const myEmail = App.getCurrentUserEmail();
      contacts = contacts.filter(c => c['Vendedor Email'] === myEmail);
    }
    _contacts = contacts;
  }

  function _renderGrid() {
    const grid = document.getElementById('agenda-grid');
    if (!grid) return;

    const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const timeSlots = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(_currentWeekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d);
    }

    const todayStr = new Date().toDateString();

    let html = `
      <div class="agenda-grid-header">
        <div class="agenda-time-column"></div>
        ${weekDates.map((date, i) => `
          <div class="agenda-day-header ${date.toDateString() === todayStr ? 'is-today' : ''}">
            <div class="day-name">${days[i]}</div>
            <div class="day-number">${date.getDate()}</div>
          </div>
        `).join('')}
      </div>
      <div class="agenda-grid-body">
        ${timeSlots.map(time => `
          <div class="agenda-row">
            <div class="agenda-time-cell">${time}</div>
            ${weekDates.map((date) => {
              const iso = Utils.toISODate(date);
              const slotHour = parseInt(time.split(':')[0]);
              
              const slotApps = _appointments.filter(a => {
                const aDate = String(a['Fecha'] || '');
                const matchesDate = aDate.includes(iso); // Handles Date ISO strings or simple ISO
                const matchesHour = Utils.getHour(a['Hora']) === slotHour;
                return matchesDate && matchesHour;
              });
              
              const filtered = _viewType === 'personal' 
                 ? slotApps.filter(a => a['Usuario Email'] === App.getCurrentUserEmail()) 
                 : slotApps;

              return `
                <div class="agenda-cell" onclick="Agenda.openAppointmentForm('${iso}', '${time}')">
                   ${filtered.map(a => {
                     const color = _getAppColor(a['Tipo']);
                     return `
                       <div class="agenda-appointment-card" 
                            onclick="event.stopPropagation(); Agenda.viewDetail('${a['ID']}')"
                            style="border-left-color: ${color};">
                          <div class="app-title" style="color:${color}">${Utils.escapeHtml(a['Asunto'])}</div>
                          <div class="app-info">${Utils.escapeHtml(a['ID Cliente'] || 'Particular')}</div>
                          <div class="app-time">
                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                             ${a['Hora']}
                          </div>
                       </div>
                     `;
                   }).join('')}
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;

    grid.innerHTML = html;
  }

  function _getAppColor(type) {
    const colors = {
      'Venta': '#3b82f6',
      'Instalación': '#10b981',
      'Soporte': '#f59e0b',
      'Visita Comercial': '#8b5cf6',
      'Reunión': '#ec4899'
    };
    return colors[type] || '#64748b';
  }

  function _getMonday(d) {
    d = new Date(d);
    const day = d.getDay(),
          diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function prevWeek() {
    _currentWeekStart.setDate(_currentWeekStart.getDate() - 7);
    _renderGrid();
  }
  function nextWeek() {
    _currentWeekStart.setDate(_currentWeekStart.getDate() + 7);
    _renderGrid();
  }
  function goToday() {
    _currentWeekStart = _getMonday(new Date());
    _renderGrid();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  function openAppointmentForm(date = '', time = '') {
    const isoDate = date || Utils.todayISO();
    const startTime = time || '09:00';

    Utils.showModal({
      title: 'Agendar Cita',
      content: `
        <form id="appointment-form">
          <div class="form-grid">
            <div class="form-group full">
              <label class="form-label">Asunto / Motivo <span class="required">*</span></label>
              <input class="form-input" name="Asunto" placeholder="Ej: Visita técnica para presupuesto" required />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-input" name="Fecha" value="${isoDate}" />
            </div>
            <div class="form-group">
              <label class="form-label">Hora</label>
              <input type="time" class="form-input" name="Hora" value="${startTime}" />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Actividad</label>
              <select class="form-select" name="Tipo">
                ${CONFIG.APPOINTMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Cliente / Contacto</label>
              <select class="form-select" name="ID Cliente">
                <option value="">-- No vinculado --</option>
                ${_contacts.map(c => `<option value="${c['Razón Social']}">${c['Razón Social']}</option>`).join('')}
              </select>
            </div>
            <div class="form-group full">
              <label class="form-label">Notas adicionales</label>
              <textarea class="form-textarea" name="Notas" placeholder="Instrucciones adicionales para la visita"></textarea>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Agenda.saveAppointment()">Confirmar Cita</button>
      `
    });
  }

  async function saveAppointment() {
    const data = Utils.getFormData('appointment-form');
    if (!data['Asunto']) {
      Utils.showToast('Introduzca el asunto de la cita', 'warning'); return;
    }

    try {
      Utils.showToast('Agendando...', 'info');
      const entry = {
        'ID': Utils.generateId(),
        ...data,
        'Estado': 'Pendiente',
        'Usuario Email': App.getCurrentUserEmail() || 'staff'
      };
      await Sheets.appendRow(CONFIG.SHEETS.AGENDA, entry);
      
      // Sincronizar con Google Calendar
      try {
        await Sheets.syncToCalendar(entry);
      } catch (calErr) {
        console.error('Error al sincronizar con Calendar:', calErr);
        // No bloqueamos el flujo principal si falla el calendario
      }

      Utils.showToast('Cita agendada correctamente', 'success');
      Utils.closeModal();
      
      // Delay refresh slightly to allow modal to close from DOM and avoid race conditions
      setTimeout(() => {
        App.navigate('/agenda');
      }, 300);
    } catch(e) { 
      Utils.showToast('Error: ' + e.message, 'error'); 
    }
  }

  function viewDetail(id) {
     const a = _appointments.find(x => x['ID'] === id);
     if (!a) return;

     Utils.showModal({
       title: 'Detalle de Cita',
       size: 'sm',
       content: `
         <div style="padding:10px;">
           <div style="font-size:11px; color:var(--primary-light); font-weight:800; text-transform:uppercase; margin-bottom:4px;">${a['Tipo']}</div>
           <h3 style="font-size:20px; font-weight:800; color:#fff; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:12px; margin-bottom:16px;">${a['Asunto']}</h3>
           
           <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
              <div>
                 <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">📅 Fecha</div>
                 <div style="font-weight:700;">${Utils.formatDate(a['Fecha'])}</div>
              </div>
              <div>
                 <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">⌚ Hora</div>
                 <div style="font-weight:700;">${a['Hora']}</div>
              </div>
           </div>

           <div style="margin-bottom:20px;">
              <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">👤 Cliente</div>
              <div style="font-weight:700; color:var(--primary-light);">${a['ID Cliente'] || 'Particular'}</div>
           </div>

           ${a['Notas'] ? `
           <div>
              <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">📝 Notas</div>
              <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; font-size:12px; line-height:1.4;">${Utils.escapeHtml(a['Notas'])}</div>
           </div>
           ` : ''}
         </div>
       `,
       footer: `
         <button class="btn btn-ghost" onclick="Utils.closeModal()">Cerrar</button>
         <button class="btn btn-danger" style="background:var(--error); border:none;" onclick="Agenda.deleteAppointment('${a['ID']}')">Eliminar</button>
       `
     });
  }

  async function deleteAppointment(id) {
    if (!confirm('¿Seguro de cancelar esta cita?')) return;
    try {
      await Sheets.deleteRow(CONFIG.SHEETS.AGENDA, id);
      Utils.showToast('Cita eliminada', 'success');
      Utils.closeModal();
      
      // Delay refresh slightly to allow modal to close from DOM
      setTimeout(() => {
        App.navigate('/agenda');
      }, 300);
    } catch(e) { Utils.showToast('Error: ' + e.message, 'error'); }
  }

  return {
    render, prevWeek, nextWeek, goToday, setView: (v) => { _viewType = v; _renderGrid(); },
    openAppointmentForm, saveAppointment, viewDetail, deleteAppointment
  };
})();
