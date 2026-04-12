-- ERGOEXPRESS FINANCE - Esquema de Base de Datos PostgreSQL
-- Versión: 1.0 - Supabase Compatible
-- Fecha: Abril 2026

-- NOTA: Este archivo está adaptado para Supabase
-- Se eliminaron comandos específicos de psql que no son compatibles

-- Extensiones útiles (algunas ya están disponibles en Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- ESQUEMAS
-- ===========================================

-- Esquema principal
CREATE SCHEMA IF NOT EXISTS finance;

-- Esquema para auditoría
CREATE SCHEMA IF NOT EXISTS audit;

-- ===========================================
-- TIPOS ENUMERADOS
-- ===========================================

-- Roles de usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'finance'
  ) THEN
    CREATE TYPE finance.user_role AS ENUM ('admin', 'manager', 'user', 'viewer');
  END IF;
END
$$ LANGUAGE plpgsql;

-- Estados de documentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'document_status' AND n.nspname = 'finance'
  ) THEN
    CREATE TYPE finance.document_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'completed');
  END IF;
END
$$ LANGUAGE plpgsql;

-- Tipos de transacción financiera
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'transaction_type' AND n.nspname = 'finance'
  ) THEN
    CREATE TYPE finance.transaction_type AS ENUM ('ingreso', 'egreso', 'transferencia');
  END IF;
END
$$ LANGUAGE plpgsql;

-- Categorías fiscales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'tax_category' AND n.nspname = 'finance'
  ) THEN
    CREATE TYPE finance.tax_category AS ENUM ('ordinario', 'especial', 'no_contribuyente');
  END IF;
END
$$ LANGUAGE plpgsql;

-- Estados de inventario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_status' AND n.nspname = 'finance'
  ) THEN
    CREATE TYPE finance.inventory_status AS ENUM ('active', 'inactive', 'discontinued');
  END IF;
END
$$ LANGUAGE plpgsql;

-- ===========================================
-- TABLAS PRINCIPALES
-- ===========================================

-- Usuarios
CREATE TABLE IF NOT EXISTS finance.usuarios (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255),
    rol finance.user_role DEFAULT 'user',
    activo BOOLEAN DEFAULT true,
    super_admin BOOLEAN DEFAULT false,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por INTEGER REFERENCES finance.usuarios(id),
    actualizado_por INTEGER REFERENCES finance.usuarios(id),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE IF NOT EXISTS finance.categorias_productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos
CREATE TABLE IF NOT EXISTS finance.productos (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES finance.categorias_productos(id),
    precio_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto_pct DECIMAL(5,2) DEFAULT 16.00,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    stock_maximo INTEGER,
    ubicacion VARCHAR(100),
    status finance.inventory_status DEFAULT 'active',
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER REFERENCES finance.usuarios(id),
    actualizado_por INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes/Proveedores
CREATE TABLE IF NOT EXISTS finance.entidades (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente', 'proveedor')),
    razon_social VARCHAR(255) NOT NULL,
    rif VARCHAR(20) UNIQUE,
    persona_contacto VARCHAR(255),
    telefonos JSONB,
    email VARCHAR(255),
    direccion JSONB,
    estado VARCHAR(50),
    municipio VARCHAR(100),
    categoria_fiscal finance.tax_category DEFAULT 'ordinario',
    rif_validado BOOLEAN DEFAULT false,
    rif_ultimo_digito INTEGER,
    contribuyente_especial BOOLEAN DEFAULT false,
    limite_credito DECIMAL(12,2) DEFAULT 0,
    dias_credito INTEGER DEFAULT 0,
    puntaje INTEGER DEFAULT 0 CHECK (puntaje >= 0 AND puntaje <= 100),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER REFERENCES finance.usuarios(id),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías de transacciones
CREATE TABLE IF NOT EXISTS finance.categorias_transacciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    tipo finance.transaction_type NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contactos y clientes
CREATE TABLE IF NOT EXISTS finance.contactos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telefono VARCHAR(100),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente', 'proveedor', 'prospecto')),
    empresa VARCHAR(255),
    creado_por INTEGER REFERENCES finance.usuarios(id),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transacciones Financieras
CREATE TABLE IF NOT EXISTS finance.transacciones_financieras (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    fecha DATE NOT NULL,
    tipo finance.transaction_type NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    descripcion TEXT,
    entidad_id INTEGER REFERENCES finance.entidades(id),
    categoria_id INTEGER REFERENCES finance.categorias_transacciones(id),
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    monto_usd DECIMAL(12,2) NOT NULL,
    monto_ves DECIMAL(12,2),
    tasa_cambio DECIMAL(8,2),
    metodo_pago VARCHAR(50),
    banco VARCHAR(100),
    referencia VARCHAR(100),
    numero_control VARCHAR(50),
    tasa_factura DECIMAL(8,2),
    igtf_ves DECIMAL(12,2),
    diferencial_cambiario DECIMAL(12,2),
    retencion_iva DECIMAL(12,2),
    retencion_islr DECIMAL(12,2),
    islr_pct DECIMAL(5,2),
    aporte_pension DECIMAL(12,2),
    monto_neto_divisa DECIMAL(12,2),
    status finance.document_status DEFAULT 'completed',
    usuario_id INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Presupuestos
CREATE TABLE IF NOT EXISTS finance.presupuestos (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    categoria VARCHAR(100) NOT NULL,
    monto_asignado DECIMAL(12,2) NOT NULL DEFAULT 0,
    monto_ejecutado DECIMAL(12,2) DEFAULT 0,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(anio, mes, categoria)
);

-- Tasas de cambio
CREATE TABLE IF NOT EXISTS finance.tasas_cambio (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    tasa_oficial DECIMAL(8,2) NOT NULL,
    tasa_paralela DECIMAL(8,2),
    fuente VARCHAR(100) DEFAULT 'BCV',
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS finance.cotizaciones (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    numero VARCHAR(20) UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    cliente_id INTEGER REFERENCES finance.entidades(id),
    validez_dias INTEGER DEFAULT 30,
    status finance.document_status DEFAULT 'draft',
    subtotal_usd DECIMAL(12,2) DEFAULT 0,
    impuesto_usd DECIMAL(12,2) DEFAULT 0,
    total_usd DECIMAL(12,2) DEFAULT 0,
    subtotal_ves DECIMAL(12,2) DEFAULT 0,
    total_ves DECIMAL(12,2) DEFAULT 0,
    notas TEXT,
    detalle JSONB, -- Array de productos con cantidades y precios
    usuario_id INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detalle de cotizaciones
CREATE TABLE IF NOT EXISTS finance.cotizaciones_detalle (
    id SERIAL PRIMARY KEY,
    cotizacion_id INTEGER REFERENCES finance.cotizaciones(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES finance.productos(id),
    descripcion VARCHAR(255),
    cantidad DECIMAL(10,2) NOT NULL,
    precio_unitario_usd DECIMAL(12,2) NOT NULL,
    impuesto_pct DECIMAL(5,2) DEFAULT 16.00,
    subtotal_usd DECIMAL(12,2) NOT NULL,
    descuento_pct DECIMAL(5,2) DEFAULT 0,
    total_usd DECIMAL(12,2) NOT NULL
);

-- Nómina - Control
CREATE TABLE IF NOT EXISTS finance.nomina_control (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL, -- Referencia externa por simplicidad
    nombre VARCHAR(255) NOT NULL,
    sueldo_base_usd DECIMAL(10,2) NOT NULL,
    sueldo_indexado_ves DECIMAL(12,2),
    bono_alimentacion DECIMAL(10,2) DEFAULT 0,
    bono_especial_config DECIMAL(10,2) DEFAULT 0,
    total_destajo_mes_ves DECIMAL(12,2) DEFAULT 0,
    total_bonos_cumplimiento_ves DECIMAL(12,2) DEFAULT 0,
    metodo_pago_preferido VARCHAR(50),
    fecha_ingreso DATE,
    ultima_liquidacion DATE,
    apartado_art142_a BOOLEAN DEFAULT false,
    apartado_art142_c BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nómina - Detalle
CREATE TABLE IF NOT EXISTS finance.nomina_detalle (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    tipo_pago VARCHAR(50) NOT NULL,
    descripcion_tarea VARCHAR(255),
    cantidad DECIMAL(8,2) DEFAULT 1,
    precio_unitario_usd DECIMAL(10,2),
    subtotal_usd DECIMAL(12,2),
    estatus_pago finance.document_status DEFAULT 'pending',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agenda
CREATE TABLE IF NOT EXISTS finance.agenda (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    fecha DATE NOT NULL,
    hora TIME,
    cliente_id INTEGER REFERENCES finance.entidades(id),
    asunto VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'reunion',
    status finance.document_status DEFAULT 'pending',
    notas TEXT,
    usuario_id INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS finance.configuracion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descripcion VARCHAR(255),
    tipo VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- TABLAS DE AUDITORÍA
-- ===========================================

-- Logs de auditoría
CREATE TABLE IF NOT EXISTS audit.logs_auditoria (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_email VARCHAR(255),
    usuario_id INTEGER,
    accion VARCHAR(100) NOT NULL,
    tabla VARCHAR(100),
    registro_id INTEGER,
    detalles JSONB,
    ip_address INET,
    user_agent TEXT
);

-- Notas de operaciones
CREATE TABLE IF NOT EXISTS audit.notas_operaciones (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- debito, credito, ajuste
    registro_original_id INTEGER,
    tabla_original VARCHAR(100),
    concepto VARCHAR(255) NOT NULL,
    monto_ajuste_usd DECIMAL(12,2),
    total_ves DECIMAL(12,2),
    tasa DECIMAL(8,2),
    usuario_email VARCHAR(255),
    usuario_id INTEGER,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- VISTAS ÚTILES
-- ===========================================

-- Vista de productos con stock
CREATE OR REPLACE VIEW finance.vw_productos_stock AS
SELECT
    p.id,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    CASE
        WHEN p.stock_actual <= p.stock_minimo THEN 'bajo'
        WHEN p.stock_actual = 0 THEN 'agotado'
        ELSE 'normal'
    END as status_stock,
    c.nombre as categoria
FROM finance.productos p
LEFT JOIN finance.categorias_productos c ON p.categoria_id = c.id
WHERE p.activo = true;

-- Vista de balance general
CREATE OR REPLACE VIEW finance.vw_balance_general AS
SELECT
    DATE_TRUNC('month', fecha) as mes,
    SUM(CASE WHEN tipo = 'ingreso' THEN monto_usd ELSE 0 END) as ingresos_usd,
    SUM(CASE WHEN tipo = 'egreso' THEN monto_usd ELSE 0 END) as egresos_usd,
    SUM(CASE WHEN tipo = 'ingreso' THEN monto_usd ELSE -monto_usd END) as balance_usd
FROM finance.transacciones_financieras
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', fecha)
ORDER BY mes DESC;

-- Vista de punto de equilibrio
CREATE OR REPLACE VIEW finance.vw_punto_equilibrio AS
WITH costos AS (
    SELECT
        categoria,
        SUM(CASE WHEN tipo = 'egreso' THEN monto_usd ELSE 0 END) as costo_mensual
    FROM finance.transacciones_financieras
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)
      AND fecha < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
      AND status = 'completed'
    GROUP BY categoria
),
costos_fijos AS (
    SELECT SUM(costo_mensual) as total_fijos
    FROM costos
    WHERE categoria IN ('Nómina', 'Administrativos', 'Servicios', 'Impuestos')
),
costos_variables AS (
    SELECT SUM(costo_mensual) as total_variables
    FROM costos
    WHERE categoria NOT IN ('Nómina', 'Administrativos', 'Servicios', 'Impuestos')
)
SELECT
    cf.total_fijos as costos_fijos,
    cv.total_variables as costos_variables,
    (cf.total_fijos + cv.total_variables) as costos_totales,
    CASE
        WHEN cv.total_variables > 0 THEN cf.total_fijos / (1 - (cv.total_variables / (cf.total_fijos + cv.total_variables)))
        ELSE cf.total_fijos
    END as punto_equilibrio_usd
FROM costos_fijos cf
CROSS JOIN costos_variables cv;

-- ===========================================
-- FUNCIONES ÚTILES
-- ===========================================

-- Función para calcular IVA
CREATE OR REPLACE FUNCTION finance.calcular_iva(monto DECIMAL, porcentaje DECIMAL DEFAULT 16.0)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(monto * (porcentaje / 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener tasa de cambio
CREATE OR REPLACE FUNCTION finance.get_tasa_cambio(fecha_busqueda DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
DECLARE
    tasa DECIMAL;
BEGIN
    SELECT tasa_oficial INTO tasa
    FROM finance.tasas_cambio
    WHERE fecha <= fecha_busqueda
      AND activo = true
    ORDER BY fecha DESC
    LIMIT 1;

    RETURN COALESCE(tasa, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Función para generar números de documento
CREATE OR REPLACE FUNCTION finance.generar_numero_documento(tipo VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefijo VARCHAR(5);
    contador INTEGER;
    numero VARCHAR(20);
BEGIN
    -- Definir prefijos
    CASE tipo
        WHEN 'cotizacion' THEN prefijo := 'COT';
        WHEN 'factura' THEN prefijo := 'FAC';
        WHEN 'nota_credito' THEN prefijo := 'NC';
        WHEN 'nota_debito' THEN prefijo := 'ND';
        ELSE prefijo := 'DOC';
    END CASE;

    -- Obtener último número
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO contador
    FROM finance.cotizaciones
    WHERE numero LIKE prefijo || '%';

    -- Generar número
    numero := prefijo || '-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
              LPAD(contador::TEXT, 4, '0');

    RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS DE AUDITORÍA
-- ===========================================

-- Trigger para auditar cambios en usuarios
CREATE OR REPLACE FUNCTION audit.auditar_usuarios()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.logs_auditoria (usuario_id, accion, tabla, registro_id, detalles)
        VALUES (NEW.creado_por, 'INSERT', 'usuarios', NEW.id, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.logs_auditoria (usuario_id, accion, tabla, registro_id, detalles)
        VALUES (NEW.actualizado_por, 'UPDATE', 'usuarios', NEW.id,
                json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.logs_auditoria (usuario_id, accion, tabla, registro_id, detalles)
        VALUES (NULL, 'DELETE', 'usuarios', OLD.id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = 'trg_auditar_usuarios'
          AND n.nspname = 'finance'
    ) THEN
        CREATE TRIGGER trg_auditar_usuarios
            AFTER INSERT OR UPDATE OR DELETE ON finance.usuarios
            FOR EACH ROW EXECUTE FUNCTION audit.auditar_usuarios();
    END IF;
END
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION finance.actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = 'trg_usuarios_timestamp'
          AND n.nspname = 'finance'
    ) THEN
        CREATE TRIGGER trg_usuarios_timestamp BEFORE UPDATE ON finance.usuarios
            FOR EACH ROW EXECUTE FUNCTION finance.actualizar_timestamp();
    END IF;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = 'trg_productos_timestamp'
          AND n.nspname = 'finance'
    ) THEN
        CREATE TRIGGER trg_productos_timestamp BEFORE UPDATE ON finance.productos
            FOR EACH ROW EXECUTE FUNCTION finance.actualizar_timestamp();
    END IF;
END
$$ LANGUAGE plpgsql;

-- ===========================================
-- DATOS INICIALES
-- ===========================================

-- Usuario administrador
INSERT INTO finance.usuarios (email, password_hash, nombre, rol, super_admin)
VALUES (
    'admin@ergoexpress.com',
    crypt('admin123', gen_salt('bf')),
    'Administrador',
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- Categorías iniciales
INSERT INTO finance.categorias_productos (nombre, descripcion) VALUES
('Electrónicos', 'Productos electrónicos y tecnología'),
('Ropa', 'Prendas de vestir y accesorios'),
('Alimentos', 'Productos alimenticios'),
('Servicios', 'Servicios profesionales'),
('Otros', 'Categoría general')
ON CONFLICT (nombre) DO NOTHING;

-- Configuración inicial
INSERT INTO finance.configuracion (clave, valor, descripcion, tipo) VALUES
('empresa.nombre', 'ERGOEXPRESS FINANCE', 'Nombre de la empresa', 'string'),
('empresa.rif', 'J-12345678-9', 'RIF de la empresa', 'string'),
('sistema.moneda_principal', 'USD', 'Moneda principal del sistema', 'string'),
('sistema.tasa_impuesto', '16.0', 'Tasa de IVA por defecto', 'number'),
('sistema.zona_horaria', 'America/Caracas', 'Zona horaria del sistema', 'string')
ON CONFLICT (clave) DO NOTHING;

-- Tasa de cambio inicial
INSERT INTO finance.tasas_cambio (fecha, tasa_oficial, fuente) VALUES
(CURRENT_DATE, 36.50, 'BCV')
ON CONFLICT (fecha) DO NOTHING;

-- ===========================================
-- ÍNDICES DE PERFORMANCE
-- ===========================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON finance.productos (categoria_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_productos_activo ON finance.productos (activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON finance.productos (codigo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON finance.transacciones_financieras (fecha);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON finance.transacciones_financieras (tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_categoria ON finance.transacciones_financieras (categoria);
CREATE INDEX IF NOT EXISTS idx_transacciones_status ON finance.transacciones_financieras (status);

CREATE INDEX IF NOT EXISTS idx_entidades_tipo ON finance.entidades (tipo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_entidades_rif ON finance.entidades (rif) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON finance.cotizaciones (fecha);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_status ON finance.cotizaciones (status);

-- Índices de texto completo
CREATE INDEX IF NOT EXISTS idx_productos_texto ON finance.productos USING gin (to_tsvector('spanish', nombre || ' ' || descripcion)) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_entidades_texto ON finance.entidades USING gin (to_tsvector('spanish', razon_social || ' ' || COALESCE(persona_contacto, ''))) WHERE activo = true;

-- ===========================================
-- PERMISOS Y SEGURIDAD
-- ===========================================

-- Row Level Security (RLS) para multi-tenant futuro
-- NOTA: En Supabase, RLS se configura a través de las políticas de Supabase Auth
-- Las siguientes líneas están comentadas ya que requieren configuración específica de Supabase

-- ALTER TABLE finance.usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE finance.productos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE finance.transacciones_financieras ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (se configurarán en Supabase Dashboard)
-- CREATE POLICY usuarios_own ON finance.usuarios FOR ALL USING (id = current_user_id() OR rol = 'admin');

-- ===========================================
-- COMENTARIOS FINALES
-- ===========================================

COMMENT ON SCHEMA finance IS 'Esquema principal con todas las tablas de negocio - Compatible con Supabase';
COMMENT ON SCHEMA audit IS 'Esquema de auditoría y logs del sistema - Compatible con Supabase';

-- Verificar que todo esté creado correctamente
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname IN ('finance', 'audit')
ORDER BY schemaname, tablename;
