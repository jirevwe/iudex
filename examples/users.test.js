// API Guardian Test Example
import { describe, test, expect, beforeEach, afterEach } from '../core/dsl.js';

describe('Users API', () => {
  let createdUserIds = [];

  beforeEach(async () => {
    console.log('Setting up test...');
  });

  afterEach(async ({ request }) => {
    // Cleanup created users
    for (const userId of createdUserIds) {
      try {
        await request.delete(`/api/v1/users/${userId}`);
      } catch (error) {
        console.warn(`Failed to cleanup user ${userId}`);
      }
    }
    createdUserIds = [];
  });

  test('should get all users', async ({ request }) => {
    const response = await request.get('/api/v1/users');
    
    expect(response).toHaveStatus(200);
    expect(response).toRespondWithin(500);
    expect(response.body).toHaveProperty('users');
    expect(response.body.users).toBeArray();
  });

  test('should create a new user', async ({ request }) => {
    const userData = {
      name: 'John Doe',
      email: `test-${Date.now()}@example.com`,
      role: 'user'
    };

    const response = await request.post('/api/v1/users', {
      body: userData
    });

    expect(response).toHaveStatus(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', userData.name);
    
    // Security: Ensure no password in response
    expect(response.body).not.toHaveProperty('password');
    
    // Governance: Check security headers
    expect(response).toHaveSecurityHeaders();
    
    createdUserIds.push(response.body.id);
  });

  test('should return 404 for non-existent user', async ({ request }) => {
    const response = await request.get('/api/v1/users/99999');
    
    expect(response).toHaveStatus(404);
    expect(response.body).toHaveProperty('error');
  });

  test('should validate email format', async ({ request }) => {
    const response = await request.post('/api/v1/users', {
      body: {
        name: 'Test',
        email: 'invalid-email'
      }
    });

    expect(response).toHaveStatus(400);
  });
});
