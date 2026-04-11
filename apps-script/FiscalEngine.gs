/**
 * ERGOEXPRESS FINANCE — Motor Fiscal y Tributario (FiscalEngine.gs)
 * v1.0: Calendario SPE 2026 + Exportadores XML/TXT + Comprobantes Inteligentes
 */

const FISCAL_CALENDAR_2026 = {
  // Basado en Gaceta Oficial N° 43.283 (SPE 2026)
  // Mapping: UltimoDigitoRIF -> [Días de vencimiento por mes/quincena]
  // Estructura simplificada para demostración funcional:
  "1": ["2026-01-20", "2026-02-05", "2026-02-20", "2026-03-05", "2026-03-20", "2026-04-06", "2026-04-20", "2026-05-06"],
  "2": ["2026-01-21", "2026-02-06", "2026-02-21", "2026-03-06", "2026-03-23", "2026-04-07", "2026-04-21", "2026-05-07"],
  "3": ["2026-01-22", "2026-02-09", "2026-02-23", "2026-03-09", "2026-03-24", "2026-04-08", "2026-04-22", "2026-05-08"],
  "4": ["2026-01-23", "2026-02-10", "2026-02-24", "2026-03-10", "2026-03-25", "2026-04-09", "2026-04-23", "2026-05-11"],
  "5": ["2026-01-26", "2026-02-11", "2026-02-25", "2026-03-11", "2026-03-26", "2026-04-10", "2026-04-24", "2026-05-12"],
  "6": ["2026-01-27", "2026-02-12", "2026-02-26", "2026-03-12", "2026-03-27", "2026-04-13", "2026-04-27", "2026-05-13"],
  "7": ["2026-01-28", "2026-02-13", "2026-02-27", "2026-03-13", "2026-03-30", "2026-04-14", "2026-04-28", "2026-05-14"],
  "8": ["2026-01-29", "2026-02-18", "2026-03-02", "2026-03-18", "2026-03-31", "2026-04-15", "2026-04-29", "2026-05-15"],
  "9": ["2026-01-30", "2026-02-19", "2026-03-03", "2026-03-19", "2026-04-01", "2026-04-16", "2026-04-30", "2026-05-18"],
  "0": ["2026-01-08", "2026-02-04", "2026-02-19", "2026-03-04", "2026-03-19", "2026-04-01", "2026-04-16", "2026-04-30"]
};

/**
 * Obtiene el estatus fiscal actual basaado en el RIF de la empresa.
 */
function getFiscalDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rifEmpresa = _getCompanyConfig('empresa_rif') || 'J-12345678-0';
  const ultimoDigito = rifEmpresa.split('-').pop();
  
  const hoy = new Date();
  const fechas = FISCAL_CALENDAR_2026[ultimoDigito] || [];
  
  let proximoVencimiento = null;
  for (let f of fechas) {
    const d = new Date(f + "T23:59:59");
    if (d >= hoy) {
      proximoVencimiento = d;
      break;
    }
  }

  const diasRestantes = proximoVencimiento ? Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24)) : 'N/A';
  
  // Resumen de retenciones del mes actual
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  
  const statsIVA = _summarizeRetenciones('Finanzas_Egresos', mesActual, anioActual, 'IVA');
  const statsISLR = _summarizeRetenciones('Finanzas_Egresos', mesActual, anioActual, 'ISLR');

  return {
    success: true,
    rif: rifEmpresa,
    calendario: {
      proxima_fecha: proximoVencimiento ? proximoVencimiento.toISOString().split('T')[0] : 'No definida',
      dias_restantes: diasRestantes,
      estatus: diasRestantes <= 3 ? 'URGENTE' : (diasRestantes <= 7 ? 'PENDIENTE' : 'AL DIA')
    },
    resumen_mes: {
      iva_retenido_ves: statsIVA.totalVES,
      islr_retenido_ves: statsISLR.totalVES,
      conteo_documentos: statsIVA.count + statsISLR.count
    }
  };
}

/**
 * Genera el XML de Retenciones IVA para el SENIAT.
 */
function generateIVAXMLExport(periodo) {
  const [mes, anio] = periodo.split('-').map(Number);
  const data = _getFiscalData('Finanzas_Egresos', mes, anio, 'IVA');
  const rifEmpresa = _getCompanyConfig('empresa_rif').replace(/-/g, '');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<RelacionRetencionesIVA rifAgente="${rifEmpresa}" periodo="${anio}${String(mes).padStart(2, '0')}">\n`;

  data.forEach(row => {
    xml += `  <DetalleRetencion>\n`;
    xml += `    <RifRetenido>${row.rif.replace(/-/g, '')}</RifRetenido>\n`;
    xml += `    <NumeroFactura>${row.factura}</NumeroFactura>\n`;
    xml += `    <NumeroControl>${row.control}</NumeroControl>\n`;
    xml += `    <FechaOperacion>${row.fecha}</FechaOperacion>\n`;
    xml += `    <TipoOperacion>01</TipoOperacion>\n`;
    xml += `    <TipoDocumento>01</TipoDocumento>\n`;
    xml += `    <BaseImponible>${row.base.toFixed(2)}</BaseImponible>\n`;
    xml += `    <Alicuota>${row.alicuota.toFixed(2)}</Alicuota>\n`;
    xml += `    <MontoRetenido>${row.retenido.toFixed(2)}</MontoRetenido>\n`;
    xml += `  </DetalleRetencion>\n`;
  });

  xml += `</RelacionRetencionesIVA>`;
  return xml;
}

/**
 * Genera el TXT de Retenciones IVA para el SENIAT (Formato Pipe).
 */
function generateIVATXTExport(periodo) {
  const [mes, anio] = periodo.split('-').map(Number);
  const data = _getFiscalData('Finanzas_Egresos', mes, anio, 'IVA');
  const rifEmpresa = _getCompanyConfig('empresa_rif').replace(/-/g, '');

  let txt = "";
  data.forEach(row => {
    // Formato: RIF|Factura|Control|BaseImponible|IVA|Retencion|Fecha|Periodo|Alicuota
    txt += `${rifEmpresa}|${row.rif.replace(/-/g, '')}|${row.factura}|${row.control}|${row.base.toFixed(2)}|${row.iva.toFixed(2)}|${row.retenido.toFixed(2)}|${row.fecha}|01|${row.alicuota.toFixed(2)}\n`;
  });
  return txt;
}

// ─── HELPERS PRIVADOS ────────────────────────────────────────────────────────

function _getCompanyConfig(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Configuracion');
  if (!sh) return null;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function _summarizeRetenciones(sheetName, mes, anio, tipo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return { totalVES: 0, count: 0 };

  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const idxFecha = hdrs.indexOf('Fecha');
  const idxRet = hdrs.indexOf(tipo === 'IVA' ? 'Retencion_IVA' : 'Retencion_ISLR');
  const idxVES = hdrs.indexOf('Total VES');

  let totalVES = 0;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const f = new Date(data[i][idxFecha]);
    if (f.getMonth() + 1 === mes && f.getFullYear() === anio) {
      const ret = Number(data[i][idxRet] || 0);
      if (ret > 0) {
        totalVES += ret;
        count++;
      }
    }
  }
  return { totalVES, count };
}

function _getFiscalData(sheetName, mes, anio, tipo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const f = new Date(row[hdrs.indexOf('Fecha')]);
    if (f.getMonth() + 1 === mes && f.getFullYear() === anio) {
      const retenido = Number(row[hdrs.indexOf(tipo === 'IVA' ? 'Retencion_IVA' : 'Retencion_ISLR')] || 0);
      if (retenido > 0) {
        results.push({
          rif: String(row[hdrs.indexOf('Beneficiario')]),
          factura: String(row[hdrs.indexOf('Referencia Nº')] || '000'),
          control: String(row[hdrs.indexOf('Nro_Control_Factura')] || '00ABC'),
          fecha: f.toISOString().split('T')[0],
          base: Number(row[hdrs.indexOf('Base_Imponible_VES')] || 0),
          iva: Number(row[hdrs.indexOf('IVA_VES')] || 0),
          alicuota: 16.00, // Asumido
          retenido: retenido
        });
      }
    }
  }
  return results;
}

/**
 * Normaliza un RIF al formato SENIAT: L-NNNNNNNN-D
 */
function _normalizeRIF(rif) {
  if (!rif) return '';
  let clean = String(rif).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 2) return clean;
  
  const letra = clean.charAt(0);
  const cuerpo = clean.substring(1, clean.length - 1);
  const digito = clean.charAt(clean.length - 1);
  
  // Rellenar con ceros si el cuerpo es corto (estándar 8 dígitos para J/G/V/E/P)
  const cuerpoPad = cuerpo.padStart(8, '0');
  
  return `${letra}-${cuerpoPad}-${digito}`;
}
