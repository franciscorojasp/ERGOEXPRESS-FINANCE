/**
 * ERGOEXPRESS-FINANCE — Backend en Google Apps Script
 * 
 * INSTRUCCIONES:
 * 1. Abrir el Google Sheet "ERGOEXPRESS-FINANCE"
 * 2. Extensiones → Apps Script → pegar este código completo
 * 3. Cambiar el API_KEY en la línea siguiente por uno propio
 * 4. Ejecutar la función "configurarSistema" (▶ botón Play) — solo una vez
 * 5. Implementar → Nueva implementación → Tipo: App web
 *    · Ejecutar como: Yo (mi cuenta)
 *    · Acceso: Cualquier usuario
 * 6. Copiar la URL de la web app → pegar en config.js
 */

// ⚙️ El sistema busca la API_KEY en Propiedades del Script. Si no existe, usa la predeterminada.
// Para mayor seguridad, el administrador debe ejecutar configurarApiKey() una vez.
function getApiKey() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('API_KEY');
  return key || 'ERGX2026';
}

/**
 * Función de utilidad para que el administrador establezca una nueva API_KEY
 * sin editar el código fuente.
 */
function configurarApiKey(nuevaClave) {
  if (!nuevaClave) throw new Error('Se requiere una nueva clave');
  PropertiesService.getScriptProperties().setProperty('API_KEY', nuevaClave);
  return 'API_KEY actualizada correctamente.';
}

// ─── Cabeceras de cada hoja (Sincronizadas con ERP v4) ────────────────────────────
const HEADERS = {
  Contactos:    ['ID','Razón Social','RIF','Persona Contacto','Teléfonos','Email','Dirección','Estado','Puntaje','Tipo','Fecha Registro','Notas','Etapa Pipeline','Vendedor Email','Categoria_Fiscal','Municipio_ID','RIF_Validado','RIF_Ultimo_Digito','Contribuyente_Especial'],
  Productos:    ['ID','Nombre','Descripción','Categoría','Precio USD','Costo USD','Impuesto %','Stock_Actual','Stock_Minimo'],
  TasasCambio:  ['ID','Fecha','Tasa Oficial','Fuente'],
  Cotizaciones: ['ID','Número','Fecha','ID Cliente','Validez Días','Estado','Total USD','Total VES','Detalle JSON','Fecha Creación','Usuario Email','Notas','Stock_Sincronizado'],
  Seguimiento:  ['ID','ID Cliente','Fecha','Tipo','Descripción','Próximo Seguimiento','Asunto Próximo','Etapa Pipeline','Fecha Cambio Etapa','Usuario Email'],
  Configuracion:['Clave','Valor'],
  Usuarios:     ['ID','Email','Nombre','Rol','Activo','Fecha Registro','Password','SuperAdmin'],
  Finanzas_Ingresos: ['ID','Fecha','ID Cliente','Concepto','ID Cotización','Método','Banco','Referencia Nº','Referencia', 'Tasa', 'Total USD','Total VES','Estado','Vendedor Email','IGTF_VES','Diferencial_Cambiario','Tasa_Factura','Nro_Control_Factura','Estatus_Retencion','Monto_Divisa_Neto'],
  Finanzas_Egresos:  ['ID','Fecha','Beneficiario','Categoría','Concepto','Referencia','Método', 'Banco', 'Referencia Nº', 'Pagador', 'Tasa', 'Total USD','Total VES', 'Estado','Usuario Email','Retencion_IVA','Retencion_ISLR','ISLR_%','Aporte_Pension_9%','Monto_Neto_Divisa','Base_Imponible_VES'],
  Agenda:            ['ID','Fecha','Hora','ID Cliente','Asunto','Tipo','Estado','Notas','Usuario Email'],
  Presupuestos:      ['ID','Partida','Monto_Asignado_USD','Monto_Ejecutado_USD','Disponible_USD','Mes_Año'],
  Nomina_Control:    ['ID_Empleado','Nombre','Sueldo_USD_Base','Sueldo_VES_Indexado','Bono_Alimentacion','Bono_Especial_Config','Total_Destajo_Mes_VES','Total_Bonos_Cumplimiento_VES','Metodo_Pago_Preferencia','Fecha_Ingreso','Ultima_Liquidacion','Apartado_Art142_A','Apartado_Art142_C'],
  Nomina_Detalle:    ['ID','ID_Empleado','Fecha','Tipo_Pago','Descripcion_Tarea','Cantidad', 'Precio_Unitario_USD', 'Subtotal_USD', 'Estatus_Pago'],
  Pasivos_Laborales: ['ID','ID_Empleado','Trimestre','Dias_Garantia','Monto_Garantia_VES','Intereses_Prestaciones'],
  Logs_Auditoria:    ['ID','Fecha','Usuario_Email','Accion','Tabla','ID_Registro','Detalles'],
  Notas_Operaciones: ['ID','Número','Fecha','Tipo','ID_Registro_Original','Tabla_Original','Concepto','Monto_Ajuste_USD','Total_VES','Tasa','Usuario_Email']
};

// ─── Punto de entrada POST ───────────────────────────────────────────────────
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const API_KEY = getApiKey();
    if (!req.apiKey || req.apiKey !== API_KEY) {
      return ok({ success: false, error: 'Acceso Denegado: API Key inválida' });
    }
    
    // Acciones públicas (No requieren Token)
    if (['LOGIN', 'CHECK_SETUP', 'SETUP', 'CREATE_ADMIN', 'REQUEST_ACCESS'].includes(req.action)) {
      switch (req.action) {
        case 'CHECK_SETUP':    return ok(checkSetup());
        case 'SETUP':          return ok(setup());
        case 'CREATE_ADMIN':   return ok(createAdmin(req));
        case 'LOGIN':          return ok(login(req));
        case 'REQUEST_ACCESS': return ok(requestAccess(req));
      }
    }

    // Acciones protegidas (Requieren Token válido)
    try {
      const user = auth(req);
      switch (req.action) {
        case 'VALIDATE_TOKEN': return ok({ success: true, user });
        case 'FETCH_BCV_RATE': return ok(fetchBCVRate());
        case 'READ':           return ok(read(req));
        case 'BATCH_READ':     return ok(batchRead(req));
        case 'APPEND':         return ok(append(req));
        case 'BATCH_APPEND':   return ok(batchAppend(req));
        case 'SAVE_PDF_TO_DRIVE': return ok(savePDFToDrive(req));
        case 'CLEAR_SHEETS':   return ok(clearSheets(req));
        case 'UPDATE':         return ok(update(req));
        case 'DELETE':         return ok(del(req));
        case 'SYNC_TO_CALENDAR': return ok(syncToCalendar(req));
        case 'GET_NEXT_NUMBER': return ok(getNextNumber(req));
        case 'EXECUTE_PAYROLL_ACTION': return ok(executePayrollAction(req));
        case 'RESET_ALL_PASSWORDS': return ok(resetAllPasswords(req));
        case 'RUN_MAINTENANCE': return ok({ success: true, message: repararCuentasUsuarios() });
        case 'ASK_GEMINI':     return ok(askGemini(req));

        // 🛠️ MÓDULO MANTENIMIENTO SUPER-ADMIN
        case 'HARD_RESET': 
          if (!user.isSuper) return ok({ success: false, error: 'Acceso Denegado: Se requieren permisos de SuperAdmin' });
          return ok(system_hardReset(req));
        case 'GENERATE_BACKUP':
          if (!user.isSuper) return ok({ success: false, error: 'Acceso Denegado: Se requieren permisos de SuperAdmin' });
          return ok(system_generateBackup(req));

        // 📊 MÓDULO FISCAL
        case 'FISCAL_EXPORT_IVA_XML': return ok(generateIVAXMLExport(req.period));
        case 'FISCAL_EXPORT_IVA_TXT': return ok(generateIVATXTExport(req.period));
        case 'GET_FISCAL_DASHBOARD':  return ok(getFiscalDashboard(req.period));

        // 🔍 MÓDULO INTELIGENCIA & BI
        case 'BI_GET_STATS':  return ok(getBIStatsPackage(req.options));
        case 'BI_AUDIT':      return ok(runAIAudit(req.query, req.history));
        case 'BI_SETUP_KEY':  return ok(setupSecureAI());

        // 📦 MÓDULO INVENTARIO & AUDITORÍA
        case 'INV_REDUCE_STOCK': return ok(syncStockWithQuota(req.quotaId));
        case 'GET_AUDIT_LOGS':   return ok(getAuditLogs(req.limit));

        default: return ok({ success: false, error: 'Acción desconocida o no autorizada: ' + req.action });
      }
    } catch (authErr) {
      return ok({ success: false, error: 'UNAUTHORIZED' });
    }
  } catch (err) {
    return ok({ success: false, error: 'Error interno: ' + err.message });
  }
}

// ─── GET: verifica que el servicio está activo ────────────────────────────────
function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<h2>✅ ERGOEXPRESS CRM API activa</h2><p>El servicio está funcionando correctamente.</p>'
  );
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── SEGURIDAD: Hashing SHA-256 ──────────────────────────────────────────────
function hash(str) {
  if (!str) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  let hexString = '';
  for (let i = 0; i < digest.length; i++) {
    let byte = digest[i];
    if (byte < 0) byte += 256;
    let byteStr = byte.toString(16);
    if (byteStr.length === 1) byteStr = '0' + byteStr;
    hexString += byteStr;
  }
  return hexString;
}

// ─── Tokens (duración: 8 horas) ──────────────────────────────────────────────
const TOKEN_TTL = 8 * 60 * 60 * 1000;

function makeToken(email, name, role, ip = '0.0.0.0') {
  const token = Utilities.getUuid();
  const exp   = Date.now() + TOKEN_TTL;
  PropertiesService.getScriptProperties()
    .setProperty('TK:' + token, JSON.stringify({ email, name, role, exp, ip }));
  return token;
}

function checkToken(token) {
  if (!token) return null;
  const raw = PropertiesService.getScriptProperties().getProperty('TK:' + token);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (Date.now() > d.exp) {
      PropertiesService.getScriptProperties().deleteProperty('TK:' + token);
      return null;
    }
    return d;
  } catch(e) { return null; }
}

function auth(req) {
  const user = checkToken(req.token);
  if (!user) throw new Error('UNAUTHORIZED');
  
  // VALIDACIÓN DE IP (Simulación 2FA / Fingerprinting)
  const currentIP = req.ip || '0.0.0.0';
  if (user.ip && user.ip !== '0.0.0.0' && user.ip !== currentIP) {
    console.warn(`[SECURITY] IP Mismatch detected for ${user.email}. Expected: ${user.ip}, Found: ${currentIP}`);
    // En producción podrías invalidar el token aquí
  }

  return user;
}

// ─── Acciones ────────────────────────────────────────────────────────────────
function checkSetup() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Usuarios');
  if (!sheet) return { success: true, needsSetup: true, hasAdmin: false };
  const rows  = Math.max(0, sheet.getLastRow() - 1);
  return { success: true, needsSetup: false, hasAdmin: rows > 0 };
}

// (Función setup eliminada por duplicidad, ver final del archivo)


function getNextNumber(req) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(req.sheet);
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  
  // Usamos un lock para evitar condiciones de carrera (Race Conditions)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Esperar hasta 10 segundos
    const data = sheet.getDataRange().getValues();
    const colName = (req.sheet === 'Cotizaciones' || req.sheet === 'Cotización') ? 'Número' : 'Item';
    const idx = data[0].indexOf(colName);
    
    // Solución definitiva: Si la hoja no tiene columna de secuencia, no damos error fatal.
    if (idx === -1) return { success: true, next: null };
    
    let max = 0;
    const prefix = req.prefix || '';
    for (let i = 1; i < data.length; i++) {
      const valStr = String(data[i][idx]);
      if (prefix && !valStr.startsWith(prefix)) continue;
      const val = parseInt(valStr.replace(prefix, '')) || 0;
      if (val > max) max = val;
    }
    return { success: true, next: max + 1, formatted: prefix + (max + 1) };
  } catch (e) {
    return { success: false, error: 'Timeout obteniendo número secuencial' };
  } finally {
    lock.releaseLock();
  }
}

function resetAllPasswords(req) {
  const user = auth(req);
  if (user.role !== 'admin') return { success: false, error: 'Solo administradores' };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Usuarios');
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const iP = h.indexOf('Password');
  
  if (iP === -1) return { success: false, error: 'Columna Password no encontrada' };
  
  // Limpiamos todas las contraseñas para forzar el reset
  // No las hasheamos todavia, dejamos que al entrar o al ser editados se graben
  for (let i = 2; i <= sh.getLastRow(); i++) {
    sh.getRange(i, iP + 1).setValue('');
  }
  
  return { success: true, message: 'Todas las contraseñas han sido removidas. Use el panel de usuarios para asignar nuevas.' };
}

function createAdmin(req) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Usuarios');
  if (!sheet) return { success: false, error: 'Ejecuta Setup primero' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === 'admin')
      return { success: false, error: 'Ya existe un administrador' };
  }

  const cols = HEADERS.Usuarios;
  sheet.appendRow(cols.map(h => ({
    ID: Utilities.getUuid(), Email: req.email, Nombre: req.name,
    Rol: 'admin', Activo: 'SI',
    'Fecha Registro': new Date().toISOString().split('T')[0],
    Password: hash(req.password) // GUARDAMOS HASH
  }[h] || '')));

  _initConfig(ss);
  const token = makeToken(req.email, req.name, 'admin');
  return { success: true, token, user: { email: req.email, name: req.name, role: 'admin' } };
}

function requestAccess(req) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Usuarios');
  if (!sheet) return { success: false, error: 'Sistema no configurado' };

  const data = sheet.getDataRange().getValues();
  const emailInput = (req.email || '').toLowerCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === emailInput)
      return { success: false, error: 'Ya existe una solicitud o cuenta con este correo.' };
  }

  const cols = HEADERS.Usuarios;
  sheet.appendRow(cols.map(h => ({
    ID: Utilities.getUuid(), Email: emailInput, Nombre: req.name,
    Rol: 'vendedor', Activo: 'NO',
    'Fecha Registro': new Date().toISOString().split('T')[0],
    Password: hash(req.password)
  }[h] || '')));

  return { success: true, message: 'Solicitud enviada. Contacte al administrador para la activación.' };
}

function _initConfig(ss) {
  const sh = ss.getSheetByName('Configuracion');
  if (!sh || sh.getLastRow() > 1) return;
  const rows = [
    ['empresa_nombre','ERGOEXPRESS, C.A.'],
    ['empresa_rif','J-50251246-2'],
    ['empresa_lema','SOLUCIONES EN SEGURIDAD, ERGONOMÍA, HIGIENE'],
    ['empresa_direccion','Calle 2 Manzana F Casa Nº 12386 Brisas del Lago, San Joaquín, Carabobo, Venezuela'],
    ['empresa_telefono1','+58 424-4736489'],
    ['empresa_telefono2','+58 412-4116804'],
    ['empresa_email1','ergoexpressca@gmail.com'],
    ['empresa_email2','ergoexpress1@gmail.com'],
    ['empresa_ciudad','Valencia'],
    ['empresa_logo_url','assets/logo.png'],
    ['empresa_instagram','@ergoexpress_ve'],
    ['cotizacion_firma_nombre','Lcdo. Francisco Rojas Pineda'],
    ['cotizacion_firma_cargo','Presidente'],
    ['cotizacion_validez_default','5'],
    ['cotizacion_intro','Le presentamos nuestra mejor propuesta para impulsar el éxito de su organización. Esta cotización exclusiva, diseñada para atender sus requerimientos de manera efectiva, incluye los siguientes servicios:'],
    ['cotizacion_condiciones','1. Para el inicio de las actividades deben efectuar transferencias al Banco Provincial BBVA Cta. Cte. Nº 01080083840100593524 a nombre de ERGOEXPRESS C.A. RIF J-50251246-2.\n2. Los montos en Dólares Americanos deben cancelarse en Bolívares a la tasa BCV vigente el día de la transacción.\n3. Estos costos NO INCLUYEN gastos de envío, transporte, alimentación ni hospedaje.\n4. Precios NO INCLUYEN IVA.\n5. Emitir orden de compra y comprobantes de pago a ergoexpressca@gmail.com / ergoexpress1@gmail.com.'],
    ['cotizacion_inicio_estudio','Definido con ustedes luego de realizado y verificado el pago de anticipo solicitado.'],
    ['cotizacion_tiempo_ejecucion','Según plan de trabajo convenido conjuntamente. Informes entregados en 10 días hábiles tras culminar la recopilación de datos.'],
    ['cotizacion_lugar_entrega','En sus instalaciones. Los informes de resultados serán emitidos en formato PDF.'],
  ];
  rows.forEach(r => sh.appendRow(r));
}

function login(req) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Usuarios');
  if (!sheet || sheet.getLastRow() < 2)
    return { success: false, error: 'NO_USERS' };

  const data = sheet.getDataRange().getValues();
  const h    = data[0];
  const iE = h.indexOf('Email'), iP = h.indexOf('Password'),
        iN = h.indexOf('Nombre'), iR = h.indexOf('Rol'), iA = h.indexOf('Activo');
  const email = (req.email || '').toLowerCase().trim();
  const hashedInput = hash(req.password); // HASHEAMOS ENTRADA

  const emailInput = (req.email || '').toLowerCase().trim();
  const passHashed = hash(req.password);

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[iE]).toLowerCase().trim() === emailInput) {
      const storedPass = String(r[iP]);
      const isCorrect = (storedPass === passHashed) || (storedPass === req.password);
      
      if (!isCorrect) return { success: false, error: 'Contraseña incorrecta.' };
      if (String(r[iA]).toUpperCase() !== 'SI') return { success: false, error: 'Cuenta inactiva.' };
      
      const superIdx = hdrs.indexOf('SuperAdmin');
      const isSuper = (String(emailInput).toLowerCase() === 'francisco.rojasp@gmail.com') || (superIdx !== -1 && String(r[superIdx]).toUpperCase() === 'SI');

      const token = makeToken(emailInput, r[iN], r[iR], req.ip);
      return { 
        success: true, 
        token, 
        user: { 
          email: emailInput, 
          name: r[iN], 
          role: r[iR], 
          isSuper: isSuper,
          isOwner: (String(emailInput).toLowerCase() === 'francisco.rojasp@gmail.com')
        } 
      };
    }
  }
  return { success: false, error: 'Usuario no encontrado.' };
}

function read(req) {
  const user = auth(req);
  if (!user) return { success: false, error: 'No autorizado' };

  const res = _getMaskedRows(req.sheet, user);
  return res;
}

function _getMaskedRows(sheetName, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  // BLOQUEO TOTAL DE HOJAS SENSIBLES (Zero-Trust)
  const blacklist = ['Nomina_Control', 'Finanzas_Ingresos', 'Configuracion', 'Logs_Auditoria'];
  const isHighSilver = ['admin', 'socio', 'gerente'].includes(user.role);
  
  if (blacklist.includes(sheetName) && !isHighSilver) {
    return { success: false, error: 'Acceso denegado a datos sensibles' };
  }

  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };
  
  const all = sheet.getDataRange().getValues();
  const hdrs = all[0];
  const isUserSheet = (sheetName === 'Usuarios');

  // FILTRADO POR VENDEDOR (Seguridad Horizontal)
  let rowsRaw = all.slice(1);
  if (user.role === 'vendedor') {
    const idxVendedor = hdrs.indexOf('Vendedor_ID') !== -1 ? hdrs.indexOf('Vendedor_ID') : hdrs.indexOf('Email_Vendedor');
    if (idxVendedor !== -1 && (sheetName === 'Cotizaciones' || sheetName === 'Seguimiento')) {
      rowsRaw = rowsRaw.filter(r => String(r[idxVendedor]).toLowerCase() === String(user.email).toLowerCase());
    }
  }

  const rowsProcessed = rowsRaw.map((row, i) => {
    const o = { _rowIndex: i + 2 };
    hdrs.forEach((h, j) => { 
      if (isUserSheet && h === 'Password') {
        o[h] = '********';
        return;
      }

      let val = row[j];
      const dateHdrs = ['Fecha','Registro','Seguimiento','Validez'];
      const isDateCol = dateHdrs.some(dh => h.includes(dh));

      if (val instanceof Date) {
        if (isDateCol) {
          val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        } else {
          val = String(val);
        }
      }
      o[h] = (val === undefined || val === null) ? '' : val; 
    });
    return o;
  });

  return { success: true, data: rowsProcessed };
}

/**
 * Habilita al usuario solicitado vera.hugo712@gmail.com como administrador.
 * Esta función es de utilidad única para cumplir con el requerimiento del sistema.
 */
function habilitarUsuarioSolicitado() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Usuarios');
  if (!sh) {
    setup();
    sh = ss.getSheetByName('Usuarios');
  }
  
  const data = sh.getDataRange().getValues();
  const emailTarget = 'vera.hugo712@gmail.com';
  let found = false;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === emailTarget) {
      // Si existe, aseguramos que sea admin y esté activo
      sh.getRange(i + 1, 4).setValue('admin'); // Rol
      sh.getRange(i + 1, 5).setValue('SI');    // Activo
      found = true;
      break;
    }
  }
  
  if (!found) {
    const newUser = [
      Utilities.getUuid(),
      emailTarget,
      'Hugo Vera',
      'admin',
      'SI',
      new Date().toISOString().split('T')[0],
      '' // Password vacío, deberá establecerlo al entrar o vía reset
    ];
    sh.appendRow(newUser);
  }
  
  return "Usuario vera.hugo712@gmail.com habilitado correctamente como admin.";
}

function batchRead(req) {
  const user = auth(req);
  if (!user) return { success: false, error: 'No autorizado' };

  const out = {};
  for (const name of (req.sheets || [])) {
    const res = _getMaskedRows(name, user);
    out[name] = res.success ? res.data : [];
  }
  return { success: true, data: out };
}

function append(req) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(req.sheet);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + req.sheet };
  const cols  = HEADERS[req.sheet] || sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  
  // ─── INTERCEPTORES FINANCE ERP (v6) ─────────────────────────────────────────────
  
  // A. Redondeo de Tasa (Obligatorio SENIAT)
  if (req.data.Tasa) {
    req.data.Tasa = _roundVES(req.data.Tasa);
  }

  // B. Ingresos: Cálculos Fiscales
  if (req.sheet === 'Finanzas_Ingresos') {
    const tasaActual = Number(req.data.Tasa || 0);
    const montoUSD = Number(req.data['Total USD'] || 0);

    // Validar Secuencia Legal
    if (req.data.Nro_Control_Factura) {
      const seqCheck = validarSecuenciaFactura(req.data.Nro_Control_Factura);
      if (!seqCheck.success) return { success: false, error: seqCheck.error };
    }
    
    // Auto-cálculo de IGTF y Redondeo
    const fiscal = calcFiscalidad(montoUSD, tasaActual, false, req.data['Método']);
    req.data['Total VES'] = fiscal.total_con_igtf_ves;
    req.data['IGTF_VES'] = fiscal.igtf_ves;
  }

  // C. Egresos: Nómina y Productividad
  if (req.sheet === 'Finanzas_Egresos') {
    const montoUSD = Number(req.data['Total USD'] || 0);
    const categoria = req.data['Categoría'];
    
    // Validar Presupuesto
    const budgetCheck = checkBudget(categoria, montoUSD);
    if (!budgetCheck.success) {
      return { success: false, error: budgetCheck.error, type: 'BUDGET_EXCEEDED' };
    }

    if (categoria === 'Nómina') {
       _updateLaborLiabilities(req.data);
       // Liquidar tareas a destajo si se proporciona ID_Empleado
       if (req.data.ID_Empleado) {
         _settlePieceworkTasks(req.data.ID_Empleado);
       }
    }
  }
  
  // ─── LÓGICA ESTÁNDAR ───────────────────────────────────────────────────────
  
  if (req.sheet === 'Usuarios') {
    if (req.data.Password) req.data.Password = hash(req.data.Password);
    if (req.data.Activo) req.data.Activo = String(req.data.Activo).toUpperCase();
  }

  if (cols.includes('ID') && (!req.data.ID || req.data.ID === '')) {
    req.data.ID = Utilities.getUuid();
  }
  
  sheet.appendRow(cols.map(h => {
    if (req.data[h] === undefined) return '';
    if (typeof req.data[h] === 'number') return req.data[h];
    return String(req.data[h]);
  }));

  // 4. Log Auditoría
  logAction('CREATE', req.sheet, req.data.ID || 'N/A', req.data);

  return { success: true };
}

function batchAppend(req) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(req.sheet);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + req.sheet };
  if (!req.data || !req.data.length) return { success: true };
  
  const cols = HEADERS[req.sheet] || sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const hasID = cols.includes('ID');

  const rows = req.data.map(row => cols.map(h => {
    if (h === 'ID' && (!row[h] || row[h] === '')) {
      row[h] = Utilities.getUuid();
    }
    if (req.sheet === 'Usuarios' && h === 'Activo' && row[h]) {
      row[h] = String(row[h]).toUpperCase();
    }
    if (row[h] === undefined) return '';
    if (typeof row[h] === 'number') return row[h];
    return String(row[h]);
  }));
  
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, cols.length).setValues(rows);
  return { success: true, count: rows.length };
}

function clearSheets(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToClear = req.sheets || ['Contactos', 'Productos', 'TasasCambio'];
  sheetsToClear.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    }
  });
  return { success: true };
}

function update(req) {
  const user = auth(req);
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(req.sheet);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + req.sheet };
  
  // BLOQUEO DE INALTERABILIDAD FISCAL (SNAT/2024/00121)
  const fiscalSheets = ['Finanzas_Ingresos', 'Finanzas_Egresos', 'Cotizaciones', 'Nomina_Control'];
  if (fiscalSheets.includes(req.sheet) && !req.permitidoOverride) {
    return { success: false, error: 'CERTIFICACIÓN SNAT/2024/00121: Los registros fiscales son inalterables. Todo ajuste debe realizarse mediante Notas de Crédito/Débito en el módulo de Notas de Operaciones.' };
  }

  const cols  = HEADERS[req.sheet] || sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  
  // 0. Interceptores ERP para Update
  if (req.sheet === 'Finanzas_Egresos' && req.data['Total USD']) {
     const budgetCheck = checkBudget(req.data['Categoría'], Number(req.data['Total USD']), true); // true = update mode
     if (!budgetCheck.success) return budgetCheck;
  }

  // 1. Obtener datos actuales de la fila (para no perder campos no enviados)
  const currentRowValues = sheet.getRange(req.rowIndex, 1, 1, cols.length).getValues()[0];
  const mergedData = {};
  cols.forEach((h, i) => {
    mergedData[h] = currentRowValues[i];
  });

  // 2. Seguridad: Verificar que el ID en esa fila coincida con el solicitado
  const idIdx = cols.indexOf('ID');
  if (idIdx !== -1 && req.data.ID) {
    const rowId = String(mergedData['ID']);
    if (rowId !== String(req.data.ID)) {
      return { success: false, error: 'ID Mismatch: La fila ha cambiado o el ID no coincide. Por favor recargue.' };
    }
  }
  
  // 3. Mezclar nuevos datos sobre los existentes
  Object.keys(req.data).forEach(key => {
    mergedData[key] = req.data[key];
  });

  // 4. Procesar Passwords (Solo si es la hoja de Usuarios)
  if (req.sheet === 'Usuarios' && req.data.Password) {
    const oldPass = currentRowValues[cols.indexOf('Password')];
    if (req.data.Password !== oldPass) {
      mergedData['Password'] = hash(req.data.Password);
    }
  }

  // 5. Mapear de nuevo al array de la fila
  const row = cols.map(h => {
    const val = mergedData[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'number') return val;
    return String(val);
  });
  
  const rng = sheet.getRange(req.rowIndex, 1, 1, row.length);
  rng.setValues([row]);
  rng.setNumberFormat(""); // Limpiar formatos forzados
  
  // 6. Log Auditoría
  logAction('UPDATE', req.sheet, mergedData['ID'] || 'N/A', { anterior: currentRowValues, nuevo: row });

  return { success: true };
}

function del(req) {
  const user = auth(req);
  if (!user) return { success: false, error: 'No autorizado' };
  
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(req.sheet);
  if (!sheet) return { success: false, error: 'Hoja no encontrada: ' + req.sheet };

  // BLOQUEO DE INALTERABILIDAD FISCAL (SNAT/2024/00121)
  const fiscalSheets = ['Finanzas_Ingresos', 'Finanzas_Egresos', 'Cotizaciones', 'Nomina_Control'];
  if (fiscalSheets.includes(req.sheet)) {
    return { success: false, error: 'CERTIFICACIÓN SNAT/2024/00121: Prohibido eliminar registros con valor fiscal. Use Notas de Crédito para ajustes.' };
  }
  
  // Log Auditoría antes de borrar
  const cols = HEADERS[req.sheet] || [];
  const rowData = sheet.getRange(req.rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = cols.indexOf('ID');
  const recordId = idIdx !== -1 ? rowData[idIdx] : 'N/A';
  
  logAction('DELETE', req.sheet, recordId, rowData);

  sheet.deleteRow(req.rowIndex);
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════════════
// Ejecutar desde el editor UNA SOLA VEZ para crear las hojas
// ════════════════════════════════════════════════════════════════════════════
function configurarSistema() {
  setup();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('CRM ERGOEXPRESS');
  ss.setSpreadsheetLocale('es_VE');
  // Eliminar hoja vacía por defecto
  ['Hoja 1','Sheet1','Hoja1'].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh && ss.getSheets().length > Object.keys(HEADERS).length) try { ss.deleteSheet(sh); } catch(e) {}
  });
  SpreadsheetApp.getUi().alert(
    '✅ Sistema listo',
    'El CRM ha sido configurado correctamente y las hojas de datos (incluyendo Finanzas y Agenda) están listas.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(HEADERS[name]);
      sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold').setBackground('#2d3436').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    } else {
      // Verificar si faltan columnas
      const existingHeaders = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
      HEADERS[name].forEach(h => {
        if (existingHeaders.indexOf(h) === -1) {
          sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold').setBackground('#2d3436').setFontColor('#ffffff');
        }
      });
    }
    
    // Auto-ajuste de columnas
    if (sh.getLastColumn() > 0) sh.autoResizeColumns(1, sh.getLastColumn());
  });

  // Configuración Inicial de Datos de Empresa
  _initConfig(ss);

  // VALIDACIONES DE DATOS (Dropdowns sugeridos para integridad)
  const shUser = ss.getSheetByName('Usuarios');
  if (shUser) {
    const hdrs = shUser.getRange(1, 1, 1, shUser.getLastColumn()).getValues()[0];
    const iRol = hdrs.indexOf('Rol') + 1;
    const iAct = hdrs.indexOf('Activo') + 1;
    const iSup = hdrs.indexOf('SuperAdmin') + 1;

    if (iRol > 0) {
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(['admin', 'vendedor', 'socio', 'gerente']).build();
      shUser.getRange(2, iRol, 100).setDataValidation(rule);
    }
    if (iAct > 0) {
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO']).build();
      shUser.getRange(2, iAct, 100).setDataValidation(rule);
    }
    if (iSup > 0) {
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO']).build();
      shUser.getRange(2, iSup, 100).setDataValidation(rule);
    }
  }

  return { success: true, message: 'Sistema configurado y sincronizado exitosamente.' };
}

function savePDFToDrive(req) {
  try {
    auth(req);
    let folder;
    const folders = DriveApp.getFoldersByName("Cotizaciones");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("Cotizaciones");
    }
    
    const blob = Utilities.newBlob(Utilities.base64Decode(req.base64), 'application/pdf', req.filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { success: true, url: file.getUrl(), id: file.getId() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function syncToCalendar(req) {
  try {
    auth(req);
    const data = req.data; // { Fecha, Hora, Asunto, Tipo, Notas, ID Cliente, Usuario Email }
    
    // 1. Obtener o crear el calendario compartido del CRM
    let crmCal;
    const cals = CalendarApp.getCalendarsByName("CRM ERGOEXPRESS");
    if (cals.length > 0) {
      crmCal = cals[0];
    } else {
      crmCal = CalendarApp.createCalendar("CRM ERGOEXPRESS");
      crmCal.setDescription("Calendario Centralizado del CRM ERGOEXPRESS");
    }
    
    // 2. Preparar fecha y hora (asumimos 1 hora de duración)
    const start = new Date(data['Fecha'] + 'T' + (data['Hora'] || '09:00'));
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    
    // 3. Crear el evento
    const options = {
      description: `Tipo: ${data['Tipo']}\nCliente: ${data['ID Cliente'] || 'Particular'}\nNotas: ${data['Notas'] || ''}\nRegistro CRM: ${data['ID']}`,
    };
    
    // Agregar al creador como invitado para que le aparezca en su propio calendario (Sincronización Dual)
    const creatorEmail = data['Usuario Email'];
    if (creatorEmail && creatorEmail.includes('@')) {
      options.guests = creatorEmail;
      options.sendInvites = true;
    }
    
    const event = crmCal.createEvent(
      `[${data['Tipo'] || 'Cita'}] ${data['Asunto']}`,
      start,
      end,
      options
    );
    
    return { success: true, eventId: event.getId() };
  } catch (e) {
    return { success: false, error: 'Error Sync Calendar: ' + e.message };
  }
}

/**
 * Obtiene la tasa oficial del BCV (USD) mediante web scraping.
 */
function fetchBCVRate() {
  try {
    const url = 'https://www.bcv.org.ve/';
    const options = {
      'muteHttpExceptions': true,
      'followRedirects': true,
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      return { success: false, error: 'Servidor BCV no disponible (HTTP ' + response.getResponseCode() + ')' };
    }
    
    const html = response.getContentText();
    
    // El BCV suele tener la tasa en un div con id="dolar" o similar. 
    // Buscamos el patrón: <div id="dolar"> ... <strong> 47,4061 </strong>
    // Nota: El regex debe ser flexible ante espacios y cambios menores.
    const regex = /id=["']dolar["'][^>]*>[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i;
    const match = html.match(regex);
    
    if (match && match[1]) {
      let rateStr = match[1].replace(',', '.'); // Convertir coma decimal a punto
      const rate = parseFloat(rateStr);
      
      if (!isNaN(rate) && rate > 0) {
        return { 
          success: true, 
          rate: rate, 
          date: new Date().toISOString().split('T')[0],
          source: 'BCV (Auto)'
        };
      }
    }
    
    // Intento 2: Buscar por etiquetas de texto si el ID falló
    const regex2 = /Dólar[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i;
    const match2 = html.match(regex2);
    if (match2 && match2[1]) {
       let rateStr = match2[1].replace(',', '.');
       const rate = parseFloat(rateStr);
       if (!isNaN(rate)) return { success: true, rate, date: new Date().toISOString().split('T')[0], source: 'BCV (Auto-Alt)' };
    }

    return { success: false, error: 'No se pudo localizar el valor de la tasa en el HTML del BCV.' };
  } catch (err) {
    return { success: false, error: 'Error al consultar BCV: ' + err.message };
  }
}

/**
 * Comunicación con Google Gemini AI (v1 Estable)
 */
function askGemini(req) {
  const apiKey = req.geminiApiKey;
  // Lista expandida para cubrir distintos niveles de acceso
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
  let lastError = '';

  for (const modelId of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
      const systemPrompt = `Eres "ERGO-AI", el asistente experto del CRM ERGOEXPRESS.
      Tu objetivo es ayudar a los vendedores y administradores a gestionar el sistema ERGOEXPRESS (Seguridad, Ergonomía e Higiene en Venezuela).
      Hoy es ${new Date().toLocaleDateString('es-VE')}.`;

      const contents = [...req.contents];
      contents.unshift({ role: 'user', parts: [{ text: `IDENTIDAD: ${systemPrompt}.` }] });
      contents.unshift({ role: 'model', parts: [{ text: "Entendido. Soy ERGO-AI. ¿Cómo puedo ayudarte?" }] });

      const payload = {
        contents: contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const resJson = JSON.parse(response.getContentText());

      if (response.getResponseCode() === 200) {
        return { success: true, answer: resJson.candidates[0].content.parts[0].text };
      }
      
      lastError = resJson.error?.message || 'Error desconocido';
      console.warn(`[AI] Falló modelo ${modelId}: ${lastError}`);
      
    } catch (err) {
      lastError = err.message;
      console.error(`[AI] Error crítico con ${modelId}: ${err.message}`);
    }
  }

  return { success: false, error: lastError };
}

/**
 * FUNCIÓN DE MIGRACIÓN SEGURA — EJECUTAR UNA SOLA VEZ
 * ────────────────────────────────────────────────────────────────────────────
 * Añade las columnas faltantes (Banco, Referencia Nº, Pagador) a la hoja de 
 * Finanzas_Egresos de forma inofensiva.
 */
function migrarTablasEgresos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Finanzas_Egresos');
  if (!hoja) return 'Error: No se encontró la hoja Finanzas_Egresos';

  const headersActuales = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const headersObjetivo = ['ID','Fecha','Beneficiario','Categoría','Concepto','Referencia','Método', 'Banco', 'Referencia Nº', 'Pagador', 'Tasa', 'Total USD','Total VES','Estado','Usuario Email'];
  
  // 1. Verificar si faltan columnas
  headersObjetivo.forEach((h, index) => {
    if (!headersActuales.includes(h)) {
      // Si el header no existe, lo añadimos al final por seguridad
      hoja.getRange(1, hoja.getLastColumn() + 1).setValue(h);
      Logger.log('Añadida columna: ' + h);
    }
  });

// 2. Sincronizar el orden exacto (Opcional, pero para mayor seguridad solo informamos)
  return 'Migración completada. Por favor, asegúrese de que las columnas están presentes en su hoja.';
}

/**
 * REPARACIÓN DE DATOS DE USUARIOS
 * ────────────────────────────────────────────────────────────────────────────
 * 1. Asigna IDs (UUID) a usuarios que no lo tengan.
 * 2. Normaliza el estado Activo a "SI" (en mayúsculas).
 * 3. Corrige la cuenta de francisco.rojasp@gmail.com si es necesario.
 */
function repararCuentasUsuarios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Usuarios');
  if (!sh) return "Error: Hoja 'Usuarios' no existe.";
  
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const iID = hdrs.indexOf('ID');
  const iEm = hdrs.indexOf('Email');
  const iAc = hdrs.indexOf('Activo');
  const iPa = hdrs.indexOf('Password');
  
  if (iID === -1 || iEm === -1 || iAc === -1 || iPa === -1) return "Error: Columnas críticas no encontradas.";
  
  let repairs = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;
    let changed = false;
    
    // 1. Verificar ID
    if (!row[iID] || row[iID] === '') {
      sh.getRange(rowNum, iID + 1).setValue(Utilities.getUuid());
      changed = true;
    }
    
    // 2. Normalizar "SI"
    const status = String(row[iAc]).toUpperCase().trim();
    if (status === 'SI' && row[iAc] !== 'SI') {
      sh.getRange(rowNum, iAc + 1).setValue('SI');
      changed = true;
    }

    // 3. Encriptar contraseñas antiguas (Texto plano)
    const rawPass = String(row[iPa] || '');
    if (rawPass !== '' && rawPass.length < 60) {
      sh.getRange(rowNum, iPa + 1).setValue(hash(rawPass));
      changed = true;
    }
    
    if (changed) repairs++;
  }
  
  return `Mantenimiento completado. Se repararon ${repairs} registros de usuarios.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 MÓDULO ERP FINANCE: MIGRACIÓN Y MOTOR MATEMÁTICO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MIGRACIÓN AUTOMÁTICA: Expande la estructura de datos local a ERP Finance.
 * No borra datos, solo añade columnas faltantes y crea nuevas hojas.
 */
function migrarEstructuraFinance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToProcess = Object.keys(HEADERS);
  let logs = [];

  sheetsToProcess.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    const expectedHeaders = HEADERS[sheetName];

    if (!sheet) {
      // Crear hoja si no existe
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
      logs.push(`Hoja creada: ${sheetName}`);
    } else {
      // Verificar y añadir columnas faltantes
      const existingHeaders = sheet.getDataRange().getValues()[0];
      expectedHeaders.forEach(header => {
        if (existingHeaders.indexOf(header) === -1) {
          const lastCol = sheet.getLastColumn();
          sheet.insertColumnAfter(lastCol);
          sheet.getRange(1, lastCol + 1).setValue(header);
          sheet.getRange(1, lastCol + 1).setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold');
          logs.push(`Columna añadida a ${sheetName}: ${header}`);
        }
      });
    }
  });

  return { success: true, logs: logs };
}

// ─── MOTOR MATEMÁTICO FISCAL (Senior Accountant Logic) ────────────────────────

/**
 * Calcula IGTF (3%) sobre pagos en divisas.
 */
function calcIGTF(montoUSD, tasaBCV) {
  const montoVES = montoUSD * tasaBCV;
  return {
    monto_usd: montoUSD,
    igtf_ves: Number((montoVES * 0.03).toFixed(2)),
    base_ves: Number(montoVES.toFixed(2))
  };
}

/**
 * Calcula Retenciones IVA (75% o 100%) e ISLR.
 */
function calcRetenciones(baseImponibleVES, alicuotaIVA = 0.16, esEspecial = true, islrPorcentaje = 0.03) {
  const ivaTotal = baseImponibleVES * alicuotaIVA;
  const retencionIVA = esEspecial ? (ivaTotal * 0.75) : (ivaTotal * 1.00);
  const retencionISLR = baseImponibleVES * islrPorcentaje;
  
  return {
    iva_total_ves: Number(ivaTotal.toFixed(2)),
    retencion_iva_ves: Number(retencionIVA.toFixed(2)),
    retencion_islr_ves: Number(retencionISLR.toFixed(2))
  };
}

/**
 * Diferencial Cambiario: Compara tasa de origen vs tasa de pago.
 */
function calcDiferencial(montoUSD, tasaOrigen, tasaPago) {
  const vesOrigen = montoUSD * tasaOrigen;
  const vesPago = montoUSD * tasaPago;
  return {
    diferencial_ves: Number((vesPago - vesOrigen).toFixed(2)),
    tasa_variacion: Number((tasaPago - tasaOrigen).toFixed(4))
  };
}

// ─── MOTOR MATEMÁTICO LABORAL (LOTTT & Parafiscal) ───────────────────────────

/**
 * Calcula Garantía de Prestaciones (15 días trimestrales).
 */
function calcPrestacionesGarantia(sueldoIntegralVES) {
  const salarioDiario = sueldoIntegralVES / 30;
  return {
    dias: 15,
    monto_garantia_ves: Number((salarioDiario * 15).toFixed(2))
  };
}

/**
 * Retorna deducciones de ley para el empleado y aportes del patrono.
 */
function calcAportesNomina(sueldoVES) {
  return {
    empleado: {
      ivss: Number((sueldoVES * 0.04).toFixed(2)),
      faov: Number((sueldoVES * 0.01).toFixed(2))
    },
    patrono: {
      ivss: Number((sueldoVES * 0.10).toFixed(2)), // 10% fijo para medianos/grandes
      faov: Number((sueldoVES * 0.02).toFixed(2)),
      inces: Number((sueldoVES * 0.02).toFixed(2))
    }
  };
}

/**
 * Provisión mensual para Vacaciones y Utilidades (min 15 días/año c/u).
 */
function calcVacacionesUtilidades(sueldoIntegralVES) {
  const provisionMensualVac = (sueldoIntegralVES / 360) * 15;
  const provisionMensualUtil = (sueldoIntegralVES / 360) * 15;
  return {
    mensual_vacaciones_ves: Number(provisionMensualVac.toFixed(2)),
    mensual_utilidades_ves: Number(provisionMensualUtil.toFixed(2))
  };
}

/**
 * Indexación de sueldo según BCV.
 */
function indexarSueldo(montoUSD, tasaBCV) {
  return Number((montoUSD * tasaBCV).toFixed(2));
}

/**
 * Costo de Servicio (Estructura SUNDDE).
 */
function calcCostoServicio(horas, costoHora, overheadPerc = 0.3) {
  const base = horas * costoHora;
  const overhead = base * overheadPerc;
  return {
    costo_directo: base,
    overhead: overhead,
    costo_total: base + overhead
  };
}

// ─── HELPERS DE INTEGRACIÓN ──────────────────────────────────────────────────

/**
 * Busca la tasa BCV original de una cotización.
 */
function _getQuoteRate(quoteId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Cotizaciones');
  if (!sh) return null;
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const iID = hdrs.indexOf('ID');
  const iVES = hdrs.indexOf('Total VES');
  const iUSD = hdrs.indexOf('Total USD');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][iID]) === String(quoteId)) {
      const ves = Number(data[i][iVES] || 0);
      const usd = Number(data[i][iUSD] || 0);
      return usd > 0 ? Number((ves / usd).toFixed(4)) : null;
    }
  }
  return null;
}

/**
 * Valida si un gasto excede el presupuesto mensual de su partida.
 */
function checkBudget(partida, montoUSD, isUpdate = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Presupuestos');
  if (!sh) return { success: true }; // Si no hay hoja, no bloqueamos (graceful degradation)

  const now = new Date();
  const mesAnio = _formatMesAnio(now);
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const iPartida = hdrs.indexOf('Partida');
  const iMes = hdrs.indexOf('Mes_Año');
  const iAsignado = hdrs.indexOf('Monto_Asignado_USD');
  const iEjecutado = hdrs.indexOf('Monto_Ejecutado_USD');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iPartida] === partida && data[i][iMes] === mesAnio) {
      const asignado = Number(data[i][iAsignado] || 0);
      const ejecutado = Number(data[i][iEjecutado] || 0);
      
      if (!isUpdate && (ejecutado + montoUSD > asignado)) {
        return { 
          success: false, 
          error: `Presupuesto insuficiente para ${partida}. Disponible: $${(asignado - ejecutado).toFixed(2)}` 
        };
      }
      
      // Actualizar el ejecutado si es un append exitoso (esto se hará después en la lógica de negocio real)
      // Por ahora solo validamos.
      return { success: true };
    }
  }
  
  return { success: true }; // Si no hay presupuesto definido, permitimos el gasto (flexible)
}

function _formatMesAnio(date) {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${meses[date.getMonth()]}-${date.getFullYear()}`;
}

/**
 * Actualiza el historial de pasivos laborales al registrar una nómina.
 */
function _updateLaborLiabilities(expenseData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Pasivos_Laborales');
  if (!sh) return;
  
  // Lógica simplificada: Registrar el aporte a pasivos en base al sueldo pagado
  // En una implementación real buscaría al empleado en Nomina_Control
  const sueldoVES = Number(expenseData['Total VES'] || 0);
  const sueldoIntegralVES = sueldoVES * 1.20; // Estimación bono vac/util
  
  const garantia = calcPrestacionesGarantia(sueldoIntegralVES);
  
  sh.appendRow([
    Utilities.getUuid(),
    'AUTO-GEN',
    _getTrimestreActual(),
    15,
    garantia.monto_garantia_ves,
    0
  ]);
}

/**
 * Liquida todas las tareas pendientes de un empleado (Cierre de Nómina mensual).
 */
function _settlePieceworkTasks(idEmpleado) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Nomina_Detalle');
  if (!sh) return;
  
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const idxId = hdrs.indexOf('ID_Empleado');
  const idxEst = hdrs.indexOf('Estatus_Pago');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxId]) === String(idEmpleado) && data[i][idxEst] !== 'PAGADO') {
      sh.getRange(i + 1, idxEst + 1).setValue('PAGADO');
    }
  }
}

/**
 * Valida que no se dupliquen números de control de facturación (Providencia 0071).
 */
function validarSecuenciaFactura(nroControl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Finanzas_Ingresos');
  if (!sh) return { success: true };
  
  const data = sh.getDataRange().getValues();
  const hdrs = data[0];
  const idxC = hdrs.indexOf('Nro_Control_Factura');
  
  const existe = data.slice(1).some(row => String(row[idxC]) === String(nroControl));
  if (existe) {
    return { success: false, error: "El Nro de Control " + nroControl + " ya existe. Bloqueo fiscal preventivo." };
  }
  return { success: true };
}

function _getTrimestreActual() {
  const mes = new Date().getMonth() + 1;
  if (mes <= 3) return 'T1';
  if (mes <= 6) return 'T2';
  if (mes <= 9) return 'T3';
  return 'T4';
}

/**
 * Acción Central de Nómina: Registra egreso, cierra tareas y notifica.
 */
function executePayrollAction(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tasa = _roundVES(fetchBCVRate().tasa || 36.5);
  const data = req.data || {};
  
  try {
    // 1. Registrar Egreso en Finanzas_Egresos
    const shEgresos = ss.getSheetByName('Finanzas_Egresos');
    const idEgreso = Utilities.getUuid();
    const totalUSD = _roundVES(data.amountUSD || 0);
    const totalVES = _roundVES(totalUSD * tasa);
    
    const nuevoEgreso = [
      idEgreso,
      new Date().toISOString().split('T')[0],
      data.employeeId, // Beneficiario
      'Nómina',        // Categoría
      `Pago Nómina ${data.frequency.toUpperCase()} - Emp: ${data.employeeId}`,
      'N/A',
      'Transferencia', // Método default
      'Banco Principal',
      'REF-' + Utilities.getUuid().substring(0,8),
      'Caja Principal',
      tasa,
      totalUSD,
      totalVES,
      'Pagado',
      req.userEmail || 'admin@ergoexpress.com',
      0, 0, 0, 0, totalUSD, totalVES // Fiscales vacíos para nómina simplificada
    ];
    shEgresos.appendRow(nuevoEgreso);

    // 2. Cerrar Tareas en Nomina_Detalle
    const shDetalle = ss.getSheetByName('Nomina_Detalle');
    if (shDetalle) {
      const allDet = shDetalle.getDataRange().getValues();
      for (let i = 1; i < allDet.length; i++) {
        // Si el empleado coincide y estaba PENDIENTE, marcar como PAGADO
        if (String(allDet[i][1]) === String(data.employeeId) && allDet[i][8] === 'PENDIENTE') {
          shDetalle.getRange(i + 1, 9).setValue('PAGADO');
        }
      }
    }

    // 3. Actualizar Ultima_Liquidacion en Nomina_Control
    const shControl = ss.getSheetByName('Nomina_Control');
    if (shControl) {
      const allCtrl = shControl.getDataRange().getValues();
      for (let i = 1; i < allCtrl.length; i++) {
        if (String(allCtrl[i][0]) === String(data.employeeId)) {
          shControl.getRange(i + 1, 11).setValue(new Date());
          break;
        }
      }
    }

    // 4. Enviar Email (Notificación Humanizada)
    sendPayrollNotification(data.employeeId, data.frequency, totalUSD, tasa);

    return { success: true, phone: data.phone };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function addFiscalAdjustment(req) {
  const user = auth(req);
  if (!user) return { success: false, error: 'No autorizado' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Notas_Operaciones');
  if (!sh) return { success: false, error: 'Hoja Notas_Operaciones no encontrada' };

  // 1. Obtener número correlativo según tipo (NC o ND)
  const prefix = req.data.Tipo === 'Crédito' ? 'NC-' : 'ND-';
  const next = getNextNumber({ sheet: 'Notas_Operaciones', prefix: prefix });
  if (!next.success) return next;

  const row = [
    Utilities.getUuid(),
    next.formatted,
    new Date().toISOString().split('T')[0],
    req.data.Tipo,
    req.data.ID_Registro_Original,
    req.data.Tabla_Original,
    req.data.Concepto,
    Number(req.data.Monto_Ajuste_USD || 0),
    Number(req.data.Total_VES || 0),
    Number(req.data.Tasa || 0),
    user.email
  ];

  sh.appendRow(row);
  logAction('FISCAL_ADJUST', 'Notas_Operaciones', next.formatted, row);

  return { success: true, number: next.formatted };
}

/**
 * CONFIGURACIÓN DE SEGURIDAD AI
 * Ejecutar desde el editor de Apps Script pasando la clave como argumento:
 * setupSecureAI('TU_CLAVE_AQUI')
 */
function setupSecureAI(apiKey) {
  if (!apiKey) throw new Error('Se requiere la API Key para configurar');
  PropertiesService.getScriptProperties().setProperty('GROQ_API_KEY', apiKey);
  return "Clave Groq configurada exitosamente en almacenamiento seguro (PropertiesService).";
}
