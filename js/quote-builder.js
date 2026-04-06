/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Elite 8.0: "CORPORATE CLEAN"
   Motor de Generación de PDF Pro: Estética Simétrica, Clara y Pura.
   ════════════════════════════════════════════════════════════════════════════ */

const QuoteBuilder = (() => {

  function buildHTML(quote, client, config) {
    const detail = typeof quote['Detalle JSON'] === 'object' ? quote['Detalle JSON'] : JSON.parse(quote['Detalle JSON'] || '{}');
    const items = Utils.normalizeItems(detail.items);
    const currencyMode = detail.currencyMode || 'usd';
    const rate = Utils.toNumber(detail.rate) || 0;
    
    const totalUSD = Utils.round(items.reduce((sum, it) => sum + (Utils.toNumber(it.qty) * Utils.toNumber(it.price)), 0));
    const totalVES = Utils.round(totalUSD * rate);
    
    const num = String(quote['Número'] || '0').padStart(6,'0');
    const quoteCode = `ERGOX-${num}`;
    
    const empresa = config['empresa_nombre'] || 'ERGOEXPRESS, C.A.';
    const rif = config['empresa_rif'] || 'J-50251246-2';
    const dir = config['empresa_direccion'] || 'Valencia, Carabobo, Venezuela';
    const tel1 = config['empresa_telefono1'] || '';
    const email1 = config['empresa_email1'] || 'ergoexpressca@gmail.com';
    const logoUrl = config['empresa_logo_url'] || 'assets/logo.png';
    const ciudad = config['empresa_ciudad'] || 'Valencia';
    const fechaStr = Utils.formatDateLong(quote['Fecha']);
    const intro = detail.intro || config['cotizacion_intro'] || '';
    const firmaNom = config['cotizacion_firma_nombre'] || 'Lcdo. Francisco Rojas Pineda';
    const firmaCargo = config['cotizacion_firma_cargo'] || 'Presidente';
    const validez = quote['Validez Días'] || 5;

    // Colores y Tipografía (Inter de Google Fonts)
    const colorText = '#1e293b';
    const colorPrimary = '#0d7377';
    const colorMuted = '#64748b';
    const colorBorder = '#e2e8f0';

    return `
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <div id="pdf-content-root" style="width:215.9mm; background:#ffffff; box-sizing:border-box; font-family:'Inter', sans-serif; color:${colorText}; position:relative;">
      
      <div style="padding:10mm 12mm; display:flex; flex-direction:column; box-sizing:border-box; min-height:270mm;">
        
        <!-- CABECERA -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6mm;">
          <img src="${logoUrl}" style="height:25mm; width:25mm; object-fit:contain;" />
          <div style="text-align:right; flex:1;">
             <h2 style="margin:0; font-size:22px; font-weight:900; color:${colorText}; letter-spacing:-0.5px;">${empresa}</h2>
             <div style="font-size:11px; color:${colorPrimary}; font-weight:800; margin-top:2px;">RIF: ${rif}</div>
             <p style="font-size:9.5px; color:${colorMuted}; margin-top:4px; line-height:1.5; font-weight:500;">
               ${dir}<br/>
               Tel: ${tel1} | ${email1}
             </p>
          </div>
        </div>

        <div style="width:100%; height:1px; background:${colorBorder}; margin-bottom:8mm;"></div>

        <!-- METADATOS -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10mm;">
           <div>
              <div style="font-size:9px; color:${colorMuted}; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Dirigido a:</div>
              <h3 style="margin:0; font-size:16px; font-weight:900; color:${colorText}; line-height:1.2;">${(client?.['Razón Social'] || 'CLIENTE').toUpperCase()}</h3>
              <div style="font-size:10px; margin-top:4px; color:${colorText}; font-weight:700;">RIF/CI: ${client?.['RIF'] || '—'}</div>
              <div style="font-size:9.5px; margin-top:3px; color:${colorMuted}; max-width:90mm; line-height:1.4; font-weight:500;">${client?.['Dirección'] || '—'}</div>
           </div>
           <div style="text-align:right;">
              <div style="font-size:9px; color:${colorMuted}; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Propuesta Comercial</div>
              <h1 style="margin:0; font-size:18px; font-weight:900; color:${colorPrimary}; letter-spacing:0.5px; text-transform:uppercase;">COTIZACIÓN Nº ${quoteCode}</h1>
              <div style="margin-top:4px; font-size:11px; font-weight:600; color:${colorText};">${ciudad}, ${fechaStr}</div>
              <div style="font-size:10px; color:${colorMuted}; font-weight:800; margin-top:2px; text-transform:uppercase;">Validez: ${validez} días hábiles</div>
           </div>
        </div>

        <!-- INTRODUCCIÓN -->
        ${intro ? `
          <div style="margin-bottom:8mm;">
            <p style="font-size:11px; line-height:1.6; color:${colorText}; margin:0; font-weight:500; text-align:justify;">${intro}</p>
          </div>
        ` : ''}

        <!-- TABLA -->
        <div style="margin-bottom:6mm; flex-grow:1;">
          <div style="display:flex; border-bottom:3px solid ${colorPrimary}; padding-bottom:6px; margin-bottom:10px; font-size:9.5px; font-weight:900; color:${colorPrimary}; text-transform:uppercase; letter-spacing:1px;">
            <div style="flex:1;">Descripción del Bien o Servicio</div>
            <div style="width:20mm; text-align:center;">Cant.</div>
            <div style="width:28mm; text-align:right;">Precio U.</div>
            <div style="width:32mm; text-align:right;">Monto Neto</div>
          </div>
          
          <div style="display:flex; flex-direction:column;">
            ${items.map((it) => `
              <div style="display:flex; padding:8px 0; border-bottom:1px solid #f1f5f9; align-items:center; page-break-inside:avoid;">
                <div style="flex:1; font-size:11px; font-weight:700; color:${colorText};">${Utils.escapeHtml(it.desc)}</div>
                <div style="width:20mm; text-align:center; font-size:11px; color:${colorText}; font-weight:500;">${it.qty}</div>
                <div style="width:28mm; text-align:right; font-size:11px; color:${colorMuted}; font-weight:700;">$${Utils.formatUSD(it.price)}</div>
                <div style="width:32mm; text-align:right; font-size:12px; font-weight:900; color:${colorText};">$${Utils.formatUSD(it.qty * it.price)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TOTALS -->
        <div style="display:flex; justify-content:flex-end; margin-bottom:8mm; margin-top:6mm;">
          <div style="width:80mm;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-right:5px;">
              <span style="font-size:10px; color:${colorMuted}; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Neto USD</span>
              <span style="font-size:12px; font-weight:900; color:${colorText};">$${Utils.formatUSD(totalUSD)}</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:3px solid ${colorPrimary};">
               <span style="font-size:14px; color:${colorText}; font-weight:900; text-transform:uppercase; letter-spacing:1px;">TOTAL</span>
               <span style="font-size:28px; font-weight:950; color:${colorPrimary}; line-height:1; letter-spacing:-1px;">$${Utils.formatUSD(totalUSD)}</span>
            </div>
            
            ${(currencyMode==='both' || currencyMode==='ves') ? `
              <div style="text-align:right; font-size:9px; color:${colorMuted}; margin-top:8px; font-weight:700; border-top:1px dashed #cbd5e1; padding-top:6px;">
                Equivalente Bs. ${Utils.formatVES(totalVES)} <br/>
                <span style="font-size:8px; font-weight:500;">(Tasa Ref: Bs. ${Utils.formatVES(rate)})</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- PIE DE PÁGINA -->
        <div style="display:flex; flex-direction:column; gap:8mm; margin-top:auto;">
           
           <!-- Firma -->
           <div style="width:55mm; margin:0 auto; text-align:center; page-break-inside:avoid;">
              <div style="border-top:2px solid ${colorText}; width:100%; margin-bottom:6px;"></div>
              <div style="font-size:12px; font-weight:800; color:${colorText}; letter-spacing:0.3px;">${firmaNom}</div>
              <div style="font-size:9px; color:${colorMuted}; font-weight:600; text-transform:uppercase;">${firmaCargo}</div>
           </div>

           <!-- Condiciones -->
           <div style="width:100%; page-break-inside:avoid;">
              <div style="font-size:10px; font-weight:900; color:${colorPrimary}; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">Condiciones Comerciales</div>
              <div style="font-size:9px; color:${colorText}; line-height:1.7; font-weight:500; text-align:justify; white-space:pre-line;">
                 ${(config['cotizacion_condiciones'] || '').split(/\n/).map((line, idx) => line.trim() ? `${idx + 1}. ${line.replace(/^\d+\.\s*/, '')}` : '').filter(l => l).join('\n')}
              </div>
           </div>
        </div>

      </div>
    </div>`;
  }

  function generatePDF(quoteId) {
    if (typeof html2pdf === 'undefined') { Utils.showToast('El módulo PDF no está cargado.', 'error'); return; }
    const quote = Quotations.getQuotation(quoteId);
    if (!quote) return;
    const client = Quotations.getContacts().find(c => c['ID'] === quote['ID Cliente']);
    const config = Quotations.getConfig();
    Utils.showToast('Generando descarga local...', 'info');
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.innerHTML = buildHTML(quote, client, config);
    document.body.appendChild(wrapper);
    const qs = String(quote['Número']).padStart(6, '0');
    const opt = {
      margin: 0,
      filename: `Cotizacion_ERGOX-${qs}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(wrapper.querySelector('#pdf-content-root') || wrapper).save()
      .then(() => {
        Utils.showToast('Descarga completada.', 'success');
        document.body.removeChild(wrapper);
      })
      .catch(err => {
        console.error(err);
        Utils.showToast('Error al generar PDF.', 'error');
        if (wrapper.parentNode) document.body.removeChild(wrapper);
      });
  }

  async function shareByWhatsApp(quoteId) {
    if (typeof html2pdf === 'undefined') { Utils.showToast('Módulo PDF no cargado.', 'error'); return; }
    const quote = Quotations.getQuotation(quoteId);
    if (!quote) return;
    const client = Quotations.getContacts().find(c => c['ID'] === quote['ID Cliente']);
    const config = Quotations.getConfig();
    if (!client) { Utils.showToast('No se encontró el cliente.', 'warning'); return; }
    
    Utils.showToast('Subiendo PDF a Drive para WhatsApp...', 'info');
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.innerHTML = buildHTML(quote, client, config);
    document.body.appendChild(wrapper);
    const qs = String(quote['Número']).padStart(6, '0');
    const filename = `Cotizacion_ERGOX-${qs}.pdf`;

    try {
      console.log('[WhatsApp] Iniciando generación de PDF...');
      const element = wrapper.querySelector('#pdf-content-root') || wrapper;
      
      // Obtener el PDF como base64
      const pdfBase64 = await html2pdf()
        .set({ 
          margin: 0, 
          html2canvas: { scale: 2, useCORS: true }, 
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' } 
        })
        .from(element)
        .outputPdf('datauristring');

      console.log('[WhatsApp] PDF generado. Longitud:', pdfBase64.length);
      Utils.showToast('Archivo listo. Sincronizando con Drive...', 'info');
      
      const res = await Sheets.savePDFToDrive(filename, pdfBase64.split(',')[1]);
      if (res.success && res.url) {
        const driveUrl = res.url;
        const clientName = client['Persona Contacto'] || client['Razón Social'] || 'Cliente';
        const total = Utils.formatUSD(quote['Total USD']);
        const phoneRaw = client['Teléfonos'] || '';
        const whatsapp = Utils.formatWhatsApp(phoneRaw, client['Dirección'] || '');

        if (!whatsapp) {
          Utils.showToast('Número no válido. Enlace copiado.', 'warning');
          await navigator.clipboard.writeText(driveUrl);
          return;
        }

        // Guardas de datos para evitar "undefined"
        const finalClientName = (clientName || 'Cliente').trim();
        const finalTotal = total || '0,00';
        const finalUrl = driveUrl || '';

        if (!finalUrl) throw new Error('No se pudo generar el enlace del PDF.');

        const message = encodeURIComponent(`*PROPUESTA COMERCIAL — ERGOEXPRESS*\n\nHola, *${finalClientName}*.\nLe envío la cotización *Nº ERGOX-${qs}* ($ ${finalTotal}).\n\n📄 *Descargar PDF:* ${finalUrl}`);
        
        // Abrir WhatsApp en pestaña nueva para no perder el CRM
        window.open(`https://api.whatsapp.com/send?phone=${whatsapp}&text=${message}`, '_blank');
        Utils.showToast('Canal de WhatsApp iniciado.', 'success');
      } else throw new Error(res.error || 'Error al guardar en Drive');
    } catch (err) {
      console.error('[WhatsApp] Error:', err);
      Utils.showToast('Error en WhatsApp: ' + err.message, 'error');
    } finally {
      if (wrapper.parentNode) {
        document.body.removeChild(wrapper);
        console.log('[WhatsApp] DOM limpiado.');
      }
    }
  }

  async function shareByEmail(quoteId) {
    if (typeof html2pdf === 'undefined') { Utils.showToast('Módulo PDF no cargado.', 'error'); return; }
    const quote = Quotations.getQuotation(quoteId);
    if (!quote) return;
    const client = Quotations.getContacts().find(c => c['ID'] === quote['ID Cliente']);
    const config = Quotations.getConfig();
    if (!client) { Utils.showToast('No se encontró el cliente.', 'warning'); return; }

    Utils.showToast('Preparando envío por Email...', 'info');
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.innerHTML = buildHTML(quote, client, config);
    document.body.appendChild(wrapper);
    const qs = String(quote['Número']).padStart(6, '0');
    const filename = `Cotizacion_ERGOX-${qs}.pdf`;

    try {
      const worker = html2pdf().set({ 
        margin:0, 
        html2canvas:{scale:2, useCORS:true}, 
        jsPDF:{unit:'mm', format:'letter', orientation:'portrait'} 
      }).from(wrapper.querySelector('#pdf-content-root') || wrapper);

      const pdfBase64 = await worker.output('datauristring');
      
      Utils.showToast('Sincronizando con la nube...', 'info');
      
      const res = await Sheets.savePDFToDrive(filename, pdfBase64.split(',')[1]);
      if (res.success && res.url) {
        const driveUrl = res.url;
        const clientEmail = (client['Email'] || '').trim();
        const clientName = client['Persona Contacto'] || client['Razón Social'] || 'Cliente';
        const subject = encodeURIComponent(`Cotización Comercial ERGOX-${qs} — ERGOEXPRESS`);
        const body = encodeURIComponent(`Estimado(a) ${clientName},\n\nLe envío la propuesta comercial Nº ERGOX-${qs}.\n\n📄 Ver PDF: ${driveUrl}\n\nAtentamente,\n${config['empresa_nombre'] || 'ERGOEXPRESS'}`);
        
        if (!clientEmail) {
          Utils.showToast('El cliente no tiene un Email registrado. Enlace copiado.', 'warning');
          await navigator.clipboard.writeText(driveUrl);
          return;
        }

        const mailtoUrl = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
        
        // Método directo y robusto (Evita el bloqueo X-Frame-Options de Gmail/Outlook)
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Limpieza rápida
        setTimeout(() => document.body.removeChild(link), 100);

        Utils.showToast('Cliente de correo iniciado.', 'success');
      } else throw new Error(res.error || 'Error al guardar en Drive');
    } catch (err) {
      console.error('Error en Email Share:', err);
      Utils.showToast('Error: ' + err.message, 'error');
    } finally { if (wrapper.parentNode) document.body.removeChild(wrapper); }
  }

  return { buildHTML, generatePDF, downloadPDF: generatePDF, shareByWhatsApp, shareByEmail };
})();
