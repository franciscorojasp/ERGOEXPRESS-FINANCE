/**
 * ERGOEXPRESS FINANCE - Configuración de Supabase
 * Cliente y utilidades para Supabase Auth y Database
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL y SUPABASE_ANON_KEY son requeridos');
}

// Cliente para operaciones del cliente (frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para operaciones del servidor (backend) - requiere SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin = null;
if (supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Cliente Supabase Admin inicializado');
  } catch (err) {
    console.error('❌ Error inicializando Supabase Admin:', err.message);
  }
} else {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no encontrada en variables de entorno.');
}

// Función para verificar conexión
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('finance.usuarios')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Error conectando a Supabase:', error.message);
      return false;
    }

    console.log('✅ Conexión a Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    return false;
  }
};

// Función para obtener usuario actual
const getCurrentUser = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Error obteniendo usuario:', error.message);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error obteniendo usuario:', error.message);
    return null;
  }
};

// Función para verificar permisos de usuario
const checkUserPermissions = async (userId, requiredRole = null) => {
  try {
    const { data: user, error } = await supabase
      .from('finance.usuarios')
      .select('rol, activo')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Usuario no encontrado:', error?.message);
      return false;
    }

    if (!user.activo) {
      console.error('Usuario inactivo');
      return false;
    }

    if (requiredRole && user.rol !== requiredRole && user.rol !== 'admin') {
      console.error(`Permisos insuficientes. Rol requerido: ${requiredRole}, rol actual: ${user.rol}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verificando permisos:', error.message);
    return false;
  }
};

// Función para crear usuario en tabla custom
const createUserProfile = async (userId, userData) => {
  try {
    const { data, error } = await supabase
      .from('finance.usuarios')
      .insert([{
        id: userId,
        email: userData.email,
        nombre: userData.nombre || userData.email.split('@')[0],
        rol: userData.rol || 'user',
        activo: true,
        creado_por: userId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando perfil de usuario:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creando perfil de usuario:', error.message);
    return null;
  }
};

// Función para ejecutar queries SQL directas (usando service role)
const executeSQL = async (query, params = []) => {
  try {
    if (!supabaseAdmin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado');
    }

    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      query,
      params: JSON.stringify(params)
    });

    if (error) {
      console.error('Error ejecutando SQL:', error.message);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error ejecutando SQL:', error.message);
    throw error;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  getCurrentUser,
  checkUserPermissions,
  createUserProfile,
  executeSQL
};