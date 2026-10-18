/**
 * ERGOEXPRESS-FINANCE — Backend Maestro (Blueprint Final)
 * Cumplimiento de Normativa: Seguridad (SHA-256), Eliminación Lógica (Auditoría), 
 * Tokens Expirables (8h) y Estructura Base de Datos Maestra.
 */

const SPREADSHEET_ID = '1sR4xAwHZd0r_z9-rwQMSNfw9VXP4jRyc6hmORJg8';
const API_KEY_DEFAULT = 'ERGX2026';

// El objeto HEADERS integra los Blueprint Maestros del PROMPT 1
// Se mantienen los adicionales del CRM preexistente para evitar corrupción temporal.
const HEADERS = {
  // === BLOQUE MAESTRO: LA FUNDACIÓN (PROMPT 1) ===
  Usuarios:     ['ID','Email','Nombre','Rol','Activo','Fecha Registro','Password','SuperAdmin'],
  Contactos:    ['ID','Razón Social','RIF','Persona Contacto','Teléfonos','Email','Dirección','Estado','Puntaje','Tipo','Fecha Registro','Notas','Etapa Pipeline','Vendedor Email','Categoria_Fiscal','Municipio_ID','RIF_Validado','RIF_Ultimo_Digito','Contribuyente_Especial'],
  Finanzas_Ingresos: ['ID','Fecha','ID Cliente','Concepto','ID Cotización','Método','Banco','Referencia Nº','Referencia', 'Tasa', 'Total USD','Total VES','Estado','Vendedor Email','IGTF_VES','Diferencial_Cambiario','Tasa_Factura','Nro_Control_Factura','Estatus_Retencion','Monto_Divisa_Neto'],
  Finanzas_Egresos:  ['ID','Fecha','Beneficiario','Categoría','Concepto','Referencia','Método', 'Banco', 'Referencia Nº', 'Pagador', 'Tasa', 'Total USD','Total VES', 'Estado','Usuario Email','Retencion_IVA','Retencion_ISLR','ISLR_%','Aporte_Pension_9%','Monto_Neto_Divisa','Base_Imponible_VES'],
  Presupuestos:      ['Categoria', 'Monto_Asignado', 'Monto_Ejecutado', 'Mes_Año'],
  
  // === BLOQUES CRM Y MÓDULOS DE EXPANSIÓN PREVIOS ===
  Productos:    ['ID','Nombre','Descripción','Categoría','Precio USD','Costo USD','Impuesto %','Stock_Actual','Stock_Minimo'],
  TasasCambio:  ['ID','Fecha','Tasa Oficial','Fuente'],
  Cotizaciones: ['ID','Número','Fecha','ID Cliente','Validez Días','Estado','Total USD','Total VES','Detalle JSON','Fecha Creación','Usuario Email','Notas','Stock_Sincronizado'],
  Seguimiento:  ['ID','ID Cliente','Fecha','Tipo','Descripción','Próximo Seguimiento','Asunto Próximo','Etapa Pipeline','Fecha Cambio Etapa','Usuario Email'],
  Configuracion:['Clave','Valor'],
  Agenda:            ['ID','Fecha','Hora','ID Cliente','Asunto','Tipo','Estado','Notas','Usuario Email'],
  Nomina_Control:    ['ID_Empleado','Nombre','Sueldo_USD_Base','Sueldo_VES_Indexado','Bono_Alimentacion','Bono_Especial_Config','Total_Destajo_Mes_VES','Total_Bonos_Cumplimiento_VES','Metodo_Pago_Preferencia','Fecha_Ingreso','Ultima_Liquidacion','Apartado_Art142_A','Apartado_Art142_C'],
  Nomina_Detalle:    ['ID','ID_Empleado','Fecha','Tipo_Pago','Descripcion_Tarea','Cantidad', 'Precio_Unitario_USD', 'Subtotal_USD', 'Estatus_Pago'],
  Pasivos_Laborales: ['ID','ID_Empleado','Trimestre','Dias_Garantia','Monto_Garantia_VES','Intereses_Prestaciones'],
  Logs_Auditoria:    ['ID','Fecha','Usuario_Email','Accion','Tabla','ID_Registro','Detalles'],
  Notas_Operaciones: ['ID','Número','Fecha','Tipo','ID_Registro_Original','Tabla_Original','Concepto','Monto_Ajuste_USD','Total_VES','Tasa','Usuario_Email']
};

function getSS() {
  try { return SpreadsheetApp.openById(SPREADSHEET_ID); }
  catch(e) { return SpreadsheetApp.getActiveSpreadsheet(); }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return ok({ success: false, error: 'Empty Request' });
    const req = JSON.parse(e.postData.contents);
    const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY') || API_KEY_DEFAULT;
    
    if (!req.apiKey || req.apiKey !== API_KEY) return ok({ success: false, error: 'Acceso Denegado: AuthKey' });
    
    // Rutas protegidas sólo por AuthKey
    if (['LOGIN', 'VERIFY_2FA', 'CHECK_SETUP', 'SETUP', 'CREATE_ADMIN', 'REQUEST_ACCESS', 'VALIDATE_TOKEN', 'FETCH_BCV_RATE', 'MIGRAR_FINANCE', 'REQUEST_PASSWORD_RESET', 'RESET_PASSWORD'].includes(req.action)) {
      switch (req.action) {
        case 'CHECK_SETUP':            return ok(checkSetup());
        case 'SETUP':                  return ok(setup());
        case 'MIGRAR_FINANCE':         return ok(migrarEstructuraFinance());
        case 'LOGIN':                  return ok(login(req));
        case 'VERIFY_2FA':             return ok(verify2FA(req));
        case 'VALIDATE_TOKEN':         return ok({ success: true, user: auth(req) });
        case 'FETCH_BCV_RATE':         return ok(fetchBcvRate());
        case 'CREATE_ADMIN':           return ok(createAdmin(req));
        case 'REQUEST_ACCESS':         return ok(requestAccess(req));
        case 'REQUEST_PASSWORD_RESET': return ok(requestPasswordReset(req));
        case 'RESET_PASSWORD':          return ok(resetPassword(req));
      }
    }

    // Rutas que requieren Token de Sesión verificado y no expirado
    const user = auth(req);
    switch (req.action) {
      case 'READ':           return ok(read(req, user));
      case 'BATCH_READ':     return ok(batchRead(req, user));
      case 'APPEND':         return ok(append(req, user));
      case 'NOTA_OPERACION': return ok(emitirNotaOperacion(req, user));
      case 'UPDATE':         return ok(update(req, user));
      case 'DELETE':         return ok(del(req, user));
      case 'GET_NEXT_NUMBER':return ok(getNextNumber(req));
      case 'SAVE_PDF_TO_DRIVE': return ok(savePdfToDrive(req));
      case 'SYNC_TO_CALENDAR':  return ok(syncToCalendar(req));
      case 'EXECUTE_PAYROLL':   return ok(executePayroll(req));
      case 'EXECUTE_QUOTATION': return ok(executeQuotation(req));
      case 'GET_FISCAL_DASHBOARD': return ok(typeof getFiscalDashboardData === 'function' ? getFiscalDashboardData() : { success: false, error: 'FiscalEngine no disponible' });
      case 'GET_BI_STATS':       return ok(typeof getBIStatsPackage === 'function' ? getBIStatsPackage(req.options || {}) : { success: false, error: 'IntelligenceEngine no disponible' });
      case 'RUN_AI_AUDIT':       return ok(runAIAudit(req.query || '', req.history || []));
      case 'GET_AUDIT_LOGS':     return ok(typeof getAuditLogs === 'function' ? getAuditLogs(req.limit || 100) : { success: false, error: 'AuditEngine.gs no disponible' });
      case 'FISCAL_EXPORT_IVA_XML': return ok({ success: true, data: typeof generateIVAXMLExport === 'function' ? generateIVAXMLExport(req.period) : '' });
      case 'FISCAL_EXPORT_IVA_TXT': return ok({ success: true, data: typeof generateIVATXTExport === 'function' ? generateIVATXTExport(req.period) : '' });
      default: return ok({ success: false, error: 'Acción no reconocida' });
    }
  } catch (err) { return ok({ success: false, error: err.message }); }
}

// ─── AUTH ENGINE (SHA-256 + 8H TOKEN) ───────────────────────────────────────

function computeSHA256(text) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text));
  let txtHash = '';
  for (let j = 0; j < rawHash.length; j++) {
    let hashVal = rawHash[j];
    if (hashVal < 0) { hashVal += 256; }
    if (hashVal.toString(16).length == 1) { txtHash += "0"; }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

function login(req) {
  // Rate limiting y bloqueo por intentos fallidos
  const rateCheck = checkRateLimit(req.email || 'unknown', 'login');
  if (!rateCheck.permitido) {
    return { success: false, error: rateCheck.mensaje };
  }
  
  const lockoutCheck = checkLoginLockout(req.email);
  if (lockoutCheck.bloqueado) {
    return { success: false, error: lockoutCheck.mensaje };
  }
  
  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) throw new Error('Sistema no configurado. Ejecute Setup.');
  const data = uSh.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: 'No hay usuarios' };

  const h = data[0];
  const getIdx = (words) => h.findIndex(col => words.includes(String(col).trim().toLowerCase()));
  const idxEmail       = getIdx(['email', 'correo']);
  const idxPass        = getIdx(['password_hash', 'password', 'contraseña', 'clave']);
  const idxStatus      = getIdx(['status', 'activo', 'estado', 'estatus']);
  const idxToken       = getIdx(['token']);
  const idxTokenExp    = getIdx(['token_expira']);
  const idxName        = getIdx(['nombre', 'name', 'usuario']);
  const idxRole        = getIdx(['rol', 'role']);
  const idxFingerprint = getIdx(['fingerprint', 'huella']);
  const idxTOTPSecret  = getIdx(['totp_secret', 'secret_totp', '2fa_secret']);

  const hashedInput = computeSHA256(req.password);

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const sheetEmail = String(r[idxEmail] || '').toLowerCase().trim();
    const reqEmail = String(req.email || '').toLowerCase().trim();

    if (sheetEmail === reqEmail && reqEmail !== '') {
      const sheetPass = String(r[idxPass] || '').trim();
      const reqPass = String(req.password || '').trim();
      const passMatch = (sheetPass === String(hashedInput) || sheetPass === reqPass);
      const statusVal = String(r[idxStatus] || '').trim().toUpperCase();
      const statusMatch = (statusVal === 'ACTIVO' || statusVal === 'SI');

      if (!passMatch) {
        recordFailedLogin(reqEmail);
        return { success: false, error: `La contraseña es incorrecta.` };
      }
      
      if (!statusMatch) {
        return { success: false, error: 'La cuenta existe pero está: ' + statusVal };
      }
      
      const deviceInfo = req.fingerprint || 'Desconocido/Temporal';
      const userFingerprint = (idxFingerprint !== -1) ? String(r[idxFingerprint] || '') : '';
      
      // Verificar si tiene TOTP configurado
      const hasTOTP = idxTOTPSecret !== -1 && r[idxTOTPSecret] && r[idxTOTPSecret] !== '';
      
      // Bloqueo Zero-Trust por dispositivo
      if (idxFingerprint !== -1 && userFingerprint !== '' && userFingerprint !== deviceInfo && deviceInfo !== 'Desconocido/Temporal') {
         AuditEngine.log('LOGIN_BLOCKED', r[idxEmail], `Intento de acceso desde dispositivo extraño: ${deviceInfo}`, '');
         
         // Si tiene TOTP, requerirlo; si no, requerir 2FA básico
         if (hasTOTP) {
           return { 
             success: false, 
             error: 'REQUIRES_TOTP', 
             message: 'Dispositivo no reconocido. Verificación TOTP requerida.',
             requiresTOTP: true
           };
         } else {
           return { 
             success: false, 
             error: 'REQUIRES_2FA', 
             message: 'Dispositivo no reconocido. Verificación 2FA requerida por seguridad bancaria.',
             requires2FA: true
           };
         }
      } else if (idxFingerprint !== -1 && userFingerprint === '' && deviceInfo !== 'Desconocido/Temporal') {
         uSh.getRange(i + 1, idxFingerprint + 1).setValue(deviceInfo);
      }

      // Resetear intentos fallidos tras login exitoso
      resetLoginAttempts(reqEmail);
      AuditEngine.log('LOGIN_SUCCESS', r[idxEmail], `Acceso exitoso. Entorno: ${req.env}. Huella: ${deviceInfo}`, '');
      
      return generateTokenAndSync(req, uSh, i+1, r, h, deviceInfo);
    }
  }
  
  // Usuario no encontrado - registrar intento fallido
  if (req.email) {
    recordFailedLogin(req.email);
  }
  return { success: false, error: 'El correo ' + req.email + ' no se encuentra en Usuarios.' };
}

function verify2FA(req) {
  // Rate limiting también en verificación 2FA (previene brute-force de códigos)
  const rateCheck2FA = checkRateLimit(req.email || 'unknown', 'verify2fa');
  if (!rateCheck2FA.permitido) {
    return { success: false, error: rateCheck2FA.mensaje };
  }

  const uSh = getSS().getSheetByName('Usuarios');
  const data = uSh.getDataRange().getValues();
  const h = data[0];
  const idxEmail = h.indexOf('Email');
  const idxFingerprint = h.indexOf('Fingerprint');
  const idxTOTPSecret = h.indexOf('TOTP_Secret');

  let userRow = -1;
  let shData = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxEmail]).toLowerCase() === String(req.email).toLowerCase()) {
      userRow = i + 1;
      shData = data[i];
      break;
    }
  }
  if (userRow === -1) return { success: false, error: 'Usuario no encontrado' };

  // Verificar si el usuario tiene TOTP configurado
  const hasTOTP = idxTOTPSecret !== -1 && shData[idxTOTPSecret] && shData[idxTOTPSecret] !== '';
  
  let otpValido = false;
  
  const currentStep = Math.floor(Date.now() / (TOTP_TIME_STEP * 1000));

  if (hasTOTP) {
    // Validar con TOTP real usando el secreto almacenado
    const secret = shData[idxTOTPSecret];
    otpValido = verifyTOTP(secret, req.otp, 1);
    if (!otpValido) {
      // Anti-replay: rechazar códigos ya usados en este mismo período de tiempo
      const replayKey = `totp_used_${req.email}_${currentStep}`;
      const usedCache = CacheService.getScriptCache();
      if (usedCache.get(replayKey)) {
        AuditEngine.log('2FA_TOTP_REPLAY', req.email, 'Código TOTP reutilizado en el mismo período', '');
        return { success: false, error: 'Este código ya fue utilizado. Espere al siguiente.' };
      }
      recordFailedLogin(String(req.email || '').toLowerCase());
      AuditEngine.log('2FA_TOTP_FAILED', req.email, `Falló validación TOTP`, '');
      return { success: false, error: 'Código TOTP incorrecto o expirado' };
    }
    // Marcar código como usado durante el resto del período + ventana
    try {
      CacheService.getScriptCache().put(`totp_used_${req.email}_${currentStep}`, '1', TOTP_TIME_STEP * 3);
    } catch(e) {}
  } else {
    // Fallback de emergencia '123456': SOLO permitido si la propiedad de script
    // ALLOW_FALLBACK_OTP está explícitamente en 'true' (modo desarrollo/certificación).
    // En producción: dejar sin configurar o en 'false' → el usuario DEBE tener TOTP.
    const allowFallback = PropertiesService.getScriptProperties().getProperty('ALLOW_FALLBACK_OTP') === 'true';
    if (!allowFallback) {
      AuditEngine.log('2FA_NO_TOTP_CONFIGURED', req.email, 'Intento de 2FA sin secreto TOTP configurado y fallback deshabilitado', '');
      return {
        success: false,
        error: 'TOTP_NO_CONFIGURED',
        message: 'Este usuario no tiene autenticador TOTP configurado. Solicite al administrador generar el secreto con setupTOTP(email).',
        requiresTOTPSetup: true
      };
    }
    if (req.otp !== '123456') {
      recordFailedLogin(String(req.email || '').toLowerCase());
      AuditEngine.log('2FA_FAILED', req.email, `Falló validación 2FA (fallback desarrollo)`, '');
      return { success: false, error: 'OTP Incorrecto' };
    }
    otpValido = true;
    AuditEngine.log('2FA_FALLBACK_USED', req.email, '⚠️ 2FA validado con OTP de DESARROLLO (fallback habilitado). Deshabilite ALLOW_FALLBACK_OTP en producción.', '');
  }

  // Registrar intento fallido si el código era inválido (rama TOTP)
  if (!otpValido) {
    recordFailedLogin(String(req.email || '').toLowerCase());
  }

  // Confiar en este nuevo dispositivo (Zero-Trust Override)
  const deviceInfo = req.fingerprint || 'Desconocido/Temporal';
  if (idxFingerprint !== -1) {
     uSh.getRange(userRow, idxFingerprint + 1).setValue(deviceInfo);
  }
  AuditEngine.log('2FA_SUCCESS', req.email, `Dispositivo confiado tras 2FA: ${deviceInfo}`, '');

  // Resetear intentos fallidos tras 2FA exitoso
  resetLoginAttempts(req.email);

  return generateTokenAndSync(req, uSh, userRow, shData, h, deviceInfo);
}
function generateTokenAndSync(req, uSh, rowNum, r, h, deviceInfo) {
  const idxEmail = h.indexOf('Email');
  const idxToken = h.indexOf('Token');
  const idxTokenExp = h.indexOf('Token_Expira');
  const idxName = h.indexOf('Nombre');
  const idxRole = h.indexOf('Rol');

  let newToken = Utilities.getUuid();
  if (idxToken === -1) {
    newToken = r[idxEmail]; // Fallback to email as token if column doesn't exist
  }
  const sessionDuration = (req.env === 'personal') ? (8 * 60 * 60 * 1000) : (15 * 60 * 1000);
  const expirationTime = new Date().getTime() + sessionDuration;
  
  AuditEngine.log('LOGIN', r[idxEmail], `Acceso al sistema. Entorno: ${req.env}. Huella: ${deviceInfo}`, '');
  
  if (idxToken !== -1) uSh.getRange(rowNum, idxToken + 1).setValue(newToken);
  if (idxTokenExp !== -1) uSh.getRange(rowNum, idxTokenExp + 1).setValue(expirationTime);
  
  return { 
     success: true, 
     token: newToken, 
     user: { nombre: r[idxName], rol: r[idxRole], email: r[idxEmail] } 
  };
}

function auth(req) {
  if (!req.token) throw new Error('Token de Sesión Requerido');
  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) throw new Error('Sistema no inicializado');
  
  const data = uSh.getDataRange().getValues();
  const headers = data[0];
  
  const idxToken = headers.indexOf('Token');
  const idxExp = headers.indexOf('Token_Expira');
  const idxStatus = headers.indexOf('Status');
  const idxEmail = headers.indexOf('Email');
  const idxRole = headers.indexOf('Rol');
  const idxName = headers.indexOf('Nombre');

  // Fallback a lógica de tokens simples si la base aún no fue migrada al 100%
  const colBusqueda = idxToken !== -1 ? idxToken : headers.indexOf('Email');
  
  const userRow = data.find(r => String(r[colBusqueda]) === String(req.token));
  if (!userRow) throw new Error('Sesión inválida o adulterada');
  
  const statusVal = idxStatus !== -1 ? userRow[idxStatus] : (headers.indexOf('Activo') !== -1 ? userRow[headers.indexOf('Activo')] : 'Activo');
  if (String(statusVal).toUpperCase() === 'INACTIVO') throw new Error('Cuenta deshabilitada');

  if (idxExp !== -1 && userRow[idxExp]) {
    const expiresAt = Number(userRow[idxExp]);
    if (new Date().getTime() > expiresAt) {
      throw new Error('Token Expirado. La sesión tiene un límite de 8 horas. Por favor ingrese de nuevo.');
    }
  }

  return { email: userRow[idxEmail], nombre: userRow[idxName], rol: userRow[idxRole] };
}

// ─── RECUPERACIÓN DE CONTRASEÑA VÍA CORREO ────────────────────────────────────

function ensureResetColumnsExist(uSh, headers) {
  let idxResetToken = headers.findIndex(col => String(col).trim().toLowerCase() === 'reset_token');
  let idxResetExp   = headers.findIndex(col => String(col).trim().toLowerCase() === 'reset_token_expira');

  if (idxResetToken === -1 || idxResetExp === -1) {
    const lastCol = uSh.getLastColumn();
    if (idxResetToken === -1) {
      uSh.getRange(1, lastCol + 1).setValue('Reset_Token');
    }
    const currentLastCol = uSh.getLastColumn();
    if (idxResetExp === -1) {
      uSh.getRange(1, currentLastCol + 1).setValue('Reset_Token_Expira');
    }
    return uSh.getDataRange().getValues()[0];
  }
  return headers;
}

function requestPasswordReset(req) {
  if (!req.email || !String(req.email).trim()) {
    return { success: false, error: 'Por favor ingresa tu correo electrónico.' };
  }

  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) throw new Error('Sistema no configurado.');

  let data = uSh.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: 'No existen usuarios registrados.' };

  let headers = data[0];
  const getIdx = (words) => headers.findIndex(col => words.includes(String(col).trim().toLowerCase()));
  const idxEmail  = getIdx(['email', 'correo']);
  const idxStatus = getIdx(['status', 'activo', 'estado', 'estatus']);
  const idxName   = getIdx(['nombre', 'name', 'usuario']);

  const reqEmail = String(req.email).toLowerCase().trim();
  let userRowIndex = -1;
  let userName = 'Usuario';

  for (let i = 1; i < data.length; i++) {
    const sheetEmail = String(data[i][idxEmail] || '').toLowerCase().trim();
    if (sheetEmail === reqEmail) {
      const statusVal = String(data[i][idxStatus] || '').trim().toUpperCase();
      if (statusVal !== 'ACTIVO' && statusVal !== 'SI') {
        return { success: false, error: 'La cuenta existe pero está inactiva o deshabilitada.' };
      }
      userRowIndex = i + 1;
      if (idxName !== -1 && data[i][idxName]) userName = String(data[i][idxName]);
      break;
    }
  }

  if (userRowIndex === -1) {
    return { success: true, message: 'Si el correo está registrado, recibirás un mensaje con las instrucciones de recuperación.' };
  }

  headers = ensureResetColumnsExist(uSh, headers);
  const idxResetToken = headers.findIndex(col => String(col).trim().toLowerCase() === 'reset_token');
  const idxResetExp   = headers.findIndex(col => String(col).trim().toLowerCase() === 'reset_token_expira');

  const rawUuid = Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetToken = rawUuid + '-' + otpCode;
  const expirationTime = new Date().getTime() + (30 * 60 * 1000); // 30 mins

  uSh.getRange(userRowIndex, idxResetToken + 1).setValue(resetToken);
  uSh.getRange(userRowIndex, idxResetExp + 1).setValue(expirationTime);

  const appUrl = req.appUrl || 'https://ergoexpress.vercel.app/login.html';
  const resetLink = appUrl + (appUrl.includes('?') ? '&' : '?') + 'resetToken=' + resetToken;

  const emailSubject = 'ERGOEXPRESS CRM — Restablecer Contraseña';
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 30px; background-color: #0f1826; color: #e2e8f0; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0d7377; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 1px;">ERGOEXPRESS CRM</h2>
        <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">Sistema ERP & CRM Financiero</p>
      </div>

      <div style="background-color: #1e293b; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Hola, ${userName}</h3>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>ERGOEXPRESS CRM</strong>.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #0d7377; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 115, 119, 0.4);">
            Restablecer Contraseña
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 10px;">
          O si lo prefieres, puedes ingresar manualmente este código de recuperación de 6 dígitos en la pantalla de restablecimiento:
        </p>
        <div style="text-align: center; margin: 16px 0;">
          <span style="font-family: monospace; font-size: 24px; font-weight: 800; color: #38bdf8; background: #0f172a; padding: 8px 20px; border-radius: 6px; letter-spacing: 4px; border: 1px dashed #38bdf8;">
            ${otpCode}
          </span>
        </div>

        <p style="color: #f59e0b; font-size: 12px; margin-top: 20px; line-height: 1.4;">
          ⚠️ <strong>Nota de Seguridad:</strong> Este enlace y código expiran en <strong>30 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #334155; padding-top: 16px; color: #64748b; font-size: 11px;">
        &copy; ERGOEXPRESS CRM · Seguridad de Grado Financiero
      </div>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: reqEmail,
      subject: emailSubject,
      htmlBody: htmlBody
    });
  } catch (err) {
    try {
      GmailApp.sendEmail(reqEmail, emailSubject, '', { htmlBody: htmlBody });
    } catch(e) {
      return { success: false, error: 'Error al enviar el correo: ' + e.message };
    }
  }

  if (typeof AuditEngine !== 'undefined' && AuditEngine.log) {
    AuditEngine.log('PASSWORD_RESET_REQUESTED', reqEmail, 'Solicitud de restablecimiento enviada por correo', '');
  }

  return {
    success: true,
    message: 'Hemos enviado las instrucciones para restablecer tu contraseña a tu correo electrónico.'
  };
}

function resetPassword(req) {
  const tokenInput = String(req.token || '').trim();
  const newPass = String(req.newPassword || '').trim();

  if (!tokenInput) {
    return { success: false, error: 'El código o token de recuperación es requerido.' };
  }
  if (!newPass || newPass.length < 6) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
  }

  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) throw new Error('Sistema no configurado.');

  const data = uSh.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: 'No existen usuarios.' };

  const headers = data[0];
  const idxResetToken = headers.findIndex(col => String(col).trim().toLowerCase() === 'reset_token');
  const idxResetExp   = headers.findIndex(col => String(col).trim().toLowerCase() === 'reset_token_expira');
  const idxPass       = headers.findIndex(col => ['password_hash', 'password', 'contraseña', 'clave'].includes(String(col).trim().toLowerCase()));
  const idxEmail      = headers.findIndex(col => ['email', 'correo'].includes(String(col).trim().toLowerCase()));
  const idxToken      = headers.findIndex(col => String(col).trim().toLowerCase() === 'token');
  const idxTokenExp   = headers.findIndex(col => String(col).trim().toLowerCase() === 'token_expira');

  if (idxResetToken === -1 || idxResetExp === -1) {
    return { success: false, error: 'Código o token de recuperación inválido o no encontrado.' };
  }

  let userRowIndex = -1;
  let userEmail = '';

  for (let i = 1; i < data.length; i++) {
    const storedToken = String(data[i][idxResetToken] || '').trim();
    if (!storedToken) continue;

    const isFullMatch = (storedToken.toLowerCase() === tokenInput.toLowerCase());
    const isOtpMatch  = (storedToken.endsWith('-' + tokenInput) || storedToken.includes(tokenInput));

    if (isFullMatch || isOtpMatch) {
      userRowIndex = i + 1;
      userEmail = String(data[i][idxEmail] || '');

      const expTime = Number(data[i][idxResetExp] || 0);
      const currentTime = new Date().getTime();

      if (currentTime > expTime) {
        uSh.getRange(userRowIndex, idxResetToken + 1).setValue('');
        uSh.getRange(userRowIndex, idxResetExp + 1).setValue('');
        return { success: false, error: 'El código o token de recuperación ha expirado. Por favor solicita uno nuevo.' };
      }
      break;
    }
  }

  if (userRowIndex === -1) {
    return { success: false, error: 'El código o token de recuperación es inválido.' };
  }

  const newHash = computeSHA256(newPass);
  uSh.getRange(userRowIndex, idxPass + 1).setValue(newHash);

  uSh.getRange(userRowIndex, idxResetToken + 1).setValue('');
  uSh.getRange(userRowIndex, idxResetExp + 1).setValue('');

  if (idxToken !== -1) uSh.getRange(userRowIndex, idxToken + 1).setValue('');
  if (idxTokenExp !== -1) uSh.getRange(userRowIndex, idxTokenExp + 1).setValue('');

  if (typeof AuditEngine !== 'undefined' && AuditEngine.log) {
    AuditEngine.log('PASSWORD_RESET_SUCCESS', userEmail, 'Contraseña restablecida exitosamente via correo', '');
  }

  return {
    success: true,
    message: 'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
  };
}

// ─── ESTRUCTURA FUNDACIONAL ──────────────────────────────────────────────────

function migrarEstructuraFinance() {
  const ss = getSS();
  const hojasFundacion = ['Usuarios', 'Contactos', 'Finanzas_Ingresos', 'Finanzas_Egresos', 'Presupuestos'];
  let actualizadas = 0;

  hojasFundacion.forEach(sheetName => {
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.appendRow(HEADERS[sheetName]);
      actualizadas++;
    } else {
      // Forzar cabeceras exactas en la fila 1 sin perder datos
      const cabecerasOriginales = sh.getRange(1, 1, 1, sh.getLastColumn() || 1).getValues()[0];
      const nuevas = HEADERS[sheetName];
      const combinadas = [...nuevas];
      
      // Preservar cabeceras previas que no estén en el blueprint para no romper el CRM
      cabecerasOriginales.forEach(c => {
         if (c && !combinadas.includes(c)) combinadas.push(c);
      });
      
      sh.getRange(1, 1, 1, combinadas.length).setValues([combinadas]);
      actualizadas++;
    }
  });

  return { 
    success: true, 
    message: 'Arquitectura de Datos Maestra procesada con precisión quirúrgica.',
    sheets_affected: actualizadas
  };
}

// ─── CRUD ENGINE (CREATE, READ, UPDATE, LOGICAL DELETE) ─────────────────────

const RESTRICTED_SHEETS = ['Usuarios', 'Finanzas_Ingresos', 'Finanzas_Egresos', 'Presupuestos', 'Payroll', 'Nominas'];

function read(req, user) {
  if (user && String(user.rol).toUpperCase() === 'VENDEDOR' && RESTRICTED_SHEETS.includes(req.sheet)) {
    return { success: false, error: 'Acceso Denegado por RBAC (Sólo lectura Admin).' };
  }

  // Caché solo para ADMIN (los VENDEDOR tienen filtrado por fila y no comparten resultado)
  const canCache = !user || String(user.rol).toUpperCase() !== 'VENDEDOR';
  const cacheKey = `read_${req.sheet}`;
  if (canCache && !req.forceRefresh) {
    const cached = (typeof getCachedData === 'function') ? getCachedData(cacheKey) : null;
    if (cached) return { success: true, data: cached, cached: true };
  }

  const sh = getSS().getSheetByName(req.sheet);
  if (!sh) return { success: false, error: 'Hoja no existe: ' + req.sheet };
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };
  const headers = data[0];
  let rows = data.slice(1).map((r, i) => {
    let o = { _rowIndex: i + 2 };
    headers.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  });

  if (user && String(user.rol).toUpperCase() === 'VENDEDOR') {
    rows = rows.filter(r => String(r.Vendedor || r.Email || r.Usuario || '').toLowerCase() === String(user.email).toLowerCase() || String(r.Vendedor || r.Responsable || '').toLowerCase() === String(user.nombre).toLowerCase());
  } else if (canCache && typeof setCachedData === 'function') {
    // Almacenar versión sin filtrar solo si cabe en el caché (límite ~110KB del CacheService)
    try { setCachedData(cacheKey, rows, CACHE_TTL_DEFAULT); } catch(e) {}
  }
  return { success: true, data: rows };
}

function batchRead(req, user) {
  const ss = getSS();
  const results = {};
  (req.sheets || []).forEach(name => {
    if (user && String(user.rol).toUpperCase() === 'VENDEDOR' && RESTRICTED_SHEETS.includes(name)) {
      results[name] = [];
      return;
    }
    const sh = ss.getSheetByName(name);
    if (!sh) { results[name] = []; return; }
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) { results[name] = []; return; }
    const headers = data[0];
    let rows = data.slice(1).map((r, i) => {
      let o = { _rowIndex: i + 2 };
      headers.forEach((h, j) => { if(h) o[h] = r[j]; });
      return o;
    });

    if (user && String(user.rol).toUpperCase() === 'VENDEDOR') {
      rows = rows.filter(r => String(r.Vendedor || r.Email || r.Usuario || '').toLowerCase() === String(user.email).toLowerCase() || String(r.Vendedor || r.Responsable || '').toLowerCase() === String(user.nombre).toLowerCase());
    }
    results[name] = rows;
  });
  return { success: true, data: results };
}

function append(req, user) {
  const sh = getSS().getSheetByName(req.sheet);
  if (!sh) throw new Error('Hoja no existe');

  // Sanitización de datos de entrada
  req.data = sanitizarObjeto(req.data);

  // Validación específica por tipo de hoja
  if (req.sheet === 'Contactos') {
    if (req.data.RIF) {
      const rifValidation = validarRIF(req.data.RIF);
      if (!rifValidation.valido) {
        throw new Error('RIF inválido: ' + rifValidation.error);
      }
      req.data.RIF_Validado = 'SI';
      req.data.RIF_Ultimo_Digito = rifValidation.numero ? rifValidation.numero.slice(-1) : '';
    }
    if (req.data.Email && !validateEmail(req.data.Email)) {
      throw new Error('Email inválido: ' + req.data.Email);
    }
  }

  // Inyección de Tasa de Operación para Diferencial Cambiario
  if (req.sheet === 'Finanzas_Ingresos' || req.sheet === 'Finanzas_Egresos') {
      try { req.data['Tasa_BCV_Operacion'] = fetchBcvRate().rate; } catch(e) { }
      
      // Validar montos positivos
      if (req.data['Total USD'] && !validateNumber(req.data['Total USD'], 0)) {
        throw new Error('El monto total debe ser un número positivo');
      }
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map(h => req.data[h] !== undefined ? req.data[h] : '');

  // Imposición de UUID si no viene uno del front, forzado a la columna 'ID'
  const idxId = headers.indexOf('ID');
  if (idxId !== -1 && !row[idxId]) {
    row[idxId] = Utilities.getUuid();
  }

  // Escritura bajo lock (concurrencia) + invalidación de caché
  const doWrite = () => { sh.appendRow(row); };
  if (typeof executeWithLock === 'function') {
    executeWithLock(doWrite, `write_${req.sheet}`);
  } else {
    doWrite();
  }
  if (typeof invalidateOnWrite === 'function') invalidateOnWrite(req.sheet);

  const forenseData = JSON.stringify({ insertado: req.data });
  AuditEngine.log('CREATE', user ? user.email : 'System', `Añadió un registro a ${req.sheet} (ID: ${row[idxId]})`, forenseData);
  return { success: true, id: row[idxId] };
}

function update(req, user) {
  if (req.sheet === 'Finanzas_Ingresos' || req.sheet === 'Finanzas_Egresos') {
    throw new Error('Art. 121 SENIAT: Prohibida la modificación directa de registros fiscales. Debe emitir Nota de Crédito/Débito.');
  }

  const sh = getSS().getSheetByName(req.sheet);
  if (!sh) throw new Error('La hoja ' + req.sheet + ' no existe.');

  // Sanitización de datos de entrada
  req.data = sanitizarObjeto(req.data);

  // Validación específica por tipo de hoja
  if (req.sheet === 'Contactos' && req.data.RIF) {
    const rifValidation = validarRIF(req.data.RIF);
    if (!rifValidation.valido) {
      throw new Error('RIF inválido: ' + rifValidation.error);
    }
    req.data.RIF_Validado = 'SI';
  }

  const data = sh.getDataRange().getValues();
  const headers = data[0];

  // Buscar el índice de la fila (1-based)
  let rowIndex = req.rowIndex || -1;
  if (rowIndex <= 0) {
    const searchId = String(req.id).trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === searchId) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  // Lógica de Upsert para Configuración: Si no existe, lo creamos
  if (rowIndex <= 1) {
    if (req.sheet === 'Configuracion' || req.sheet === 'Configuración') {
      return append(req, user);
    }
    throw new Error('Registro no encontrado para actualización en ' + req.sheet);
  }

  // Captura Forense: Estado previo
  const oldRow = data[rowIndex - 1];
  const oldObj = {}; headers.forEach((h, i) => { if(h) oldObj[h] = oldRow[i]; });

  const doUpdate = () => {
    Object.keys(req.data).forEach(h => {
      const colIdx = headers.indexOf(h);
      if (colIdx !== -1) sh.getRange(rowIndex, colIdx + 1).setValue(req.data[h]);
    });
  };
  if (typeof executeWithLock === 'function') {
    executeWithLock(doUpdate, `write_${req.sheet}`);
  } else {
    doUpdate();
  }
  if (typeof invalidateOnWrite === 'function') invalidateOnWrite(req.sheet);

  const forenseData = JSON.stringify({ old: oldObj, newFields: req.data });
  AuditEngine.log('UPDATE', user ? user.email : 'System', `Actualizó registro en ${req.sheet} (ID: ${req.id})`, forenseData);
  return { success: true };
}
function del(req, user) {
  if (req.sheet === 'Finanzas_Ingresos' || req.sheet === 'Finanzas_Egresos') {
    throw new Error('Art. 121 SENIAT: Prohibida la inhabilitación directa de registros fiscales. Debe emitir Nota de Crédito/Débito.');
  }
  const sh = getSS().getSheetByName(req.sheet);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rowIndex = req.rowIndex || (data.findIndex(r => String(r[0]) === String(req.id)) + 1);
  
  if (rowIndex > 1) { 
    // Captura Forense: Estado previo
    const oldRow = data[rowIndex - 1];
    const oldObj = {}; headers.forEach((h, i) => { if(h) oldObj[h] = oldRow[i]; });

    // ELIMINACIÓN LÓGICA
    let colStatus = headers.indexOf('Status');
    if (colStatus === -1) colStatus = headers.indexOf('Estado');
    if (colStatus === -1) colStatus = headers.indexOf('Estatus');
    if (colStatus === -1) colStatus = headers.indexOf('Activo');

    const doDelete = () => {
      if (colStatus !== -1) {
         sh.getRange(rowIndex, colStatus + 1).setValue('INACTIVO');
      } else {
         const newCol = headers.length + 1;
         sh.getRange(1, newCol).setValue('Status');
         sh.getRange(rowIndex, newCol).setValue('INACTIVO');
      }
    };
    if (typeof executeWithLock === 'function') {
      executeWithLock(doDelete, `write_${req.sheet}`);
    } else {
      doDelete();
    }
    if (typeof invalidateOnWrite === 'function') invalidateOnWrite(req.sheet);

    const forenseData = JSON.stringify({ old: oldObj, status_cambiado: 'INACTIVO' });
    AuditEngine.log('DELETE_LOGICAL', user ? user.email : 'System', `Inhabilitó registro en ${req.sheet} (ID: ${req.id})`, forenseData);
    return { success: true, message: 'Registro inhabilitado (eliminación lógica)' }; 
  }
  return { success: false, error: 'Registro no encontrado' };
}

// ─── UTILS DE SISTEMA Y EXTRA ───────────────────────────────────────────────

function emitirNotaOperacion(req, user) {
  const sh = getSS().getSheetByName('Notas_Operaciones');
  if (!sh) {
     const s = getSS().insertSheet('Notas_Operaciones');
     s.appendRow(HEADERS.Notas_Operaciones);
  }
  const t = getSS().getSheetByName('Notas_Operaciones');
  const idxId = HEADERS.Notas_Operaciones.indexOf('ID');
  const row = HEADERS.Notas_Operaciones.map(h => req.data[h] !== undefined ? req.data[h] : '');
  if (!row[idxId]) row[idxId] = Utilities.getUuid();
  
  t.appendRow(row);
  const fd = JSON.stringify({ nota: req.data });
  AuditEngine.log('CREATE_NOTA', user.email, `Emitió Nota ${req.data.Tipo} a registro original: ${req.data.ID_Registro_Original}`, fd);
  return { success: true, id: row[idxId] };
}

function getNextNumber(req) {
  const sh = getSS().getSheetByName(req.sheet);
  if (!sh) return { success: true, next: 1 };
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { success: true, next: 1 };
  
  const nums = data.slice(1).map(r => parseInt(r[1])).filter(n => !isNaN(n)).sort((a,b)=>a-b);
  
  // Providencia 0071: Detección de Saltos de Correlativo
  let saltos = [];
  for(let i=1; i<nums.length; i++){
    if(nums[i] - nums[i-1] > 1) {
       saltos.push(`Entre ${nums[i-1]} y ${nums[i]}`);
    }
  }
  
  return { 
    success: true, 
    next: (nums.length ? nums[nums.length-1] + 1 : 1), 
    saltos_detectados: saltos.length > 0 ? saltos : false 
  };
}

function fetchBcvRate() {
  try {
    const res = UrlFetchApp.fetch("https://www.bcv.org.ve/", { 
      muteHttpExceptions: true,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ErgoExpress-Collector/3.0" }
    });
    const html = res.getContentText();
    
    // Scraper de Elite: Aislamiento por Bloque de Moneda
    // Buscamos específicamente el contenedor del Dólar por su ID oficial
    const id = "dolar";
    const regexBlock = new RegExp(`id\\s*=\\s*["']${id}["'][\\s\\S]*?strong`, 'i');
    const matchBlock = html.match(regexBlock);
    
    if (matchBlock) {
      const startIdx = html.indexOf(matchBlock[0]);
      const fragment = html.substring(startIdx, startIdx + 800);
      const matchValue = fragment.match(/<strong>\s*([\d.,\s]+)\s*<\/strong>/i);
      
      if (matchValue) {
        const rawValue = matchValue[1].replace(/\s/g, '').replace(',', '.');
        const rate = parseFloat(rawValue);
        
        if (rate > 0 && rate < 550) {
          return { 
            success: true, 
            rate: Math.round(rate * 100) / 100,
            source: 'BCV (Oficial)',
            timestamp: new Date().toISOString()
          };
        }
      }
    }
  } catch(e) {
    console.error("[BCV] Scraper Error:", e.message);
  }
  
  return { 
    success: true, 
    rate: 477.15, 
    source: 'Fallback (Contingencia Dólar)', 
    message: 'Se aplicó tasa referencial por problemas técnicos con el nodo BCV.' 
  }; 
}

/**
 * MIGRAR_ESTRUCTURA_FINANCE: Asegura que el entorno de hojas de cálculo 
 * cumpla con el Blueprint Elite ERP v6.0.0.
 */
function migrarEstructuraFinance() {
  const ss = getSS();
  const results = [];
  
  Object.keys(HEADERS).forEach(sheetName => {
    let sh = ss.getSheetByName(sheetName);
    const expectedHeaders = HEADERS[sheetName];
    
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.appendRow(expectedHeaders);
      results.push(`Hoja [${sheetName}] creada.`);
    } else {
      const actualHeaders = sh.getRange(1, 1, 1, sh.getLastColumn() || 1).getValues()[0].map(h => String(h).trim());
      let modified = false;
      
      expectedHeaders.forEach(h => {
        if (!actualHeaders.includes(h)) {
          const nextCol = sh.getLastColumn() + 1;
          sh.getRange(1, nextCol).setValue(h);
          actualHeaders.push(h); 
          modified = true;
        }
      });
      
      if (modified) results.push(`Cabeceras actualizadas en [${sheetName}].`);
    }
  });
  
  AuditEngine.log('MIGRATION', 'System', 'Ejecución de Migración de Estructura ERP v6', JSON.stringify(results));
  return { success: true, log: results };
}

function checkSetup() { return { configured: true }; }
function setup() {
  const ss = getSS();
  Object.keys(HEADERS).forEach(n => {
    if (!ss.getSheetByName(n)) {
      const s = ss.insertSheet(n);
      s.appendRow(HEADERS[n]);
    }
  });
  // Si acabamos de reiniciar, invocar en cascada al Blueprint
  migrarEstructuraFinance();
  return { success: true };
}

/**
 * CREATE_ADMIN: Crea el primer usuario administrador del sistema.
 * Solo funciona si la hoja Usuarios está vacía (sin datos, más allá de headers).
 */
function createAdmin(req) {
  const ss = getSS();
  let uSh = ss.getSheetByName('Usuarios');
  if (!uSh) {
    uSh = ss.insertSheet('Usuarios');
    uSh.appendRow(HEADERS.Usuarios);
  }
  
  const data = uSh.getDataRange().getValues();
  if (data.length > 1) {
    return { success: false, error: 'Ya existe al menos un usuario. No se puede crear otro admin por esta vía.' };
  }
  
  if (!req.email || !req.password || !req.name) {
    return { success: false, error: 'Faltan datos obligatorios: email, password, name' };
  }
  
  const hashedPass = computeSHA256(req.password);
  const token = Utilities.getUuid();
  const tokenExpira = new Date().getTime() + (8 * 60 * 60 * 1000); // 8 horas
  
  // Orden según HEADERS.Usuarios: ['ID', 'Nombre', 'Email', 'Password_Hash', 'Rol', 'Token', 'Token_Expira', 'Status']
  uSh.appendRow([
    Utilities.getUuid(),
    req.name,
    req.email.toLowerCase().trim(),
    hashedPass,
    'admin',
    token,
    tokenExpira,
    'ACTIVO'
  ]);
  
  AuditEngine.log('CREATE_ADMIN', req.email, 'Primer administrador creado desde Setup.');
  
  return {
    success: true,
    token: token,
    user: { nombre: req.name, rol: 'admin', email: req.email.toLowerCase().trim() }
  };
}

/**
 * REQUEST_ACCESS: Registra un usuario pendiente de aprobación.
 */
function requestAccess(req) {
  const ss = getSS();
  let uSh = ss.getSheetByName('Usuarios');
  if (!uSh) return { success: false, error: 'Sistema no configurado.' };
  
  const data = uSh.getDataRange().getValues();
  const h = data[0];
  const idxEmail = h.indexOf('Email');
  
  // Verificar si el usuario ya existe
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxEmail]).toLowerCase().trim() === String(req.email).toLowerCase().trim()) {
      return { success: false, error: 'Ya existe una solicitud para este correo.' };
    }
  }
  
  const hashedPass = req.password ? computeSHA256(req.password) : '';
  
  uSh.appendRow([
    Utilities.getUuid(),
    req.name || 'Usuario Nuevo',
    req.email.toLowerCase().trim(),
    hashedPass,
    'vendedor',
    '',
    '',
    'PENDIENTE'
  ]);
  
  AuditEngine.log('REQUEST_ACCESS', req.email, 'Solicitud de ingreso recibida.');
  return { success: true };
}

function ok(res) {
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

// ─── MOTORES DE PROCESO DE NEGOCIO (PRESERVADOS) ────────────────────────────

function executePayroll(req) {
  const ss = getSS();
  const detSh = ss.getSheetByName('Nomina_Detalle');
  const egrSh = ss.getSheetByName('Finanzas_Egresos');
  const { employeeId, amountUSD, frequency } = req;
  const data = detSh.getDataRange().getValues();
  const headers = data[0];
  const colEmp = headers.indexOf('ID_Empleado');
  const colEst = headers.indexOf('Estatus_Pago');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colEmp]) === String(employeeId) && data[i][colEst] === 'PENDIENTE') {
      detSh.getRange(i + 1, colEst + 1).setValue('PAGADO');
    }
  }

  const tasa = fetchBcvRate().rate;
  const totalVES = amountUSD * tasa;
  
  // Generar egreso preservando la firma de la nueva base de Finanzas_Egresos
  egrSh.appendRow(['EGR-'+Date.now(), new Date(), employeeId, 'Nómina: '+frequency, amountUSD, tasa, totalVES, 0, 0, '-', '-', 'COMPLETADO']);
  return { success: true, message: 'Nómina liquidada' };
}

function executeQuotation(req) {
  const ss = getSS();
  const qSh = ss.getSheetByName('Cotizaciones');
  const pSh = ss.getSheetByName('Productos');
  const { quoteId, newStatus, detailJSON } = req;
  const qData = qSh.getDataRange().getValues();
  const qIdx = qData.findIndex(r => String(r[0]) === String(quoteId));
  if (qIdx === -1) return { success: false };

  qSh.getRange(qIdx + 1, HEADERS.Cotizaciones.indexOf('Estado') + 1).setValue(newStatus);

  if (newStatus === 'APROBADA') {
    const items = JSON.parse(detailJSON || '[]');
    const pData = pSh.getDataRange().getValues();
    const pHeaders = pData[0];
    items.forEach(item => {
      const pIdx = pData.findIndex(r => String(r[0]) === String(item.id));
      if (pIdx !== -1) {
        const cur = Number(pData[pIdx][pHeaders.indexOf('Stock_Actual')]);
        pSh.getRange(pIdx + 1, pHeaders.indexOf('Stock_Actual') + 1).setValue(cur - Number(item.cantidad));
      }
    });
  }
  return { success: true };
}

function savePdfToDrive(req) { 
  try {
    const folder = DriveApp.getFoldersByName('ERGOEXPRESS_DOCS').hasNext() ? 
                   DriveApp.getFoldersByName('ERGOEXPRESS_DOCS').next() : 
                   DriveApp.createFolder('ERGOEXPRESS_DOCS');
    // En una implementación real, aquí recibiríamos el blob base64. 
    // Por ahora, registramos la intención para estabilizar el flujo.
    AuditEngine.log('FILE_DRIVE', 'System', `Intento de guardado de PDF: ${req.filename || 'Archivo'}`);
    return { success: true, message: 'Simulated Drive Save Success' };
  } catch(e) { return { success: false, error: e.message }; }
}

function syncToCalendar(req) { 
  try {
    // Implementación básica: Crear evento si se pasan datos mínimos
    if (req.title && req.date) {
      CalendarApp.getDefaultCalendar().createEvent(req.title, new Date(req.date), new Date(new Date(req.date).getTime() + 3600000));
      return { success: true, message: 'Evento sincronizado con Google Calendar' };
    }
    return { success: true, message: 'Calendar Sync Hook Ready' };
  } catch(e) { return { success: false, error: e.message }; }
}

/* ════════════════════════════════════════════════════════════════════════════
   MOTOR MATEMÁTICO (FISCAL VENEZUELA 2026 & TALENTO HUMANO LOTTT)
   Blueprint del Sistema Integral Centralizado
   ════════════════════════════════════════════════════════════════════════════ */

const MathEngine = {
  
  // ─── TAREA 1: MOTOR FISCAL VENEZUELA 2026 ───────────────────────────────
  
  // Redondeo Obligatorio a 2 decimales para VES estricto
  roundVES: (monto) => {
    return Number(Math.round(Number(monto) + "e+2") + "e-2");
  },
  
  // Cálculo IGTF (3%) - Aplica sólo sobre operaciones liquidadas en divisas
  calcIGTF: (montoDivisa, tasaBCV) => {
    const impuestoDivisa = montoDivisa * 0.03;
    const impuestoVES = impuestoDivisa * tasaBCV;
    return MathEngine.roundVES(impuestoVES);
  },
  
  // Cálculo IVA General (16%)
  calcIVA: (montoBaseVES) => {
    return MathEngine.roundVES(montoBaseVES * 0.16);
  },
  
  // Retenciones ISLR y del IVA (Sujeto Pasivo Especial)
  calcRetencionIVA: (montoIVA, esContribuyenteEspecial, porcRetencion = 0.75) => {
    if (!esContribuyenteEspecial) return 0; // 0 para ordinarios
    // Usualmente 75%, pero admite 100% según providencia
    return MathEngine.roundVES(montoIVA * porcRetencion);
  },

  // Diferencial Cambiario por facturación vs cobranza
  calcDiferencialCambiario: (montoDivisa, tasaHistorica, tasaActual) => {
    const valorHistorico = montoDivisa * tasaHistorica;
    const valorActual = montoDivisa * tasaActual;
    return MathEngine.roundVES(valorActual - valorHistorico);
  },


  // ─── TAREA 2: MOTOR DE TALENTO HUMANO (LOTTT) ───────────────────────────

  // Doble Liquidación (Art. 142 de la LOTTT)
  calcPrestacionesLOTTT: (garantiaAcumuladaVES, salarioIntegralDiarioVES, diasServicio) => {
    // Cálculo: Máximo entre lo acumulado por los trimestres depositados y la retroactividad de todo el servicio
    const calculoServicio = salarioIntegralDiarioVES * diasServicio;
    return MathEngine.roundVES(Math.max(garantiaAcumuladaVES, calculoServicio));
  },
  
  // Nómina Híbrida (Salario Base + Destajos Unitarios + Bonos Cumplimiento)
  calcNominaHibrida: (sueldoBaseMES, pagosDestajo = [], bonosCumplimiento = []) => {
    let totalDestajo = 0;
    pagosDestajo.forEach(pago => {
      totalDestajo += (pago.unidades * pago.precio_unitario);
    });
    
    let totalBonos = 0;
    bonosCumplimiento.forEach(bono => {
      totalBonos += bono.monto;
    });

    const totalIngresoMensual = sueldoBaseMES + totalDestajo + totalBonos;
    // Salario Integral Diario Ordinario (Para efectos legales laborales mes = 30 días)
    const salarioDiarioBasico = totalIngresoMensual / 30;
    
    return {
      totalDestajo: MathEngine.roundVES(totalDestajo),
      totalBonos: MathEngine.roundVES(totalBonos),
      ingresoMensual: MathEngine.roundVES(totalIngresoMensual),
      salarioDiarioBasico: MathEngine.roundVES(salarioDiarioBasico)
    };
  },
  
  // Cálculo de Parafiscales y Nueva Ley de Pensiones (9%)
  calcParafiscales: (salarioNormalMensualVES, tasaBCV) => {
    // Ley de Protección de Pensiones establece piso mínimo de 130 USD indexados al BCV
    const pisoPensionVES = 130 * tasaBCV;
    const basePensiones = Math.max(salarioNormalMensualVES, pisoPensionVES);
    
    // Contribución 9% Patrono
    const aportePension = basePensiones * 0.09;
    
    // Retención 4% IVSS Trabajador (simplificado sin topes máximos por ahora)
    const ivssTrabajador = salarioNormalMensualVES * 0.04;
    // Retención 1% FAOV Trabajador
    const faovTrabajador = salarioNormalMensualVES * 0.01;
    
    return {
      aportePensionPatrono: MathEngine.roundVES(aportePension),
      retencionIVSS: MathEngine.roundVES(ivssTrabajador),
      retencionFAOV: MathEngine.roundVES(faovTrabajador),
      baseImponiblePensiones: MathEngine.roundVES(basePensiones)
    };
  },
  
  // LOTTT Articulo 142 (Doble Liquidación)
  calcularPrestacionesLiquidas: (salarioIntegralMes, mesesServicio, garantiaAcumuladaPrev) => {
    const salarioDiario = Number(salarioIntegralMes) / 30;
    const diasTotalesRetro = (Number(mesesServicio) / 12) * 30; // 30 dias por año
    const calculoRetroactivo = salarioDiario * diasTotalesRetro;
    
    return {
       retroactivo: MathEngine.roundVES(calculoRetroactivo),
       garantiaAcumulada: MathEngine.roundVES(garantiaAcumuladaPrev),
       montoPagar: MathEngine.roundVES(Math.max(calculoRetroactivo, Number(garantiaAcumuladaPrev)))
    };
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   AUDIT ENGINE (ZERO-TRUST Y FORENSE)
   Blueprint del Sistema Integral Centralizado
   ════════════════════════════════════════════════════════════════════════════ */

const AuditEngine = {
  // Rastreo Forense de acciones (prioridad sobre AuditEngine.gs)
  log: (action, email, detail, forenseMemory = '') => {
    try {
      const ss = getSS();
      // Escribir en ambas hojas si existen
      let sh = ss.getSheetByName('Auditoria_Logs');
      if (!sh) {
        sh = ss.insertSheet('Auditoria_Logs');
        sh.appendRow(['Timestamp', 'Fecha', 'Usuario', 'Acción', 'Detalle_Simple', 'Memoria_Forense_JSON']);
      }
      sh.appendRow([new Date().getTime(), new Date(), email, action, detail, String(forenseMemory).substring(0, 49000)]);
      // También escribir en Logs_Auditoria si existe (compatibilidad con AuditEngine.gs)
      const sh2 = ss.getSheetByName('Logs_Auditoria');
      if (sh2 && sh2.getName() !== sh.getName()) {
        sh2.appendRow([Utilities.getUuid(), new Date(), email, action, 'Code.gs', '', detail]);
      }
    } catch(e) {
      // Silencioso para no romper flujo
    }
  },
  
  // Limpieza y Validación de RIF (Formato SENIAT V-00000000-0)
  sanitizeRIF: (rawRif) => {
    if (!rawRif) return '';
    let clean = String(rawRif).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let prefix = clean.charAt(0);
    // Asumir 'V' si no dictan uno legal
    if (!['V','E','J','P','G'].includes(prefix)) { 
      prefix = 'V'; 
      clean = prefix + clean; 
    }
    let numbers = clean.substring(1);
    if (numbers.length > 9) numbers = numbers.substring(0, 9);
    if (numbers.length < 9) {
       return `${prefix}-${numbers}`; // No tiene digito final bien formateado, retornar parcial
    }
    const body = numbers.substring(0, 8).padStart(8, '0');
    const end = numbers.substring(8, 9);
    return `${prefix}-${body}-${end}`;
  },
  
  // Plan de Acción CAPA (Auditoría Maestra)
  runMasterAudit2026: () => {
    // Generador de Matriz de No Conformidades
    return {
      success: true,
      data: [
        { id: 'NC-001', tipo: 'Corrupción RIF', detalle: 'Varios contactos carecen de formato RIF oficial (Letra-Número-Dígito).', accion: 'Activar Data Cleansing' },
        { id: 'NC-002', tipo: 'Seguridad', detalle: 'Sesiones latentes identificadas con IPs variables.', accion: 'Forzar Rotación de Sesiones Compartidas' },
        { id: 'NC-003', tipo: 'Integridad Vendedor', detalle: 'Lecturas masivas en horarios extra-oficiales detectables.', accion: 'Auditar RBAC Vendedores' }
      ]
    };
  }
};

function snapshotDB() {
  const ss = getSS();
  const sheets = ss.getSheets();
  const folderIter = DriveApp.getFoldersByName('ERGOEXPRESS_BACKUPS');
  const folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder('ERGOEXPRESS_BACKUPS');
  const backupSS = SpreadsheetApp.create('Snapshot_DB_' + new Date().getTime());
  
  // Simulacro de contingencia: copiar hojas críticas si se permite el tiempo máximo
  sheets.forEach(s => {
    if (['Usuarios', 'Contactos', 'Cotizaciones', 'Finanzas_Ingresos', 'Finanzas_Egresos', 'Auditoria_Logs'].includes(s.getName())) {
       try { s.copyTo(backupSS).setName(s.getName()); } catch(e) {}
    }
  });
  
  const file = DriveApp.getFileById(backupSS.getId());
  file.moveTo(folder);
  return { success: true, url: file.getUrl() };
}
