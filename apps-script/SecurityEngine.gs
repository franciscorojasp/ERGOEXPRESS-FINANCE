/**
 * SecurityEngine.gs - Motor de Seguridad Mejorado
 * Implementa: TOTP, Validación RIF, Sanitización, Rate Limiting
 */

// ─── CONFIGURACIÓN DE SEGURIDAD ──────────────────────────────────────────────

// Nota: el secreto global no se usa para validar; cada usuario tiene su propio
// secreto TOTP en la columna TOTP_Secret de la hoja Usuarios.
const TOTP_TIME_STEP = 30; // segundos
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 900000; // 15 minutos en milisegundos
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;

// ─── GENERADOR DE SECRETO TOTP ───────────────────────────────────────────────

function generateSecretKey() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += charset[Math.floor(Math.random() * charset.length)];
  }
  return secret;
}

// Decodificar Base32 (RFC 4648) a bytes — compatible con Google Authenticator
function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const str = String(base32).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const output = [];
  for (let i = 0; i < str.length; i++) {
    const idx = alphabet.indexOf(str[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xFF);
      bits -= 8;
    }
  }
  return output;
}

// ─── IMPLEMENTACIÓN TOTP (RFC 6238) ──────────────────────────────────────────

function generateTOTPAt(secret, stepCounter) {
  try {
    // Codificar contador como buffer de 8 bytes big-endian
    const counterBytes = [];
    let c = stepCounter;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = c % 256;
      c = Math.floor(c / 256);
    }
    const keyBytes = base32Decode(secret);
    const hmac = Utilities.computeHmacSignature(
      Utilities.MacAlgorithm.HMAC_SHA_1,
      counterBytes.join(''),
      keyBytes.map(b => String.fromCharCode(b)).join('')
    );
    // Dynamic truncation (RFC 4226) — aritmética entera segura (< 2^53, sin BigInt).
    // Nota: el estándar toma los 4 bytes SIN enmascarar el bit de signo; %1000000
    // hace irrelevante el overflow de 32 bits.
    const offset = hmac[hmac.length - 1] & 0x0F;
    const binCode = ((hmac[offset] & 0xFF) * 16777216 +
                     (hmac[offset + 1] & 0xFF) * 65536 +
                     (hmac[offset + 2] & 0xFF) * 256 +
                     (hmac[offset + 3] & 0xFF)) % 1000000;
    return String(binCode).padStart(6, '0');
  } catch (e) {
    Logger.log('Error generando TOTP: ' + e.message);
    throw new Error('Error generando código de seguridad');
  }
}

function generateTOTP(secret, timeStep = TOTP_TIME_STEP) {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return generateTOTPAt(secret, counter);
}

function verifyTOTP(secret, userCode, window = 1) {
  // Verifica el código actual y los adyacentes (ventana de tiempo por desfase de reloj)
  const code = String(userCode || '').trim();
  if (!/^\d{6}$/.test(code)) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_TIME_STEP);
  for (let i = -window; i <= window; i++) {
    if (generateTOTPAt(secret, currentCounter + i) === code) {
      return true;
    }
  }
  return false;
}

// ─── VALIDACIÓN DE RIF VENEZOLANO ────────────────────────────────────────────

function validarRIF(rif) {
  if (!rif) return { valido: false, error: 'RIF vacío' };
  
  // Normalizar: mayúsculas, sin espacios ni caracteres especiales
  rif = rif.toUpperCase().replace(/[\s-]/g, '');
  
  // Verificar longitud (1 letra + 8 números + 1 dígito verificador = 10)
  if (rif.length !== 10) {
    return { valido: false, error: 'Longitud inválida. Debe ser 10 caracteres (Ej: V123456789)' };
  }
  
  // Verificar formato: primera letra válida + 8 dígitos + 1 dígito verificador
  const tipo = rif[0];
  if (!['V', 'J', 'E', 'G', 'P'].includes(tipo)) {
    return { valido: false, error: 'Tipo de persona inválido. Use: V(Jurídica), J(Jurídica), E(Extranjero), G(Gobierno), P(Pasaporte)' };
  }
  
  const numeroStr = rif.slice(1, 9);
  const numero = parseInt(numeroStr);
  const digitoVerificador = parseInt(rif[9]);
  
  if (isNaN(numero) || numeroStr !== String(numero).padStart(8, '0')) {
    return { valido: false, error: 'Los 8 dígitos centrales deben ser numéricos' };
  }
  
  if (isNaN(digitoVerificador)) {
    return { valido: false, error: 'El último dígito debe ser numérico' };
  }
  
  // Calcular dígito verificador según normativa SENIAT
  const digitos = numeroStr.split('').map(Number);
  let suma = 0;
  
  // Matriz de multiplicadores según tipo de persona
  const multiplicadores = {
    'V': [1, 2, 3, 4, 5, 6, 7, 8],
    'J': [3, 2, 7, 6, 5, 4, 3, 2],
    'E': [3, 2, 7, 6, 5, 4, 3, 2],
    'G': [3, 2, 7, 6, 5, 4, 3, 2],
    'P': [3, 2, 7, 6, 5, 4, 3, 2]
  };
  
  const mult = multiplicadores[tipo];
  for (let i = 0; i < 8; i++) {
    suma += digitos[i] * mult[i];
  }
  
  const residuo = suma % 11;
  let calculado = 11 - residuo;
  
  if (calculado === 10) calculado = 1;
  if (calculado === 11) calculado = 0;
  
  if (calculado !== digitoVerificador) {
    return { 
      valido: false, 
      error: `Dígito verificador inválido. Esperado ${calculado}, recibido ${digitoVerificador}`,
      digitoCorrecto: calculado
    };
  }
  
  return { 
    valido: true, 
    tipo: tipo, 
    numero: numeroStr,
    mensaje: 'RIF válido según normativa SENIAT'
  };
}

// ─── SANITIZACIÓN DE INPUTS ──────────────────────────────────────────────────

function sanitizarInput(input, tipo = 'texto') {
  if (input === null || input === undefined) return '';
  
  const str = String(input);
  
  switch (tipo) {
    case 'texto':
      // Eliminar fórmulas de Sheets (=, +, -, @)
      return str.replace(/^[=+\-@]/g, '_').replace(/\n/g, ' ').trim();
    
    case 'email':
      return str.toLowerCase().trim();
    
    case 'numero':
      const num = parseFloat(str.replace(/,/g, ''));
      return isNaN(num) ? 0 : num;
    
    case 'rif':
      return str.toUpperCase().replace(/[^JVPEGD0-9]/g, '');
    
    case 'fecha':
      // Validar y normalizar fecha
      const date = new Date(str);
      if (isNaN(date.getTime())) return '';
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    default:
      return str.replace(/^[=+\-@]/g, '_').trim();
  }
}

function sanitizarObjeto(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Detectar tipo por nombre de clave
        let tipo = 'texto';
        if (key.toLowerCase().includes('email')) tipo = 'email';
        else if (key.toLowerCase().includes('rif')) tipo = 'rif';
        else if (key.toLowerCase().includes('fecha')) tipo = 'fecha';
        else if (key.toLowerCase().includes('monto') || key.toLowerCase().includes('total') || key.toLowerCase().includes('precio')) {
          tipo = 'numero';
        }
        
        sanitized[key] = sanitizarInput(value, tipo);
      } else if (typeof value === 'number') {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = '';
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

// ─── RATE LIMITING ───────────────────────────────────────────────────────────

function checkRateLimit(identifier, action = 'general') {
  const cache = CacheService.getScriptCache();
  const key = `rate_${identifier}_${action}`;
  const now = Date.now();
  
  const data = cache.get(key);
  let attempts = [];
  
  if (data) {
    attempts = JSON.parse(data);
    // Filtrar intentos fuera de la ventana
    attempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
  }
  
  if (attempts.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      permitido: false,
      mensaje: `Demasiadas solicitudes. Máximo ${MAX_REQUESTS_PER_WINDOW} por minuto.`,
      reintentarEn: Math.ceil((RATE_LIMIT_WINDOW - (now - attempts[0])) / 1000)
    };
  }
  
  attempts.push(now);
  cache.put(key, JSON.stringify(attempts), 60);
  
  return { permitido: true };
}

// ─── BLOQUEO POR INTENTOS FALLIDOS ───────────────────────────────────────────

function checkLoginLockout(email) {
  const cache = CacheService.getScriptCache();
  const key = `lockout_${email.toLowerCase()}`;
  const data = cache.get(key);
  
  if (data) {
    const lockData = JSON.parse(data);
    if (lockData.attempts >= MAX_LOGIN_ATTEMPTS) {
      const remaining = lockData.lockedUntil - Date.now();
      if (remaining > 0) {
        return {
          bloqueado: true,
          mensaje: `Cuenta temporalmente bloqueada. Reintente en ${Math.ceil(remaining / 60000)} minutos.`,
          reintentarEn: Math.ceil(remaining / 1000)
        };
      }
    }
  }
  
  return { bloqueado: false };
}

function recordFailedLogin(email) {
  const cache = CacheService.getScriptCache();
  const key = `lockout_${email.toLowerCase()}`;
  const now = Date.now();
  
  let lockData = { attempts: 0, lockedUntil: 0 };
  const data = cache.get(key);
  
  if (data) {
    lockData = JSON.parse(data);
  }
  
  lockData.attempts++;
  
  if (lockData.attempts >= MAX_LOGIN_ATTEMPTS) {
    lockData.lockedUntil = now + LOCKOUT_DURATION;
    AuditEngine.log('LOGIN_LOCKOUT', email, `Cuenta bloqueada tras ${lockData.attempts} intentos fallidos`, '');
  }
  
  cache.put(key, JSON.stringify(lockData), Math.ceil(LOCKOUT_DURATION / 1000) + 60);
  
  return lockData;
}

function resetLoginAttempts(email) {
  const cache = CacheService.getScriptCache();
  const key = `lockout_${email.toLowerCase()}`;
  cache.remove(key);
}

// ─── UTILIDADES DE SEGURIDAD ─────────────────────────────────────────────────

function generarQR_TOTP(secret, email, issuer = 'ERGOEXPRESS') {
  const uri = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=${TOTP_TIME_STEP}`;
  return {
    uri: uri,
    secret: secret,
    instrucciones: 'Escanea este código con Google Authenticator, Authy o Microsoft Authenticator'
  };
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validateNumber(value, min = null, max = null) {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
}

// ─── ADMINISTRACIÓN TOTP (requiere ejecutarse desde el editor de Apps Script) ─

/**
 * Genera e instala un secreto TOTP para un usuario de la hoja Usuarios.
 * Uso: ejecutar setupTOTP('correo@dominio.com') desde el editor de Apps Script,
 * luego escanear el QR/uri con Google Authenticator o Authy.
 */
function setupTOTP(email) {
  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) throw new Error('Hoja Usuarios no encontrada');
  const data = uSh.getDataRange().getValues();
  const h = data[0];
  const idxEmail = h.findIndex(col => ['email','correo'].includes(String(col).trim().toLowerCase()));
  let idxSecret = h.findIndex(col => ['totp_secret','secret_totp','2fa_secret'].includes(String(col).trim().toLowerCase()));

  let rowNum = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxEmail]).toLowerCase() === String(email).toLowerCase()) { rowNum = i + 1; break; }
  }
  if (rowNum === -1) throw new Error('Usuario no encontrado: ' + email);

  if (idxSecret === -1) {
    idxSecret = h.length;
    uSh.getRange(1, idxSecret + 1).setValue('TOTP_Secret');
  }

  const secret = generateSecretKey();
  uSh.getRange(rowNum, idxSecret + 1).setValue(secret);

  const qr = generarQR_TOTP(secret, email);
  AuditEngine.log('TOTP_SETUP', email, 'Secreto TOTP generado e instalado', '');
  return { success: true, secret: secret, otpauth_uri: qr.uri, instrucciones: qr.instrucciones };
}

/** Verifica si un usuario tiene TOTP configurado. */
function getTOTPStatus(email) {
  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) return { success: false, error: 'Hoja Usuarios no encontrada' };
  const data = uSh.getDataRange().getValues();
  const h = data[0];
  const idxEmail = h.findIndex(col => ['email','correo'].includes(String(col).trim().toLowerCase()));
  const idxSecret = h.findIndex(col => ['totp_secret','secret_totp','2fa_secret'].includes(String(col).trim().toLowerCase()));
  if (idxSecret === -1) return { success: true, configured: false };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxEmail]).toLowerCase() === String(email).toLowerCase()) {
      return { success: true, configured: !!(data[i][idxSecret] && String(data[i][idxSecret]).trim() !== '') };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}

/** Desactiva el TOTP de un usuario (deja el secreto vacío). */
function disableTOTP(email) {
  const uSh = getSS().getSheetByName('Usuarios');
  if (!uSh) throw new Error('Hoja Usuarios no encontrada');
  const data = uSh.getDataRange().getValues();
  const h = data[0];
  const idxEmail = h.findIndex(col => ['email','correo'].includes(String(col).trim().toLowerCase()));
  const idxSecret = h.findIndex(col => ['totp_secret','secret_totp','2fa_secret'].includes(String(col).trim().toLowerCase()));
  if (idxSecret === -1) return { success: true, message: 'No hay columna TOTP_Secret' };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxEmail]).toLowerCase() === String(email).toLowerCase()) {
      uSh.getRange(i + 1, idxSecret + 1).setValue('');
      AuditEngine.log('TOTP_DISABLED', email, 'TOTP desactivado manualmente', '');
      return { success: true };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}
