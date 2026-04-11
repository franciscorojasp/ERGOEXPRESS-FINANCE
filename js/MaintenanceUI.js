/**
 * ERGOEXPRESS-FINANCE — Mantenimiento Pro & Carga Masiva (UI)
 * 
 * Modulo exclusivo para SuperAdministradores y Dueño.
 * Permite el control total del ciclo de vida de los datos y la ingesta masiva.
 */

const MaintenanceUI = (() => {

  function render(container) {
    container.innerHTML = `
      <div class="maintenance-container fade-in">
        <header class="view-header">
          <div class="header-main">
            <h2 class="view-title">Mantenimiento Pro & Sistema</h2>
            <p class="view-subtitle">Control de integridad, respaldos y cargas masivas industriales.</p>
          </div>
        </header>

        <div class="maintenance-grid">
          <!-- CARD: RESPALDOS -->
          <div class="card card-padded maintenance-card">
            <div class="maint-icon-box bg-primary-soft">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <h3>Respaldos Totales</h3>
            <p>Genera una instantánea JSON de toda la base de datos. Se guardará en Google Drive y podrás descargar una copia local.</p>
            <div class="card-actions-full">
              <button class="btn btn-primary" onclick="MaintenanceUI.handleBackup()">
                GENERAR RESPALDO AHORA
              </button>
            </div>
          </div>

          <!-- CARD: RESET -->
          <div class="card card-padded maintenance-card danger-zone">
            <div class="maint-icon-box bg-danger-soft">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3>Reinicio de Fábrica</h3>
            <p>Limpia todas las transacciones (Finanzas, Nómina, Cotizaciones) conservando los usuarios y la estructura. <b>Acción irreversible.</b></p>
            <div class="card-actions-full">
              <button class="btn btn-danger" onclick="MaintenanceUI.confirmHardReset()">
                HARD RESET (REINICIO TOTAL)
              </button>
            </div>
          </div>

          <!-- CARD: CARGA MASIVA -->
          <div class="card card-padded maintenance-card bulk-card">
            <div class="maint-icon-box bg-warning-soft">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <h3>Bulk Loading Wizard</h3>
            <p>Importa cientos de registros en segundos usando nuestras plantillas estandarizadas de Microsoft Excel (.xlsx).</p>
            
            <div class="bulk-actions">
              <select id="bulk-type-select" class="form-control">
                <option value="CONTACTOS">Módulo: Contactos / Prospectos</option>
                <option value="PRODUCTOS">Módulo: Catálogo de Productos</option>
              </select>
              
              <div class="bulk-btns">
                <button class="btn btn-outline" onclick="MaintenanceUI.downloadTemplate()">
                  DESCARGAR PLANTILLA
                </button>
                <button class="btn btn-warning" onclick="MaintenanceUI.triggerUpload()">
                  SUBIR Y CARGAR DATA
                </button>
                <input type="file" id="bulk-file-input" accept=".xlsx" style="display:none" onchange="MaintenanceUI.handleFileUpload(event)">
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .maintenance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        .maintenance-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.2s;
        }
        .maintenance-card:hover { transform: translateY(-4px); }
        .maint-icon-box {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .maint-icon-box svg { width: 32px; height: 32px; }
        .maintenance-card h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 12px; }
        .maintenance-card p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 24px; }
        .card-actions-full { width: 100%; margin-top: auto; }
        .card-actions-full .btn { width: 100%; height: 48px; font-weight: 700; }
        .danger-zone { border: 1px dashed rgba(239, 68, 68, 0.3); }
        .bg-primary-soft { background: rgba(14, 165, 233, 0.1); color: var(--primary); }
        .bg-danger-soft { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .bg-warning-soft { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
        
        .bulk-actions { width: 100%; margin-top: auto; border-top: 1px solid var(--border); padding-top: 20px; }
        .bulk-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .bulk-btns .btn { font-size: 13px; font-weight: 700; height: 44px; }
      </style>
    `;
  }

  // ─── LÓGICA DE RESPALDO ──────────────────────────────────────────────────
  async function handleBackup() {
    try {
      Utils.showToast('Generando respaldo en la nube...', 'info');
      const res = await API.call('GENERATE_BACKUP');
      
      if (res.success) {
        Utils.showToast('¡Respaldo guardado en Google Drive!', 'success');
        
        // Descarga Local
        const blob = new Blob([JSON.stringify(res.raw_data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        Utils.showModal({
          title: "🔑 Respaldo Exitoso",
          message: `El archivo ha sido guardado en tu Drive (Directorio: ERGOEXPRESS_BACKUPS) y descargado localmente.<br><br><b>Archivo:</b> ${res.file_name}`,
          type: "success"
        });
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      Utils.showToast('Error al generar respaldo: ' + e.message, 'error');
    }
  }

  // ─── LÓGICA DE RESET ─────────────────────────────────────────────────────
  async function confirmHardReset() {
    const confirmation = await Utils.confirm({
      title: "🚨 ¡ALERTA DE SEGURIDAD CRÍTICA!",
      message: "¿Estás COMPLETAMENTE seguro de reiniciar el sistema? Se borrarán todas las transacciones, nóminas, facturas y contactos. Los usuarios se conservarán.",
      confirmText: "SÍ, REINICIAR TODO",
      cancelText: "CANCELAR",
      type: "danger"
    });

    if (confirmation) {
      // Segunda confirmación (Protocolo de Seguridad)
      const keyword = prompt("Por seguridad, escriba 'CONFIRMAR RESET' para proceder:");
      if (keyword !== 'CONFIRMAR RESET') {
        Utils.showToast('Operación cancelada por falta de coincidencia.', 'info');
        return;
      }

      try {
        Utils.showLoading('Ejecutando reinicio total...');
        const res = await API.call('HARD_RESET');
        Utils.hideLoading();
        
        if (res.success) {
          Utils.showModal({
            title: "☣️ Sistema Reiniciado",
            message: res.message + " La aplicación se reiniciará para limpiar el caché.",
            type: "success",
            onClose: () => window.location.reload()
          });
        }
      } catch (e) {
        Utils.hideLoading();
        Utils.showToast('Falla crítica en el reset: ' + e.message, 'error');
      }
    }
  }

  // ─── LÓGICA DE CARGA MASIVA ──────────────────────────────────────────────
  function downloadTemplate() {
    const type = document.getElementById('bulk-type-select').value;
    const headers = type === 'CONTACTOS' 
      ? ['Nombre / Empresa', 'RIF / Cédula', 'Email', 'Teléfono', 'Persona de Contacto', 'Cargo', 'Ciudad']
      : ['Categoría', 'Código', 'Nombre del Producto / Servicio', 'Descripción Detallada', 'Precio USD', 'Stock Inicial'];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('CARGA_MASIVA');
    
    // Header Style
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0EA5E9' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    });

    // Auto-width
    sheet.columns.forEach(column => {
      column.width = 25;
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plantilla_Carga_${type}.xlsx`;
      a.click();
    });
  }

  function triggerUpload() {
    document.getElementById('bulk-file-input').click();
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const type = document.getElementById('bulk-type-select').value;
    const workbook = new ExcelJS.Workbook();
    
    try {
      Utils.showLoading('Procesando archivo...');
      await workbook.xlsx.load(file);
      const sheet = workbook.getWorksheet(1);
      
      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const values = row.values.slice(1);
        if (values.length > 0) rows.push(values);
      });

      if (rows.length === 0) throw new Error('El archivo está vacío.');

      // Validar y Transformar según el tipo
      if (type === 'CONTACTOS') {
        const payload = rows.map(r => ({
          ID: Utils.generateId(),
          Nombre: r[0],
          'RIF_Cedula': r[1],
          Email: r[2],
          Telefono: r[3],
          'Persona_Contacto': r[4],
          Cargo: r[5],
          Ciudad: r[6],
          'Fecha_Registro': Utils.todayISO()
        }));
        await API.call('BATCH_APPEND', { sheet: 'Contactos', rows: payload });
      } else {
        const payload = rows.map(r => ({
          ID: Utils.generateId(),
          Categoria: r[0],
          Codigo: r[1],
          Nombre: r[2],
          Descripcion: r[3],
          Precio_USD: parseFloat(r[4] || 0),
          Stock: parseFloat(r[5] || 0)
        }));
        await API.call('BATCH_APPEND', { sheet: 'Productos', rows: payload });
      }

      Utils.hideLoading();
      Utils.showToast(`¡Carga exitosa de ${rows.length} registros!`, 'success');
      event.target.value = ''; // Reset input
    } catch (e) {
      Utils.hideLoading();
      Utils.showToast('Error en la carga: ' + e.message, 'error');
    }
  }

  return { render, handleBackup, confirmHardReset, downloadTemplate, triggerUpload, handleFileUpload };

})();
