const FAQ_CATEGORIES = [
  "About the internship",
  "Timing and dates",
  "NOC (No Objection Certificate)",
  "Selection, offer letter, and certificate",
  "Work, mentorship, and projects",
  "Code of conduct — communication channels",
  "Interviews Related",
  "Certificate",
  "Rosetta — your internship journal",
  "Phase 1 — coursework, Vibe LMS, and live sessions",
  "Yaksha Chat Related",
  "ViBe Platform",
  "Team Formation",
  "Other"
];

const CATEGORY_ALIASES = {
  "Selection offer letter and certificate": "Selection, offer letter, and certificate",
  "Selection offer letter": "Selection, offer letter, and certificate",
  "Work mentorship and projects": "Work, mentorship, and projects",
  "Timing & Dates": "Timing and dates",
  "Phase 1 coursework vibe lms and live sessions": "Phase 1 — coursework, Vibe LMS, and live sessions",
  "Phase 1 - coursework, Vibe LMS, and live sessions": "Phase 1 — coursework, Vibe LMS, and live sessions",
  "Code of conduct communication channels": "Code of conduct — communication channels",
  "Code of conduct - communication channels": "Code of conduct — communication channels",
  "Rosetta your internship journal": "Rosetta — your internship journal",
  "Rosetta - your internship journal": "Rosetta — your internship journal",
  "NOC": "NOC (No Objection Certificate)"
};

function normalizeCategory(oldName) {
  if (!oldName || typeof oldName !== 'string') return "Other";
  
  // Exact match (case insensitive)
  const exactMatch = FAQ_CATEGORIES.find(c => c.toLowerCase() === oldName.toLowerCase());
  if (exactMatch) return exactMatch;

  // Alias match
  const aliasMatch = Object.keys(CATEGORY_ALIASES).find(
    alias => oldName.toLowerCase() === alias.toLowerCase()
  );
  if (aliasMatch) return CATEGORY_ALIASES[aliasMatch];

  // Keyword matching
  const oldLower = oldName.toLowerCase();
  if (oldLower.includes("offer") || oldLower.includes("selection") || oldLower.includes("acceptance")) {
    return "Selection, offer letter, and certificate";
  } else if (oldLower.includes("team") || oldLower.includes("formation")) {
    return "Team Formation";
  } else if (oldLower.includes("date") || oldLower.includes("time") || oldLower.includes("timing")) {
    return "Timing and dates";
  } else if (oldLower.includes("vibe lms") || oldLower.includes("phase 1")) {
    return "Phase 1 — coursework, Vibe LMS, and live sessions";
  } else if (oldLower.includes("work") || oldLower.includes("mentor") || oldLower.includes("project")) {
    return "Work, mentorship, and projects";
  } else if (oldLower.includes("yaksha")) {
    return "Yaksha Chat Related";
  } else if (oldLower.includes("about") || oldLower.includes("internship")) {
    return "About the internship";
  } else if (oldLower.includes("noc") || oldLower.includes("objection")) {
    return "NOC (No Objection Certificate)";
  } else if (oldLower.includes("code") || oldLower.includes("conduct") || oldLower.includes("communication")) {
    return "Code of conduct — communication channels";
  } else if (oldLower.includes("interview")) {
    return "Interviews Related";
  } else if (oldLower.includes("certificate")) {
    return "Certificate";
  } else if (oldLower.includes("vibe")) {
    return "ViBe Platform";
  } else if (oldLower.includes("rosetta") || oldLower.includes("journal")) {
    return "Rosetta — your internship journal";
  }

  return "Other";
}

module.exports = {
  FAQ_CATEGORIES,
  CATEGORY_ALIASES,
  normalizeCategory
};
