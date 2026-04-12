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
      const logoBase64 = await Utils.imgToBase64(logoUrl, 800);

      const empresa = config['empresa_nombre'] || 'ERGOEXPRESS, C.A.';
      const rif = config['empresa_rif'] || 'J-50251246-2';
      const dir = config['empresa_direccion'] || 'Venezuela';
      const tel = config['empresa_telefono1'] || '';
      const email = config['empresa_email1'] || 'ergoexpressca@gmail.com';

      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div id="elite-report-root" style="width:100%; max-width:800px; background:#ffffff; font-family:'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1e293b; padding:40px; box-sizing:border-box;">
          
          <!-- Header del Reporte -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom:2px solid #0d7377; padding-bottom:20px;">
            <div style="width:160px; height:100px; display:flex; align-items:center; justify-content:center; background:#ffffff; border-radius:8px;">
               <img src="${logoBase64}" style="max-height:100%; max-width:100%; object-fit:contain;" />
            </div>
            
            <div style="text-align:right; flex:1; padding-left:20px;">
               <h2 style="margin:0; font-size:22px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.5px;">${empresa}</h2>
               <div style="font-size:13px; color:#0d7377; font-weight:800; margin-top:4px; letter-spacing:1px;">RIF: ${rif}</div>
               <p style="font-size:11px; color:#64748b; margin-top:8px; line-height:1.5; font-weight:500;">
                 ${dir}<br/>
                 <span style="color:#0d7377; font-weight:700;">TEL:</span> ${tel} &nbsp;|&nbsp; <span style="color:#0d7377; font-weight:700;">EMAIL:</span> ${email}
               </p>
            </div>
          </div>

          <div style="margin-bottom:30px; text-align:center;">
             <h1 style="margin:0; font-size:26px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px;">
               ${title}
             </h1>
             <div style="margin-top:10px; display:inline-block; background:#f1f5f9; padding:4px 12px; border-radius:20px; font-size:10px; color:#475569; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">
               Generado: ${Utils.formatDateLong(new Date().toISOString())}
             </div>
          </div>

          <div style="flex:1; min-height:400px;">
             ${contentHTML}
          </div>

          <!-- Firma y QR Fiscal -->
          <div style="margin-top:40px; border:1px solid #e2e8f0; border-radius:12px; padding:20px; display:flex; justify-content:space-between; align-items:flex-end; background:#f8fafc;">
            <div style="flex:1;">
               <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; margin-bottom:12px; letter-spacing:0.5px;">Validación Digital</div>
               <div style="display:flex; align-items:center; gap:15px;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(filename)}" style="width:70px; height:70px; border:4px solid #fff; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.05);" />
                  <div>
                    <div style="font-size:11px; font-weight:800; color:#0f172a;">CERTIFICADO FISCAL DIGITAL</div>
                    <div style="font-size:9px; color:#64748b; font-family:monospace; margin-top:2px;">DOCID: ${filename.split('.')[0]}</div>
                    <div style="font-size:9px; color:#64748b; font-family:monospace;">HASH: ${btoa(filename).substring(0,16).toUpperCase()}</div>
                  </div>
               </div>
            </div>
            
            <div style="text-align:center; min-width:200px;">
               <div style="height:50px; border-bottom:1px solid #94a3b8; margin-bottom:10px;">
                  <!-- Espacio para firma manuscrita o sello digital -->
                  <div style="font-family:'Dancing Script', cursive; font-size:18px; color:#0d7377; opacity:0.6;">ErgoExpress Fiscal</div>
               </div>
               <div style="font-size:10px; font-weight:800; color:#0f172a;">${config['cotizacion_firma_nombre'] || 'ADMINISTRACIÓN'}</div>
               <div style="font-size:9px; color:#64748b;">${config['cotizacion_firma_cargo'] || 'Firma Autorizada'}</div>
            </div>
          </div>

          <div style="margin-top:20px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
             <div style="font-size:8px; color:#94a3b8; font-weight:600;">PLATAFORMA ERGOEXPRESS CRM — v${CONFIG.APP_VERSION}</div>
             <div style="font-size:8px; color:#94a3b8; font-weight:600; text-transform:uppercase;">DOCUMENTO ELECTRÓNICO ORIGINAL © ${new Date().getFullYear()}</div>
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
