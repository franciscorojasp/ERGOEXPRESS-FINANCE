/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Autenticación (email + contraseña)
   Sin OAuth. La verificación se hace contra la hoja Usuarios via Apps Script.
   ════════════════════════════════════════════════════════════════════════════ */

const Auth = (() => {
  let _user  = null;
  let _token = null;

  // ─── Init: cargar sesión desde localStorage ───────────────────────────────
  function init() {
    _token = localStorage.getItem('crm_token') || null;
    try { _user = JSON.parse(localStorage.getItem('crm_user') || 'null'); } catch(e) {}
    return { token: _token, user: _user };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async function login(email, password) {
    const res = await API.call('LOGIN', { email, password });
    if (res.success) {
      _token = res.token;
      _user  = res.user;
      localStorage.setItem('crm_token',      _token);
      localStorage.setItem('crm_user',       JSON.stringify(_user));
      localStorage.setItem('crm_user_role',  _user.role);
    }
    return res;
  }

  // ─── Validate stored token with server ───────────────────────────────────
  async function validate() {
    if (!_token) return false;
    try {
      const res = await API.call('VALIDATE_TOKEN', {});
      if (res.success) { _user = res.user; return true; }
    } catch(e) {}
    return false;
  }

  // ─── Sign out ─────────────────────────────────────────────────────────────
  function signOut() {
    _user = null; _token = null;
    localStorage.clear();
    window.location.href = 'login.html';
  }

  // ─── Getters ──────────────────────────────────────────────────────────────
  function getUser()          { return _user; }
  function getToken()         { return _token; }
  function isAuthenticated()  { return !!_token && !!_user; }

  return { init, login, validate, signOut, getUser, getToken, isAuthenticated };
})();
