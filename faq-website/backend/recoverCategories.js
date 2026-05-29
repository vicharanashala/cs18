const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const { FAQ_CATEGORIES, normalizeCategory } = require('./utils/constants');

function cleanText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function getCategory(section) {
  const map = {
    "1": "About the internship",
    "2": "Timing and dates",
    "3": "NOC (No Objection Certificate)",
    "4": "Selection, offer letter, and certificate",
    "5": "Work, mentorship, and projects",
    "6": "Code of conduct — communication channels",
    "7": "Interviews Related",
    "8": "Certificate",
    "9": "Rosetta — your internship journal",
    "10": "Phase 1 — coursework, Vibe LMS, and live sessions",
    "11": "Yaksha Chat Related",
    "12": "ViBe Platform",
    "13": "Team Formation"
  };
  return map[section] || "Other";
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const rawFile = JSON.parse(fs.readFileSync("./data/faqs.json", "utf-8"));
    const rawData = rawFile.faqs || rawFile;

    const faqsCollection = mongoose.connection.db.collection('faqs');
    const dbFaqs = await faqsCollection.find().toArray();
    let updatedCount = 0;

    for (const item of rawData) {
      if (!item.id || !item.question) continue;
      const match = item.id.match(/^(\d+)\.(\d+)$/);
      if (!match) continue;

      const categoryName = getCategory(match[1]);
      const cleanedQuestion = cleanText(item.question);

      // Find FAQ with this exact question
      const dbFaq = dbFaqs.find(f => f.question === cleanedQuestion);
      if (dbFaq) {
        await faqsCollection.updateOne(
          { _id: dbFaq._id },
          { $set: { category: categoryName } }
        );
        updatedCount++;
      }
    }
    console.log(`Recovered and updated categories for ${updatedCount} FAQs!`);
    
    // Test count output
    const groups = await faqsCollection.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]).toArray();
    console.log("Categories counts:");
    groups.forEach(g => console.log(`${g._id}: ${g.count}`));

    process.exit(0);
  });
