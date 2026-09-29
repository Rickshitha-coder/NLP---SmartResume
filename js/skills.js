/* ============================================================
   SMARTRESUME NLP — skills.js
   Structured skill dictionary + skill extraction engine
   ============================================================ */

const SKILL_DB = {
  "Frontend": [
    "HTML", "CSS", "JavaScript", "TypeScript", "React", "Angular", "Vue",
    "Bootstrap", "Tailwind CSS", "Next.js", "Redux", "jQuery", "Sass",
    "Webpack", "Responsive Design"
  ],
  "Backend": [
    "Node.js", "Express", "Python", "Django", "Flask", "Java",
    "Spring Boot", "C#", ".NET", "PHP", "Ruby", "REST API", "GraphQL",
    "Microservices"
  ],
  "Database": [
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Redis", "Oracle",
    "Firebase Realtime Database"
  ],
  "Data / AI": [
    "Pandas", "NumPy", "Matplotlib", "Scikit-learn", "TensorFlow",
    "PyTorch", "Machine Learning", "Deep Learning", "Natural Language Processing",
    "OpenCV", "Data Analysis", "Data Visualization"
  ],
  "Cloud / DevOps": [
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD",
    "Jenkins", "Terraform", "Linux"
  ],
  "Tools": [
    "Git", "GitHub", "GitLab", "Postman", "Figma", "VS Code", "Jira",
    "Bitbucket", "Slack"
  ],
  "Mobile": [
    "Flutter", "React Native", "Android", "Kotlin", "Swift", "iOS"
  ],
  "General": [
    "Agile", "Scrum", "Data Structures", "Algorithms",
    "Object Oriented Programming", "Communication", "Problem Solving",
    "Team Leadership", "Project Management", "Testing", "Unit Testing"
  ]
};

/* Aliases: alternate spelling/casing -> canonical skill name */
const SKILL_ALIASES = {
  "js": "JavaScript",
  "ts": "TypeScript",
  "node": "Node.js",
  "nodejs": "Node.js",
  "reactjs": "React",
  "react.js": "React",
  "vuejs": "Vue",
  "vue.js": "Vue",
  "angularjs": "Angular",
  "ml": "Machine Learning",
  "dl": "Deep Learning",
  "nlp": "Natural Language Processing",
  "ai": "Machine Learning",
  "github": "GitHub",
  "git hub": "GitHub",
  "gitlab": "GitLab",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "oop": "Object Oriented Programming",
  "restapi": "REST API",
  "rest apis": "REST API",
  "restful api": "REST API",
  "restful apis": "REST API",
  "api": "REST API",
  "apis": "REST API",
  "css3": "CSS",
  "html5": "HTML",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "nextjs": "Next.js",
  "next js": "Next.js",
  "dotnet": ".NET",
  "asp.net": ".NET",
  "c sharp": "C#",
  "csharp": "C#",
  "k8s": "Kubernetes",
  "ci cd": "CI/CD",
  "cicd": "CI/CD",
  "aws cloud": "AWS",
  "gcp": "Google Cloud",
  "sklearn": "Scikit-learn",
  "scikit learn": "Scikit-learn",
  "tensor flow": "TensorFlow",
  "py torch": "PyTorch",
  "react native": "React Native",
  "reactnative": "React Native",
  "vscode": "VS Code",
  "vs code": "VS Code",
  "unittest": "Unit Testing",
  "unit test": "Unit Testing",
  "unit tests": "Unit Testing",
  "scrum master": "Scrum",
  "data structure": "Data Structures",
  "algorithm": "Algorithms",
  "problem-solving": "Problem Solving"
};

/* Build a flat lookup map: lowercase term -> { name, category } */
function buildSkillLookup() {
  const lookup = {};
  for (const category in SKILL_DB) {
    SKILL_DB[category].forEach(skill => {
      lookup[skill.toLowerCase()] = { name: skill, category };
    });
  }
  for (const alias in SKILL_ALIASES) {
    const canonical = SKILL_ALIASES[alias];
    // find canonical's category
    let category = "General";
    for (const cat in SKILL_DB) {
      if (SKILL_DB[cat].some(s => s.toLowerCase() === canonical.toLowerCase())) {
        category = cat;
        break;
      }
    }
    lookup[alias.toLowerCase()] = { name: canonical, category };
  }
  return lookup;
}

const SKILL_LOOKUP = buildSkillLookup();

/* Escape a string for safe use inside a RegExp */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract recognized skills from a block of text.
 * Matches multi-word skills and aliases using word boundaries.
 * Returns an array of { name, category } objects, de-duplicated.
 */
function extractSkills(text) {
  if (!text || typeof text !== "string") return [];
  const lowerText = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";
  const found = new Map();

  // Sort terms by length (longest first) so multi-word terms are matched
  // before their shorter sub-terms (e.g. "react native" before "react").
  const terms = Object.keys(SKILL_LOOKUP).sort((a, b) => b.length - a.length);

  terms.forEach(term => {
    const pattern = new RegExp(
      "(?<![a-z0-9+#.])" + escapeRegExp(term) + "(?![a-z0-9+#])",
      "i"
    );
    if (pattern.test(lowerText)) {
      const { name, category } = SKILL_LOOKUP[term];
      if (!found.has(name)) {
        found.set(name, { name, category });
      }
    }
  });

  return Array.from(found.values());
}

/* Return the full category list (for UI rendering) */
function getSkillCategories() {
  return Object.keys(SKILL_DB);
}
