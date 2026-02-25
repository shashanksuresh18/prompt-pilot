// content-script.js — PromptPilot v0.2

function log(...args) {
  console.log("[PromptPilot]", ...args);
}

log("Content script loaded on", window.location.href);

// Detect platform for any per-platform tweaks
const PLATFORM = (() => {
  const h = window.location.hostname;
  if (h.includes("claude.ai")) return "claude";
  if (h.includes("gemini.google.com")) return "gemini";
  return "chatgpt";
})();

log("Platform detected:", PLATFORM);

// ── Bootstrap ──────────────────────────────────────────────────────────────
initPromptPilot();

// Re-inject when ChatGPT navigates (SPA) or DOM changes
const _observer = new MutationObserver(() => {
  if (!document.querySelector(".pp-enhance-button")) {
    initPromptPilot();
  }
});
_observer.observe(document.body, { childList: true, subtree: true });

// ── Core init ──────────────────────────────────────────────────────────────
function initPromptPilot() {
  const input = findChatInput();
  if (!input) {
    setTimeout(initPromptPilot, 1000);
    return;
  }

  if (document.querySelector(".pp-enhance-button")) return;

  log("Injecting Enhance button. Platform:", PLATFORM);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `pp-enhance-button pp-platform-${PLATFORM}`;
  button.innerHTML = `<span class="pp-btn-icon">🚀</span><span class="pp-btn-text">Enhance</span>`;

  const container = input.closest("form") || input.parentElement || document.body;
  if (container && getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  (container || document.body).appendChild(button);

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleEnhanceClick(input);
  });
}

// ── Input helpers ──────────────────────────────────────────────────────────
function isVisible(el) {
  if (!el) return false;
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function findChatInput() {
  const editables = Array.from(
    document.querySelectorAll('div[contenteditable="true"], div[contenteditable="plaintext-only"], div[contenteditable]')
  ).filter(isVisible);
  if (editables.length) return editables[editables.length - 1];

  const textareas = Array.from(document.querySelectorAll("textarea")).filter(isVisible);
  if (textareas.length) return textareas[textareas.length - 1];
  return null;
}

function getInputText(el) {
  if (!el) return "";
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value;
  if (el.isContentEditable) return (el.innerText || el.textContent || "").replace(/\u00A0/g, " ");
  return "";
}

function setInputText(el, text) {
  if (!el) return;
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    el.value = text;
  } else if (el.isContentEditable) {
    el.innerText = text;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  // Move cursor to end for contenteditable
  if (el.isContentEditable) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// ── Enhance flow ───────────────────────────────────────────────────────────
function handleEnhanceClick(initialInput) {
  const input = findChatInput() || initialInput;
  const originalText = getInputText(input);

  if (!originalText || !originalText.trim()) {
    showToast("Type something first, then I can enhance it.");
    return;
  }

  const button = document.querySelector(".pp-enhance-button");
  if (button) {
    button.classList.add("pp-loading");
    button.innerHTML = `<span class="pp-btn-text">Enhancing…</span>`;
  }

  chrome.runtime.sendMessage({ type: "ENHANCE_PROMPT", text: originalText }, (response) => {
    // Restore button
    if (button) {
      button.classList.remove("pp-loading");
      button.innerHTML = `<span class="pp-btn-icon">🚀</span><span class="pp-btn-text">Enhance</span>`;
    }

    if (chrome.runtime.lastError) {
      console.error("[PromptPilot] Error:", chrome.runtime.lastError);
      showToast("Error enhancing prompt.");
      return;
    }

    if (response && response.enhanced) {
      showPreviewModal(originalText, response.enhanced, input);
    } else {
      showToast("No enhanced text received.");
    }
  });
}

// ── Preview Modal ──────────────────────────────────────────────────────────
function showPreviewModal(original, enhanced, inputEl) {
  // Remove existing modal
  document.querySelector(".pp-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "pp-modal-overlay";

  overlay.innerHTML = `
    <div class="pp-modal" role="dialog" aria-modal="true" aria-label="Prompt Preview">
      <div class="pp-modal-header">
        <span class="pp-modal-logo">🚀</span>
        <span class="pp-modal-title">Enhanced Prompt Preview</span>
        <button class="pp-modal-close" title="Cancel">✕</button>
      </div>
      <div class="pp-modal-body">
        <div class="pp-panel">
          <div class="pp-panel-label">Original</div>
          <div class="pp-panel-text pp-original-text">${escapeHtml(original)}</div>
        </div>
        <div class="pp-panel pp-panel-enhanced">
          <div class="pp-panel-label">Enhanced <span class="pp-panel-hint">(you can edit below)</span></div>
          <div class="pp-panel-text pp-enhanced-text" contenteditable="true">${escapeHtml(enhanced)}</div>
        </div>
      </div>
      <div class="pp-modal-actions">
        <button class="pp-btn-cancel">Cancel</button>
        <button class="pp-btn-use">Use This ✓</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add("pp-modal-visible"));

  const closeModal = () => {
    overlay.classList.remove("pp-modal-visible");
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector(".pp-modal-close").addEventListener("click", closeModal);
  overlay.querySelector(".pp-btn-cancel").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  overlay.querySelector(".pp-btn-use").addEventListener("click", () => {
    const editedText = overlay.querySelector(".pp-enhanced-text").innerText;
    setInputText(inputEl, editedText);
    closeModal();
    showToast("Prompt enhanced ✔");
  });

  // Close on Escape
  const onKeyDown = (e) => {
    if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", onKeyDown); }
  };
  document.addEventListener("keydown", onKeyDown);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(message) {
  let toast = document.querySelector(".pp-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "pp-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("pp-toast-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove("pp-toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
