require('dotenv').config();
const mongoose = require('mongoose');

const FAQ = require('../models/FAQ');
const Submission = require('../models/Submission');
const Ticket = require('../models/Ticket');
const PersonalTicket = require('../models/PersonalTicket');
const ContributedFAQ = require('../models/ContributedFAQ');
const MentorCategory = require('../models/MentorCategory');
const User = require('../models/User');

const { normalizeCategory } = require('../utils/constants');

async function fixCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Update FAQ
    console.log('Updating FAQs...');
    const faqs = await FAQ.find({});
    let updatedFAQs = 0;
    for (const faq of faqs) {
      const normalized = normalizeCategory(faq.category);
      if (faq.category !== normalized) {
        await FAQ.updateOne({ _id: faq._id }, { $set: { category: normalized } });
        updatedFAQs++;
      }
    }
    console.log(`Updated ${updatedFAQs} FAQs`);

    // Update Submission
    console.log('Updating Submissions...');
    const submissions = await Submission.find({});
    let updatedSubmissions = 0;
    for (const sub of submissions) {
      const normalized = normalizeCategory(sub.category);
      if (sub.category !== normalized) {
        await Submission.updateOne({ _id: sub._id }, { $set: { category: normalized } });
        updatedSubmissions++;
      }
    }
    console.log(`Updated ${updatedSubmissions} Submissions`);

    // Update Ticket
    console.log('Updating Tickets...');
    const tickets = await Ticket.find({});
    let updatedTickets = 0;
    for (const t of tickets) {
      const normalized = normalizeCategory(t.category);
      if (t.category !== normalized) {
        await Ticket.updateOne({ _id: t._id }, { $set: { category: normalized } });
        updatedTickets++;
      }
    }
    console.log(`Updated ${updatedTickets} Tickets`);

    // Update PersonalTicket
    console.log('Updating PersonalTickets...');
    const ptickets = await PersonalTicket.find({});
    let updatedPTickets = 0;
    for (const pt of ptickets) {
      const normalized = normalizeCategory(pt.category);
      if (pt.category !== normalized) {
        await PersonalTicket.updateOne({ _id: pt._id }, { $set: { category: normalized } });
        updatedPTickets++;
      }
    }
    console.log(`Updated ${updatedPTickets} PersonalTickets`);

    // Update ContributedFAQ
    console.log('Updating ContributedFAQs...');
    const cfaqs = await ContributedFAQ.find({});
    let updatedCFAQs = 0;
    for (const c of cfaqs) {
      const normalized = normalizeCategory(c.category);
      if (c.category !== normalized) {
        await ContributedFAQ.updateOne({ _id: c._id }, { $set: { category: normalized } });
        updatedCFAQs++;
      }
    }
    console.log(`Updated ${updatedCFAQs} ContributedFAQs`);

    // Update MentorCategory
    console.log('Updating MentorCategories...');
    const mcs = await MentorCategory.find({});
    let updatedMCs = 0;
    for (const mc of mcs) {
      const normalized = normalizeCategory(mc.category);
      if (mc.category !== normalized) {
        try {
          await MentorCategory.updateOne({ _id: mc._id }, { $set: { category: normalized } });
          updatedMCs++;
        } catch (e) {
          if (e.code === 11000) {
            console.log(`Duplicate found for MentorCategory ${normalized} and mentor ${mc.mentorId}. Deleting old duplicate.`);
            await MentorCategory.deleteOne({ _id: mc._id });
          }
        }
      }
    }
    console.log(`Updated ${updatedMCs} MentorCategories`);

    // Update User
    console.log('Updating Users...');
    const users = await User.find({});
    let updatedUsers = 0;
    for (const u of users) {
      let changed = false;
      const updateData = {};

      // 1. mentorCategories
      if (u.mentorCategories && u.mentorCategories.length > 0) {
        const newMentorCats = [...new Set(u.mentorCategories.map(c => normalizeCategory(c)))];
        if (newMentorCats.length !== u.mentorCategories.length || !u.mentorCategories.every((c, i) => c === newMentorCats[i])) {
          updateData.mentorCategories = newMentorCats;
          changed = true;
        }
      }

      // 2. rejectedSMECategories
      if (u.rejectedSMECategories && u.rejectedSMECategories.length > 0) {
        const newRejCats = [...new Set(u.rejectedSMECategories.map(c => normalizeCategory(c)))];
        if (newRejCats.length !== u.rejectedSMECategories.length || !u.rejectedSMECategories.every((c, i) => c === newRejCats[i])) {
          updateData.rejectedSMECategories = newRejCats;
          changed = true;
        }
      }

      // 3. categoryExpertise
      if (u.categoryExpertise && u.categoryExpertise.size > 0) {
        const oldMap = u.categoryExpertise;
        const newMap = new Map();
        let mapChanged = false;

        for (const [key, val] of oldMap.entries()) {
          const normalized = normalizeCategory(key);
          if (key !== normalized) mapChanged = true;

          if (newMap.has(normalized)) {
            const existing = newMap.get(normalized);
            newMap.set(normalized, {
              answersGiven: (existing.answersGiven || 0) + (val.answersGiven || 0),
              acceptedAnswers: (existing.acceptedAnswers || 0) + (val.acceptedAnswers || 0),
              helpfulVotes: (existing.helpfulVotes || 0) + (val.helpfulVotes || 0),
              totalResponseTimeMs: (existing.totalResponseTimeMs || 0) + (val.totalResponseTimeMs || 0)
            });
          } else {
            newMap.set(normalized, { ...val.toObject() });
          }
        }

        if (mapChanged) {
          updateData.categoryExpertise = newMap;
          changed = true;
        }
      }

      if (changed) {
        await User.updateOne({ _id: u._id }, { $set: updateData });
        updatedUsers++;
      }
    }
    console.log(`Updated ${updatedUsers} Users`);

    console.log('Categories fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing categories:', error);
    process.exit(1);
  }
}

fixCategories();
