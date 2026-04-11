/**
 * ERGOEXPRESS FINANCE — Motor de Lógica y Precisión (Logic.gs)
 * v6: Redondeo VES 2 Dec + Nómina Híbrida (Destajo) + Pensiones 9%
 */

const CONFIG_ERP = {
  IVA_RATE: 0.16,
  IGTF_RATE: 0.03,
  PENSION_9_RATE: 0.09,
  PENSION_FLOOR_USD: 130,
  RETENCION_IVA_PORCENTAJE: 0.75, // Estándar para Especiales
  MAX_ANTICIPO_RETENCION: 0.75,   // 75% Límite legal LOTTT
  SSO_TRAB_RATE: 0.04,
  SSO_PATR_RATE: 0.10,
  FAOV_TRAB_RATE: 0.01,
  FAOV_PATR_RATE: 0.02,
  INCES_PATR_RATE: 0.02,
  VAR_DESTAJO_CONFIG: {
    "EVAL_PUESTO_X": { desc: "Evaluación Ergonómica Puesto X", precio_usd: 50 },
    "CHARLA_1H": { desc: "Charla 1h", precio_usd: 30 },
    "MED_LUX": { desc: "Medición Luxometría", precio_usd: 40 }
  }
};

/**
 * REGLA DE REDONDEO OBLIGATORIA (VES)
 * Redondeo estándar a 2 decimales para evitar errores de coma flotante.
 */
function _roundVES(val) {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return Math.round(Number(val) * 100) / 100;
}

/**
 * LÓGICA FISCAL DE PRECISIÓN
 */

function calcFiscalidad(montoUSD, tasaBCV, esEspecial, metodo) {
  const tasa = _roundVES(tasaBCV);
  const montoVES = _roundVES(montoUSD * tasa);
  
  const baseImponibleVES = _roundVES(montoVES / (1 + CONFIG_ERP.IVA_RATE));
  const ivaVES = _roundVES(baseImponibleVES * CONFIG_ERP.IVA_RATE);
  
  let igtfVES = 0;
  const metodosDivisa = ['USD', 'ZELLE', 'EFECTIVO', 'PANAMA', 'BINANCE'];
  if (metodosDivisa.includes(String(metodo).toUpperCase())) {
    igtfVES = _roundVES(montoVES * CONFIG_ERP.IGTF_RATE);
  }

  let retencionIVA = 0;
  if (esEspecial) {
    retencionIVA = _roundVES(ivaVES * CONFIG_ERP.RETENCION_IVA_PORCENTAJE);
  }

  return {
    tasa_usada: tasa,
    base_imponible_ves: baseImponibleVES,
    iva_ves: ivaVES,
    igtf_ves: igtfVES,
    retencion_iva_ves: retencionIVA,
    total_neto_ves: _roundVES(baseImponibleVES + ivaVES),
    total_con_igtf_ves: _roundVES(baseImponibleVES + ivaVES + igtfVES)
  };
}

/**
 * Diferencial Cambiario de Precisión (Standard VEN-NIF)
 */
function calcDiferencialCambiario(montoUSD, tasaEmision, tasaCobro) {
  const tE = _roundVES(tasaEmision);
  const tC = _roundVES(tasaCobro);
  const vesEmision = _roundVES(montoUSD * tE);
  const vesCobro = _roundVES(montoUSD * tC);
  return _roundVES(vesCobro - vesEmision);
}

/**
 * LÓGICA DE NÓMINA HÍBRIDA Y PRODUCTIVIDAD
 */

/**
 * Agrega el pago por destajo de un mes.
 */
function calcPagoDestajo(idEmpleado, mesAnio, tasaCierreBCV) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Nomina_Detalle');
  if (!sh) return 0;

  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const idxId = hdrs.indexOf('ID_Empleado');
  const idxFecha = hdrs.indexOf('Fecha');
  const idxSub = hdrs.indexOf('Subtotal_USD');
  const idxEst = hdrs.indexOf('Estatus_Pago');

  let totalUSD = 0;
  data.slice(1).forEach(row => {
    const f = new Date(row[idxFecha]);
    const mesF = `${f.getMonth() + 1}-${f.getFullYear()}`; // Formato simplificado M-YYYY
    
    if (String(row[idxId]) === String(idEmpleado) && 
        row[idxEst] !== 'PAGADO' && 
        (mesAnio === 'HISTORICO' || mesF === mesAnio)) {
      totalUSD += Number(row[idxSub] || 0);
    }
  });

  const tasa = _roundVES(tasaCierreBCV);
  return _roundVES(totalUSD * tasa);
}

/**
 * Calcula la Nómina Integral (Pila de Ingresos).
 */
function calcNominaIntegral(idEmpleado, sueldoFijoUSD, totalDestajoVES, bonosUSD, tasaBCV, esEspecialPension = true) {
  const tasa = _roundVES(tasaBCV);
  const sueldoFijoVES = _roundVES(sueldoFijoUSD * tasa);
  const bonosVES = _roundVES(bonosUSD * tasa);
  
  const totalIngresoVES = _roundVES(sueldoFijoVES + totalDestajoVES + bonosVES);
  
  const parafiscales = calcParafiscales(totalIngresoVES, tasa, esEspecialPension);
  
  return {
    ingresos: {
      fijo_ves: sueldoFijoVES,
      destajo_ves: totalDestajoVES,
      bonos_ves: bonosVES,
      total_bruto_ves: totalIngresoVES
    },
    deducciones: {
      ivss_emp: parafiscales.detalle.ivss_emp,
      faov_emp: parafiscales.detalle.faov_emp,
      total_deduc: parafiscales.empleado_total
    },
    aporte_patronal: parafiscales.patrono_total,
    neto_a_pagar_ves: _roundVES(totalIngresoVES - parafiscales.empleado_total)
  };
}

/**
 * Parafiscales con Ley de Pensiones 9% y Piso de $130.
 */
function calcParafiscales(sueldoVES, tasaBCV, esEspecialPension = true) {
  const tasa = _roundVES(tasaBCV);
  const pisoVES = _roundVES(CONFIG_ERP.PENSION_FLOOR_USD * tasa);
  const basePension = Math.max(sueldoVES, pisoVES);

  const ivss_emp = _roundVES(sueldoVES * CONFIG_ERP.SSO_TRAB_RATE);
  const ivss_pat = _roundVES(sueldoVES * CONFIG_ERP.SSO_PATR_RATE);
  const faov_emp = _roundVES(sueldoVES * CONFIG_ERP.FAOV_TRAB_RATE);
  const faov_pat = _roundVES(sueldoVES * CONFIG_ERP.FAOV_PATR_RATE);
  const inces_pat = _roundVES(sueldoVES * CONFIG_ERP.INCES_PATR_RATE);
  const pension_9 = _roundVES(basePension * CONFIG_ERP.PENSION_9_RATE);

  return {
    empleado_total: _roundVES(ivss_emp + faov_emp),
    patrono_total: _roundVES(ivss_pat + faov_pat + inces_pat + pension_9),
    detalle: {
      ivss_emp: ivss_emp,
      faov_emp: faov_emp,
      pension_9: pension_9
    }
  };
}

/**
 * Doble Liquidación Art 142 LOTTT - Incluyendo promedio de Variable (Destajo)
 */
function calcDobleLiquidacion(idEmpleado, mesesPromedio = 6) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Obtener Sueldo Fijo del Control
  const shControl = ss.getSheetByName('Nomina_Control');
  if (!shControl) return { success: false, error: "Nómina no configurada" };
  
  const dataCtrl = shControl.getDataRange().getValues();
  const hdrsCtrl = dataCtrl[0];
  const idxIdC = hdrsCtrl.indexOf('ID_Empleado');
  const idxSueldo = hdrsCtrl.indexOf('Sueldo_VES_Indexado');
  
  let sueldoFijoVES = 0;
  for (let i = 1; i < dataCtrl.length; i++) {
    if (String(dataCtrl[i][idxIdC]) === String(idEmpleado)) {
      sueldoFijoVES = Number(dataCtrl[i][idxSueldo] || 0);
      break;
    }
  }

  // 2. Calcular promedio de variable (Últimos 6 meses)
  const shDetalle = ss.getSheetByName('Nomina_Detalle');
  let promedioVariableVES = 0;
  if (shDetalle) {
    const dataDet = shDetalle.getDataRange().getValues();
    const hdrsDet = dataDet[0];
    const idxIdD = hdrsDet.indexOf('ID_Empleado');
    const idxFecha = hdrsDet.indexOf('Fecha');
    const idxSub = hdrsDet.indexOf('Subtotal_USD');
    const hoy = new Date();
    let sumVariableUSD = 0;

    dataDet.slice(1).forEach(row => {
      const f = new Date(row[idxFecha]);
      const diffDays = (hoy - f) / (1000 * 60 * 60 * 24);
      if (String(row[idxIdD]) === String(idEmpleado) && diffDays <= (mesesPromedio * 30)) {
        sumVariableUSD += Number(row[idxSub] || 0);
      }
    });

    const tasa = _roundVES(fetchBCVRate().tasa || 36.5);
    promedioVariableVES = _roundVES((sumVariableUSD * tasa) / mesesPromedio);
  }
  
  const salarioIntegralVES = _roundVES(sueldoFijoVES + promedioVariableVES);
  const salarioDiario = _roundVES(salarioIntegralVES / 30);
  
  const retroactivoCalculado = _roundVES(salarioDiario * 30);
  
  return {
    success: true,
    idEmpleado: idEmpleado,
    sueldo_fijo_ves: sueldoFijoVES,
    promedio_variable_ves: promedioVariableVES,
    salario_integral_ves: salarioIntegralVES,
    art142C_calculado: retroactivoCalculado
  };
}
