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
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyewLsUxongldudRxZEj6J8DCNDmgc6lSzKEFVAHdMsjAe5ubnNo8yREtGsFyuV9CY2/exec',
  API_KEY: 'ERGX2026',

  // ── AI Configuration (Gemini) ─────────────────────────────────────────────
  GEMINI_API_KEY: 'AIzaSyAsBBOxgvIQP6WySvA39C6c_GQEZWiKBZk',
  GEMINI_MODEL: 'gemini-1.5-flash',

  // ── Nombres de las Hojas ──────────────────────────────────────────────────
  SHEETS: {
    CONTACTS:        'Contactos',
    PRODUCTS:        'Productos',
    RATES:           'TasasCambio',
    QUOTATIONS:      'Cotizaciones',
    TRACKING:        'Seguimiento',
    CONFIG:          'Configuracion',
    USERS:           'Usuarios',
    FINANCE_INCOME:  'Finanzas_Ingresos',
    FINANCE_EXPENSE: 'Finanzas_Egresos',
    AGENDA:          'Agenda',
    BUDGET:          'Presupuestos',
    PAYROLL_CONTROL: 'Nomina_Control',
    PAYROLL_DETAIL:  'Nomina_Detalle',
    LABOR_LIABILITIES: 'Pasivos_Laborales',
    AUDIT_LOGS:      'Logs_Auditoria',
    NOTES_OPS:       'Notas_Operaciones'
  },

  // ── Cabeceras por hoja (Sincronizadas con ERP v6.0.0) ──────────────────────
  HEADERS: {
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
  },


  // ── Catálogos ──────────────────────────────────────────────────────────────
  PIPELINE_STAGES:   ['Nuevo','Contactado','En Negociación','Ganado','Perdido'],
  CONTACT_TYPES:     ['potencial','activo','inactivo'],
  QUOTE_STATUSES:    ['Borrador','Enviada','Aprobada','Aceptada','Facturada','Parcial','Pagada','Rechazada','Vencida'],
  INTERACTION_TYPES: ['nota','llamada','email','reunión','visita'],
  USER_ROLES:        ['admin','vendedor'],
  PAYMENT_METHODS:   ['Zelle','Pago Móvil','Efectivo USD','Efectivo VES','Transferencia','Binance','Banesco Panamá'],
  EXPENSE_CATEGORIES:['Operativos','Administrativos','Marketing','Honorarios','Impuestos','Servicios','Nómina','Otros'],
  APPOINTMENT_TYPES: ['Reunión','Visita Comercial','Instalación','Soporte','Venta'],
  APPOINTMENT_STATUS:['Pendiente','Realizada','Cancelada','Reprogramada'],
  BANKS:             ['Banesco','Provincial','Mercantil','BDV','Banplus','BNC','Bancamiga','Zelle','Banesco Panamá','Paypal','Binance','Efectivo','Otro'],
  VE_STATES: ['Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar',
    'Carabobo','Cojedes','Delta Amacuro','Distrito Capital','Falcón',
    'Guárico','Lara','Mérida','Miranda','Monagas','Nueva Esparta',
    'Portuguesa','Sucre','Táchira','Trujillo','Vargas','Yaracuy','Zulia'],

  APP_VERSION: '6.0.3 (Elite ERP)',
  APP_NAME:    'ERGOEXPRESS-FINANCE',
  API_VERCEL_URL: '/api', // Base URL para la API en Supabase/Vercel
  SPREADSHEET_NAME: 'ERGOEXPRESS-FINANCE',
  GEMINI_MODEL: 'gemini-1.5-flash'
};
