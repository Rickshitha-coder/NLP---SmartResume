/* ============================================================
   SMARTRESUME NLP — document-parser.js
   Client-side text extraction: PDF (PDF.js), DOCX (Mammoth.js), TXT
   Nothing here ever leaves the browser.
   ============================================================ */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"];

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function validateFile(file) {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, message: "Unsupported file type. Please upload PDF, DOCX, or TXT." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, message: "File is too large. Please upload a document smaller than 10 MB." };
  }
  return { valid: true, ext };
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsArrayBuffer(file);
  });
}

/* -------------------- PDF -------------------- */
async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }

    fullText = fullText.trim();

    if (!fullText || fullText.replace(/\s/g, "").length < 5) {
      return {
        success: false,
        text: "",
        message: "This PDF does not contain selectable text. It may be a scanned document. Please paste the text manually."
      };
    }

    return { success: true, text: fullText, message: "PDF processed successfully." };
  } catch (err) {
    console.error("PDF extraction error:", err);
    return {
      success: false,
      text: "",
      message: "This PDF does not contain selectable text. It may be a scanned document. Please paste the text manually."
    };
  }
}

/* -------------------- DOCX -------------------- */
async function extractTextFromDOCX(file) {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value || "").trim();

    if (!text) {
      return {
        success: false,
        text: "",
        message: "Unable to read this Word document. Please try another file or paste the text manually."
      };
    }

    return { success: true, text, message: "Word document processed successfully." };
  } catch (err) {
    console.error("DOCX extraction error:", err);
    return {
      success: false,
      text: "",
      message: "Unable to read this Word document. Please try another file or paste the text manually."
    };
  }
}

/* -------------------- TXT -------------------- */
function extractTextFromTXT(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result || "").toString().trim();
      resolve({ success: true, text, message: "Text file loaded successfully." });
    };
    reader.onerror = () => {
      resolve({
        success: false,
        text: "",
        message: "Unable to read this text file. Please try another file or paste the text manually."
      });
    };
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Master entry point: validates the file, routes to the correct extractor,
 * and always resolves (never throws) so the UI never crashes.
 */
async function processUploadedFile(file, onStatus) {
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, text: "", message: validation.message };
  }

  try {
    if (validation.ext === "pdf") {
      if (onStatus) onStatus("Reading PDF...");
      return await extractTextFromPDF(file);
    }
    if (validation.ext === "docx") {
      if (onStatus) onStatus("Reading Word document...");
      return await extractTextFromDOCX(file);
    }
    if (validation.ext === "txt") {
      if (onStatus) onStatus("Reading text file...");
      return await extractTextFromTXT(file);
    }
    return { success: false, text: "", message: "Unsupported file type. Please upload PDF, DOCX, or TXT." };
  } catch (err) {
    console.error("Unexpected file processing error:", err);
    return {
      success: false,
      text: "",
      message: "Something went wrong while reading this file. Please try another file or paste the text manually."
    };
  }
}
