# PromptPilot – Smart Prompt Helper for ChatGPT

PromptPilot is a Chrome extension that turns rough, messy prompts into **structured, high-quality super-prompts** directly inside ChatGPT.

It doesn’t just “rewrite nicely” – it **detects your intent** (coding, data, app ideas, resume, travel, rewriting, content, etc.) and builds a tailored prompt with:

- **Role**
- **Goal**
- **User request**
- **Context**
- **Assumptions**
- **Constraints**
- **Output format**

So you get better answers with less effort thinking about how to prompt.

---

## ✨ Features

### 🧠 Intent-aware enhancement

Automatically detects what you’re trying to do:

- `coding` – debugging, scripts, APIs, Python/JS/SQL…
- `data` – Excel / Sheets / CSV / Tableau / Power BI
- `app_build` – “build a web app / SaaS / product”
- `rewrite` – summarise, fix grammar, clean up text
- `content_creation` – blogs, LinkedIn posts, tweets, captions
- `travel` – trip planning & travel logistics
- `resume`, `email`, `explanation`, `brainstorm`, `generic`

### 🧩 Structured super-prompts

Every enhanced prompt follows a consistent pattern:

```text
Role:
Goal:
User request:
Context:
Assumptions:
Constraints:
Output format:
with domain-specific details for each intent (e.g. resume vs travel vs coding).

⚙️ Zero setup, runs locally
No external servers

No data collection

All logic is in background.js and runs in your browser

💬 One-click UX
Injects a small “Enhance” button next to the ChatGPT input box

Click it → your rough text is transformed into a structured prompt in-place

You can still edit the enhanced prompt before sending

🧱 How it works
Content script (content-script.js)
Injects the Enhance button into ChatGPT / chatgpt.com

Reads the current input (textarea / contenteditable)

Sends the raw text to the background via chrome.runtime.sendMessage

Receives the enhanced prompt and replaces the input text

Background service worker (background.js)
Listens for ENHANCE_PROMPT messages

Runs enhancePrompt(text):

classifyIntent(text) → figure out the intent

Routes to a domain-specific builder (coding, data, travel, resume, etc.)

All builders use a shared buildStructuredPrompt(...) helper

Returns the final super-prompt

Manifest V3 (manifest.json)
Runs on:

https://chat.openai.com/*

https://chatgpt.com/*

🚀 Local installation
Clone the repository:

bash
Copy code
git clone https://github.com/shashanksuresh18/prompt-pilot.git
cd prompt-pilot
Open Chrome and go to:

text
Copy code
chrome://extensions
Turn on Developer mode (top-right).

Click “Load unpacked” and select the prompt-pilot folder.

Open ChatGPT (https://chatgpt.com or https://chat.openai.com), type any prompt, and click Enhance.

🧪 Example prompts
Coding

Debug this Python error: ValueError: too many values to unpack

Data / Excel

Excel formula to sum values by category in another column

App build

I want to build a web app to track my workouts

Rewrite

Fix grammar and make this more professional: …

Travel

Plan a 2-day trip to London

Each of these is transformed into a structured, intent-specific super-prompt.

🔒 Privacy
No data is sent to any external server.

The extension only runs on ChatGPT domains.

All prompt enhancement logic runs locally in the background script.

☕ Support
If this extension saves you time and helps you write better prompts, you can support the project here:

Support / buy me a coffee:
[ADD YOUR BUYMEACOFFEE / KO-FI LINK HERE]

yaml
Copy code

---

### Next steps

1. Paste this into `README.md`.
2. Then run:

```bash
git add README.md
git commit -m "Fix README formatting"
git push
