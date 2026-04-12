/**
 * ERGOEXPRESS FINANCE - Tests de API
 * Tests básicos para verificar funcionalidad de la API
 */

const request = require('supertest');
const app = require('../server');

describe('ERGOEXPRESS FINANCE API', () => {
  describe('GET /health', () => {
    it('debería retornar estado healthy', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('GET /api/info', () => {
    it('debería retornar información de la API', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('name', 'ERGOEXPRESS FINANCE API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('documentation');
    });
  });

  describe('POST /api/auth/login', () => {
    it('debería rechazar login sin credenciales', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('debería rechazar credenciales inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@email.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/products', () => {
    it('debería requerir autenticación', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/dashboard/finance', () => {
    it('debería requerir autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/finance')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('404 handler', () => {
    it('debería retornar 404 para rutas inexistentes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Endpoint no encontrado');
    });
  });
});