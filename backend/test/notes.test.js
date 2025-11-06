const request = require('supertest');
const { expect } = require('chai');
const User = require('../models/User');
const Note = require('../models/Note');
const app = require('../server');

describe('Notes routes', function() {
  let token;
  let userId;

  beforeEach(async function() {
    await User.deleteMany({});
    await Note.deleteMany({});
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'NoteUser', email: 'noteuser@example.com', password: 'password' })
      .expect(201);
    token = signup.body.token;
    // extract user id from token by calling profile
    const profile = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`).expect(200);
    userId = profile.body.email; // keep email as identifier for tests
  });

  it('create, list, update, pin, archive and delete a note', async function() {
    // create note
    const createRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T1', content: 'C1', keywords: ['a','b'] })
      .expect(200);
    expect(createRes.body).to.have.property('title', 'T1');
    const noteId = createRes.body._id;

    // list notes
    const listRes = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body).to.be.an('array').that.is.not.empty;

    // update note
    const updateRes = await request(app)
      .put(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T1-updated', content: 'C1-upd' })
      .expect(200);
    expect(updateRes.body).to.have.property('title', 'T1-updated');

    // pin note
    const pinRes = await request(app)
      .patch(`/api/notes/${noteId}/pin`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(pinRes.body).to.have.property('pinned');

    // archive note
    const archiveRes = await request(app)
      .patch(`/api/notes/${noteId}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(archiveRes.body).to.have.property('archived');

    // delete note
    await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // ensure deletion
    const finalList = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(finalList.body.find(n => n._id === noteId)).to.be.undefined;
  });
});
