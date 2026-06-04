/**
 * Seed script: creates test users, FAQs, submissions, and SME data
 * Run: node scripts/seedUsers.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('../models/User');
  const FAQ = require('../models/FAQ');
  const Submission = require('../models/Submission');
  const ContributedFAQ = require('../models/ContributedFAQ');
  const Answer = require('../models/Answer');
  const SemanticCluster = require('../models/SemanticCluster');

  // Clean slate
  await Promise.all([
    User.deleteMany({}),
    FAQ.deleteMany({}),
    Submission.deleteMany({}),
    SemanticCluster.deleteMany({}),
  ]);
  console.log('Cleared existing data');


  // ── Create users ──────────────────────────────────────────────────────────
  const users = await User.insertMany([
    {
      email: 'alice@infracon.com', password: 'Password123', role: 'admin',
      fullName: 'Alice Johnson', username: 'alice_j',
      spurtiPoints: 850, pizzaSlices: 34,
      categoryExpertise: {},
      lastActive: new Date(),
      createdAt: new Date(Date.now() - 90 * 86400000),
    },
    {
      email: 'bob@infracon.com', password: 'Password123', role: 'mentor',
      fullName: 'Bob Singh', username: 'bob_s',
      spurtiPoints: 620, pizzaSlices: 28,
      mentorCategories: ['Certificates', 'Leave Policy'],
      categoryExpertise: {
        Certificates:    { answersGiven: 47, acceptedAnswers: 31, helpfulVotes: 89, totalResponseTimeMs: 7200000 },
        'Leave Policy':  { answersGiven: 22, acceptedAnswers: 18, helpfulVotes: 41, totalResponseTimeMs: 3600000 },
      },
      lastActive: new Date(Date.now() - 2 * 86400000),
      createdAt: new Date(Date.now() - 120 * 86400000),
    },

    {
      email: 'dave@infracon.com', password: 'Password123', role: 'user',
      fullName: 'Dave Mathew', username: 'dave_m',
      spurtiPoints: 310, pizzaSlices: 14,
      categoryExpertise: {
        'Offer Letter': { answersGiven: 8, acceptedAnswers: 5, helpfulVotes: 12, totalResponseTimeMs: 900000 },
      },
      lastActive: new Date(Date.now() - 10 * 86400000),
      createdAt: new Date(Date.now() - 60 * 86400000),
    },
    {
      email: 'eve@infracon.com', password: 'Password123', role: 'user',
      fullName: 'Eve Fernandez', username: 'eve_f',
      spurtiPoints: 195, pizzaSlices: 9,
      categoryExpertise: {},
      lastActive: new Date(Date.now() - 3 * 86400000),
      createdAt: new Date(Date.now() - 45 * 86400000),
    },
    {
      email: 'frank@infracon.com', password: 'Password123', role: 'user',
      fullName: 'Frank George', username: 'frank_g',
      spurtiPoints: 88, pizzaSlices: 4,
      categoryExpertise: {},
      isSuspended: true, suspendedUntil: new Date(Date.now() + 7 * 86400000),
      lastActive: new Date(Date.now() - 20 * 86400000),
      createdAt: new Date(Date.now() - 150 * 86400000),
    },
    {
      email: 'priya@infracon.com', password: 'Password123', role: 'mentor',
      fullName: 'Priya Nair', username: 'priya_n',
      spurtiPoints: 740, pizzaSlices: 30,
      mentorCategories: ['Appraisal', 'Promotions'],
      categoryExpertise: {
        Appraisal:    { answersGiven: 55, acceptedAnswers: 42, helpfulVotes: 110, totalResponseTimeMs: 9000000 },
        Promotions:   { answersGiven: 19, acceptedAnswers: 14, helpfulVotes: 33, totalResponseTimeMs: 2700000 },
      },
      lastActive: new Date(Date.now() - 1 * 86400000),
      createdAt: new Date(Date.now() - 180 * 86400000),
    },
    {
      email: 'quinn@infracon.com', password: 'Password123', role: 'user',
      fullName: 'Quinn K', username: 'quinn_k',
      spurtiPoints: 55, pizzaSlices: 2,
      categoryExpertise: {},
      isBanned: true, bannedAt: new Date(Date.now() - 5 * 86400000),
      lastActive: new Date(Date.now() - 30 * 86400000),
      createdAt: new Date(Date.now() - 210 * 86400000),
    },
    {
      email: 'ria@infracon.com', password: 'Password123', role: 'user',
      fullName: 'Ria Thomspon', username: 'ria_t',
      spurtiPoints: 120, pizzaSlices: 5,
      categoryExpertise: {},
      lastActive: new Date(Date.now() - 15 * 86400000),
      createdAt: new Date(Date.now() - 40 * 86400000),
    },
    {
      email: 'steve@infracon.com', password: 'Password123', role: 'mentor',
      fullName: 'Steve Paul', username: 'steve_p',
      spurtiPoints: 510, pizzaSlices: 22,
      mentorCategories: ['Infrastructure', 'Networking'],
      categoryExpertise: {
        Infrastructure: { answersGiven: 38, acceptedAnswers: 29, helpfulVotes: 74, totalResponseTimeMs: 5400000 },
        Networking:     { answersGiven: 15, acceptedAnswers: 11, helpfulVotes: 28, totalResponseTimeMs: 2100000 },
      },
      lastActive: new Date(),
      createdAt: new Date(Date.now() - 100 * 86400000),
    },
  ]);
  console.log(`Created ${users.length} users`);

  // ── Create semantic clusters / submissions ────────────────────────────────
  const [alice, bob, dave, eve, , priya, , ria, steve] = users;

  const p = (userIds, q) => userIds.map(uid => ({ userId: uid, joinedAt: new Date(), joinMethod: 'MANUAL', question: q }));
  const clusters = await SemanticCluster.insertMany([
    {
      canonicalQuestion: 'How do I apply for maternity leave?',
      rawQuestion: 'maternity leave apply',
      context: 'HR policy question about leave',
      status: 'PROMOTED', category: 'Leave Policy',
      submissionsCount: 8, answerCount: 3,
      participants: p([dave._id, eve._id, ria._id], 'maternity leave apply'),
      spWeight: 0.8, severityScore: 5,
      createdAt: new Date(Date.now() - 30 * 86400000),
    },
    {
      canonicalQuestion: 'What is the annual appraisal cycle?',
      rawQuestion: 'appraisal cycle when',
      context: 'HR process question',
      status: 'PROMOTED', category: 'Appraisal',
      submissionsCount: 5, answerCount: 2,
      participants: p([dave._id, ria._id], 'appraisal cycle when'),
      spWeight: 0.7, severityScore: 4,
      createdAt: new Date(Date.now() - 45 * 86400000),
    },
    {
      canonicalQuestion: 'How to raise an infrastructure request?',
      rawQuestion: 'infrastructure request raise',
      context: 'IT infrastructure request process',
      status: 'PROMOTED', category: 'Infrastructure',
      submissionsCount: 12, answerCount: 4,
      participants: p([eve._id, steve._id], 'infrastructure request raise'),
      spWeight: 0.9, severityScore: 6,
      createdAt: new Date(Date.now() - 20 * 86400000),
    },
    {
      canonicalQuestion: 'Can I encash unused sick leave?',
      rawQuestion: 'sick leave encashment',
      context: 'Leave policy question',
      status: 'OPEN', category: 'Leave Policy',
      submissionsCount: 4, answerCount: 2,
      participants: p([ria._id], 'sick leave encashment'),
      spWeight: 0.5, severityScore: 3,
      createdAt: new Date(Date.now() - 60 * 86400000),
    },
    {
      canonicalQuestion: 'What are the promotion criteria for band 2 to band 3?',
      rawQuestion: 'promotion band 2 to 3 criteria',
      context: 'Career progression policy',
      status: 'OPEN', category: 'Promotions',
      submissionsCount: 7, answerCount: 3,
      participants: p([dave._id, eve._id, ria._id], 'promotion band 2 to 3 criteria'),
      spWeight: 0.85, severityScore: 7,
      createdAt: new Date(Date.now() - 15 * 86400000),
    },
    {
      canonicalQuestion: 'How to reset VPN password?',
      rawQuestion: 'vpn password reset',
      context: 'IT helpdesk query',
      status: 'CLOSED', category: 'Networking',
      submissionsCount: 20, answerCount: 6,
      participants: p([eve._id, ria._id, dave._id], 'vpn password reset'),
      spWeight: 0.6, severityScore: 2,
      createdAt: new Date(Date.now() - 10 * 86400000),
    },
    {
      canonicalQuestion: 'What is the notice period for resignation?',
      rawQuestion: 'resignation notice period',
      context: 'HR policy',
      status: 'ADMIN_REVIEW', category: 'Policies',
      submissionsCount: 9, answerCount: 4,
      participants: p([dave._id, eve._id], 'resignation notice period'),
      spWeight: 0.75, severityScore: 5,
      createdAt: new Date(Date.now() - 25 * 86400000),
    },
    {
      canonicalQuestion: 'How to claim health insurance?',
      rawQuestion: 'health insurance claim',
      context: 'Benefits question',
      status: 'OPEN', category: 'Benefits',
      submissionsCount: 6, answerCount: 2,
      participants: p([ria._id], 'health insurance claim'),
      spWeight: 0.65, severityScore: 4,
      createdAt: new Date(Date.now() - 50 * 86400000),
    },
    {
      canonicalQuestion: 'How are salaries structured?',
      rawQuestion: 'salary structure breakdown',
      context: 'Compensation info',
      status: 'OPEN', category: 'Compensation',
      submissionsCount: 3, answerCount: 1,
      participants: p([dave._id], 'salary structure breakdown'),
      spWeight: 0.7, severityScore: 4,
      createdAt: new Date(Date.now() - 70 * 86400000),
    },
    {
      canonicalQuestion: 'Can I work remotely from another city?',
      rawQuestion: 'remote work other city wfh',
      context: 'Remote work policy',
      status: 'OPEN', category: 'Policies',
      submissionsCount: 15, answerCount: 5,
      participants: p([eve._id, ria._id, dave._id, steve._id], 'remote work other city wfh'),
      spWeight: 0.8, severityScore: 5,
      createdAt: new Date(Date.now() - 5 * 86400000),
    },
  ]);
  console.log(`Created ${clusters.length} semantic clusters`);

  // ── Create FAQs ──────────────────────────────────────────────────────────
  await FAQ.insertMany([
    {
      question: 'How do I apply for maternity leave?',
      answer: 'Submit the ML-1 form to HR at least 30 days before. You get 26 weeks paid leave.',
      category: 'Leave Policy', status: 'published', authorId: bob._id,
      viewCount: 234, createdAt: new Date(Date.now() - 30 * 86400000),
    },
    {
      question: 'What is the annual appraisal cycle?',
      answer: 'Appraisals are conducted in Q4 (October-November). Self-review opens in October.',
      category: 'Appraisal', status: 'published', authorId: priya._id,
      viewCount: 187, createdAt: new Date(Date.now() - 45 * 86400000),
    },
    {
      question: 'How to raise an infrastructure request?',
      answer: 'Submit a ticket via the IT portal with details of the requirement.',
      category: 'Infrastructure', status: 'published', authorId: steve._id,
      viewCount: 412, createdAt: new Date(Date.now() - 20 * 86400000),
    },
  ]);
  console.log('Created 3 FAQs');

  // ── Create submissions ───────────────────────────────────────────────────
  await Submission.insertMany(
    clusters.map((c, i) => ({
      userId: users[i % users.length]._id,
      question: c.rawQuestion,
      context: c.context,
      clusterId: c._id,
      status: 'merged',
      createdAt: new Date(Date.now() - (i + 1) * 5 * 86400000),
    }))
  );
  console.log('Created submissions');

  // ── Set lastActive on all users to make them "active" ────────────────────
  await User.updateMany({}, { lastActive: new Date() });
  // Override a few to test inactive detection
  await User.findByIdAndUpdate(users[5]._id, { lastActive: new Date(Date.now() - 35 * 86400000) });
  await User.findByIdAndUpdate(users[7]._id, { lastActive: new Date(Date.now() - 40 * 86400000) });

  console.log('\n✅ Seed complete!');
  console.log(`   Users: ${users.length}`);
  console.log(`   Admin login: alice@infracon.com / Password123`);


  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});