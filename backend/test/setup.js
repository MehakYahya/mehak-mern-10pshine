const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

before(async function() {
  this.timeout(60000);
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

after(async function() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
