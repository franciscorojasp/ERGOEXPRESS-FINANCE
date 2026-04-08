/**
 * ERGOEXPRESS CRM — Configuración Global
 * ────────────────────────────────────────────────────────────────────────────
 * ÚNICOS VALORES QUE DEBES CONFIGURAR:
 *
 *  1. APPS_SCRIPT_URL → la URL de tu Web App (desde Apps Script → Implementar)
 *  2. API_KEY         → debe ser IDÉNTICA a la línea "const API_KEY = '...'"
 *                       en tu archivo apps-script/Code.gs
 */
const CONFIG = {

  // ── Backend (Google Apps Script Web App) ──────────────────────────────────
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxd02_nG9gjFjSIZpKY2Pv1EryUCq21X4m1lBXTltmrxweTPsXMlYtFmpr2JvSCgQ-U/exec',
  API_KEY: 'ERGX2026',

  // ── AI Configuration (Gemini) ─────────────────────────────────────────────
  GEMINI_API_KEY: 'AIzaSyAsBBOxgvIQP6WySvA39C6c_GQEZWiKBZk', // Pega tu clave de API de Google AI Studio
  GEMINI_MODEL: 'gemini-1.5-flash',

  // ── Nombres de las Hojas (no cambiar si ya están creadas) ─────────────────
  SHEETS: {
    CONTACTS:     'Contactos',
    PRODUCTS:     'Productos',
    RATES:        'TasasCambio',
    QUOTATIONS:   'Cotizaciones',
    TRACKING:     'Seguimiento',
    CONFIG:       'Configuracion',
    USERS:        'Usuarios',
    FINANCE_INCOME:  'Finanzas_Ingresos',
    FINANCE_EXPENSE: 'Finanzas_Egresos',
    AGENDA:          'Agenda'
  },

  // ── Cabeceras por hoja (sincronizadas con el Apps Script) ─────────────────
  HEADERS: {
    Contactos:    ['ID','Razón Social','RIF','Persona Contacto','Teléfonos','Email','Dirección','Estado','Puntaje','Tipo','Fecha Registro','Notas','Etapa Pipeline','Vendedor Email'],
    Productos:    ['ID','Nombre','Descripción','Categoría','Precio USD','Costo USD','Impuesto %'],
    TasasCambio:  ['ID','Fecha','Tasa Oficial','Fuente'],
    Cotizaciones: ['ID','Número','Fecha','ID Cliente','Validez Días','Estado','Total USD','Total VES','Detalle JSON','Fecha Creación','Usuario Email','Notas'],
    Seguimiento:  ['ID','ID Cliente','Fecha','Tipo','Descripción','Próximo Seguimiento','Asunto Próximo','Etapa Pipeline','Fecha Cambio Etapa','Usuario Email'],
    Configuracion:['Clave','Valor'],
    Usuarios:     ['ID','Email','Nombre','Rol','Activo','Fecha Registro','Password'],
    Finanzas_Ingresos: ['ID','Fecha','ID Cliente','Concepto','ID Cotización','Método','Banco','Referencia Nº','Referencia', 'Tasa', 'Total USD','Total VES','Estado','Vendedor Email'],
    Finanzas_Egresos:  ['ID','Fecha','Beneficiario','Categoría','Concepto','Referencia','Método', 'Banco', 'Referencia Nº', 'Pagador', 'Tasa', 'Total USD','Total VES','Estado','Usuario Email'],
    Agenda:       ['ID','Fecha','Hora','ID Cliente','Asunto','Tipo','Estado','Notas','Usuario Email']
  },

  // ── Catálogos ──────────────────────────────────────────────────────────────
  PIPELINE_STAGES:  ['Nuevo','Contactado','En Negociación','Ganado','Perdido'],
  CONTACT_TYPES:    ['potencial','activo','inactivo'],
  QUOTE_STATUSES:   ['Borrador','Enviada','Aprobada','Aceptada','Facturada','Parcial','Pagada','Rechazada','Vencida'],
  INTERACTION_TYPES:['nota','llamada','email','reunión','visita'],
  USER_ROLES:       ['admin','vendedor'],
  PAYMENT_METHODS:  ['Zelle','Pago Móvil','Efectivo USD','Efectivo VES','Transferencia','Binance','Banesco Panamá'],
  EXPENSE_CATEGORIES: ['Operativos','Administrativos','Marketing','Honorarios','Impuestos','Servicios','Otros'],
  APPOINTMENT_TYPES: ['Reunión','Visita Comercial','Instalación','Soporte','Venta'],
  APPOINTMENT_STATUS:['Pendiente','Realizada','Cancelada','Reprogramada'],
  BANKS:            ['Banesco','Provincial','Mercantil','BDV','Banplus','BNC','Bancamiga','Zelle','Banesco Panamá','Paypal','Binance','Efectivo','Otro'],
  VE_STATES: ['Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar',
    'Carabobo','Cojedes','Delta Amacuro','Distrito Capital','Falcón',
    'Guárico','Lara','Mérida','Miranda','Monagas','Nueva Esparta',
    'Portuguesa','Sucre','Táchira','Trujillo','Vargas','Yaracuy','Zulia'],

  APP_VERSION: '3.2.7',
  APP_NAME:    'ERGOEXPRESS CRM',
  GEMINI_MODEL: 'gemini-1.5-flash'
};
