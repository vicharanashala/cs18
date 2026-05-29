require('dotenv').config();
const generateCanonicalTitle = require('./utils/generateCanonicalTitle');

async function runTests() {
  const tests = [
    {
      question: "GUYD CAN I MAKE YOU MY NEW FRIENDS MY OLD WERE BAD",
      context: "i just joined the cohort and my old group was toxic"
    },
    {
      question: "yo my coursework still not assigned after joining",
      context: "it has been 3 days and my dashboard is empty"
    },
    {
      question: "can i call peers",
      context: "i want to discuss an assignment via voice call"
    }
  ];

  for (const t of tests) {
    console.log("\n--- Testing ---");
    console.log("Raw Question:", t.question);
    const result = await generateCanonicalTitle(t.question, t.context);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}

runTests();
