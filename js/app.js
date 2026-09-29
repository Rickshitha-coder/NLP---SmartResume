/* ============================================================
   SMARTRESUME NLP — app.js
   Wires up navigation, upload/paste inputs, analysis, results,
   and history rendering. No frameworks — vanilla DOM only.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- Toast ---------------- */
  const toastEl = document.getElementById("srToast");
  let toastTimer = null;
  function showToast(message, type) {
    toastEl.textContent = message;
    toastEl.className = "sr-toast show" + (type ? " " + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove("show"); }, 3500);
  }

  /* ============================================================
     SIDE CONTROLLER — one instance for "resume", one for "job"
     ============================================================ */
  function createSideController(side) {
    const state = { mode: "upload", text: "", fileMeta: null };

    const el = {
      modeButtons: document.querySelectorAll(`.input-mode-btn[data-target="${side}"]`),
      uploadPanel: document.getElementById(side + "UploadPanel"),
      pastePanel: document.getElementById(side + "PastePanel"),
      pasteArea: document.getElementById(side + "PasteArea"),
      dropzone: document.getElementById(side + "Dropzone"),
      fileInput: document.getElementById(side + "FileInput"),
      browseBtn: document.getElementById(side + "BrowseBtn"),
      fileChip: document.getElementById(side + "FileChip"),
      status: document.getElementById(side + "Status"),
      stats: document.getElementById(side + "Stats"),
      wordCount: document.getElementById(side + "WordCount"),
      charCount: document.getElementById(side + "CharCount"),
      previewToggle: document.getElementById(side + "PreviewToggle"),
      previewBox: document.getElementById(side + "PreviewBox"),
      replaceBtn: document.getElementById(side + "ReplaceBtn"),
      removeBtn: document.getElementById(side + "RemoveBtn"),
      clearBtn: document.getElementById(side + "ClearBtn")
    };

    function setMode(mode) {
      state.mode = mode;
      el.modeButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
      el.uploadPanel.classList.toggle("d-none", mode !== "upload");
      el.pastePanel.classList.toggle("d-none", mode !== "paste");
    }

    function setStatus(message, type) {
      if (!message) { el.status.innerHTML = ""; return; }
      const icon = type === "success" ? "bi-check-circle-fill"
                 : type === "error" ? "bi-exclamation-triangle-fill"
                 : "bi-arrow-repeat";
      el.status.innerHTML = `<span class="status-line ${type || "loading"}"><i class="bi ${icon}"></i> ${message}</span>`;
    }

    function updateCounts(text) {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      el.wordCount.textContent = words;
      el.charCount.textContent = text.length;
      el.stats.classList.toggle("d-none", text.length === 0);
    }

    function setText(text) {
      state.text = text || "";
      updateCounts(state.text);
      el.previewBox.textContent = state.text;
      el.previewToggle.classList.toggle("d-none", state.text.length === 0);
      if (state.text.length === 0) {
        el.previewBox.classList.add("d-none");
        el.previewToggle.textContent = "Preview Extracted Text";
      }
      refreshAnalyzeButton();
    }

    function showFileChip(name, sizeBytes, typeLabel) {
      const sizeKB = sizeBytes / 1024;
      const sizeLabel = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + " MB" : Math.round(sizeKB) + " KB";
      el.fileChip.innerHTML = `
        <div class="file-chip">
          <div>
            <div class="file-chip-name">✓ ${escapeHTML(name)}</div>
            <div class="file-chip-meta">${typeLabel} • ${sizeLabel}</div>
          </div>
        </div>`;
      el.dropzone.classList.add("d-none");
      el.replaceBtn.classList.remove("d-none");
      el.removeBtn.classList.remove("d-none");
    }

    function clearFileChip() {
      el.fileChip.innerHTML = "";
      el.dropzone.classList.remove("d-none");
      el.replaceBtn.classList.add("d-none");
      el.removeBtn.classList.add("d-none");
    }

    function escapeHTML(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    async function handleFile(file) {
      if (!file) return;
      const validation = validateFile(file);
      if (!validation.valid) {
        setStatus(validation.message, "error");
        showToast(validation.message, "error");
        return;
      }
      setStatus("Reading " + (validation.ext === "pdf" ? "PDF" : validation.ext === "docx" ? "Word document" : "text file") + "...", "loading");
      const result = await processUploadedFile(file, (msg) => setStatus(msg, "loading"));
      if (result.success) {
        setStatus(result.message, "success");
        showFileChip(file.name, file.size, validation.ext.toUpperCase());
        setText(result.text);
      } else {
        setStatus(result.message, "error");
        setText("");
        clearFileChip();
      }
    }

    function reset() {
      state.fileMeta = null;
      clearFileChip();
      setStatus("");
      setText("");
      el.fileInput.value = "";
      el.pasteArea.value = "";
    }

    /* --- Event bindings --- */
    el.modeButtons.forEach(btn => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    el.browseBtn.addEventListener("click", () => el.fileInput.click());
    el.dropzone.addEventListener("click", () => el.fileInput.click());
    el.dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.fileInput.click(); }
    });
    el.fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });

    ["dragenter", "dragover"].forEach(evt => {
      el.dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        el.dropzone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(evt => {
      el.dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        el.dropzone.classList.remove("dragover");
      });
    });
    el.dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    el.pasteArea.addEventListener("input", () => setText(el.pasteArea.value));

    el.previewToggle.addEventListener("click", () => {
      const isHidden = el.previewBox.classList.contains("d-none");
      if (isHidden) {
        el.previewBox.classList.remove("d-none");
        el.previewToggle.textContent = "Hide Preview";
      } else {
        el.previewBox.classList.add("d-none");
        el.previewToggle.textContent = "Preview Extracted Text";
      }
    });

    el.replaceBtn.addEventListener("click", () => el.fileInput.click());
    el.removeBtn.addEventListener("click", reset);
    el.clearBtn.addEventListener("click", () => {
      reset();
      el.pasteArea.value = "";
    });

    return {
      get text() { return state.text; },
      setPasteText(text) {
        setMode("paste");
        el.pasteArea.value = text;
        setText(text);
      },
      reset
    };
  }

  const resumeSide = createSideController("resume");
  const jobSide = createSideController("job");

  /* ============================================================
     ANALYZE BUTTON — enabled only when both sides have text
     ============================================================ */
  const analyzeBtn = document.getElementById("analyzeBtn");
  function refreshAnalyzeButton() {
    const ready = resumeSide.text.trim().length > 10 && jobSide.text.trim().length > 10;
    analyzeBtn.disabled = !ready;
  }
  // refreshAnalyzeButton is referenced by setText() inside createSideController
  // via closure lookup at call time (function hoisting covers this).

  /* ============================================================
     SAMPLE DEMO
     ============================================================ */
  const SAMPLE_RESUME = "Frontend developer with experience building responsive web applications using HTML, CSS, JavaScript, React and Bootstrap. Familiar with Git, REST APIs and UI development.";
  const SAMPLE_JOB = "We are looking for a Frontend Developer Intern with knowledge of HTML, CSS, JavaScript, React, Git, REST APIs, TypeScript and responsive design.";

  document.getElementById("btnTrySample").addEventListener("click", () => {
    resumeSide.setPasteText(SAMPLE_RESUME);
    jobSide.setPasteText(SAMPLE_JOB);
    document.getElementById("jobTitleInput").value = "Frontend Developer Intern";
    showToast("Sample resume and job description loaded.", "success");
    document.getElementById("analyzer").scrollIntoView({ behavior: "smooth" });
  });

  /* ============================================================
     PREVIEW MODAL (used for both sides' "Preview Extracted Text")
     — kept simple: the inline preview box already toggles, this
     modal is available for a larger view if desired later.
     ============================================================ */

  /* ============================================================
     ANALYSIS PIPELINE + RESULTS RENDERING
     ============================================================ */
  let lastResult = null;

  const pipelineStepsEl = document.getElementById("pipelineSteps");
  function runPipelineAnimation() {
    return new Promise(resolve => {
      pipelineStepsEl.classList.remove("d-none");
      const steps = pipelineStepsEl.querySelectorAll(".step");
      let i = 0;
      const interval = setInterval(() => {
        steps.forEach(s => s.classList.remove("active"));
        if (steps[i]) steps[i].classList.add("active");
        i++;
        if (i > steps.length) {
          clearInterval(interval);
          pipelineStepsEl.classList.add("d-none");
          steps.forEach(s => s.classList.remove("active"));
          resolve();
        }
      }, 260);
    });
  }

  analyzeBtn.addEventListener("click", async () => {
    if (analyzeBtn.disabled) return;
    analyzeBtn.disabled = true;
    await runPipelineAnimation();
    try {
      const result = compareTexts(resumeSide.text, jobSide.text);
      lastResult = result;
      renderResults(result);
      document.getElementById("results").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Analysis error:", err);
      showToast("Something went wrong while analyzing. Please try again.", "error");
    } finally {
      refreshAnalyzeButton();
    }
  });

  function chipHTML(list, cls, symbol) {
    if (!list.length) return '<p class="small text-muted mb-0">None detected.</p>';
    return list.map(s => `<span class="chip ${cls}">${symbol} ${escapeHTML(s.name)}</span>`).join("");
  }
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderResults(result) {
    document.getElementById("resultsEmptyState").classList.add("d-none");
    const content = document.getElementById("resultsContent");
    content.classList.remove("d-none");

    // Score ring animation
    const scoreRing = document.getElementById("scoreRing");
    const scoreValue = document.getElementById("scoreValue");
    animateScore(scoreValue, scoreRing, result.skillMatchScore);

    document.getElementById("scoreExplain").textContent =
      `${result.matchingSkills.length} of ${result.jobSkills.length} recognized job skills were detected in the resume. Calculated from recognized skills in the provided resume and job description.`;

    document.getElementById("similarityValue").textContent = result.textSimilarity + "%";

    // Summary cards
    const totalSkillsFound = new Set([
      ...result.resumeSkills.map(s => s.name),
      ...result.jobSkills.map(s => s.name)
    ]).size;
    document.getElementById("statSkillsFound").textContent = totalSkillsFound;
    document.getElementById("statMatching").textContent = result.matchingSkills.length;
    document.getElementById("statMissing").textContent = result.missingSkills.length;
    document.getElementById("statKeywords").textContent = result.jobKeywords.length;

    // Skill chip lists
    document.getElementById("matchingSkillsList").innerHTML = chipHTML(result.matchingSkills, "chip-match", "✓");
    document.getElementById("missingSkillsList").innerHTML = chipHTML(result.missingSkills, "chip-missing", "+");
    document.getElementById("additionalSkillsList").innerHTML = chipHTML(result.additionalSkills, "chip-additional", "•");

    // Keywords
    document.getElementById("jobKeywordsList").innerHTML = result.jobKeywords.length
      ? result.jobKeywords.map(k => `<span class="keyword-tag">${escapeHTML(k.word)} (${k.count})</span>`).join("")
      : '<p class="small text-muted mb-0">No significant keywords detected.</p>';

    // Statistics panels
    document.getElementById("resumeStatsList").innerHTML = statListHTML(result.resumeAnalysis, result.resumeSkills, result.resumeKeywords);
    document.getElementById("jobStatsList").innerHTML = statListHTML(result.jobAnalysis, result.jobSkills, result.jobKeywords);

    // Category breakdown
    const catEl = document.getElementById("categoryBreakdown");
    catEl.innerHTML = result.categoryBreakdown.length
      ? result.categoryBreakdown.map(c => `
        <div class="progress-cat">
          <div class="progress-cat-label"><span>${escapeHTML(c.category)}</span><span>${c.matched}/${c.total} (${c.percent}%)</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${c.percent}%"></div></div>
        </div>`).join("")
      : '<p class="small text-muted mb-0">No categorized skills were detected in the job description.</p>';

    // Insights
    document.getElementById("insightsList").innerHTML = buildInsights(result);

    updateSaveButtonState(result);
  }

  function statListHTML(analysis, skills, keywords) {
    return `
      <li class="d-flex justify-content-between border-bottom py-2"><span>Words</span><strong>${analysis.wordCount}</strong></li>
      <li class="d-flex justify-content-between border-bottom py-2"><span>Characters</span><strong>${analysis.charCount}</strong></li>
      <li class="d-flex justify-content-between border-bottom py-2"><span>Unique Terms</span><strong>${analysis.uniqueTerms}</strong></li>
      <li class="d-flex justify-content-between border-bottom py-2"><span>Detected Skills</span><strong>${skills.length}</strong></li>
      <li class="d-flex justify-content-between py-2"><span>Important Keywords</span><strong>${keywords.length}</strong></li>
    `;
  }

  function buildInsights(result) {
    const items = [];
    if (result.missingSkills.length > 0) {
      items.push(`These job requirements were not detected in the resume: ${result.missingSkills.map(s => s.name).join(", ")}.`);
    }
    if (result.matchingSkills.length > 0) {
      items.push(`These relevant skills were detected: ${result.matchingSkills.map(s => s.name).join(", ")}.`);
    }
    if (result.textSimilarity < 40) {
      items.push("Consider using terminology from the job description where it accurately reflects your existing experience.");
    }
    if (result.additionalSkills.length > 0) {
      items.push(`Your resume also highlights skills not mentioned in this job description: ${result.additionalSkills.map(s => s.name).join(", ")}. These may still be valuable to keep for other roles.`);
    }
    if (items.length === 0) {
      items.push("No specific insights could be generated from the recognized skills in these documents.");
    }
    return items.map(text => `<div class="insight-item"><i class="bi bi-arrow-right-circle"></i><p class="mb-0 small">${escapeHTML(text)}</p></div>`).join("");
  }

  function animateScore(valueEl, ringEl, target) {
    let current = 0;
    const duration = 900;
    const start = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      current = Math.round(target * progress);
      valueEl.textContent = current + "%";
      ringEl.style.background = `conic-gradient(var(--coral) ${current * 3.6}deg, #F0E3E8 ${current * 3.6}deg)`;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ============================================================
     SAVE ANALYSIS / HISTORY
     ============================================================ */
  const saveAnalysisBtn = document.getElementById("saveAnalysisBtn");

  function updateSaveButtonState() {
    saveAnalysisBtn.disabled = false;
    saveAnalysisBtn.innerHTML = '<i class="bi bi-save"></i> Save Analysis';
  }

  saveAnalysisBtn.addEventListener("click", () => {
    if (!lastResult) return;
    const jobTitle = document.getElementById("jobTitleInput").value.trim() || "Untitled Analysis";
    const totalSkillsFound = new Set([
      ...lastResult.resumeSkills.map(s => s.name),
      ...lastResult.jobSkills.map(s => s.name)
    ]).size;

    const { success } = saveAnalysis({
      jobTitle,
      matchScore: lastResult.skillMatchScore,
      textSimilarity: lastResult.textSimilarity,
      matchingSkills: lastResult.matchingSkills.map(s => s.name),
      missingSkills: lastResult.missingSkills.map(s => s.name),
      skillsFoundCount: totalSkillsFound,
      keywordCount: lastResult.jobKeywords.length
    });

    if (success) {
      showToast("Analysis saved to history.", "success");
      renderHistory();
    } else {
      showToast("Could not save this analysis. Your browser storage may be full or disabled.", "error");
    }
  });

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderHistory() {
    const history = getAnalysisHistory();
    const listEl = document.getElementById("historyList");
    const emptyEl = document.getElementById("historyEmptyState");
    const clearBtn = document.getElementById("clearHistoryBtn");

    if (!history.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("d-none");
      clearBtn.classList.add("d-none");
      return;
    }

    emptyEl.classList.add("d-none");
    clearBtn.classList.remove("d-none");

    listEl.innerHTML = history.map(item => `
      <div class="col-md-6 col-lg-4">
        <div class="sr-card history-card h-100 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start">
            <span class="history-title">${escapeHTML(item.jobTitle)}</span>
            <span class="history-score">${item.matchScore}%</span>
          </div>
          <p class="history-meta mb-2">${item.matchingSkills.length} Matching · ${item.missingSkills.length} Missing</p>
          <p class="history-meta mb-3">${formatDate(item.timestamp)}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn-ghost" data-view="${item.id}" type="button">View</button>
            <button class="btn-ghost danger" data-delete="${item.id}" type="button">Delete</button>
          </div>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll("[data-view]").forEach(btn => {
      btn.addEventListener("click", () => viewHistoryItem(btn.dataset.view));
    });
    listEl.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", () => {
        deleteAnalysis(btn.dataset.delete);
        showToast("Analysis deleted.", "success");
        renderHistory();
      });
    });
  }

  function viewHistoryItem(id) {
    const item = getAnalysisHistory().find(h => h.id === id);
    if (!item) return;
    const body = document.getElementById("historyViewModalBody");
    body.innerHTML = `
      <p class="fw-bold mb-1" style="color:var(--plum)">${escapeHTML(item.jobTitle)}</p>
      <p class="text-muted small mb-3">${formatDate(item.timestamp)}</p>
      <p><strong>Skill Match Score:</strong> ${item.matchScore}%</p>
      <p><strong>Text Similarity:</strong> ${item.textSimilarity}%</p>
      <p class="mb-1"><strong>Matching Skills</strong></p>
      <p class="small">${item.matchingSkills.length ? item.matchingSkills.map(escapeHTML).join(", ") : "None"}</p>
      <p class="mb-1"><strong>Missing Skills</strong></p>
      <p class="small">${item.missingSkills.length ? item.missingSkills.map(escapeHTML).join(", ") : "None"}</p>
    `;
    new bootstrap.Modal(document.getElementById("historyViewModal")).show();
  }

  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    if (confirm("Clear all saved analysis history? This cannot be undone.")) {
      clearHistory();
      showToast("History cleared.", "success");
      renderHistory();
    }
  });

  /* ============================================================
     INIT
     ============================================================ */
  renderHistory();
})();
