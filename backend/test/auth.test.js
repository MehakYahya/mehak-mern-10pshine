const request = require('supertest');
const { expect } = require('chai');
const User = require('../models/User');
const app = require('../server');

describe('Auth routes (signup, login, profile)', function() {
  beforeEach(async function() {
    await User.deleteMany({});
  });

  it('signup -> login -> get profile', async function() {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' })
      .expect(201);
    expect(signupRes.body).to.have.property('token');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' })
      .expect(200);
    expect(loginRes.body).to.have.property('token');

    const token = loginRes.body.token;
    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profileRes.body).to.have.property('email', 'alice@example.com');
    expect(profileRes.body).to.have.property('name', 'Alice');
  });
});
