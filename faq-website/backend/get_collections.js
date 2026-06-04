const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const results = [];
  
  for (let col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    results.push({ name: col.name, count });
  }
  
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
