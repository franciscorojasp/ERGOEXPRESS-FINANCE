/**
 * ERGOEXPRESS FINANCE - Script de Seeds
 * Pobla la base de datos con datos de ejemplo para desarrollo
 */

const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Cargar variables de entorno
dotenv.config();

const { supabaseAdmin } = require('../config/supabase');
const { query } = require('../config/database');

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const error = (message) => {
  console.error(`[${new Date().toISOString()}] ❌ ERROR: ${message}`);
};

const success = (message) => {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
};

async function seedDatabase() {
  try {
    log('🌱 Iniciando seeds de ERGOEXPRESS FINANCE...');

    // Crear usuario administrador
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const { error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@ergoexpress.com',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        nombre: 'Administrador',
        rol: 'admin'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      throw adminError;
    }

    success('Usuario administrador creado');

    // Crear usuario manager
    const { error: managerError } = await supabaseAdmin.auth.admin.createUser({
      email: 'manager@ergoexpress.com',
      password: 'Manager123!',
      email_confirm: true,
      user_metadata: {
        nombre: 'Manager',
        rol: 'manager'
      }
    });

    if (managerError && !managerError.message.includes('already registered')) {
      throw managerError;
    }

    success('Usuario manager creado');

    // Crear usuario regular
    const { error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'user@ergoexpress.com',
      password: 'User123!',
      email_confirm: true,
      user_metadata: {
        nombre: 'Usuario',
        rol: 'user'
      }
    });

    if (userError && !userError.message.includes('already registered')) {
      throw userError;
    }

    success('Usuario regular creado');

    // Crear categorías de productos
    const categorias = [
      'Electrónicos',
      'Ropa y Accesorios',
      'Hogar y Jardín',
      'Deportes',
      'Libros',
      'Juguetes',
      'Salud y Belleza',
      'Automotriz'
    ];

    for (const categoria of categorias) {
      const { error } = await supabaseAdmin
        .from('finance.categorias_productos')
        .upsert([{ nombre: categoria }], { onConflict: 'nombre' });

      if (error) throw error;
    }

    success(`${categorias.length} categorías de productos creadas`);

    // Crear productos de ejemplo
    const productos = [
      {
        codigo: 'ELE001',
        nombre: 'Laptop Gaming Pro',
        descripcion: 'Laptop de alta gama para gaming con RTX 4070',
        precio_usd: 1299.99,
        costo_usd: 999.99,
        impuesto_pct: 16.0,
        stock_actual: 15,
        stock_minimo: 5,
        categoria: 'Electrónicos'
      },
      {
        codigo: 'ELE002',
        nombre: 'Smartphone XYZ',
        descripcion: 'Smartphone de última generación con 5G',
        precio_usd: 699.99,
        costo_usd: 499.99,
        impuesto_pct: 16.0,
        stock_actual: 25,
        stock_minimo: 10,
        categoria: 'Electrónicos'
      },
      {
        codigo: 'ROP001',
        nombre: 'Camisa Casual',
        descripcion: 'Camisa de algodón 100% para uso diario',
        precio_usd: 29.99,
        costo_usd: 15.99,
        impuesto_pct: 16.0,
        stock_actual: 50,
        stock_minimo: 20,
        categoria: 'Ropa y Accesorios'
      },
      {
        codigo: 'HOG001',
        nombre: 'Juego de Sábanas Queen',
        descripcion: 'Juego de sábanas de microfibra para cama queen',
        precio_usd: 49.99,
        costo_usd: 29.99,
        impuesto_pct: 16.0,
        stock_actual: 30,
        stock_minimo: 15,
        categoria: 'Hogar y Jardín'
      },
      {
        codigo: 'DEP001',
        nombre: 'Pelota de Fútbol',
        descripcion: 'Pelota de fútbol profesional tamaño 5',
        precio_usd: 24.99,
        costo_usd: 14.99,
        impuesto_pct: 16.0,
        stock_actual: 40,
        stock_minimo: 25,
        categoria: 'Deportes'
      }
    ];

    for (const producto of productos) {
      // Obtener ID de categoría
      const { data: categoriaData, error: categoriaError } = await supabaseAdmin
        .from('finance.categorias_productos')
        .select('id')
        .eq('nombre', producto.categoria)
        .single();

      if (categoriaError || !categoriaData) {
        console.warn(`Categoría no encontrada: ${producto.categoria}`);
        continue;
      }

      const { error: productoError } = await supabaseAdmin
        .from('finance.productos')
        .upsert([{
          codigo: producto.codigo,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          categoria_id: categoriaData.id,
          precio_usd: producto.precio_usd,
          costo_usd: producto.costo_usd,
          impuesto_pct: producto.impuesto_pct,
          stock_actual: producto.stock_actual,
          stock_minimo: producto.stock_minimo,
          creado_por: 1
        }], { onConflict: 'codigo' });

      if (productoError) throw productoError;
    }

    success(`${productos.length} productos de ejemplo creados`);

    // Crear categorías de transacciones
    const categoriasTransacciones = [
      'Ventas',
      'Servicios',
      'Inversiones',
      'Marketing',
      'Sueldos',
      'Rentas',
      'Utilidades',
      'Proveedores',
      'Impuestos',
      'Mantenimiento'
    ];

    for (const categoria of categoriasTransacciones) {
      await query(`
        INSERT INTO finance.categorias_transacciones (nombre, tipo)
        VALUES ($1, $2)
        ON CONFLICT (nombre) DO NOTHING
      `, [categoria, categoria === 'Ventas' || categoria === 'Servicios' || categoria === 'Inversiones' ? 'ingreso' : 'egreso']);
    }

    success(`${categoriasTransacciones.length} categorías de transacciones creadas`);

    // Crear transacciones de ejemplo
    const transacciones = [
      {
        tipo: 'ingreso',
        categoria: 'Ventas',
        monto_usd: 1299.99,
        descripcion: 'Venta de Laptop Gaming Pro',
        fecha: new Date('2024-01-15'),
        referencia: 'VEN-001'
      },
      {
        tipo: 'ingreso',
        categoria: 'Ventas',
        monto_usd: 699.99,
        descripcion: 'Venta de Smartphone XYZ',
        fecha: new Date('2024-01-16'),
        referencia: 'VEN-002'
      },
      {
        tipo: 'egreso',
        categoria: 'Proveedores',
        monto_usd: 999.99,
        descripcion: 'Compra de inventario - Laptops',
        fecha: new Date('2024-01-10'),
        referencia: 'COM-001'
      },
      {
        tipo: 'egreso',
        categoria: 'Sueldos',
        monto_usd: 2500.00,
        descripcion: 'Pago de sueldos enero 2024',
        fecha: new Date('2024-01-30'),
        referencia: 'NOM-001'
      },
      {
        tipo: 'egreso',
        categoria: 'Marketing',
        monto_usd: 500.00,
        descripcion: 'Campaña publicitaria Google Ads',
        fecha: new Date('2024-01-20'),
        referencia: 'MKT-001'
      }
    ];

    for (const transaccion of transacciones) {
      // Obtener ID de categoría
      const categoriaResult = await query(
        'SELECT id FROM finance.categorias_transacciones WHERE nombre = $1',
        [transaccion.categoria]
      );

      if (categoriaResult.rows.length > 0) {
        const categoriaId = categoriaResult.rows[0].id;

        await query(`
          INSERT INTO finance.transacciones_financieras (
            tipo, categoria_id, monto_usd, descripcion, fecha, referencia, creado_por
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          transaccion.tipo, categoriaId, transaccion.monto_usd,
          transaccion.descripcion, transaccion.fecha, transaccion.referencia, 1
        ]);
      }
    }

    success(`${transacciones.length} transacciones de ejemplo creadas`);

    // Crear algunos contactos de ejemplo
    const contactos = [
      {
        nombre: 'Juan Pérez',
        email: 'juan.perez@email.com',
        telefono: '+52 55 1234 5678',
        tipo: 'cliente',
        empresa: 'Empresa XYZ'
      },
      {
        nombre: 'María García',
        email: 'maria.garcia@email.com',
        telefono: '+52 55 8765 4321',
        tipo: 'proveedor',
        empresa: 'Proveedor ABC'
      },
      {
        nombre: 'Carlos López',
        email: 'carlos.lopez@email.com',
        telefono: '+52 55 5555 1234',
        tipo: 'cliente',
        empresa: null
      }
    ];

    for (const contacto of contactos) {
      await query(`
        INSERT INTO finance.contactos (nombre, email, telefono, tipo, empresa, creado_por)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [
        contacto.nombre, contacto.email, contacto.telefono,
        contacto.tipo, contacto.empresa, 1
      ]);
    }

    success(`${contactos.length} contactos de ejemplo creados`);

    success('🎉 Seeds completados exitosamente!');
    success('📊 Datos de ejemplo disponibles para desarrollo.');

    // Mostrar resumen
    const resumen = await query(`
      SELECT
        (SELECT COUNT(*) FROM finance.usuarios) as usuarios,
        (SELECT COUNT(*) FROM finance.productos) as productos,
        (SELECT COUNT(*) FROM finance.transacciones_financieras) as transacciones,
        (SELECT COUNT(*) FROM finance.contactos) as contactos
    `);

    const stats = resumen.rows[0];
    log(`📈 Resumen: ${stats.usuarios} usuarios, ${stats.productos} productos, ${stats.transacciones} transacciones, ${stats.contactos} contactos`);

  } catch (err) {
    error(`Error durante los seeds: ${err.message}`);
    error('Stack trace:', err.stack);
    process.exit(1);
  }
}

// Ejecutar seeds si se llama directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };