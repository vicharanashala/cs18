require('dotenv').config();
const mongoose = require('mongoose');
const { performSearch } = require('./controllers/searchController');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const req = {
    body: { query: 'hostel', type: 'faq' }
  };
  
  const res = {
    json: (data) => console.log(JSON.stringify(data, null, 2)),
    status: (code) => ({ json: (data) => console.log('STATUS', code, data) })
  };

  await performSearch(req, res);
  
  console.log('\n--- ZOOM ---');
  req.body.query = 'zoom';
  await performSearch(req, res);

  mongoose.disconnect();
}
test();
