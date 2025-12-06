// background.js

console.log("[PromptPilot] Background service worker loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "ENHANCE_PROMPT") return;

  const original = message.text || "";
  // Check length for heuristics later
  const enhanced = enhancePrompt(original);

  sendResponse({ enhanced });
});

// ---------------- core enhancement logic ----------------

function looksAlreadyStructured(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes("goal:") &&
    lower.includes("context:") &&
    lower.includes("output format")
  );
}

function classifyIntent(text) {
  const t = text.toLowerCase();
  const len = text.length;

  // 1. HEURISTIC: "Lazy Fix" for long text
  // If text is long (> 300 chars) and user just says "fix this", "clean up", it's a Rewrite.
  const isLong = len > 300;
  if (isLong && (t.includes("fix this") || t.includes("clean this") || t.includes("improve this"))) {
    return "rewrite";
  }

  // 2. PRIORITY: CODING & TECHNICAL
  if (
    t.includes("bug") ||
    t.includes("error") ||
    t.includes("stack trace") ||
    t.includes("exception") ||
    t.match(/\bpython\b|\bjavascript\b|\btypescript\b|\breact\b|\bsql\b|\bjava\b/) ||
    (t.includes("code") && !t.includes("code of conduct"))
  ) {
    return "coding";
  }

  // 3. PRIORITY: DATA & ANALYTICS (Expanded)
  if (
    t.includes("excel") ||
    t.includes("spreadsheet") ||
    t.includes("formula") ||
    t.includes("google sheet") ||
    t.includes("pivot table") ||
    t.includes("csv") ||
    t.includes("xlsx") ||
    t.includes("tableau") ||
    t.includes("power bi")
  ) {
    return "data";
  }

  // 4. PRIORITY: BUILD / PRODUCT
  const buildVerbs = /\b(build|create|design|ship|launch|develop)\b/;
  const productWords = /\b(app|application|web app|website|product|tool|saas|platform|startup)\b/;

  if (buildVerbs.test(t) && productWords.test(t)) {
    return "app_build";
  }

  // 5. REWRITE / SUMMARIZE / EDITING
  if (
    t.includes("summarize") ||
    t.includes("rewrite") ||
    t.includes("shorten") ||
    t.includes("tldr") ||
    t.includes("proofread") ||
    t.includes("fix grammar") ||
    t.includes("simplify")
  ) {
    return "rewrite";
  }

  // 6. CONTENT CREATION
  if (
    t.includes("blog") ||
    t.includes("article") ||
    t.includes("linkedin") ||
    t.includes("tweet") ||
    t.includes("instagram") ||
    t.includes("caption") ||
    t.includes("copywriting") ||
    t.includes("essay")
  ) {
    return "content_creation";
  }

  // 7. SPECIFIC TOPICS (Lower priority)
  if (t.includes("resume") || t.includes("cv") || t.includes("curriculum vitae")) return "resume";
  if (t.includes("cover letter") || (t.includes("email") && t.includes("write"))) return "email";

  const travelWords = /\b(trip|travel|itinerary|vacation|holiday|sightseeing|city break|visit)\b/;
  const travelPhrases = /\b(go to|fly to|flight to)\b/;
  if (travelWords.test(t) || travelPhrases.test(t)) return "travel";

  if (
    t.includes("explain") ||
    t.includes("difference between") ||
    t.startsWith("what is ") ||
    t.startsWith("how does ")
  ) return "explanation";

  if (
    t.includes("ideas") ||
    t.includes("brainstorm") ||
    t.includes("suggestions") ||
    t.includes("creative")
  ) return "brainstorm";

  return "generic";
}

// Generic builder: same structure for ALL prompts
function buildStructuredPrompt({ role, goal, userText, context, assumptions, constraints, outputFormat }) {
  const assumptionText =
    assumptions && assumptions.length
      ? "Assumptions (update if needed):\n" +
        assumptions.map((a) => `- ${a}`).join("\n") +
        "\n\n"
      : "";

  const constraintText =
    constraints && constraints.length
      ? "Constraints:\n" + constraints.map((c) => `- ${c}`).join("\n") + "\n\n"
      : "";

  const outputText =
    outputFormat && outputFormat.length
      ? "Output format:\n" + outputFormat.map((o) => `${o}`).join("\n") + "\n"
      : "";

  return (
    `${role}\n\n` +
    `Goal:\n- ${goal}\n\n` +
    "User request:\n" +
    `"${userText}"\n\n` +
    "Context:\n" +
    `- ${context}\n\n` +
    assumptionText +
    constraintText +
    outputText
  );
}

function enhancePrompt(text) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (looksAlreadyStructured(trimmed)) {
    console.log("[PromptPilot] Prompt already structured, returning as-is.");
    return trimmed;
  }

  const intent = classifyIntent(trimmed);
  console.log("[PromptPilot] Classified intent:", intent);

  switch (intent) {
    case "coding":
      return buildCodingPrompt(trimmed);
    case "data":
      return buildDataPrompt(trimmed);
    case "app_build":
      return buildAppBuildPrompt(trimmed);
    case "rewrite":
      return buildRewritePrompt(trimmed);
    case "content_creation":
      return buildContentCreationPrompt(trimmed);
    case "travel":
      return buildTravelPrompt(trimmed);
    case "resume":
      return buildResumePrompt(trimmed);
    case "email":
      return buildEmailPrompt(trimmed);
    case "explanation":
      return buildExplanationPrompt(trimmed);
    case "brainstorm":
      return buildBrainstormPrompt(trimmed);
    default:
      return buildGenericPrompt(trimmed);
  }
}

// --------- domain-specific templates ---------

function buildCodingPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are a senior software engineer and educator.",
    goal: "Help the user understand the problem and provide a robust code solution.",
    userText,
    context: "The user is working on a coding task or facing a bug.",
    assumptions: [
      "The user has basic familiarity with the language they mention.",
      "They prefer clear, well-commented example code."
    ],
    constraints: [
      "Explain concepts briefly before showing complex code.",
      "Prefer simple, readable solutions over clever but confusing ones.",
      "Briefly outline your step-by-step reasoning (bullet points preferred) before writing code.",
      "Use strict markdown code blocks for the solution."
    ],
    outputFormat: [
      "1) One-paragraph summary of the problem/approach.",
      "2) The Code Solution (with comments).",
      "3) Common pitfalls or performance notes."
    ]
  });
}

function buildDataPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are an advanced Data Analyst and Spreadsheet expert.",
    goal: "Provide a precise formula, SQL query, or data interpretation.",
    userText,
    context: "The user is working with data tools like Excel, Google Sheets, or SQL.",
    assumptions: [
      "Unless specified, assume the user is using the latest version of Excel/Google Sheets.",
      "The user needs a solution that handles edge cases (e.g., empty cells, division by zero)."
    ],
    constraints: [
      "Wrap all formulas or code in code blocks.",
      "Explain how the formula works step-by-step.",
      "Mention if helper columns are required."
    ],
    outputFormat: [
      "1) The direct solution (Formula/Query).",
      "2) Explanation of syntax.",
      "3) Example of how to apply it to a sample dataset."
    ]
  });
}

function buildAppBuildPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are a senior full-stack engineer and product coach.",
    goal: "Help the user go from a rough app idea to a concrete, buildable plan.",
    userText,
    context: "The user wants to build a web app or product but needs structure and guidance.",
    assumptions: [
      "The user can do some coding or is willing to learn, or may work with a small team.",
      "They want a realistic MVP, not a huge enterprise system.",
      "They prefer modern, mainstream tech (e.g. React, Node, Python, etc.)."
    ],
    constraints: [
      "Avoid over-engineering; prefer simple, proven approaches.",
      "Explain trade-offs when you recommend tech choices.",
      "Keep the plan in small, shippable milestones."
    ],
    outputFormat: [
      "1) Short summary of the app idea and target users (2–3 sentences).",
      "2) High-level architecture: frontend, backend, database, auth, and hosting (with 1–2 stack options).",
      "3) Feature breakdown into milestones (MVP, v1, later improvements).",
      "4) Concrete next steps for the user for the next 1–2 weeks (learning + building tasks)."
    ]
  });
}

function buildRewritePrompt(userText) {
  return buildStructuredPrompt({
    role: "You are an expert editor and copywriter.",
    goal: "Improve the clarity, grammar, and flow of the text while preserving the original meaning.",
    userText,
    context: "The user has provided text that needs polishing or summarizing.",
    assumptions: [
      "The user wants to retain the original voice unless requested otherwise.",
      "Accuracy is paramount; do not hallucinate new facts."
    ],
    constraints: [
      "Highlight changes if significant.",
      "Fix all grammatical and spelling errors.",
      "Ensure the tone is consistent throughout."
    ],
    outputFormat: [
      "1) The revised/summarized version.",
      "2) A bulleted list of key changes made (e.g., 'Removed passive voice', 'Fixed sentence fragments')."
    ]
  });
}

function buildContentCreationPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are a creative digital marketing strategist and content creator.",
    goal: "Create engaging content tailored to the specific platform and audience.",
    userText,
    context: "The user needs content for a blog, social media, or marketing campaign.",
    assumptions: [
      "The goal is high engagement and value, not just keywords.",
      "The tone should be human, authentic, and not sound 'AI-generated'."
    ],
    constraints: [
      "Use short paragraphs and scannable formatting.",
      "Include a strong hook at the start.",
      "Match the format to the platform (e.g., hashtags for Instagram, professional tone for LinkedIn)."
    ],
    outputFormat: [
      "1) 3–5 Headline/Hook options.",
      "2) The main content body.",
      "3) Suggested Call to Action (CTA)."
    ]
  });
}

function buildTravelPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are an expert travel planner with deep knowledge of major cities worldwide.",
    goal: "Plan a clear, enjoyable itinerary or travel plan that balances practicality, comfort and good experiences.",
    userText,
    context: "The user is using an AI chat tool and wants a clear, detailed travel plan or route.",
    assumptions: [
      "Budget is moderate (not ultra-luxury, not backpacker) unless the user says otherwise.",
      "The user is comfortable using public transport or short taxi rides.",
      "Connections and opening hours are average (not peak-holiday chaos) unless stated."
    ],
    constraints: [
      "Be clear and concise.",
      "Explain your reasoning step by step (why each route/choice is recommended).",
      "Use simple language.",
      "Include approximate timings and key logistics (airports, stations, visa/ticket hints) where relevant."
    ],
    outputFormat: [
      "1) Short summary of the recommended travel approach (2–3 sentences).",
      "2) Detailed plan: routes, transport modes, and key decisions (e.g. which airport, which area to stay in, etc.).",
      "3) Actionable next steps: what to book, when, and 3–5 practical tips (money, time, safety, paperwork)."
    ]
  });
}

function buildResumePrompt(userText) {
  return buildStructuredPrompt({
    role: "You are an expert resume writer who specialises in tech, data and analytics roles.",
    goal: "Turn the user's request into a high-impact, ATS-friendly resume.",
    userText,
    context: "The user wants a job-ready resume that highlights impact and modern tools.",
    assumptions: [
      "The user is early–mid career unless otherwise stated.",
      "They are applying for roles where measurable impact and skills matter.",
      "The resume will be read by both ATS and human recruiters."
    ],
    constraints: [
      "Be concise and results-oriented.",
      "Focus on measurable impact (numbers, speed, revenue, accuracy, etc.).",
      "Avoid fluff like 'hard-working' unless backed by evidence."
    ],
    outputFormat: [
      "1) 3–4 line professional summary tailored to the target role.",
      "2) Experience section for 2–3 roles with bullet points focused on impact.",
      "3) Skills section grouped by categories (Languages, Tools, Cloud, Soft skills).",
      "4) Optional extras: Projects, Certifications, or Achievements if relevant."
    ]
  });
}

function buildEmailPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are an expert communication coach and email writer.",
    goal: "Draft a clear, effective email that matches the user's situation and goal.",
    userText,
    context: "The user needs a professional, well-structured email.",
    assumptions: [
      "Tone should be professional but warm unless the user requests very formal or very casual.",
      "The email will likely be read quickly on a laptop or phone."
    ],
    constraints: [
      "Keep paragraphs short and scannable.",
      "Avoid unnecessary jargon.",
      "Be respectful and specific about asks and timelines."
    ],
    outputFormat: [
      "1) 2–3 subject line options.",
      "2) Full email body (with greeting and sign-off).",
      "3) One-sentence explanation of tone and key choices."
    ]
  });
}

function buildExplanationPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are a clear, patient teacher.",
    goal: "Explain the topic so a motivated learner can truly understand it.",
    userText,
    context: "The user wants an explanation, not just a short definition.",
    assumptions: [
      "The user is willing to read a detailed explanation.",
      "They might not be familiar with specialist jargon."
    ],
    constraints: [
      "Avoid heavy jargon unless you define it.",
      "Use examples and analogies where possible."
    ],
    outputFormat: [
      "1) Intuitive explanation in 1–2 paragraphs.",
      "2) Step-by-step breakdown of key ideas.",
      "3) Simple real-world analogy or example.",
      "4) 3–5 practice questions or ways to apply the concept."
    ]
  });
}

function buildBrainstormPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are a creative collaborator and idea generator.",
    goal: "Generate diverse, specific ideas the user can actually act on.",
    userText,
    context: "The user wants help coming up with options, not just one idea.",
    assumptions: [
      "The user is open to a mix of safe and bold ideas.",
      "They may have limited time or budget, so practicality matters."
    ],
    constraints: [
      "Each idea should be concrete, not generic.",
      "Group similar ideas together to avoid repetition."
    ],
    outputFormat: [
      "1) 10–15 ideas grouped into themes.",
      "2) For the top 3–5 ideas, include 2–3 bullets on how to execute them.",
      "3) Optional: a short suggestion on how to choose between the ideas."
    ]
  });
}

function buildGenericPrompt(userText) {
  return buildStructuredPrompt({
    role: "You are an expert assistant.",
    goal: "Help the user achieve their goal in a clear, structured way.",
    userText,
    context: "The user is using an AI chat tool and wants a clear, detailed response.",
    assumptions: [],
    constraints: [
      "Be clear and concise.",
      "Explain your reasoning step by step.",
      "Use simple language unless technical detail is requested.",
      "Briefly outline your step-by-step reasoning (bullet points preferred) before the final answer."
    ],
    outputFormat: [
      "1) Short summary (2–3 sentences).",
      "2) Detailed answer with reasoning.",
      "3) Actionable next steps or examples."
    ]
  });
}