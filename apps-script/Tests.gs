/**
 * Tests.gs — Suite de validación para las mejoras de seguridad/rendimiento.
 * Ejecutar desde el editor de Apps Script: seleccionar la función y pulsar ▶.
 */

function test_TOTP_RFC6238() {
  // Vector de prueba RFC 6238 (SHA1, secreto ASCII "12345678901234567890" = Base32 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ)
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  // Counter 1 → código esperado 282760 (RFC 6238 Appendix B, T=59 → counter=1... usar counter exacto del estándar)
  const code = generateTOTPAt(secret, 1);
  console.log('TOTP@counter1:', code, '(esperado 282760 si implementación es correcta)');
  console.log('TOTP actual:', generateTOTP(secret));
  console.log('verify con código actual:', verifyTOTP(secret, generateTOTP(secret)));
}

function test_ValidacionRIF() {
  console.log(validarRIF('V-136007415'));  // ejemplo real formato SENIAT
  console.log(validarRIF('J-312546781'));
  console.log(validarRIF('INVALIDO'));
  console.log(validarRIF(''));
}

function test_Sanitizacion() {
  console.log(sanitizarInput('=HYPERLINK("http://evil.com")', 'texto'));   // debe prefijar _
  console.log(sanitizarInput('  USER@Example.COM ', 'email'));              // minusculas/trim
  console.log(sanitizarObjeto({ Email: 'A@B.com', RIF: 'v-12345678-9', 'Total USD': '=1+1' }));
}

function test_RateLimitYLockout() {
  const email = 'test_ratelimit@ergoexpress.local';
  let blocked = false;
  for (let i = 0; i < 12; i++) {
    const r = checkRateLimit(email, 'login');
    if (!r.permitido) { blocked = true; console.log('Bloqueado por rate limit en intento', i + 1); break; }
  }
  console.log('Rate limiting activo:', blocked);

  for (let i = 0; i < 6; i++) recordFailedLogin(email);
  console.log('Lockout tras intentos fallidos:', checkLoginLockout(email));
  resetLoginAttempts(email);
  console.log('Lockout tras reset:', checkLoginLockout(email));
}

function test_Cache() {
  setCachedData('demo_key', { hello: 'world' }, 60);
  console.log('Cache read:', getCachedData('demo_key'));
  invalidateCache('demo_key');
  console.log('Cache tras invalidar (null esperado):', getCachedData('demo_key'));
}

function test_LockService() {
  const result = executeWithLock(() => {
    console.log('Dentro del lock...');
    return 'ok';
  }, 'write_Contactos', 5000);
  console.log('executeWithLock:', result);
}
