/* ============================================================
   SMARTRESUME NLP — nlp.js
   Lightweight, dependency-free NLP pipeline (browser-only)
   ============================================================ */

const STOP_WORDS = new Set([
  "a","an","the","and","or","is","are","was","were","to","of","in","on",
  "for","with","from","at","by","this","that","as","be","been","being",
  "have","has","had","it","its","our","your","their","you","we","they",
  "i","he","she","them","his","her","will","would","can","could","should",
  "may","might","must","not","no","do","does","did","but","if","then",
  "than","so","such","also","into","about","over","under","up","down",
  "out","off","again","further","once","here","there","when","where",
  "why","how","all","any","both","each","few","more","most","other",
  "some","only","own","same","just","who","whom","which","what","these",
  "those","am","because","while","after","before","during","above",
  "below","between","through","per","etc","via"
]);

/* Normalize raw text: lowercase, collapse whitespace, strip stray punctuation
   while preserving technical tokens like "C#", ".NET", "Node.js", "CI/CD" */
function normalizeText(text) {
  if (!text) return "";
  let t = text.toLowerCase();
  t = t.replace(/[\r\n\t]+/g, " ");
  // Keep letters, numbers, and technical symbols: # . + / -
  t = t.replace(/[^a-z0-9#.+/\-\s]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/* Split normalized text into tokens */
function tokenizeText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(" ").filter(tok => tok.length > 1);
}

/* Remove stop words from a token list */
function removeStopWords(tokens) {
  return tokens.filter(tok => !STOP_WORDS.has(tok));
}

/* Compute word frequency map from a token list */
function getWordFrequency(tokens) {
  const freq = {};
  tokens.forEach(tok => {
    freq[tok] = (freq[tok] || 0) + 1;
  });
  return freq;
}

/* Extract top N keywords by frequency, excluding stop words & very short tokens */
function extractKeywords(text, topN = 15) {
  const tokens = removeStopWords(tokenizeText(text));
  const freq = getWordFrequency(tokens);
  return Object.entries(freq)
    .filter(([word]) => word.length > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

/* Build a TF-IDF style weight map across two documents (resume, job) */
function calculateTFIDF(docTokensA, docTokensB) {
  const docs = [docTokensA, docTokensB];
  const vocab = new Set([...docTokensA, ...docTokensB]);
  const tfidfVectors = docs.map(tokens => {
    const tf = getWordFrequency(tokens);
    const total = tokens.length || 1;
    const vector = {};
    vocab.forEach(term => {
      const termFreq = (tf[term] || 0) / total;
      const docsContaining = docs.filter(d => d.includes(term)).length;
      const idf = Math.log((docs.length + 1) / (docsContaining + 1)) + 1;
      vector[term] = termFreq * idf;
    });
    return vector;
  });
  return { vocab: Array.from(vocab), vectorA: tfidfVectors[0], vectorB: tfidfVectors[1] };
}

/* Cosine similarity between two TF-IDF vectors (returned as % 0-100) */
function calculateCosineSimilarity(vectorA, vectorB, vocab) {
  let dot = 0, magA = 0, magB = 0;
  vocab.forEach(term => {
    const a = vectorA[term] || 0;
    const b = vectorB[term] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  });
  if (magA === 0 || magB === 0) return 0;
  const similarity = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return Math.round(similarity * 100);
}

/**
 * Full analysis pipeline for a single document's text.
 * Returns stats used for the statistics panels.
 */
function analyzeText(text) {
  const words = tokenizeText(text);
  const meaningful = removeStopWords(words);
  const unique = new Set(meaningful);
  return {
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
    charCount: text.length,
    uniqueTerms: unique.size,
    tokens: words,
    meaningfulTokens: meaningful
  };
}

/**
 * Compare resume text against job description text.
 * Produces the full result object consumed by the results dashboard.
 */
function compareTexts(resumeText, jobText) {
  const resumeAnalysis = analyzeText(resumeText);
  const jobAnalysis = analyzeText(jobText);

  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobText);

  const resumeSkillNames = new Set(resumeSkills.map(s => s.name));
  const jobSkillNames = new Set(jobSkills.map(s => s.name));

  const matchingSkills = jobSkills.filter(s => resumeSkillNames.has(s.name));
  const missingSkills = jobSkills.filter(s => !resumeSkillNames.has(s.name));
  const additionalSkills = resumeSkills.filter(s => !jobSkillNames.has(s.name));

  const skillMatchScore = jobSkills.length > 0
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 0;

  const { vocab, vectorA, vectorB } = calculateTFIDF(
    resumeAnalysis.meaningfulTokens,
    jobAnalysis.meaningfulTokens
  );
  const textSimilarity = calculateCosineSimilarity(vectorA, vectorB, vocab);

  const jobKeywords = extractKeywords(jobText, 15);
  const resumeKeywords = extractKeywords(resumeText, 15);

  // Category breakdown: for each category present in job skills, compute % matched
  const categories = getSkillCategories();
  const categoryBreakdown = categories.map(cat => {
    const jobInCat = jobSkills.filter(s => s.category === cat);
    if (jobInCat.length === 0) return null;
    const matchedInCat = jobInCat.filter(s => resumeSkillNames.has(s.name));
    return {
      category: cat,
      total: jobInCat.length,
      matched: matchedInCat.length,
      percent: Math.round((matchedInCat.length / jobInCat.length) * 100)
    };
  }).filter(Boolean);

  return {
    resumeAnalysis,
    jobAnalysis,
    resumeSkills,
    jobSkills,
    matchingSkills,
    missingSkills,
    additionalSkills,
    skillMatchScore,
    textSimilarity,
    jobKeywords,
    resumeKeywords,
    categoryBreakdown
  };
}
