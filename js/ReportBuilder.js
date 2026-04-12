/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Generador de Reportes PDF (v6.0.4 - Guardado Nativo y Seguro)
   Se soluciona el problema de los UUID implementando window.showSaveFilePicker 
   y fallback a DataURI puro para evitar corrupción de extensión a "archivo".
   ════════════════════════════════════════════════════════════════════════════ */

const ReportBuilder = (() => {

  async function generateEliteReport(options = {}) {
    const {
      title = 'REPORTE CORPORATIVO',
      filename = `Reporte-${Utils.todayISO()}.pdf`,
      contentHTML = '',
      orientation = 'portrait'
    } = options;

    try {
      Utils.showToast('Generando reporte PDF optimizado...', 'info');
      
      const config = await Sheets.getAllConfig();
      const logoUrl = config['empresa_logo_url'] || 'assets/logo.png';
      const empresa = config['empresa_nombre'] || 'ERGOEXPRESS, C.A.';
      const rif = config['empresa_rif'] || 'J-50251246-2';
      const dir = config['empresa_direccion'] || 'Venezuela';
      const tel = config['empresa_telefono1'] || '';
      const email = config['empresa_email1'] || 'ergoexpressca@gmail.com';

      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div id="elite-report-root" style="width:100%; max-width:800px; background:#ffffff; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1e293b; padding:40px; box-sizing:border-box;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
            <img src="${logoUrl}" style="height:80px; width:80px; object-fit:contain;" crossorigin="anonymous" />
            <div style="text-align:right; flex:1;">
               <h2 style="margin:0; font-size:24px; font-weight:bold;">${empresa}</h2>
               <div style="font-size:14px; color:#0d7377; font-weight:bold; margin-top:2px;">RIF: ${rif}</div>
               <p style="font-size:12px; color:#64748b; margin-top:6px; line-height:1.4;">
                 ${dir}<br/>
                 Tel: ${tel} | ${email}
               </p>
            </div>
          </div>

          <div style="width:100%; height:1px; background:#e2e8f0; margin-bottom:24px;"></div>

          <div style="margin-bottom:24px; text-align:center;">
             <h1 style="margin:0; font-size:24px; font-weight:bold; text-transform:uppercase; border-bottom:3px solid #0d7377; display:inline-block; padding-bottom:6px;">
               ${title}
             </h1>
             <div style="margin-top:8px; font-size:12px; color:#64748b; font-weight:bold;">
               Emitido el ${Utils.formatDateLong(new Date().toISOString())}
             </div>
          </div>

          <div style="flex:1;">
             ${contentHTML}
          </div>

          <div style="margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between;">
             <div style="font-size:10px; color:#64748b;">ERGOEXPRESS CRM — v6.0.4</div>
             <div style="font-size:10px; color:#64748b;">Documento Digital de Validez Administrativa</div>
          </div>
        </div>
      `;
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      document.body.appendChild(wrapper);

      const el = document.getElementById('elite-report-root');
      
      let safeFilename = String(filename || 'Reporte_ErgoExpress').replace(/[^a-zA-Z0-9_\-\.]/g, '');
      if (!safeFilename.toLowerCase().endsWith('.pdf')) {
         safeFilename += '.pdf';
      }

      const opt = {
        margin:       0,
        filename:     safeFilename,
        image:        { type: 'jpeg', quality: 0.8 }, 
        html2canvas:  { scale: 1.5, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: orientation }
      };

      // Recibimos la representación Base64 limpia
      const pdfBase64Data = await html2pdf().set(opt).from(el).outputPdf('datauristring');
      
      // Intentamos usar FileSystem Access API para forzar caja de "Guardar como"
      let saved = false;
      if (window.showSaveFilePicker) {
        try {
           // Decodificar el base64 a un Blob real para guardarlo
           const res = await fetch(pdfBase64Data);
           const blob = await res.blob();
           
           const handle = await window.showSaveFilePicker({
              suggestedName: safeFilename,
              id: 'ergoexpress_pdf',
              types: [{ description: 'Documento PDF', accept: {'application/pdf': ['.pdf']} }]
           });
           const writable = await handle.createWritable();
           await writable.write(blob);
           await writable.close();
           saved = true;
           Utils.showToast('Reporte guardado con éxito', 'success');
        } catch(e) {
           console.warn('FilePicker cancelado o bloqueado:', e);
           // Si el usuario cancela o da error, seguimos al fallback
        }
      }

      // Fallback para navegadores donde showSaveFilePicker falla o no existe
      if (!saved) {
         const a = document.createElement('a');
         a.style.display = 'none';
         a.href = pdfBase64Data; // Usamos directo el base64 (nunca será un UUID)
         a.download = safeFilename;
         document.body.appendChild(a);
         a.click();
         setTimeout(() => document.body.removeChild(a), 200);
      }

      document.body.removeChild(wrapper);

    } catch (e) {
      console.error('[ReportBuilder] Error:', e);
      Utils.showToast('Error al generar Reporte: ' + e.message, 'error');
    }
  }

  async function generateFromElement(el, options = {}) {
    const { title = 'REPORTE', filename = 'reporte.pdf' } = options;
    await generateEliteReport({ title, filename, contentHTML: el.innerHTML });
  }

  return { generateFromElement, generateEliteReport };
})();
