// content-script.js

function log(...args) {
  console.log("[PromptPilot]", ...args);
}

log("Content script loaded on", window.location.href);

// Start
initPromptPilot();

// ---------------- core logic ----------------

// Helper: is element actually visible on screen?
function isVisible(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function initPromptPilot() {
  const input = findChatInput();
  if (!input) {
    log("Chat input not found yet, retrying...");
    setTimeout(initPromptPilot, 1000);
    return;
  }

  // Avoid injecting twice
  if (document.querySelector(".pp-enhance-button")) {
    log("Enhance button already present, skipping.");
    return;
  }

  log("Chat input found, injecting Enhance button.", input);

  const button = document.createElement("button");
  button.type = "button"; // don't submit the form
  button.textContent = "Enhance";
  button.className = "pp-enhance-button";

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

// Prefer visible contenteditable inputs over hidden textareas
function findChatInput() {
  // 1) Visible contenteditable divs
  const editableCandidates = Array.from(
    document.querySelectorAll(
      'div[contenteditable="true"], div[contenteditable="plaintext-only"], div[contenteditable]'
    )
  ).filter(isVisible);

  log("Visible contenteditable candidates:", editableCandidates.length);

  if (editableCandidates.length > 0) {
    return editableCandidates[editableCandidates.length - 1];
  }

  // 2) Fallback: visible textareas (if any)
  const textareaCandidates = Array.from(document.querySelectorAll("textarea")).filter(isVisible);

  log("Visible textarea candidates:", textareaCandidates.length);

  if (textareaCandidates.length > 0) {
    return textareaCandidates[textareaCandidates.length - 1];
  }

  return null;
}

function getInputText(el) {
  if (!el) return "";

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    return el.value;
  }

  if (el.isContentEditable) {
    // Use innerText; normalize NBSP
    return (el.innerText || el.textContent || "").replace(/\u00A0/g, " ");
  }

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
}

function handleEnhanceClick(initialInput) {
  // Re-find in case DOM changed
  const input = findChatInput() || initialInput;
  const originalText = getInputText(input);

  log("Current input text:", JSON.stringify(originalText));

  if (!originalText || !originalText.trim()) {
    showToast("Type something first, then I can enhance it.");
    return;
  }

  log("Sending text to background for enhancement...");

  chrome.runtime.sendMessage(
    { type: "ENHANCE_PROMPT", text: originalText },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("[PromptPilot] Error:", chrome.runtime.lastError);
        showToast("Error enhancing prompt. Check console.");
        return;
      }

      if (response && response.enhanced) {
        setInputText(input, response.enhanced);
        showToast("Prompt enhanced ✔");
      } else {
        showToast("No enhanced text received.");
      }
    }
  );
}

// Simple toast notification
function showToast(message) {
  let toast = document.querySelector(".pp-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "pp-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;

  clearTimeout(showToast._timeoutId);
  showToast._timeoutId = setTimeout(() => {
    toast.remove();
  }, 2000);
}
