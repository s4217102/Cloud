// ---------- Tab switching ----------
const tabTitles = {
  grammar: "Grammar Fix",
  style: "Style Match",
  settings: "Settings",
};

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  document.getElementById("pageTitle").textContent = tabTitles[name];
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (activeSpeakBtn) {
    activeSpeakBtn.textContent = "🔊 Listen";
    activeSpeakBtn = null;
  }
}

// ---------- Settings: API key storage ----------
const API_KEY_STORAGE = "writewell_api_key";
const apiKeyInput = document.getElementById("apiKeyInput");
const settingsStatus = document.getElementById("settingsStatus");

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

apiKeyInput.value = getApiKey();

document.getElementById("saveKeyBtn").addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus(settingsStatus, "Please paste a key first.", "error");
    return;
  }
  localStorage.setItem(API_KEY_STORAGE, key);
  setStatus(settingsStatus, "Saved on this device.", "ok");
});

document.getElementById("clearKeyBtn").addEventListener("click", () => {
  localStorage.removeItem(API_KEY_STORAGE);
  apiKeyInput.value = "";
  setStatus(settingsStatus, "Cleared.", "ok");
});

function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

// ---------- Grammar tab ----------
const grammarInput = document.getElementById("grammarInput");
const grammarStatus = document.getElementById("grammarStatus");
const grammarResults = document.getElementById("grammarResults");

document.getElementById("checkGrammarBtn").addEventListener("click", checkGrammar);

async function checkGrammar() {
  const text = grammarInput.value.trim();
  grammarResults.innerHTML = "";
  if (!text) {
    setStatus(grammarStatus, "Write something first.", "error");
    return;
  }

  setStatus(grammarStatus, "Checking...", "");

  try {
    const res = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: "en-US" }),
    });

    if (!res.ok) throw new Error("Grammar service returned an error.");

    const data = await res.json();
    renderGrammarResults(text, data.matches || []);
    setStatus(grammarStatus, "", "");
  } catch (err) {
    setStatus(grammarStatus, "Couldn't check grammar. Check your internet connection and try again.", "error");
  }
}

function renderGrammarResults(originalText, matches) {
  grammarResults.innerHTML = "";

  if (matches.length === 0) {
    grammarResults.innerHTML = '<div class="no-issues">No issues found. Looks good! ✓</div>';
    return;
  }

  const fixAllBtn = document.createElement("button");
  fixAllBtn.className = "primary-btn";
  fixAllBtn.style.marginBottom = "12px";
  fixAllBtn.textContent = `Fix All (${matches.length})`;
  fixAllBtn.addEventListener("click", () => applyAllFixes(originalText, matches));
  grammarResults.appendChild(fixAllBtn);

  matches.forEach((match) => {
    const card = document.createElement("div");
    card.className = "issue-card";

    const before = originalText.slice(Math.max(0, match.offset - 20), match.offset);
    const errorText = originalText.slice(match.offset, match.offset + match.length);
    const after = originalText.slice(match.offset + match.length, match.offset + match.length + 20);

    const originalP = document.createElement("div");
    originalP.className = "issue-original";
    originalP.innerHTML = `…${escapeHtml(before)}<mark>${escapeHtml(errorText)}</mark>${escapeHtml(after)}…`;
    card.appendChild(originalP);

    const messageP = document.createElement("div");
    messageP.className = "issue-message";
    messageP.textContent = match.message;
    card.appendChild(messageP);

    if (match.replacements && match.replacements.length > 0) {
      const row = document.createElement("div");
      row.className = "issue-suggestion-row";
      match.replacements.slice(0, 3).forEach((r) => {
        const pill = document.createElement("span");
        pill.className = "suggestion-pill";
        pill.textContent = r.value || "(remove)";
        row.appendChild(pill);
      });
      card.appendChild(row);
    }

    grammarResults.appendChild(card);
  });
}

function applyAllFixes(originalText, matches) {
  // Apply replacements from the end of the text backwards so offsets stay valid.
  const sorted = [...matches].sort((a, b) => b.offset - a.offset);
  let fixed = originalText;
  sorted.forEach((match) => {
    if (match.replacements && match.replacements.length > 0) {
      const value = match.replacements[0].value;
      fixed = fixed.slice(0, match.offset) + value + fixed.slice(match.offset + match.length);
    }
  });

  grammarInput.value = fixed;

  const label = document.createElement("div");
  label.className = "clean-text-label";
  label.textContent = "Corrected text";
  grammarResults.prepend(label);

  const card = document.createElement("div");
  card.className = "result-card";
  const textDiv = document.createElement("div");
  textDiv.className = "result-text";
  textDiv.textContent = fixed;
  card.appendChild(textDiv);
  card.appendChild(buildResultActions(fixed));

  grammarResults.insertBefore(card, grammarResults.children[1]);
}

// ---------- Style tab ----------
const styleInput = document.getElementById("styleInput");
const moodInput = document.getElementById("moodInput");
const styleStatus = document.getElementById("styleStatus");
const styleResult = document.getElementById("styleResult");

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
    moodInput.value = chip.dataset.mood;
  });
});

document.getElementById("rewriteBtn").addEventListener("click", rewriteStyle);

async function rewriteStyle() {
  const text = styleInput.value.trim();
  const mood = moodInput.value.trim();
  styleResult.innerHTML = "";

  if (!text) {
    setStatus(styleStatus, "Write something first.", "error");
    return;
  }
  if (!mood) {
    setStatus(styleStatus, "Pick or type a mood/style.", "error");
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    setStatus(styleStatus, "Add your Anthropic API key in Settings first.", "error");
    switchTab("settings");
    return;
  }

  setStatus(styleStatus, "Rewriting...", "");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system:
          "You rewrite text to match a requested mood or style while keeping the original meaning. " +
          "You also fix any grammar mistakes. Reply with ONLY the rewritten text - no explanations, no quotation marks, no extra commentary.",
        messages: [
          {
            role: "user",
            content: `Mood/style: ${mood}\n\nText to rewrite:\n${text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const msg = errBody && errBody.error && errBody.error.message ? errBody.error.message : "Request failed.";
      throw new Error(msg);
    }

    const data = await res.json();
    const rewritten = (data.content || []).map((block) => block.text || "").join("").trim();

    renderStyleResult(rewritten);
    setStatus(styleStatus, "", "");
  } catch (err) {
    setStatus(styleStatus, "Couldn't rewrite: " + err.message, "error");
  }
}

function renderStyleResult(text) {
  styleResult.innerHTML = "";

  const label = document.createElement("div");
  label.className = "clean-text-label";
  label.textContent = "Rewritten text";
  styleResult.appendChild(label);

  const card = document.createElement("div");
  card.className = "result-card";
  const textDiv = document.createElement("div");
  textDiv.className = "result-text";
  textDiv.textContent = text;
  card.appendChild(textDiv);
  card.appendChild(buildResultActions(text));

  styleResult.appendChild(card);
}

function buildResultActions(text) {
  const row = document.createElement("div");
  row.className = "result-actions";

  const listenBtn = document.createElement("button");
  listenBtn.className = "text-btn";
  listenBtn.textContent = "🔊 Listen";
  listenBtn.addEventListener("click", () => speakText(text, listenBtn));
  row.appendChild(listenBtn);

  const copyBtn = document.createElement("button");
  copyBtn.className = "text-btn";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => copyToClipboard(text, copyBtn));
  row.appendChild(copyBtn);

  return row;
}

// ---------- Helpers ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => (btn.textContent = original), 1500);
  });
}

// ---------- Read aloud ----------
let activeSpeakBtn = null;

function speakText(text, btn) {
  if (!("speechSynthesis" in window)) {
    alert("Sorry, read-aloud isn't supported on this device.");
    return;
  }
  if (!text) return;

  const wasActive = activeSpeakBtn === btn;
  window.speechSynthesis.cancel();
  if (activeSpeakBtn) {
    activeSpeakBtn.textContent = "🔊 Listen";
    activeSpeakBtn = null;
  }
  if (wasActive) return; // tapping the same button again just stops it

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.onend = utterance.onerror = () => {
    btn.textContent = "🔊 Listen";
    if (activeSpeakBtn === btn) activeSpeakBtn = null;
  };

  btn.textContent = "⏹ Stop";
  activeSpeakBtn = btn;
  window.speechSynthesis.speak(utterance);
}

document.getElementById("grammarListenBtn").addEventListener("click", (e) => {
  speakText(grammarInput.value.trim(), e.currentTarget);
});

document.getElementById("styleListenBtn").addEventListener("click", (e) => {
  speakText(styleInput.value.trim(), e.currentTarget);
});

// ---------- Offline support ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
