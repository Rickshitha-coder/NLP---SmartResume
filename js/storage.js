/* ============================================================
   SMARTRESUME NLP — storage.js
   localStorage-backed analysis history (no resume/JD text saved)
   ============================================================ */

const STORAGE_KEY = "smartresume_nlp_history_v1";

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.error("History parse error:", err);
    return fallback;
  }
}

function getAnalysisHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return safeParse(raw, []);
  } catch (err) {
    console.error("localStorage unavailable:", err);
    return [];
  }
}

function saveAnalysis(entry) {
  try {
    const history = getAnalysisHistory();
    const record = {
      id: "analysis_" + Date.now(),
      jobTitle: entry.jobTitle || "Untitled Analysis",
      timestamp: new Date().toISOString(),
      matchScore: entry.matchScore,
      textSimilarity: entry.textSimilarity,
      matchingSkills: entry.matchingSkills || [],
      missingSkills: entry.missingSkills || [],
      skillsFoundCount: entry.skillsFoundCount || 0,
      keywordCount: entry.keywordCount || 0
    };
    history.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return { success: true, record };
  } catch (err) {
    console.error("Could not save analysis:", err);
    return { success: false };
  }
}

function deleteAnalysis(id) {
  try {
    const history = getAnalysisHistory().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (err) {
    console.error("Could not delete analysis:", err);
    return false;
  }
}

function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("Could not clear history:", err);
    return false;
  }
}
