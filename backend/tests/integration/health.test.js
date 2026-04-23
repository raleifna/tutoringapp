import request from 'supertest';

import app from '../../src/app.js';

describe('backend test framework smoke test', () => {
  test('GET /health returns the API heartbeat payload', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      name: 'TutorConnect API',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });

  test('GET /api/v1/health returns the versioned heartbeat payload', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      name: 'TutorConnect API',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });
});
