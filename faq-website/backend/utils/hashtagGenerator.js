const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
  'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
  'they', 'this', 'to', 'was', 'will', 'with', 'what', 'why', 'where', 'how', 'when', 'can',
  'i', 'you', 'he', 'she', 'we', 'do', 'does', 'did', 'have', 'has', 'had', 'my', 'your',
  'about', 'from', 'which', 'who', 'whom', 'whose', 'would', 'should', 'could', 'am', 'me', 'us'
]);

function generateHashtags(text, category) {
  const hashtags = new Set();
  
  // 1. Add normalized category as first hashtag
  if (category && category !== 'Other') {
    const catTag = category.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (catTag) hashtags.add(catTag);
  }

  // 2. Tokenize text, remove punctuation, lower case
  if (text) {
    const words = text
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);     // Remove tiny words
      
    // 3. Remove stop words and add to set
    for (const word of words) {
      if (!STOP_WORDS.has(word)) {
        hashtags.add(word);
      }
    }
  }

  // 4. Return array of up to 6 hashtags
  return Array.from(hashtags).slice(0, 6);
}

module.exports = {
  generateHashtags
};
