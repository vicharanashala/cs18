const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config();

const FAQ = require("./models/FAQ");
const Category = require("./models/Category");
const { normalizeCategory } = require("./utils/constants");

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ocfaq").then(async () => {
  console.log("Connected");
  const rawFile = JSON.parse(fs.readFileSync("./data/faqs.json", "utf-8"));
  const rawData = rawFile.faqs || rawFile;

  await FAQ.deleteMany();
  await Category.deleteMany();

  const categoryNames = new Set();
  const categoryMap = {};

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

  for (const item of rawData) {
    if (!item.id) continue;
    const match = item.id.match(/^(\d+)\.(\d+)$/);
    if (match) {
      categoryNames.add(normalizeCategory(getCategory(match[1])));
    }
  }

  for (const name of categoryNames) {
    const cat = new Category({ name });
    await cat.save();
    categoryMap[name] = cat._id;
  }

  for (const item of rawData) {
    const question = item.question || "";
    const answer = item.answer || "";
    const id = item.id || "";
    if (!question || !answer || !id) continue;
    const match = id.match(/^(\d+)\.(\d+)$/);
    if (!match) continue;
    
    const categoryName = getCategory(match[1]);

    const faq = new FAQ({
      category: normalizeCategory(categoryName),
      question,
      answer,
      needsReview: false,
      isArchived: false
    });
    await faq.save();
  }
  console.log("Seeded successfully");
  process.exit();
});
