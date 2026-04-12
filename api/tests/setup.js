/**
 * ERGOEXPRESS FINANCE - Setup de Tests
 * Configuración global para Jest
 */

// Configurar variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock de Redis para tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  }))
}));

// Configurar timeouts globales
jest.setTimeout(10000);

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Configurar console para tests
global.console = {
  ...console,
  // Mantener log y error para debugging
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};