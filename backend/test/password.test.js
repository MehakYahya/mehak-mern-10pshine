const request = require('supertest');
const { expect } = require('chai');
const User = require('../models/User');
const app = require('../server');

describe('Password reset flows', function() {
  beforeEach(async function() {
    await User.deleteMany({});
  });

  it('forgot-password -> reset-password -> login with new password', async function() {
    this.timeout(10000);
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'oldpass' })
      .expect(201);

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'bob@example.com' })
      .expect(200);

    const code = forgotRes.body.testCode;
    expect(code).to.match(/^\d{4}$/);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'bob@example.com', code, newPassword: 'newpass123' })
      .expect(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'newpass123' })
      .expect(200);

    expect(loginRes.body).to.have.property('token');
  });
});
