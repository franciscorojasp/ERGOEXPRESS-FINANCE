/**
 * ERGOEXPRESS FINANCE — Motor de Reportes y Cumplimiento (ReportingEngine.gs)
 * v6: Precisión 2 Dec + Nómina Híbrida + Reporte Proyectos
 */

/**
 * Genera el JSON de un recibo de pago digital detallado.
 */
function generatePaystubJSON(employeeId, mesAnio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Nomina_Control');
  if (!shControl) return { success: false, error: 'Hoja Nomina_Control no encontrada' };

  const data = shControl.getDataRange().getValues();
  const hdrs = data[0];
  let empData = null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(employeeId)) {
      empData = {};
      hdrs.forEach((h, j) => empData[h] = data[i][j]);
      break;
    }
  }

  if (!empData) return { success: false, error: 'Empleado no encontrado' };

  // 1. Obtener Ingresos con Precisión
  const sueldoBaseVES = _roundVES(empData.Sueldo_VES_Indexado || 0);
  const totalDestajoVES = _roundVES(empData.Total_Destajo_Mes_VES || 0);
  const bonosVES = _roundVES(empData.Total_Bonos_Cumplimiento_VES || 0);
  const bonoAlimVES = _roundVES(empData.Bono_Alimentacion || 0);

  // 2. Cálculos de nómina integral usando el motor Logic.gs
  const integral = calcNominaIntegral(
    employeeId, 
    empData.Sueldo_USD_Base, 
    totalDestajoVES, 
    bonosVES / 36, // Mock de conversión si viene en VES 
    36, // Tasa Mock si se necesita
    true
  );

  return {
    success: true,
    metadata: {
      empresa: "ERGOEXPRESS, C.A.",
      rif: "J-50251246-2",
      periodo: mesAnio,
      tasa_referencia: 36.45 // Ejemplo
    },
    empleado: {
      id: empData.ID_Empleado,
      nombre: empData.Nombre
    },
    asignaciones: {
      sueldo_base_ves: sueldoBaseVES,
      productividad_destajo_ves: totalDestajoVES,
      bonos_cumplimiento_ves: bonosVES,
      bono_alimentacion_ves: bonoAlimVES,
      total_bruto_ves: _roundVES(sueldoBaseVES + totalDestajoVES + bonosVES + bonoAlimVES)
    },
    deducciones: {
      ivss: integral.deducciones.ivss_emp,
      faov: integral.deducciones.faov_emp,
      total_deduc_ves: integral.deducciones.total_deduc
    },
    neto_a_pagar_ves: _roundVES(sueldoBaseVES + totalDestajoVES + bonosVES + bonoAlimVES - integral.deducciones.total_deduc)
  };
}

/**
 * Reporte de Costo Laboral por Proyecto/Tarea (JSON)
 */
function getLaborCostPerProjectJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Nomina_Detalle');
  if (!sh) return [];

  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const idxDesc = hdrs.indexOf('Descripcion_Tarea');
  const idxSub = hdrs.indexOf('Subtotal_USD');

  const proyMap = {};
  data.slice(1).forEach(row => {
    const proy = row[idxDesc] || 'Sin Clasificar';
    const sub = Number(row[idxSub] || 0);
    proyMap[proy] = (proyMap[proy] || 0) + sub;
  });

  return Object.keys(proyMap).map(p => ({
    proyecto: p,
    costo_usd: _roundVES(proyMap[p]),
    costo_ves_est: _roundVES(proyMap[p] * 36.5) // Tasa estimada
  }));
}

/**
 * Genera el archivo TXT para carga masiva de retenciones IVA (SENIAT).
 */
function generateTxtSeniat(mes, anio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Finanzas_Egresos');
  if (!sh) return "Error: Hoja de Egresos no encontrada";

  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  let txt = "";

  data.slice(1).forEach(row => {
    const o = {};
    hdrs.forEach((h, j) => o[h] = row[j]);
    
    const fecha = new Date(o.Fecha);
    if (fecha.getMonth() + 1 === Number(mes) && fecha.getFullYear() === Number(anio) && o.Retencion_IVA > 0) {
      txt += `${o.RIF || 'V00000000'}|${o['Referencia Nº']}|${o.Nro_Control_Factura || '00'}|${_roundVES(o.Base_Imponible_VES)}|${_roundVES(o.IVA_VES || 0)}|${_roundVES(o.Retencion_IVA)}\n`;
    }
  });
  return txt;
}

/**
 * Cierre de Mes Consolidado con Precisión 2 Decimales.
 */
function getCierreMesJSON(mes, anio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ingresosData = ss.getSheetByName('Finanzas_Ingresos').getDataRange().getValues();
  const egresosData = ss.getSheetByName('Finanzas_Egresos').getDataRange().getValues();
  
  let totalIGTF = 0;
  let totalIVA = 0;
  let totalDiferencial = 0;

  // Procesar Ingresos
  const hIng = ingresosData[0];
  ingresosData.slice(1).forEach(row => {
    const o = {}; hIng.forEach((h, j) => o[h] = row[j]);
    const f = new Date(o.Fecha);
    if (f.getMonth() + 1 === Number(mes) && f.getFullYear() === Number(anio)) {
      totalIGTF += Number(o.IGTF_VES || 0);
      totalDiferencial += Number(o.Diferencial_Cambiario || 0);
    }
  });

  // Procesar Egresos
  const hEgr = egresosData[0];
  egresosData.slice(1).forEach(row => {
    const o = {}; hEgr.forEach((h, j) => o[h] = row[j]);
    const f = new Date(o.Fecha);
    if (f.getMonth() + 1 === Number(mes) && f.getFullYear() === Number(anio)) {
      totalIVA += Number(o.Retencion_IVA || 0);
    }
  });

  return {
    success: true,
    periodo: `${mes}-${anio}`,
    fiscal: {
      total_igtf_ves: _roundVES(totalIGTF),
      total_iva_retenido_ves: _roundVES(totalIVA),
      diferencial_cambiario_neto_ves: _roundVES(totalDiferencial)
    },
    moneda: "VES",
    precision: "2 decimals"
  };
}

/**
 * Genera y envía el comprobante de nómina humanizado (Email + PDF).
 */
function sendPayrollNotification(employeeId, frequency, amountUSD, tasa) {
  const paystubData = generatePaystubJSON(employeeId, frequency.toUpperCase());
  if (!paystubData.success) return;

  const employeeEmail = _getEmployeeEmail(employeeId);
  if (!employeeEmail) {
    Logger.log("No se encontró email para el empleado: " + employeeId);
    return;
  }

  // 1. Generar HTML para el PDF
  const htmlContent = _createPaystubHtml(paystubData);
  const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', 'recibo.html')
                           .getAs('application/pdf')
                           .setName(`Recibo_Nomina_${employeeId}_${frequency}.pdf`);

  // 2. Mensaje Humanizado
  const nombre = paystubData.empleado.nombre.split(' ')[0];
  const subject = `📄 Tu Recibo de Pago - ERGOEXPRESS-FINANCE (${frequency.toUpperCase()})`;
  const body = `¡Hola ${nombre}! 🌟\n\n` +
               `Esperamos que estés teniendo un excelente día.\n\n` +
               `Te informamos que se ha procesado con éxito tu pago de nómina bajo la modalidad ${frequency.toUpperCase()}.\n\n` +
               `Monto Neto: $ ${amountUSD.toFixed(2)} / Bs. ${(amountUSD * tasa).toLocaleString('es-VE')}\n\n` +
               `Adjunto a este correo encontrarás tu recibo de pago digital con el desglose detallado de tus asignaciones y deducciones de ley.\n\n` +
               `Gracias por tu valioso compromiso y por ser parte de la familia ErgoExpress.\n\n` +
               `Atentamente,\n` +
               `Departamento de Finanzas\n` +
               `ERGOEXPRESS, C.A.`;

  // 3. Enviar Email
  MailApp.sendEmail({
    to: employeeEmail,
    subject: subject,
    body: body,
    attachments: [pdfBlob]
  });
}

/**
 * Obtiene el email del empleado desde la hoja Contactos (relación por ID).
 */
function _getEmployeeEmail(employeeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Contactos');
  if (!sh) return null;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(employeeId)) return data[i][5]; // Columna Email
  }
  return null;
}

/**
 * Helper para construir el HTML "Premium" del recibo.
 */
function _createPaystubHtml(d) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <div style="text-align: center; border-bottom: 2px solid #1a237e; padding-bottom: 10px;">
            <h1 style="color: #1a237e; margin: 0;">ERGOEXPRESS-FINANCE</h1>
            <p style="margin: 0; font-size: 12px;">RIF: J-50251246-2 | Control Financiero de Alto Rendimiento</p>
          </div>
          
          <h2 style="text-align: center; background: #f5f5f5; padding: 10px;">RECIBO DE PAGO DIGITAL</h2>
          
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td><b>Colaborador:</b> ${d.empleado.nombre}</td>
              <td style="text-align: right;"><b>Fecha:</b> ${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
              <td><b>ID:</b> ${d.empleado.id}</td>
              <td style="text-align: right;"><b>Periodo:</b> ${d.metadata.periodo}</td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #1a237e; color: white;">
                <th style="padding: 10px; text-align: left;">CONCEPTO</th>
                <th style="padding: 10px; text-align: right;">ASIGNACIONES</th>
                <th style="padding: 10px; text-align: right;">DEDUCCIONES</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Sueldo Base Indexado</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Bs. ${d.asignaciones.sueldo_base_ves.toLocaleString('es-VE')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">—</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Productividad (Destajo)</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Bs. ${d.asignaciones.productividad_destajo_ves.toLocaleString('es-VE')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">—</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Deducciones de Ley (SSO/FAOV)</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">—</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">Bs. ${d.deducciones.total_deduc_ves.toLocaleString('es-VE')}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 30px; background: #1a237e; color: white; padding: 20px; border-radius: 5px;">
            <div style="font-size: 14px; text-transform: uppercase;">NETO A PAGAR</div>
            <div style="font-size: 24px; font-weight: bold; text-align: right;">Bs. ${d.neto_a_pagar_ves.toLocaleString('es-VE')}</div>
            <div style="font-size: 14px; text-align: right; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 5px;">
              Equivalente: $ ${(d.neto_a_pagar_ves / d.metadata.tasa_referencia).toFixed(2)} (Tasa: ${d.metadata.tasa_referencia})
            </div>
          </div>
          
          <p style="font-size: 10px; color: #777; margin-top: 40px; text-align: center;">
            Este recibo de pago es un comprobante digital generado por el sistema ERGOEXPRESS-FINANCE.<br>
            No requiere firma física para su validez contable interna.
          </p>
        </div>
      </body>
    </html>
  `;
}
