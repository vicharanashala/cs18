const mongoose = require("mongoose");
require("dotenv").config();

const SolvedPersonalIssue = require("./models/SolvedPersonalIssue");
const getEmbedding = require("./utils/embedding");

const sampleIssues = [
  {
    normalizedIntent: "multiple NOC approvals required",
    verifiedAnswer: "If your institution requires double signatures (e.g., Department Head and College Dean) on your NOC, upload a combined PDF containing both signatures in the portal's NOC upload section. The system will process it correctly.",
    institution: "MIT",
    category: "NOC",
    quirks: "Requires combined PDF format containing both signatures"
  },
  {
    normalizedIntent: "offer letter identity mismatch",
    verifiedAnswer: "If the name on your offer letter does not match your official government ID or registration name exactly, please email admin-support@faqhive.com with a scanned copy of your national ID card and your offer letter. Our admin team will verify and regenerate the document.",
    institution: "MIT",
    category: "Offer Letter",
    quirks: "Requires national ID verification"
  },
  {
    normalizedIntent: "portal login failure due to credential mismatch",
    verifiedAnswer: "For portal access failures, please clear your browser cache and cookies, then try logging in using the Google OAuth sign-in option rather than a standard password. If the issue persists, request a password reset link.",
    institution: "HARVARD",
    category: "Portal Access",
    quirks: "Requires Google OAuth fallback"
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for seeding Personal Issues...");

    // Clear old ones
    await SolvedPersonalIssue.deleteMany();
    console.log("Cleared old SolvedPersonalIssue data.");

    for (const issue of sampleIssues) {
      console.log(`Generating embedding for intent: "${issue.normalizedIntent}"...`);
      const embedding = await getEmbedding(issue.normalizedIntent);

      if (!embedding || embedding.length === 0) {
        console.error(`Failed to generate embedding for: ${issue.normalizedIntent}`);
        continue;
      }

      const doc = new SolvedPersonalIssue({
        ...issue,
        embedding
      });
      await doc.save();
      console.log(`Saved: "${issue.normalizedIntent}"`);
    }

    console.log("Personal Issues Seed Complete! ✓");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
