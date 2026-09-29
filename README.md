# SmartResume NLP

**Resume Keyword & Job Match Analyzer** — a 100% client-side, browser-based
NLP application that compares a resume against a job description, scores the
skill match, and surfaces missing keywords — all without a server, backend,
or API key.

Live design: Deep Plum + Warm Coral + Soft Cream, an editorial career-tech
aesthetic built with Bootstrap 5, Bootstrap Icons, and hand-written CSS.

---

## Features

- Upload **or** paste both the resume and the job description
- Client-side text extraction from **PDF**, **DOCX**, and **TXT**
- Drag-and-drop upload zones with live status messages
- Word/character counters and an expandable extracted-text preview
- A lightweight, hand-rolled NLP pipeline (no external NLP library):
  normalization → tokenization → stop-word removal → keyword extraction →
  skill detection → skill matching → TF-IDF → cosine similarity
- Skill Match Score, Text Similarity score, and a full results dashboard:
  matching / missing / additional skills, keyword lists, per-document
  statistics, skill-category breakdown, and rule-based improvement insights
- Analysis history saved to `localStorage` (scores and skill lists only —
  never the full resume or job description text)
- Fully responsive, accessible, and keyboard-navigable
- A one-click "Try Sample Analysis" demo

## Supported Documents

| Format | Library used |
|---|---|
| PDF | [PDF.js](https://mozilla.github.io/pdf.js/) |
| DOCX | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) |
| TXT | Browser `FileReader` API |
| Paste Text | Plain `<textarea>` |

Every combination of resume format × job-description format is supported
(PDF+PDF, PDF+DOCX, DOCX+TXT, Paste+Paste, and so on).

## NLP Techniques

- **Normalization** — lowercasing, whitespace cleanup, punctuation handling
  that preserves technical tokens like `C#`, `.NET`, `Node.js`, `CI/CD`
- **Tokenization** — splitting normalized text into word tokens
- **Stop-word Removal** — filtering common English function words
- **Keyword Extraction** — frequency-ranked, meaningful terms
- **Skill Detection** — a categorized skill dictionary with alias resolution
  (e.g. `JS` → `JavaScript`, `ReactJS` → `React`)
- **TF-IDF** — term weighting across the two documents
- **Cosine Similarity** — vector-based text similarity score

All of this runs synchronously in the browser in `js/nlp.js` and
`js/skills.js` — there is no server round-trip.

## Technology Stack

- HTML5, CSS3
- Bootstrap 5 (CDN) + Bootstrap Icons (CDN)
- Vanilla JavaScript (no framework, no build step)
- PDF.js (CDN) for PDF parsing
- Mammoth.js (CDN) for DOCX parsing
- Browser `localStorage` for analysis history

No backend. No database. No API keys. No `npm install`.

## Privacy

Your resume and job description are **never uploaded anywhere**. All parsing
and analysis happen entirely inside your browser tab using JavaScript. Only
a compact summary of a saved analysis (job title, scores, and matched/missing
skill names) is written to your browser's `localStorage` — the full resume
and job description text is never stored.

## Project Structure

```
smartresume-nlp/
│
├── index.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js              # UI wiring, events, results rendering
│   ├── nlp.js               # tokenization, stop-words, TF-IDF, similarity
│   ├── skills.js             # skill dictionary + alias-aware extraction
│   ├── storage.js            # localStorage history (save/get/delete/clear)
│   └── document-parser.js    # PDF / DOCX / TXT extraction
│
├── assets/
│   └── README.md
│
├── README.md
└── LICENSE
```

## How to Run

No installation required.

1. Download or clone this repository.
2. Open `index.html` directly in any modern browser (Chrome, Edge, Firefox,
   Safari).

That's it — everything runs from static files.

## GitHub Pages Deployment

1. Create a new repository on GitHub.
2. Upload all files, preserving the folder structure above.
3. Commit the files.
4. Open the repository's **Settings**.
5. Open **Pages** in the sidebar.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the **main** branch.
8. Select the **/ (root)** folder.
9. Click **Save**.
10. After a minute, open the generated URL:
    `https://USERNAME.github.io/REPOSITORY-NAME/`

Or from the command line:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

All asset paths in this project are relative (`css/`, `js/`, `assets/`), so
it works correctly both when opened locally and when hosted at a GitHub
Pages sub-path.

## Limitations

- Skill detection depends entirely on the built-in skill dictionary in
  `js/skills.js` — skills outside that list won't be recognized.
- Scanned PDFs with no selectable text are not supported (no OCR is
  included); you'll be prompted to paste the text manually.
- DOCX formatting (tables, styles, images) is not preserved — only text is
  extracted.
- This is **not** a real Applicant Tracking System (ATS) and does not
  replicate any specific ATS's scoring algorithm.
- The **Skill Match Score** reflects only recognized skills detected by
  simple text matching, not overall candidate fit.
- **Text Similarity** is a lightweight keyword-overlap measurement (TF-IDF +
  cosine similarity), not a deep semantic comparison.
- All results should be treated as informational, not authoritative.

## Future Improvements

- Expand the skill dictionary and alias table, or make it user-editable
- Add basic OCR support for scanned PDFs
- Use word embeddings (e.g. a small pretrained model) for true semantic
  similarity instead of keyword-overlap TF-IDF
- Support exporting a saved analysis as a PDF report
- Add multi-language support
