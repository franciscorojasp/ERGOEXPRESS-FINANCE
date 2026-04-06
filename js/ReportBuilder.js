/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Generador de Reportes PDF
   Motor unificado para exportación de datos en formato profesional
   ════════════════════════════════════════════════════════════════════════════ */

const ReportBuilder = (() => {

  /**
   * Genera un reporte PDF con la estética corporativa Elite 8.0 (IDEM Cotización)
   * @param {Object} options - { title, filename, contentHTML, orientation }
   */
  async function generateEliteReport(options = {}) {
    const {
      title = 'REPORTE CORPORATIVO',
      filename = `Reporte-${Utils.todayISO()}.pdf`,
      contentHTML = '',
      orientation = 'p'
    } = options;

    try {
      Utils.showToast('Preparando reporte...', 'info');
      
      // Obtener configuración global para el encabezado
      const config = await Sheets.getAllConfig();
      const logoUrl = config['empresa_logo_url'] || 'assets/logo.png';
      const empresa = config['empresa_nombre'] || 'ERGOEXPRESS, C.A.';
      const rif = config['empresa_rif'] || 'J-50251246-2';
      const dir = config['empresa_direccion'] || 'Venezuela';
      const tel = config['empresa_telefono1'] || '';
      const email = config['empresa_email1'] || 'ergoexpressca@gmail.com';
      const colorPrimary = '#0d7377';
      const colorText = '#1e293b';
      const colorMuted = '#64748b';
      const colorBorder = '#e2e8f0';

      // Crear el DOM para el reporte (Estilo Elite 8.0)
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-10000px';
      wrapper.style.top = '0';
      wrapper.innerHTML = `
        <div id="elite-report-root" style="width:215.9mm; background:#ffffff; font-family:'Inter', sans-serif; color:${colorText};">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <div style="padding:10mm 12mm; min-height:270mm; display:flex; flex-direction:column; box-sizing:border-box;">
            
            <!-- CABECERA ELITE -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6mm;">
              <img src="${logoUrl}" style="height:22mm; width:22mm; object-fit:contain;" />
              <div style="text-align:right; flex:1;">
                 <h2 style="margin:0; font-size:20px; font-weight:900; color:${colorText}; letter-spacing:-0.5px;">${empresa}</h2>
                 <div style="font-size:11px; color:${colorPrimary}; font-weight:800; margin-top:2px;">RIF: ${rif}</div>
                 <p style="font-size:9px; color:${colorMuted}; margin-top:4px; line-height:1.4; font-weight:500;">
                   ${dir}<br/>
                   Tel: ${tel} | ${email}
                 </p>
              </div>
            </div>

            <div style="width:100%; height:1px; background:${colorBorder}; margin-bottom:8mm;"></div>

            <!-- TÍTULO DEL REPORTE -->
            <div style="margin-bottom:8mm; text-align:center;">
               <h1 style="margin:0; font-size:22px; font-weight:900; color:${colorText}; text-transform:uppercase; letter-spacing:1px; border-bottom:3px solid ${colorPrimary}; display:inline-block; padding-bottom:4px;">
                 ${title}
               </h1>
               <div style="margin-top:6px; font-size:10px; color:${colorMuted}; font-weight:700; text-transform:uppercase;">
                 Emitido el ${Utils.formatDateLong(new Date().toISOString())}
               </div>
            </div>

            <!-- CONTENIDO PERSONALIZADO -->
            <div style="flex:1;">
               ${contentHTML}
            </div>

            <!-- PIE DE REPORTE -->
            <div style="margin-top:10mm; padding-top:4mm; border-top:1px solid ${colorBorder}; display:flex; justify-content:space-between; align-items:center;">
               <div style="font-size:9px; color:${colorMuted}; font-weight:600;">ERGOEXPRESS CRM — v1.0</div>
               <div style="font-size:9px; color:${colorMuted}; font-weight:600;">Página 1 de 1</div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(wrapper);

      // Generar PDF desde el wrapper
      const el = document.getElementById('elite-report-root');
      const { jsPDF } = window.jspdf;
      
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
      
      document.body.removeChild(wrapper);
      Utils.showToast('Reporte generado exitosamente', 'success');
    } catch (e) {
      console.error('[ReportBuilder] Error:', e);
      Utils.showToast('Error al generar Reporte Especial: ' + e.message, 'error');
    }
  }

  /**
   * Genera un reporte PDF simple desde un elemento del DOM
   * @param {HTMLElement} el - Elemento a capturar
   * @param {Object} options - { title, filename }
   */
  async function generateFromElement(el, options = {}) {
    const { title = 'REPORTE', filename = 'reporte.pdf' } = options;
    try {
      Utils.showToast('Procesando elemento...', 'info');
      // Capturamos el contenido actual del elemento
      const contentHTML = el.innerHTML;
      await generateEliteReport({ title, filename, contentHTML });
    } catch (e) {
      console.error('[ReportBuilder] Error capturando elemento:', e);
      Utils.showToast('Error al capturar contenido', 'error');
    }
  }

  return {
    generateFromElement,
    generateEliteReport
  };
})();
