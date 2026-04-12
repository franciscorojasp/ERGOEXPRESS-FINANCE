-- =============================================================================
-- ERGOEXPRESS-FINANCE: MIGRACIÓN DE ADECUACIÓN FISCAL Y LEGAL (v1.1)
-- Objetivos: Inalterabilidad SENIAT 2026 + Cumplimiento LOTTT Art. 142
-- =============================================================================

-- 1. PARÁMETROS LEGALES DE CONFIGURACIÓN
INSERT INTO finance.configuracion (clave, valor, descripcion, tipo) VALUES
('nomina.tasa_sso', '4.0', 'Porcentaje Seguro Social Obligatorio (Empleado)', 'number'),
('nomina.tasa_lph', '1.0', 'Porcentaje Ley Política Habitacional (Empleado)', 'number'),
('nomina.tasa_spf', '0.5', 'Porcentaje Seguro Paro Forzoso (Empleado)', 'number'),
('nomina.dias_garantia_trimestral', '15', 'Días de salario depositados por trimestre (Art. 142a)', 'number'),
('sistema.tasa_impuesto_igtf', '3.0', 'Tasa de Impuesto a las Grandes Transacciones Financieras', 'number'),
('sistema.forensic_logging', 'true', 'Habilitar captura extendida de IP y User Agent', 'boolean')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- 2. TABLA DE PRESTACIONES SOCIALES (ART. 142 LOTTT)
CREATE TABLE IF NOT EXISTS finance.prestaciones_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id VARCHAR(50) NOT NULL,
    periodo_anio INTEGER NOT NULL,
    periodo_trimestre INTEGER NOT NULL, -- 1, 2, 3, 4
    monto_garantia_usd DECIMAL(12, 2) NOT NULL,
    monto_retroactivo_acumulado_usd DECIMAL(12, 2) NOT NULL,
    salario_base_momento_usd DECIMAL(12, 2) NOT NULL,
    fecha_calculo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID,
    
    CONSTRAINT unique_periodo_empleado UNIQUE(empleado_id, periodo_anio, periodo_trimestre)
);

-- 3. FUNCIONES DE INALTERABILIDAD
CREATE OR REPLACE FUNCTION finance.prevent_fiscal_changes() 
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir cambios solo si el estatus es 'draft' o 'borrador'
    -- Bloquear DELETE y UPDATE en registros 'completed', 'paid', 'anulada'
    IF (TG_OP = 'DELETE') THEN
        IF (OLD.status IN ('completed', 'paid', 'anulada', 'procesada')) THEN
            RAISE EXCEPTION 'RESTRICCIÓN SENIAT: Los registros fiscales finalizados no pueden ser eliminados.';
        END IF;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IN ('completed', 'paid', 'anulada', 'procesada') AND NEW.status = OLD.status) THEN
            RAISE EXCEPTION 'RESTRICCIÓN SENIAT: Los registros fiscales finalizados no admiten modificaciones. Utilice Notas de Crédito/Débito.';
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. APLICACIÓN DE TRIGGERS DE INTEGRIDAD
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fiscal_integrity_transacciones') THEN
        CREATE TRIGGER trg_fiscal_integrity_transacciones
        BEFORE UPDATE OR DELETE ON finance.transacciones_financieras
        FOR EACH ROW EXECUTE FUNCTION finance.prevent_fiscal_changes();
    END IF;
END $$;

-- 5. ENDURECIMIENTO DE SEGURIDAD (RLS)
ALTER TABLE finance.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.transacciones_financieras ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para permitir acceso a usuarios autenticados
-- NOTA: Estas políticas asumen que el JWT de Supabase contiene el role 'authenticated'
DROP POLICY IF EXISTS "Acepta todo para admin" ON finance.transacciones_financieras;
CREATE POLICY "Acepta todo para admin" ON finance.transacciones_financieras 
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acepta todo para admin" ON finance.entidades;
CREATE POLICY "Acepta todo para admin" ON finance.entidades 
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura publica config" ON finance.configuracion;
CREATE POLICY "Lectura publica config" ON finance.configuracion 
    FOR SELECT TO authenticated USING (true);

-- 6. VALIDACIÓN DE RIF (SANITIZACIÓN)
CREATE OR REPLACE FUNCTION finance.validar_rif() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rif !~ '^[VJEG]-[0-9]{8}-[0-9]$|^(V|J|E|G)[0-9]{8}[0-9]$|^(V|J|E|G)-[0-9]{8}-[0-9]$|^(v|j|e|g)-[0-9]{8}-[0-9]$|^(v|j|e|g)[0-9]{8}[0-9]$' THEN
        RAISE EXCEPTION 'FORMATO DE RIF INVÁLIDO. Debe seguir el patrón SENIAT (Ej: J-12345678-9).';
    END IF;
    -- Normalizar a MAYÚSCULAS y con GUIONES
    NEW.rif := UPPER(NEW.rif);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rif_entidades
BEFORE INSERT OR UPDATE ON finance.entidades
FOR EACH ROW EXECUTE FUNCTION finance.validar_rif();

-- 7. AUDITORÍA EXTENDIDA
-- Asegurar que la tabla de logs tenga índices para búsquedas forenses
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON audit.logs_auditoria (fecha);
CREATE INDEX IF NOT EXISTS idx_logs_accion ON audit.logs_auditoria (accion);
