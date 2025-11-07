const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('Health endpoint', function() {
  it('GET /health should return status ok', async function() {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).to.have.property('status', 'ok');
  });
});
