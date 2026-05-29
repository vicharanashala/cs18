const URL = "https://api.jina.ai/v1/embeddings";

// Helper function to L2 normalize an embedding vector for cosine similarity
function normalizeVector(vector) {
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  const magnitude = Math.sqrt(sumSq);
  if (magnitude === 0) return vector; // avoid division by zero
  return vector.map(val => val / magnitude);
}

async function getEmbedding(text, retries = 3, timeoutMs = 35000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const payload = { 
        model: "jina-embeddings-v2-base-en",
        input: [text] 
      };
      
      const requestBody = JSON.stringify(payload);
      
      const response = await fetch(URL, {
        headers: { 
          Authorization: `Bearer ${process.env.JINA_API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: requestBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status: ${response.status} ${response.statusText} | Body: ${errorText} | Sent Payload excerpt: ${requestBody.substring(0, 150)}`);
      }

      const output = await response.json();
      
      if (output && output.data && output.data.length > 0 && output.data[0].embedding) {
        const vector = output.data[0].embedding;
        // Return normalized embedding vectors for accurate cosine similarity
        return normalizeVector(vector);
      } else {
        throw new Error(`Unexpected output format: ${JSON.stringify(output)}`);
      }

    } catch (err) {
      console.warn(`[WARNING] Embedding attempt ${i + 1} failed:\n   -> ${err.message}`);
      
      if (i === retries - 1) {
        console.error("[ERROR] All embedding retries failed for text excerpt:", text.substring(0, 50).replace(/\n/g, " "));
        // Graceful failure handling
        return [];
      }
      
      // Exponential backoff
      await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
    }
  }
  return [];
}

module.exports = getEmbedding;