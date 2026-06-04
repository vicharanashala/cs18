const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config();

const FAQ = require("./models/FAQ");
const Category = require("./models/Category");
const SemanticCluster = require("./models/SemanticCluster");
const getEmbedding = require("./utils/embedding");
const { normalizeCategory } = require("./utils/constants");

/* CONNECT */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    seedData();
  })
  .catch((err) => {
    console.log("Mongo Error:", err);
  });

/* LOAD FAQS */
const rawFile = JSON.parse(fs.readFileSync("./data/faqs.json", "utf-8"));
const rawData = rawFile.faqs || rawFile;

/* CLEAN TEXT */
function cleanText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

/* CATEGORY MAP */
function getCategory(section) {
  const map = {
    "1": "About the internship",
    "2": "Timing and dates",
    "3": "NOC",
    "4": "Selection & Offer Letter",
    "5": "Work & Mentorship",
    "6": "Communication Rules",
    "7": "Interview Issues",
    "8": "Certificates",
    "9": "Rosetta Journal",
    "10": "Phase 1 — coursework, ViBe LMS, and live sessions",
    "11": "Yaksha Chat Related",
    "12": "ViBe Platform",
    "13": "Team Formation"
  };
  return map[section] || "General";
}

const delay = ms => new Promise(res => setTimeout(res, ms));

/* MAIN SEED FUNCTION */
async function seedData() {
  try {
    console.log("Clearing old data (Idempotent seed)...");
    await FAQ.deleteMany();
    await SemanticCluster.deleteMany();
    await Category.deleteMany();

    // 1. Seed Categories First
    console.log("Seeding Categories...");
    const categoryMap = {};
    const categoryNames = new Set();
    
    for (const item of rawData) {
      if (!item.id) continue;
      const match = item.id.match(/^(\d+)\.(\d+)$/);
      if (match) {
        categoryNames.add(getCategory(match[1]));
      }
    }
    
    for (const name of categoryNames) {
      const cat = new Category({ name });
      await cat.save();
      categoryMap[name] = cat._id;
    }
    console.log(`Successfully seeded ${Object.keys(categoryMap).length} Categories.`);

    // 2. Seed Semantic Clusters and FAQs
    console.log("Seeding Semantic Clusters and FAQs...");
    let count = 0;

    for (const item of rawData) {
      const question = item.question || "";
      const answer = item.answer || "";
      const id = item.id || "";

      if (!question || !answer || !id) continue;

      const match = id.match(/^(\d+)\.(\d+)$/);
      if (!match) continue;
      
      const categoryName = getCategory(match[1]);
      const categoryId = categoryMap[categoryName];

      const cleanedQuestion = cleanText(question);
      const cleanedAnswer = cleanText(answer);

      // Embedding text
      const searchableText = `Question:\n${cleanedQuestion}\n\nAnswer:\n${cleanedAnswer}`;

      console.log(`[${count + 1}/${rawData.length}] Fetching Embedding for: ${cleanedQuestion.substring(0, 30)}...`);
      
      let embedding = [];
      let retries = 3;
      while (retries > 0) {
        try {
          embedding = await getEmbedding(searchableText);
          if (embedding && embedding.length > 0) break;
        } catch (e) {
          console.error("Embedding API failed, retrying...");
        }
        retries--;
        await delay(1000); // Wait 1s on failure
      }

      if (!embedding || embedding.length === 0) {
         console.warn(`\n[WARNING] Skipping FAQ due to embedding failure (API rate limit or network issue): ${cleanedQuestion}\n`);
         continue;
      }

      // 3. Create canonical FAQ directly
      const faq = new FAQ({
        category: normalizeCategory(categoryName),
        question: cleanedQuestion,
        answer: cleanedAnswer,
        embedding: embedding
      });
      await faq.save();

      count++;
      
      // Delay to avoid hitting HuggingFace API rate limits during bulk seed
      await delay(300);
    }

    console.log(`\n✅ Successfully seeded ${count} FAQs and Semantic Clusters!`);
    process.exit();
  } catch (err) {
    console.log("Seed Error:", err);
    process.exit(1);
  }
}