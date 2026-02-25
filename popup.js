// popup.js — PromptPilot Settings

const ALL_CATEGORIES = [
    "coding", "data", "app_build", "rewrite",
    "content_creation", "travel", "resume", "email", "brainstorm"
];

const DEFAULT_SETTINGS = {
    tone: "professional",
    disabledCategories: []
};

function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        document.getElementById("tone-select").value = settings.tone || "professional";
        const disabled = settings.disabledCategories || [];
        ALL_CATEGORIES.forEach((cat) => {
            const el = document.getElementById(`cat-${cat}`);
            if (el) el.checked = !disabled.includes(cat);
        });
    });
}

function saveSettings() {
    const tone = document.getElementById("tone-select").value;
    const disabledCategories = ALL_CATEGORIES.filter((cat) => {
        const el = document.getElementById(`cat-${cat}`);
        return el && !el.checked;
    });

    chrome.storage.sync.set({ tone, disabledCategories }, () => {
        const status = document.getElementById("save-status");
        status.textContent = "✓ Saved!";
        setTimeout(() => { status.textContent = ""; }, 2000);
    });
}

document.getElementById("save-btn").addEventListener("click", saveSettings);
document.addEventListener("DOMContentLoaded", loadSettings);
loadSettings();
