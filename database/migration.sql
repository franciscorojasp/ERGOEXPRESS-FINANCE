-- ERGOEXPRESS FINANCE - Script de Migración
-- Migra datos desde Google Sheets a PostgreSQL
-- Versión: 1.0
-- Fecha: Abril 2026

-- ===========================================
-- PREPARACIÓN PARA MIGRACIÓN
-- ===========================================

-- Crear tabla temporal para datos de Sheets
CREATE TEMP TABLE temp_sheets_data (
    sheet_name VARCHAR(100),
    row_data JSONB
);

-- Función auxiliar para convertir valores
CREATE OR REPLACE FUNCTION migrate.safe_decimal(val TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN val ~ '^[0-9]+(\.[0-9]+)?$' THEN val::DECIMAL
        ELSE 0.0
    END;
EXCEPTION WHEN OTHERS THEN
    RETURN 0.0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION migrate.safe_integer(val TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE
        WHEN val ~ '^[0-9]+$' THEN val::INTEGER
        ELSE 0
    END;
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION migrate.safe_date(val TEXT)
RETURNS DATE AS $$
BEGIN
    RETURN CASE
        WHEN val ~ '^\d{4}-\d{2}-\d{2}$' THEN val::DATE
        WHEN val ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(val, 'DD/MM/YYYY')
        ELSE CURRENT_DATE
    END;
EXCEPTION WHEN OTHERS THEN
    RETURN CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- MIGRACIÓN DE USUARIOS
-- ===========================================

CREATE OR REPLACE FUNCTION migrate.usuarios()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    user_record RECORD;
BEGIN
    RAISE NOTICE 'Iniciando migración de usuarios...';

    -- Iterar sobre datos de usuarios en temp_sheets_data
    FOR user_record IN
        SELECT row_data
        FROM temp_sheets_data
        WHERE sheet_name = 'Usuarios'
    LOOP
        -- Insertar usuario si no existe
        INSERT INTO finance.usuarios (
            email,
            password_hash,
            nombre,
            rol,
            activo,
            super_admin,
            fecha_registro
        )
        SELECT
            row_data->>'Email',
            -- Hash de contraseña por defecto (cambiar después)
            crypt('changeme123', gen_salt('bf')),
            COALESCE(row_data->>'Nombre', 'Usuario Migrado'),
            CASE
                WHEN LOWER(row_data->>'Rol') = 'admin' THEN 'admin'::finance.user_role
                WHEN LOWER(row_data->>'Rol') = 'manager' THEN 'manager'::finance.user_role
                ELSE 'user'::finance.user_role
            END,
            CASE WHEN LOWER(row_data->>'Activo') = 'true' THEN true ELSE false END,
            CASE WHEN LOWER(row_data->>'SuperAdmin') = 'true' THEN true ELSE false END,
            migrate.safe_date(row_data->>'Fecha Registro')
        FROM temp_sheets_data
        WHERE sheet_name = 'Usuarios'
          AND row_data->>'Email' = user_record.row_data->>'Email'
        ON CONFLICT (email) DO NOTHING;

        migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migración de usuarios completada: % registros', migrated_count;
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- MIGRACIÓN DE PRODUCTOS
-- ===========================================

CREATE OR REPLACE FUNCTION migrate.productos()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    product_record RECORD;
    categoria_id INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando migración de productos...';

    FOR product_record IN
        SELECT row_data
        FROM temp_sheets_data
        WHERE sheet_name = 'Productos'
    LOOP
        -- Buscar o crear categoría
        SELECT id INTO categoria_id
        FROM finance.categorias_productos
        WHERE nombre = COALESCE(product_record.row_data->>'Categoría', 'Otros');

        IF categoria_id IS NULL THEN
            INSERT INTO finance.categorias_productos (nombre, descripcion)
            VALUES (COALESCE(product_record.row_data->>'Categoría', 'Otros'), 'Categoría migrada')
            RETURNING id INTO categoria_id;
        END IF;

        -- Insertar producto
        INSERT INTO finance.productos (
            nombre,
            descripcion,
            categoria_id,
            precio_usd,
            costo_usd,
            impuesto_pct,
            stock_actual,
            stock_minimo,
            activo
        )
        SELECT
            COALESCE(row_data->>'Nombre', 'Producto sin nombre'),
            row_data->>'Descripción',
            categoria_id,
            migrate.safe_decimal(row_data->>'Precio USD'),
            migrate.safe_decimal(row_data->>'Costo USD'),
            migrate.safe_decimal(row_data->>'Impuesto %'),
            migrate.safe_integer(row_data->>'Stock_Actual'),
            migrate.safe_integer(row_data->>'Stock_Minimo'),
            true
        FROM temp_sheets_data
        WHERE sheet_name = 'Productos'
          AND row_data->>'ID' = product_record.row_data->>'ID'
        ON CONFLICT (nombre) DO NOTHING;

        migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migración de productos completada: % registros', migrated_count;
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- MIGRACIÓN DE TRANSACCIONES FINANCIERAS
-- ===========================================

CREATE OR REPLACE FUNCTION migrate.transacciones_financieras()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    transaction_record RECORD;
BEGIN
    RAISE NOTICE 'Iniciando migración de transacciones financieras...';

    FOR transaction_record IN
        SELECT row_data
        FROM temp_sheets_data
        WHERE sheet_name IN ('Finanzas_Ingresos', 'Finanzas_Egresos')
    LOOP
        -- Insertar transacción
        INSERT INTO finance.transacciones_financieras (
            fecha,
            tipo,
            concepto,
            descripcion,
            categoria,
            monto_usd,
            monto_ves,
            tasa_cambio,
            metodo_pago,
            banco,
            referencia,
            tasa_factura,
            igtf_ves,
            retencion_iva,
            retencion_islr,
            islr_pct,
            monto_neto_divisa,
            status
        )
        SELECT
            migrate.safe_date(row_data->>'Fecha'),
            CASE
                WHEN sheet_name = 'Finanzas_Ingresos' THEN 'ingreso'::finance.transaction_type
                ELSE 'egreso'::finance.transaction_type
            END,
            COALESCE(row_data->>'Concepto', 'Concepto migrado'),
            row_data->>'Concepto',
            row_data->>'Categoría',
            migrate.safe_decimal(row_data->>'Total USD'),
            migrate.safe_decimal(row_data->>'Total VES'),
            migrate.safe_decimal(row_data->>'Tasa'),
            row_data->>'Método',
            row_data->>'Banco',
            row_data->>'Referencia',
            migrate.safe_decimal(row_data->>'Tasa_Factura'),
            migrate.safe_decimal(row_data->>'IGTF_VES'),
            migrate.safe_decimal(row_data->>'Retencion_IVA'),
            migrate.safe_decimal(row_data->>'Retencion_ISLR'),
            migrate.safe_decimal(row_data->>'ISLR_%'),
            migrate.safe_decimal(row_data->>'Monto_Neto_Divisa'),
            'completed'::finance.document_status
        FROM temp_sheets_data
        WHERE sheet_name = transaction_record.sheet_name
          AND row_data->>'ID' = transaction_record.row_data->>'ID';

        migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migración de transacciones completada: % registros', migrated_count;
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- MIGRACIÓN DE ENTIDADES (CLIENTES/PROVEEDORES)
-- ===========================================

CREATE OR REPLACE FUNCTION migrate.entidades()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    entity_record RECORD;
BEGIN
    RAISE NOTICE 'Iniciando migración de entidades...';

    -- Nota: Esta migración asume que hay una hoja "Contactos"
    -- Adaptar según la estructura real de Sheets

    FOR entity_record IN
        SELECT row_data
        FROM temp_sheets_data
        WHERE sheet_name = 'Contactos'
    LOOP
        INSERT INTO finance.entidades (
            tipo,
            razon_social,
            rif,
            persona_contacto,
            telefonos,
            email,
            direccion,
            estado,
            categoria_fiscal,
            notas,
            activo
        )
        SELECT
            CASE
                WHEN row_data->>'Tipo' = 'Cliente' THEN 'cliente'
                ELSE 'proveedor'
            END,
            COALESCE(row_data->>'Razón Social', 'Entidad migrada'),
            row_data->>'RIF',
            row_data->>'Persona Contacto',
            json_build_object('principal', row_data->>'Teléfonos'),
            row_data->>'Email',
            json_build_object('direccion', row_data->>'Dirección'),
            row_data->>'Estado',
            CASE
                WHEN row_data->>'Categoria_Fiscal' = 'Especial' THEN 'especial'::finance.tax_category
                WHEN row_data->>'Categoria_Fiscal' = 'No Contribuyente' THEN 'no_contribuyente'::finance.tax_category
                ELSE 'ordinario'::finance.tax_category
            END,
            row_data->>'Notas',
            true
        FROM temp_sheets_data
        WHERE sheet_name = 'Contactos'
          AND row_data->>'ID' = entity_record.row_data->>'ID'
        ON CONFLICT (rif) DO NOTHING;

        migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migración de entidades completada: % registros', migrated_count;
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCIÓN PRINCIPAL DE MIGRACIÓN
-- ===========================================

CREATE OR REPLACE FUNCTION migrate.all_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
    usuarios_count INTEGER;
    productos_count INTEGER;
    transacciones_count INTEGER;
    entidades_count INTEGER;
BEGIN
    RAISE NOTICE '🚀 Iniciando migración completa de datos...';

    -- Ejecutar migraciones
    SELECT migrate.usuarios() INTO usuarios_count;
    SELECT migrate.productos() INTO productos_count;
    SELECT migrate.transacciones_financieras() INTO transacciones_count;
    SELECT migrate.entidades() INTO entidades_count;

    -- Crear resultado
    result := json_build_object(
        'success', true,
        'migrated', json_build_object(
            'usuarios', usuarios_count,
            'productos', productos_count,
            'transacciones', transacciones_count,
            'entidades', entidades_count
        ),
        'timestamp', NOW()
    );

    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Resumen: Usuarios: %, Productos: %, Transacciones: %, Entidades: %',
        usuarios_count, productos_count, transacciones_count, entidades_count;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SCRIPT DE EJECUCIÓN MANUAL
-- ===========================================

-- Para ejecutar la migración completa:
-- SELECT migrate.all_data();

-- Para ejecutar migraciones individuales:
-- SELECT migrate.usuarios();
-- SELECT migrate.productos();
-- SELECT migrate.transacciones_financieras();
-- SELECT migrate.entidades();

-- ===========================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===========================================

CREATE OR REPLACE FUNCTION migrate.verify_migration()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'usuarios', (SELECT COUNT(*) FROM finance.usuarios),
        'productos', (SELECT COUNT(*) FROM finance.productos WHERE activo = true),
        'transacciones', (SELECT COUNT(*) FROM finance.transacciones_financieras),
        'entidades', (SELECT COUNT(*) FROM finance.entidades WHERE activo = true),
        'balance_usd', (SELECT SUM(
            CASE WHEN tipo = 'ingreso' THEN monto_usd ELSE -monto_usd END
        ) FROM finance.transacciones_financieras WHERE status = 'completed'),
        'verified_at', NOW()
    ) INTO stats;

    RAISE NOTICE '📊 Estadísticas post-migración: %', stats;
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- LIMPIEZA POST-MIGRACIÓN
-- ===========================================

-- Después de verificar que la migración fue exitosa:

-- DROP FUNCTION migrate.usuarios();
-- DROP FUNCTION migrate.productos();
-- DROP FUNCTION migrate.transacciones_financieras();
-- DROP FUNCTION migrate.entidades();
-- DROP FUNCTION migrate.all_data();
-- DROP FUNCTION migrate.verify_migration();
-- DROP FUNCTION migrate.safe_decimal(TEXT);
-- DROP FUNCTION migrate.safe_integer(TEXT);
-- DROP FUNCTION migrate.safe_date(TEXT);

-- ===========================================
-- NOTAS IMPORTANTES
-- ===========================================

/*
IMPORTANTE:
1. Este script asume una estructura específica de datos en Google Sheets
2. Adaptar los nombres de campos según la estructura real
3. Ejecutar primero en un entorno de desarrollo/testing
4. Hacer backup completo antes de migrar producción
5. Verificar constraints y relaciones después de la migración
6. Actualizar contraseñas de usuarios migrados
7. Configurar índices adicionales si es necesario

Para migrar datos reales:
1. Exportar datos de Sheets a JSON/CSV
2. Insertar en temp_sheets_data
3. Ejecutar SELECT migrate.all_data()
4. Verificar con SELECT migrate.verify_migration()
*/