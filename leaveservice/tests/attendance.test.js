// Jest unit tests for attendance service/routes
import request from 'supertest';
import app from '../src/app.js';

describe('Attendance API', () => {
  it('should return attendance logs (mock)', async () => {
    const res = await request(app).get('/api/attendance');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
