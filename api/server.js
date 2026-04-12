/**
 * ERGOEXPRESS FINANCE - API Server
 * Servidor REST con PostgreSQL y autenticación JWT
 * Versión: 1.0
 * Fecha: Abril 2026
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

// Configuración de Supabase
const { supabase, supabaseAdmin, getCurrentUser, checkUserPermissions } = require('./config/supabase');
const { pool } = require('./config/database');

// Cargar variables de entorno
dotenv.config();

// Configuración de la aplicación
const app = express();
app.set('trust proxy', true); // Requerido para capturar IP real en Vercel/Proxies
const PORT = process.env.PORT || 3001;

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://ergoexpress-finance.vercel.app']
    : ['http://localhost:8000', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
  message: {
    error: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Rate limiting más estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: {
    error: 'Demasiados intentos de autenticación. Intenta en 15 minutos.'
  }
});

// Conexión a Redis (opcional para cache)
let redisClient;
try {
  if (process.env.REDIS_URL) {
    redis = require('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    redisClient.connect();
    console.log('✅ Redis conectado');
  }
} catch (error) {
  console.warn('⚠️ Redis no disponible:', error.message);
}

// Función de logging con persistencia en Supabase (Versión Ultra-Segura)
const log = async (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  // Limpieza de datos para evitar referencias circulares (frecuente en errores de Node/Vercel)
  let cleanData = {};
  try {
    if (data instanceof Error) {
      cleanData = { message: data.message, stack: data.stack };
    } else if (typeof data === 'object' && data !== null) {
      // Clonado básico para evitar mutaciones y circularidad simple
      cleanData = JSON.parse(JSON.stringify(data, (key, value) => 
        (typeof value === 'object' && value !== null && key === 'req') ? '[Request Object]' : value
      ));
    } else {
      cleanData = { value: data };
    }
  } catch (e) {
    cleanData = { error: 'No se pudieron serializar los detalles del log' };
  }

  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, cleanData);

  try {
    if (supabaseAdmin && level !== 'debug') {
      const logEntry = {
        accion: (message || 'Sin mensaje').substring(0, 500),
        usuario_email: cleanData.user_email || cleanData.email || 'Sistema/API',
        usuario_id: cleanData.user_id || null,
        detalles: cleanData,
        tabla: cleanData.table || 'Backend',
        registro_id: cleanData.record_id || null
      };

      if (data.req) {
        logEntry.ip_address = data.req.ip || '0.0.0.0';
        logEntry.user_agent = data.req.headers ? data.req.headers['user-agent'] : 'unknown';
      }

      // No esperamos a que termine (fire and forget) para no retrasar la API principal
      supabaseAdmin.from('audit.logs_auditoria').insert([logEntry]).then(({ error }) => {
        if (error) console.warn('⚠️ No se pudo persistir el log:', error.message);
      }).catch(e => console.warn('⚠️ Error en promesa de log:', e.message));
    }
  } catch (err) {
    console.error('Error crítico en sistema de audidoria:', err.message);
  }
};

// Middleware de autenticación con Supabase
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    // Verificar token con Supabase
    const user = await getCurrentUser(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    // Verificar permisos en tabla custom
    const hasAccess = await checkUserPermissions(user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Usuario inactivo o sin permisos'
      });
    }

    // Obtener datos completos del usuario
    const { data: userProfile, error } = await supabase
      .from('finance.usuarios')
      .select('id, email, nombre, rol, activo')
      .eq('id', user.id)
      .single();

    if (error || !userProfile) {
      return res.status(401).json({
        success: false,
        error: 'Perfil de usuario no encontrado'
      });
    }

    req.user = userProfile;
    next();

  } catch (error) {
    log('error', 'Error de autenticación:', error);
    return res.status(401).json({
      success: false,
      error: 'Error de autenticación'
    });
  }
};

// Middleware de autorización por rol
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes'
      });
    }

    next();
  };
};

/**
 * UTILS - Mapeo de entidades Supabase <-> Frontend
 */
const mapEntityToFrontend = (entity) => {
  return {
    'ID': entity.id,
    'Razón Social': entity.razon_social,
    'RIF': entity.rif,
    'Persona Contacto': entity.persona_contacto || '',
    'Teléfonos': entity.telefonos?.principal || '',
    'Email': entity.email || '',
    'Dirección': entity.direccion?.direccion || entity.direccion?.texto || '',
    'Estado': entity.estado || '',
    'Puntaje': entity.puntaje || 0,
    'Tipo': entity.tipo,
    'Fecha Registro': entity.fecha_registro,
    'Notas': entity.notas || '',
    'Etapa Pipeline': entity.etapa_pipeline || 'Nuevo',
    'Vendedor Email': entity.vendedor_email || '',
    'Categoria_Fiscal': entity.categoria_fiscal,
    'Municipio_ID': entity.municipio_id || '',
    'RIF_Validado': entity.rif_validado,
    'RIF_Ultimo_Digito': entity.rif_ultimo_digito,
    'Contribuyente_Especial': entity.contribuyente_especial,
    'id': entity.id // Para compatibilidad con frameworks modernos
  };
};

const mapFrontendToEntity = (data) => {
  return {
    razon_social: data['Razón Social'],
    rif: data['RIF'],
    persona_contacto: data['Persona Contacto'],
    telefonos: typeof data['Teléfonos'] === 'string' ? { principal: data['Teléfonos'] } : data['Teléfonos'],
    email: data['Email'],
    direccion: typeof data['Dirección'] === 'string' ? { direccion: data['Dirección'] } : data['Dirección'],
    estado: data['Estado'],
    puntaje: parseInt(data['Puntaje']) || 0,
    tipo: data['Tipo'] || 'cliente',
    notas: data['Notas'],
    etapa_pipeline: data['Etapa Pipeline'] || 'Nuevo',
    vendedor_email: data['Vendedor Email'],
    categoria_fiscal: data['Categoria_Fiscal'] || 'ordinario',
    contribuyente_especial: data['Contribuyente_Especial'] === true || data['Contribuyente_Especial'] === 'true'
  };
};

// ===========================================
// RUTAS DE LA API
// ===========================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Información del API
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    name: 'ERGOEXPRESS FINANCE API',
    version: '1.0.0',
    description: 'API REST para sistema de gestión financiera',
    documentation: '/api/docs'
  });
});

// ===========================================
// AUTENTICACIÓN
// ===========================================

app.use('/api/auth/login', authLimiter);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    // Autenticar con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar que el usuario existe en tabla custom
    const hasAccess = await checkUserPermissions(data.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Usuario inactivo o sin permisos'
      });
    }

    // Obtener perfil completo
    const { data: userProfile, error: profileError } = await supabase
      .from('finance.usuarios')
      .select('id, email, nombre, rol, activo')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(401).json({
        success: false,
        error: 'Perfil de usuario no encontrado'
      });
    }

    // Actualizar último login
    await supabase
      .from('finance.usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', data.user.id);

    log('info', `Usuario ${email} inició sesión`);

    res.json({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        nombre: userProfile.nombre,
        rol: userProfile.rol
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    log('error', 'Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, rol = 'user' } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'Email, contraseña y nombre son requeridos'
      });
    }

    // Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          rol
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Crear perfil en tabla custom
    if (data.user) {
      const userProfile = await createUserProfile(data.user.id, {
        email,
        nombre,
        rol
      });

      if (!userProfile) {
        return res.status(500).json({
          success: false,
          error: 'Error creando perfil de usuario'
        });
      }
    }

    log('info', `Usuario registrado: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Revisa tu email para confirmar.',
      user: data.user
    });

  } catch (error) {
    log('error', 'Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Logout
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al cerrar sesión'
      });
    }

    log('info', `Usuario ${req.user.email} cerró sesión`);

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    log('error', 'Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión'
    });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token requerido'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token inválido'
      });
    }

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    log('error', 'Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===========================================
// PRODUCTOS
// ===========================================

// Obtener productos
app.get('/api/products', authenticate, async (req, res) => {
  try {
    const {
      categoria,
      search,
      limit = 50,
      offset = 0,
      sort = 'nombre',
      order = 'asc'
    } = req.query;

    let query = supabase
      .from('finance.productos')
      .select(`
        id, uuid, codigo, nombre, descripcion,
        precio_usd, costo_usd, impuesto_pct,
        stock_actual, stock_minimo, stock_maximo,
        ubicacion, status, activo,
        categorias_productos!inner(nombre)
      `, { count: 'exact' })
      .eq('activo', true);

    // Filtros
    if (categoria) {
      query = query.ilike('categorias_productos.nombre', `%${categoria}%`);
    }

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,descripcion.ilike.%${search}%,codigo.ilike.%${search}%`);
    }

    // Ordenamiento
    const validSorts = ['nombre', 'precio_usd', 'stock_actual', 'fecha_creacion'];
    const sortField = validSorts.includes(sort) ? sort : 'nombre';
    const sortOrder = order.toLowerCase() === 'desc' ? false : true;

    query = query.order(sortField, { ascending: sortOrder });

    // Paginación
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: products,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + products.length) < count
    });

  } catch (error) {
    log('error', 'Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener productos'
    });
  }
});

// Crear producto
app.post('/api/products', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      categoria,
      precio_usd,
      costo_usd,
      impuesto_pct = 16.0,
      stock_actual = 0,
      stock_minimo = 0,
      codigo
    } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del producto es requerido'
      });
    }

    // Buscar o crear categoría
    let { data: categoriaExistente, error: categoriaError } = await supabase
      .from('finance.categorias_productos')
      .select('id')
      .eq('nombre', categoria)
      .single();

    let categoriaId;
    if (categoriaError || !categoriaExistente) {
      const { data: nuevaCategoria, error: insertError } = await supabase
        .from('finance.categorias_productos')
        .insert([{ nombre: categoria }])
        .select('id')
        .single();

      if (insertError) throw insertError;
      categoriaId = nuevaCategoria.id;
    } else {
      categoriaId = categoriaExistente.id;
    }

    // Insertar producto
    const { data: producto, error: productoError } = await supabase
      .from('finance.productos')
      .insert([{
        codigo,
        nombre,
        descripcion,
        categoria_id: categoriaId,
        precio_usd: precio_usd || 0,
        costo_usd: costo_usd || 0,
        impuesto_pct,
        stock_actual,
        stock_minimo,
        creado_por: req.user.id
      }])
      .select('id, uuid')
      .single();

    if (productoError) throw productoError;

    log('info', `Producto creado: ${nombre} por ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: producto,
      message: 'Producto creado exitosamente'
    });

  } catch (error) {
    log('error', 'Error creando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear producto'
    });
  }
});

// Actualizar producto
app.put('/api/products/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el producto existe
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('finance.productos')
      .select('id')
      .eq('id', id)
      .eq('activo', true)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    });

    cleanUpdates.actualizado_por = req.user.id;
    cleanUpdates.actualizado_en = new Date().toISOString();

    const { data: result, error: updateError } = await supabaseAdmin
      .from('finance.productos')
      .update(cleanUpdates)
      .eq('id', id)
      .eq('activo', true)
      .select('id');

    if (updateError) throw updateError;

    log('info', `Producto ${id} actualizado por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente'
    });

  } catch (error) {
    log('error', 'Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar producto'
    });
  }
});

// Eliminar producto (soft delete)
app.delete('/api/products/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: result, error: deleteError } = await supabaseAdmin
      .from('finance.productos')
      .update({ 
        activo: false, 
        eliminado_en: new Date().toISOString(), 
        eliminado_por: req.user.id 
      })
      .eq('id', id)
      .eq('activo', true)
      .select('id');

    if (deleteError) throw deleteError;

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    log('info', `Producto ${id} eliminado por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    log('error', 'Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto'
    });
  }
});

// ===========================================
// CONTACTOS (ENTIDADES)
// ===========================================

// Obtener contactos
app.get('/api/contacts', authenticate, async (req, res) => {
  try {
    const { tipo, search, limit = 1000, offset = 0 } = req.query;

    let query = supabase
      .from('finance.entidades')
      .select('*', { count: 'exact' })
      .eq('activo', true);

    // Si no es admin ni manager, solo ve sus propios contactos
    if (req.user.rol !== 'admin' && req.user.rol !== 'manager') {
      // Intentamos filtrar por vendedor_email si la columna existe. 
      // Por ahora la consulta fallará si la columna no existe en Supabase.
      query = query.eq('vendedor_email', req.user.email);
    }

    if (tipo) {
      query = query.eq('tipo', tipo.toLowerCase());
    }

    if (search) {
      query = query.or(`razon_social.ilike.%${search}%,rif.ilike.%${search}%,persona_contacto.ilike.%${search}%`);
    }

    const { data: entities, error, count } = await query
      .order('razon_social', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      // Fallback si la columna vendedor_email o etapa_pipeline no existen aún
      if (error.message.includes('column') && error.message.includes('not found')) {
        log('warn', 'Fallback detectado: Algunas columnas de contactos no existen en schema.');
        
        // Ejecutamos query limpia sin los filtros problemáticos
        let fallbackQuery = supabase
          .from('finance.entidades')
          .select('*', { count: 'exact' })
          .eq('activo', true);
          
        if (tipo) fallbackQuery = fallbackQuery.eq('tipo', tipo.toLowerCase());
        
        const { data: fbEntities, error: fbError, count: fbCount } = await fallbackQuery
          .order('razon_social', { ascending: true })
          .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
          
        if (fbError) throw fbError;
        
        return res.json({
          success: true,
          data: fbEntities.map(mapEntityToFrontend),
          total: fbCount
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: entities.map(mapEntityToFrontend),
      total: count
    });

  } catch (error) {
    log('error', 'Error obteniendo contactos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contactos'
    });
  }
});

// Obtener contacto por ID
app.get('/api/contacts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: entity, error } = await supabase
      .from('finance.entidades')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !entity) {
      return res.status(404).json({ success: false, error: 'Contacto no encontrado' });
    }

    res.json({
      success: true,
      data: mapEntityToFrontend(entity)
    });
  } catch (error) {
    log('error', `Error obteniendo contacto ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener el contacto' });
  }
});

// Crear contacto
app.post('/api/contacts', authenticate, async (req, res) => {
  try {
    const entityData = mapFrontendToEntity(req.body);
    
    // Asignar vendedor si no es admin
    if (req.user.rol !== 'admin' && !entityData.vendedor_email) {
      entityData.vendedor_email = req.user.email;
    }

    const { data, error } = await supabase
      .from('finance.entidades')
      .insert([entityData])
      .select()
      .single();

    if (error) {
      // Manejar error de columnas faltantes en el insert
      if (error.message.includes('column') && error.message.includes('not found')) {
        delete entityData.etapa_pipeline;
        delete entityData.vendedor_email;
        const { data: fbData, error: fbError } = await supabase
          .from('finance.entidades')
          .insert([entityData])
          .select()
          .single();
        if (fbError) throw fbError;
        return res.status(201).json({ success: true, data: mapEntityToFrontend(fbData) });
      }
      throw error;
    }

    log('info', `Contacto creado: ${entityData.razon_social} por ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: mapEntityToFrontend(data)
    });
  } catch (error) {
    log('error', 'Error creando contacto:', error);
    res.status(500).json({ success: false, error: 'Error al crear contacto' });
  }
});

// Actualizar contacto
app.put('/api/contacts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const entityData = mapFrontendToEntity(req.body);

    const { data, error } = await supabase
      .from('finance.entidades')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message.includes('column') && error.message.includes('not found')) {
        delete entityData.etapa_pipeline;
        delete entityData.vendedor_email;
        const { data: fbData, error: fbError } = await supabase
          .from('finance.entidades')
          .update(entityData)
          .eq('id', id)
          .select()
          .single();
        if (fbError) throw fbError;
        return res.json({ success: true, data: mapEntityToFrontend(fbData) });
      }
      throw error;
    }

    res.json({
      success: true,
      data: mapEntityToFrontend(data)
    });
  } catch (error) {
    log('error', `Error actualizando contacto ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Error al actualizar contacto' });
  }
});

// Eliminar contacto (Soft delete marcando activo=false)
app.delete('/api/contacts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('finance.entidades')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    log('info', `Contacto eliminado: ${id} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contacto eliminado correctamente'
    });
  } catch (error) {
    log('error', `Error eliminando contacto ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Error al eliminar contacto' });
  }
});

// ===========================================
// AUDITORÍA
// ===========================================

// Obtener logs de auditoría
app.get('/api/audit', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de auditoría no configurado',
        message: 'La clave SUPABASE_SERVICE_ROLE_KEY es requerida para esta operación.'
      });
    }

    const { limit = 100, offset = 0, action, table } = req.query;

    let query = supabaseAdmin
      .from('audit.logs_auditoria')
      .select('*', { count: 'exact' });

    if (action) query = query.ilike('accion', `%${action}%`);
    if (table) query = query.ilike('tabla', `%${table}%`);

    const { data: logs, error, count } = await query
      .order('fecha', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: logs,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    log('error', 'Error obteniendo logs de auditoría:', { error: error.message, user_email: req.user.email });
    res.status(500).json({
      success: false,
      error: 'Error al obtener logs de auditoría'
    });
  }
});

// ===========================================
// DASHBOARD Y REPORTES
// ===========================================

// Dashboard financiero
app.get('/api/dashboard/finance', authenticate, async (req, res) => {
  try {
    // 1. Obtener métricas financieras vía RPC (más eficiente)
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .rpc('get_dashboard_metrics');

    if (metricsError) throw metricsError;
    const finance = metrics[0] || {
      ingresos_total: 0,
      egresos_total: 0,
      num_ingresos: 0,
      num_egresos: 0
    };

    // 2. Punto de equilibrio
    const { data: puntoEquilibrio, error: peError } = await supabaseAdmin
      .from('finance.vw_punto_equilibrio')
      .select('*')
      .single();

    // 3. Productos con stock bajo
    const { data: lowStockRows, error: lowStockError } = await supabaseAdmin
      .from('finance.vw_productos_stock')
      .select('nombre, stock_actual, stock_minimo')
      .eq('status', 'bajo')
      .order('stock_actual', { ascending: true })
      .limit(10);

    res.json({
      success: true,
      data: {
        ingresos: parseFloat(finance.ingresos_total) || 0,
        egresos: parseFloat(finance.egresos_total) || 0,
        balance: (parseFloat(finance.ingresos_total) || 0) - (parseFloat(finance.egresos_total) || 0),
        numTransacciones: parseInt(finance.num_ingresos) + parseInt(finance.num_egresos),
        puntoEquilibrio: {
          costosFijos: parseFloat(puntoEquilibrio?.costos_fijos) || 0,
          costosVariables: parseFloat(puntoEquilibrio?.costos_variables) || 0,
          puntoEquilibrio: parseFloat(puntoEquilibrio?.punto_equilibrio_usd) || 0
        },
        alertas: {
          stockBajo: lowStockRows || []
        }
      }
    });

  } catch (error) {
    log('error', 'Error obteniendo dashboard financiero:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del dashboard'
    });
  }
});

// ===========================================
// MANEJO DE ERRORES GLOBAL
// ===========================================

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Error handler
app.use((error, req, res, next) => {
  log('error', 'Error no manejado:', error);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : error.message
  });
});

// ===========================================
// INICIO DEL SERVIDOR
// ===========================================

// Para desarrollo local
if (require.main === module) {
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    log('info', 'SIGTERM recibido, cerrando servidor...');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    log('info', 'SIGINT recibido, cerrando servidor...');
    process.exit(0);
  });

  // Iniciar servidor solo en desarrollo
  app.listen(PORT, () => {
    log('info', `🚀 ERGOEXPRESS FINANCE API v1.0.0 ejecutándose en puerto ${PORT}`);
    log('info', `📊 Base de datos: Supabase PostgreSQL`);
    log('info', `🔐 Autenticación: Supabase Auth`);
    log('info', `🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Exportar app para Vercel (serverless) y testing
module.exports = app;