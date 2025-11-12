// Jest unit tests for leave service/routes
import request from 'supertest';
import app from '../src/app.js';

describe('Leave API', () => {
  it('should return leave requests (mock)', async () => {
    const res = await request(app).get('/api/leaves');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
