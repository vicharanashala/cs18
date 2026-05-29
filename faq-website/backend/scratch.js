const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected. Testing query...");
    const User = require("./models/User");
    try {
      const u = await User.findOne({ email: "test" });
      console.log("Query success", u);
    } catch (e) {
      console.error("Query error", e);
    }
    process.exit(0);
  })
  .catch(console.error);
