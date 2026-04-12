-- ERGOEXPRESS FINANCE - Módulo Fiscal y Costos
-- Versión: 2.0 - Fiscal Hardening
-- Fecha: Abril 2026

-- ===========================================
-- 1. SECUENCIAS FISCALES (Control de Numeración)
-- ===========================================
CREATE TABLE IF NOT EXISTS finance.secuencias_fiscales (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) UNIQUE NOT NULL, -- 'factura', 'nota_entrega', 'nota_credito', 'nota_debito'
    proximo_numero INTEGER NOT NULL DEFAULT 1,
    ultimo_control VARCHAR(50), -- Para facturas (formas libres)
    prefijo VARCHAR(10) DEFAULT '',
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inicializar secuencias
INSERT INTO finance.secuencias_fiscales (tipo, proximo_numero) VALUES 
('factura', 1),
('nota_entrega', 1),
('nota_credito', 1),
('nota_debito', 1)
ON CONFLICT (tipo) DO NOTHING;

-- ===========================================
-- 2. ESTRUCTURA DE COSTOS
-- ===========================================
CREATE TABLE IF NOT EXISTS finance.costos_productos (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES finance.productos(id) ON DELETE CASCADE,
    materiales_usd DECIMAL(12,2) DEFAULT 0,
    mano_obra_usd DECIMAL(12,2) DEFAULT 0,
    gastos_indirectos_usd DECIMAL(12,2) DEFAULT 0,
    comisiones_usd DECIMAL(12,2) DEFAULT 0,
    costo_total_usd DECIMAL(12,2) GENERATED ALWAYS AS (materiales_usd + mano_obra_usd + gastos_indirectos_usd + comisiones_usd) STORED,
    detalles_json JSONB, -- Desglose textual de componentes
    actualizado_por INTEGER REFERENCES finance.usuarios(id),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(producto_id)
);

-- ===========================================
-- 3. DOCUMENTOS FISCALES
-- ===========================================

-- Notas de Entrega (Despachos)
CREATE TABLE IF NOT EXISTS finance.notas_entrega (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    numero VARCHAR(20) UNIQUE NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_id INTEGER REFERENCES finance.entidades(id),
    cotizacion_id INTEGER REFERENCES finance.cotizaciones(id),
    status finance.document_status DEFAULT 'completed',
    subtotal_usd DECIMAL(12,2) DEFAULT 0,
    total_usd DECIMAL(12,2) DEFAULT 0,
    items JSONB, -- [{producto_id, cantidad, descripcion, precio}]
    notas TEXT,
    usuario_id INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facturas Fiscales
CREATE TABLE IF NOT EXISTS finance.facturas (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    numero INTEGER UNIQUE NOT NULL, -- Secuencial interno (1, 2, 3...)
    numero_control VARCHAR(50) NOT NULL, -- El de la forma libre
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_id INTEGER REFERENCES finance.entidades(id),
    nota_entrega_id INTEGER REFERENCES finance.notas_entrega(id),
    cotizacion_id INTEGER REFERENCES finance.cotizaciones(id),
    tasa_bcv DECIMAL(12,2) NOT NULL,
    subtotal_usd DECIMAL(12,2) NOT NULL,
    iva_usd DECIMAL(12,2) NOT NULL,
    igtf_usd DECIMAL(12,2) DEFAULT 0,
    total_usd DECIMAL(12,2) NOT NULL,
    total_ves DECIMAL(12,2) NOT NULL,
    status finance.document_status DEFAULT 'completed',
    items JSONB,
    qr_code_data TEXT,
    firma_digital VARCHAR(255),
    usuario_id INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notas de Crédito / Débito
CREATE TABLE IF NOT EXISTS finance.documentos_ajuste (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) CHECK (tipo IN ('credito', 'debito')),
    numero INTEGER NOT NULL,
    factura_afectada INTEGER REFERENCES finance.facturas(id),
    motivo TEXT NOT NULL,
    monto_usd DECIMAL(12,2) NOT NULL,
    monto_ves DECIMAL(12,2) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    status finance.document_status DEFAULT 'completed',
    usuario_id INTEGER REFERENCES finance.usuarios(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 4. FUNCIONES DE SEGURIDAD Y RESET
-- ===========================================

-- Función para obtener próximo número y actualizar
CREATE OR REPLACE FUNCTION finance.obtener_proximo_numero(p_tipo VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_num INTEGER;
BEGIN
    UPDATE finance.secuencias_fiscales
    SET proximo_numero = proximo_numero + 1
    WHERE tipo = p_tipo
    RETURNING proximo_numero - 1 INTO v_num;
    RETURN v_num;
END;
$$ LANGUAGE plpgsql;

-- Función de Reseteo (SOLO SuperAdmin)
CREATE OR REPLACE FUNCTION finance.reset_fiscal_data(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Verificar si es super_admin
    IF NOT EXISTS (SELECT 1 FROM finance.usuarios WHERE id = p_user_id AND super_admin = true) THEN
        RAISE EXCEPTION 'No autorizado. Solo el propietario puede resetear registros fiscales.';
    END IF;

    -- Limpiar documentos
    TRUNCATE finance.documentos_ajuste RESTART IDENTITY CASCADE;
    TRUNCATE finance.facturas RESTART IDENTITY CASCADE;
    TRUNCATE finance.notas_entrega RESTART IDENTITY CASCADE;

    -- Reiniciar secuencias
    UPDATE finance.secuencias_fiscales SET proximo_numero = 1;

    -- Registrar evento en auditoría
    INSERT INTO audit.logs (usuario_id, accion, detalles)
    VALUES (p_user_id, 'RESET_FISCAL', 'Se realizó un reseteo completo de la facturación y secuencias.');
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 5. RLS (Row Level Security) - Inalterabilidad
-- ===========================================

-- Bloquear UPDATE/DELETE en facturas una vez creadas
CREATE OR REPLACE FUNCTION finance.prevent_fiscal_modifications()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        RAISE EXCEPTION 'Los registros fiscales (Facturas/Notas) son inalterables por ley.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_modificar_facturas
BEFORE UPDATE OR DELETE ON finance.facturas
FOR EACH ROW EXECUTE FUNCTION finance.prevent_fiscal_modifications();

CREATE TRIGGER trg_no_modificar_ajustes
BEFORE UPDATE OR DELETE ON finance.documentos_ajuste
FOR EACH ROW EXECUTE FUNCTION finance.prevent_fiscal_modifications();
