/**
 * ERGOEXPRESS FINANCE - Validaciones de API
 * Esquemas de validación con Joi para todos los endpoints
 */

const Joi = require('joi');

// Esquemas de validación reutilizables
const schemas = {
  // Autenticación
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'El email debe tener un formato válido',
        'any.required': 'El email es requerido'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'any.required': 'La contraseña es requerida'
      })
  }),

  // Productos
  createProduct: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    descripcion: Joi.string()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'La descripción no puede exceder 500 caracteres'
      }),
    categoria: Joi.string()
      .min(2)
      .max(50)
      .messages({
        'string.min': 'La categoría debe tener al menos 2 caracteres',
        'string.max': 'La categoría no puede exceder 50 caracteres'
      }),
    precio_usd: Joi.number()
      .min(0)
      .precision(2)
      .messages({
        'number.min': 'El precio debe ser mayor o igual a 0',
        'number.precision': 'El precio debe tener máximo 2 decimales'
      }),
    costo_usd: Joi.number()
      .min(0)
      .precision(2)
      .messages({
        'number.min': 'El costo debe ser mayor o igual a 0',
        'number.precision': 'El costo debe tener máximo 2 decimales'
      }),
    impuesto_pct: Joi.number()
      .min(0)
      .max(100)
      .precision(2)
      .default(16.0)
      .messages({
        'number.min': 'El impuesto debe ser mayor o igual a 0',
        'number.max': 'El impuesto no puede exceder 100%',
        'number.precision': 'El impuesto debe tener máximo 2 decimales'
      }),
    stock_actual: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.integer': 'El stock debe ser un número entero',
        'number.min': 'El stock debe ser mayor o igual a 0'
      }),
    stock_minimo: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.integer': 'El stock mínimo debe ser un número entero',
        'number.min': 'El stock mínimo debe ser mayor o igual a 0'
      }),
    codigo: Joi.string()
      .max(50)
      .allow('')
      .messages({
        'string.max': 'El código no puede exceder 50 caracteres'
      })
  }),

  updateProduct: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres'
      }),
    descripcion: Joi.string()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'La descripción no puede exceder 500 caracteres'
      }),
    precio_usd: Joi.number()
      .min(0)
      .precision(2)
      .messages({
        'number.min': 'El precio debe ser mayor o igual a 0',
        'number.precision': 'El precio debe tener máximo 2 decimales'
      }),
    costo_usd: Joi.number()
      .min(0)
      .precision(2)
      .messages({
        'number.min': 'El costo debe ser mayor o igual a 0',
        'number.precision': 'El costo debe tener máximo 2 decimales'
      }),
    impuesto_pct: Joi.number()
      .min(0)
      .max(100)
      .precision(2)
      .messages({
        'number.min': 'El impuesto debe ser mayor o igual a 0',
        'number.max': 'El impuesto no puede exceder 100%',
        'number.precision': 'El impuesto debe tener máximo 2 decimales'
      }),
    stock_actual: Joi.number()
      .integer()
      .min(0)
      .messages({
        'number.integer': 'El stock debe ser un número entero',
        'number.min': 'El stock debe ser mayor o igual a 0'
      }),
    stock_minimo: Joi.number()
      .integer()
      .min(0)
      .messages({
        'number.integer': 'El stock mínimo debe ser un número entero',
        'number.min': 'El stock mínimo debe ser mayor o igual a 0'
      }),
    ubicacion: Joi.string()
      .max(100)
      .allow('')
      .messages({
        'string.max': 'La ubicación no puede exceder 100 caracteres'
      })
  }).min(1).messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar'
  }),

  // Transacciones financieras
  createTransaction: Joi.object({
    tipo: Joi.string()
      .valid('ingreso', 'egreso')
      .required()
      .messages({
        'any.only': 'El tipo debe ser "ingreso" o "egreso"',
        'any.required': 'El tipo es requerido'
      }),
    categoria: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'La categoría debe tener al menos 2 caracteres',
        'string.max': 'La categoría no puede exceder 50 caracteres',
        'any.required': 'La categoría es requerida'
      }),
    monto_usd: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.positive': 'El monto debe ser positivo',
        'number.precision': 'El monto debe tener máximo 2 decimales',
        'any.required': 'El monto es requerido'
      }),
    descripcion: Joi.string()
      .max(200)
      .required()
      .messages({
        'string.max': 'La descripción no puede exceder 200 caracteres',
        'any.required': 'La descripción es requerida'
      }),
    fecha: Joi.date()
      .max('now')
      .messages({
        'date.max': 'La fecha no puede ser futura'
      }),
    referencia: Joi.string()
      .max(100)
      .allow('')
      .messages({
        'string.max': 'La referencia no puede exceder 100 caracteres'
      })
  }),

  // Usuarios
  createUser: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'El email debe tener un formato válido',
        'any.required': 'El email es requerido'
      }),
    nombre: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
        'any.required': 'La contraseña es requerida'
      }),
    rol: Joi.string()
      .valid('admin', 'manager', 'user')
      .default('user')
      .messages({
        'any.only': 'El rol debe ser "admin", "manager" o "user"'
      })
  }),

  // Parámetros de consulta comunes
  pagination: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.integer': 'El límite debe ser un número entero',
        'number.min': 'El límite debe ser mayor a 0',
        'number.max': 'El límite no puede exceder 100'
      }),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.integer': 'El offset debe ser un número entero',
        'number.min': 'El offset debe ser mayor o igual a 0'
      })
  }),

  productsQuery: Joi.object({
    categoria: Joi.string()
      .min(1)
      .max(50)
      .messages({
        'string.min': 'La categoría debe tener al menos 1 carácter',
        'string.max': 'La categoría no puede exceder 50 caracteres'
      }),
    search: Joi.string()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'La búsqueda debe tener al menos 1 carácter',
        'string.max': 'La búsqueda no puede exceder 100 caracteres'
      }),
    sort: Joi.string()
      .valid('nombre', 'precio_usd', 'stock_actual', 'fecha_creacion')
      .default('nombre')
      .messages({
        'any.only': 'El orden debe ser uno de: nombre, precio_usd, stock_actual, fecha_creacion'
      }),
    order: Joi.string()
      .valid('asc', 'desc')
      .default('asc')
      .messages({
        'any.only': 'El orden debe ser "asc" o "desc"'
      })
  }).concat(Joi.object().keys({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  })),

  // IDs
  idParam: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.integer': 'El ID debe ser un número entero',
        'number.positive': 'El ID debe ser positivo',
        'any.required': 'El ID es requerido'
      })
  }),

  uuidParam: Joi.object({
    uuid: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'El UUID debe tener un formato válido',
        'any.required': 'El UUID es requerido'
      })
  })
};

// Middleware de validación
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

// Validación de parámetros de query
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Parámetros de consulta inválidos',
        details: errors
      });
    }

    req.query = value;
    next();
  };
};

// Validación de parámetros de ruta
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Parámetros de ruta inválidos',
        details: errors
      });
    }

    req.params = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
  validateQuery,
  validateParams
};