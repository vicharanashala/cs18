const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const faqs = await mongoose.connection.db.collection('faqs').find().limit(5).toArray();
    console.log(JSON.stringify(faqs, null, 2));
    
    const cats = await mongoose.connection.db.collection('categories').find().toArray();
    console.log("Categories in DB:", cats.length);
    if(cats.length > 0) console.log(JSON.stringify(cats[0], null, 2));

    process.exit(0);
  });
