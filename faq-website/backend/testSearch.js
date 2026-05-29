require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('./models/FAQ');
const ContributedFAQ = require('./models/ContributedFAQ');
const SemanticCluster = require('./models/SemanticCluster');
const getEmbedding = require('./utils/embedding');
const { cosineSimilarity } = require('./utils/clustering');

async function testSearch() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const rawQuery = 'hostel';
  console.log(`[SEARCH] Query: "${rawQuery}"`);

  try {
    const faqs = await FAQ.find().populate('categoryId', 'name').lean();
    console.log('Fetched FAQs:', faqs.length);
    
    const queryEmbedding = await getEmbedding(rawQuery);
    console.log('Got query embedding. Length:', queryEmbedding.length);
    
    const scoredFaqs = faqs.map(faq => {
      let sim = 0;
      try {
        sim = cosineSimilarity(queryEmbedding, faq.embedding);
      } catch (e) {
        console.error('Error calculating similarity for FAQ', faq._id, e.message);
      }
      return { ...faq, similarity: sim };
    });
    
    console.log('Calculated scored FAQs.');
    
    // Fetch closed/promoted SemanticClusters (solved public issues) and score them
    const solvedClusters = await SemanticCluster.find({ status: { $in: ['CLOSED', 'PROMOTED'] } }).lean();
    const scoredSolvedClusters = solvedClusters.map(sc => ({
      _id: sc._id,
      question: sc.canonicalQuestion,
      answer: sc.aiGeneratedAnswer || sc.context,
      similarity: cosineSimilarity(queryEmbedding, sc.embedding),
      isDiscussion: true
    }));
    
    console.log('Scored clusters.');
    
    const allScored = [...scoredFaqs, ...scoredSolvedClusters].sort((a, b) => b.similarity - a.similarity);
    console.log('Top match:', allScored[0]?.question, 'Score:', allScored[0]?.similarity);
    
  } catch (err) {
    console.error('SEARCH ERROR', err);
  }
  
  mongoose.disconnect();
}

testSearch();
