const API_BASE_URL = "http://127.0.0.1:8000";

// ==================== STORAGE & CONFIG ====================
const STORAGE_KEYS = {
  history: 'codeDebugHistory',
  theme: 'theme',
  autoAnalyze: 'autoAnalyze',
  defaultLanguage: 'defaultLanguage',
  autoSave: 'autoSave',
  showMetrics: 'showMetrics',
  lastCode: 'lastCode'
};

const Settings = {
  theme: localStorage.getItem(STORAGE_KEYS.theme) || 'dark',
  autoAnalyze: localStorage.getItem(STORAGE_KEYS.autoAnalyze) === 'true',
  defaultLanguage: localStorage.getItem(STORAGE_KEYS.defaultLanguage) || 'Python',
  autoSave: localStorage.getItem(STORAGE_KEYS.autoSave) !== 'false',
  showMetrics: localStorage.getItem(STORAGE_KEYS.showMetrics) !== 'false'
};

// ==================== DOM ELEMENTS ====================
const analyzeBtn = document.getElementById("analyze-btn");
const languageSelect = document.getElementById("language");
const codeInput = document.getElementById("code-input");
const lineNumbers = document.getElementById("line-numbers");
const statusBox = document.getElementById("status");
const bugsTableBody = document.querySelector("#bugs-table tbody");
const explanationBox = document.getElementById("explanation");
const fixedCodeBox = document.getElementById("fixed-code");
const optimizedCodeBox = document.getElementById("optimized-code");
const timeComplexity = document.getElementById("time-complexity");
const spaceComplexity = document.getElementById("space-complexity");
const testsList = document.getElementById("tests-list");

// New elements
const themeToggle = document.getElementById("theme-toggle");
const settingsBtn = document.getElementById("settings-btn");
const historyBtn = document.getElementById("history-btn");
const settingsPanel = document.getElementById("settings-panel");
const historyPanel = document.getElementById("history-panel");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const metricsSection = document.getElementById("metrics-section");
const autoAnalyzeCheckbox = document.getElementById("auto-analyze");
const defaultLanguageSelect = document.getElementById("default-language");
const autoSaveCheckbox = document.getElementById("auto-save");
const showMetricsCheckbox = document.getElementById("show-metrics");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// ==================== INITIALIZATION ====================
function initializeApp() {
  applyTheme(Settings.theme);
  
  if (Settings.defaultLanguage) {
    languageSelect.value = Settings.defaultLanguage;
    defaultLanguageSelect.value = Settings.defaultLanguage;
  }
  
  autoAnalyzeCheckbox.checked = Settings.autoAnalyze;
  autoSaveCheckbox.checked = Settings.autoSave;
  showMetricsCheckbox.checked = Settings.showMetrics;
  
  if (Settings.autoSave) {
    const lastCode = localStorage.getItem(STORAGE_KEYS.lastCode);
    if (lastCode) {
      codeInput.value = lastCode;
      updateLineNumbers();
      updateMetrics();
    }
  }
  
  metricsSection.style.display = Settings.showMetrics ? 'grid' : 'none';
  updateLineNumbers();
}

// ==================== THEME MANAGEMENT ====================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  Settings.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener("click", () => {
  const newTheme = Settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
});

// ==================== SETTINGS MANAGEMENT ====================
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
  historyPanel.classList.add("hidden");
});

document.getElementById("close-settings").addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

autoAnalyzeCheckbox.addEventListener("change", (e) => {
  Settings.autoAnalyze = e.target.checked;
  localStorage.setItem(STORAGE_KEYS.autoAnalyze, Settings.autoAnalyze);
});

autoSaveCheckbox.addEventListener("change", (e) => {
  Settings.autoSave = e.target.checked;
  localStorage.setItem(STORAGE_KEYS.autoSave, Settings.autoSave);
});

showMetricsCheckbox.addEventListener("change", (e) => {
  Settings.showMetrics = e.target.checked;
  localStorage.setItem(STORAGE_KEYS.showMetrics, Settings.showMetrics);
  metricsSection.style.display = Settings.showMetrics ? 'grid' : 'none';
});

defaultLanguageSelect.addEventListener("change", (e) => {
  Settings.defaultLanguage = e.target.value;
  localStorage.setItem(STORAGE_KEYS.defaultLanguage, Settings.defaultLanguage);
  languageSelect.value = Settings.defaultLanguage;
});

clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Clear all history? This cannot be undone.")) {
    localStorage.removeItem(STORAGE_KEYS.history);
    document.getElementById("history-list").innerHTML = '';
  }
});

// ==================== HISTORY MANAGEMENT ====================
function saveToHistory(language, code, result) {
  let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
  
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString(),
    language,
    code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
    fullCode: code,
    bugCount: result.bugs?.length || 0
  };
  
  history.unshift(entry);
  history = history.slice(0, 20);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  updateHistoryUI();
}

function updateHistoryUI() {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
  const historyList = document.getElementById("history-list");
  
  if (history.length === 0) {
    historyList.innerHTML = '<p style="color: #888;">No history yet</p>';
    return;
  }
  
  historyList.innerHTML = history.map(entry => `
    <div class="history-item" data-id="${entry.id}">
      <div class="history-meta">
        <strong>${entry.language}</strong>
        <span class="history-time">${entry.timestamp}</span>
        <span class="history-bugs">${entry.bugCount} bugs</span>
      </div>
      <div class="history-code">${entry.code}</div>
      <button class="history-load-btn" data-code="${entry.id}">Load</button>
    </div>
  `).join('');
  
  document.querySelectorAll('.history-load-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.getAttribute('data-code'));
      const entry = history.find(h => h.id === id);
      if (entry) {
        codeInput.value = entry.fullCode;
        languageSelect.value = entry.language;
        updateLineNumbers();
        updateMetrics();
        settingsPanel.classList.add("hidden");
        historyPanel.classList.add("hidden");
      }
    });
  });
}

historyBtn.addEventListener("click", () => {
  historyPanel.classList.toggle("hidden");
  settingsPanel.classList.add("hidden");
  updateHistoryUI();
});

document.getElementById("close-history").addEventListener("click", () => {
  historyPanel.classList.add("hidden");
});

// ==================== CODE METRICS ====================
function updateMetrics() {
  const code = codeInput.value;
  const lines = code.split('\n').length;
  const chars = code.length;
  const funcs = (code.match(/function|def|const.*=.*=>|\w+\s*\(/g) || []).length;
  
  const loops = (code.match(/for|while|foreach/gi) || []).length;
  const conditions = (code.match(/if|else|switch|case/gi) || []).length;
  const complexity = loops + conditions;
  let complexityLabel = 'Low';
  if (complexity > 10) complexityLabel = 'High';
  else if (complexity > 5) complexityLabel = 'Medium';
  
  document.getElementById('metric-loc').textContent = lines;
  document.getElementById('metric-chars').textContent = chars;
  document.getElementById('metric-funcs').textContent = funcs;
  document.getElementById('metric-complexity').textContent = complexityLabel;
}

// ==================== DEBOUNCE & LINE NUMBERS ====================
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function updateLineNumbers() {
  const lines = codeInput.value.split("\n").length;
  const fragment = document.createDocumentFragment();
  
  for (let i = 1; i <= lines; i++) {
    const lineNum = document.createElement("div");
    lineNum.textContent = i;
    fragment.appendChild(lineNum);
  }
  
  lineNumbers.innerHTML = "";
  lineNumbers.appendChild(fragment);
}

const debouncedLineUpdate = debounce(updateLineNumbers, 100);
const debouncedMetricsUpdate = debounce(updateMetrics, 200);
const debouncedAutoAnalyze = debounce(() => {
  if (Settings.autoAnalyze && codeInput.value.trim()) {
    analyzeCode();
  }
}, 1500);

function syncScroll() {
  lineNumbers.scrollTop = codeInput.scrollTop;
}

codeInput.addEventListener("input", () => {
  debouncedLineUpdate();
  debouncedMetricsUpdate();
  debouncedAutoAnalyze();
  
  if (Settings.autoSave) {
    localStorage.setItem(STORAGE_KEYS.lastCode, codeInput.value);
  }
});

codeInput.addEventListener("scroll", syncScroll);
codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    codeInput.value = codeInput.value.substring(0, start) + "  " + codeInput.value.substring(end);
    codeInput.selectionStart = codeInput.selectionEnd = start + 2;
    updateLineNumbers();
  }
});

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    analyzeCode();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    clearCode();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
    e.preventDefault();
    themeToggle.click();
  }
});

// ==================== CLEAR CODE ====================
function clearCode() {
  codeInput.value = '';
  updateLineNumbers();
  updateMetrics();
  clearResults();
}

clearBtn.addEventListener("click", clearCode);

// ==================== EXPORT RESULTS ====================
function exportResults(format) {
  const results = {
    language: languageSelect.value,
    code: codeInput.value,
    timestamp: new Date().toISOString(),
    complexity: {
      time: timeComplexity.textContent,
      space: spaceComplexity.textContent
    }
  };
  
  if (format === 'json') {
    const dataStr = JSON.stringify(results, null, 2);
    downloadFile(dataStr, 'code-analysis.json', 'application/json');
  } else if (format === 'markdown') {
    const md = generateMarkdownReport(results);
    downloadFile(md, 'code-analysis.md', 'text/markdown');
  }
}

function generateMarkdownReport(results) {
  return `# Code Analysis Report
  
**Language:** ${results.language}
**Date:** ${new Date(results.timestamp).toLocaleString()}

## Original Code
\`\`\`${results.language.toLowerCase()}
${results.code}
\`\`\`

## Complexity
- **Time:** ${results.complexity.time}
- **Space:** ${results.complexity.space}

---
Generated by AI Code Debug Playground
`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", () => {
  const format = prompt("Export as: 'json' or 'markdown'?", "json");
  if (format === 'json' || format === 'markdown') {
    exportResults(format);
  }
});

// ==================== STATUS MESSAGES ====================
function setStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = "status " + type;
  statusBox.classList.remove("hidden");
}

function clearStatus() {
  statusBox.classList.add("hidden");
}

function clearResults() {
  bugsTableBody.innerHTML = "";
  explanationBox.textContent = "";
  fixedCodeBox.textContent = "";
  optimizedCodeBox.textContent = "";
  timeComplexity.textContent = "";
  spaceComplexity.textContent = "";
  testsList.innerHTML = "";
}

// ==================== TYPE COLORS ====================
const TYPE_COLORS = {
  "Syntax": "#ff6b6b",
  "Logic": "#ffd93d",
  "Performance": "#6bcf7f",
  "Style": "#a78bfa",
  "Other": "#888888"
};

// ==================== CODE ANALYSIS ====================
async function analyzeCode() {
  const language = languageSelect.value;
  const code = codeInput.value.trim();

  if (!code) {
    setStatus("Please enter some code before analyzing.", "error");
    return;
  }

  analyzeBtn.disabled = true;
  clearResults();
  setStatus("Analyzing code, please wait...", "info");

  try {
    const res = await fetch(API_BASE_URL + "/api/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    if (!data) {
      throw new Error("No response data received");
    }

    clearStatus();
    setStatus(data.message || "Analysis complete.", "info");
    
    saveToHistory(language, code, data);

    const bugsFragment = document.createDocumentFragment();
    const testsFragment = document.createDocumentFragment();

    if (data.bugs && data.bugs.length > 0) {
      for (let i = 0; i < data.bugs.length; i++) {
        const bug = data.bugs[i];
        const tr = document.createElement("tr");

        const tdLine = document.createElement("td");
        if (bug.line !== null && bug.line !== undefined) {
          tdLine.textContent = bug.line;
          tdLine.style.fontWeight = "600";
        } else {
          const lineMatch = bug.message.match(/line\s+(\d+)/i) || bug.message.match(/\b(\d+)\s*(?:line|ln)/i);
          tdLine.textContent = lineMatch ? lineMatch[1] : "-";
          tdLine.style.opacity = lineMatch ? "1" : "0.5";
        }

        const tdType = document.createElement("td");
        tdType.textContent = bug.type || "Info";
        tdType.style.color = TYPE_COLORS[bug.type] || "#888888";

        const tdMsg = document.createElement("td");
        tdMsg.textContent = bug.message || "";

        const tdDetails = document.createElement("td");
        const detailsBtn = document.createElement("button");
        detailsBtn.className = "details-btn";
        detailsBtn.textContent = "ℹ️";
        tdDetails.appendChild(detailsBtn);

        tr.appendChild(tdLine);
        tr.appendChild(tdType);
        tr.appendChild(tdMsg);
        tr.appendChild(tdDetails);
        bugsFragment.appendChild(tr);
      }
    } else {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No bugs detected.";
      td.style.textAlign = "center";
      td.style.color = "#888888";
      tr.appendChild(td);
      bugsFragment.appendChild(tr);
    }

    bugsTableBody.appendChild(bugsFragment);

    if (data.explanation) explanationBox.textContent = data.explanation;
    if (data.fixed_code) {
      fixedCodeBox.textContent = data.fixed_code;
      if (hljs) hljs.highlightElement(fixedCodeBox);
    }
    if (data.optimized_code) {
      optimizedCodeBox.textContent = data.optimized_code;
      if (hljs) hljs.highlightElement(optimizedCodeBox);
    }

    if (data.complexity) {
      if (data.complexity.time) timeComplexity.textContent = data.complexity.time;
      if (data.complexity.space) spaceComplexity.textContent = data.complexity.space;
    }

    if (data.tests && Array.isArray(data.tests)) {
      for (let i = 0; i < data.tests.length; i++) {
        const t = data.tests[i];
        const li = document.createElement("li");
        li.textContent = t.description + " | input: " + t.input + " | expected: " + t.expected_output;
        testsFragment.appendChild(li);
      }
      testsList.appendChild(testsFragment);
    }

  } catch (error) {
    console.error("API Error:", error);
    setStatus("Error: " + error.message, "error");
  } finally {
    analyzeBtn.disabled = false;
  }
}

analyzeBtn.addEventListener("click", analyzeCode);

// ==================== COPY BUTTONS ====================
document.querySelectorAll(".copy-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    const targetId = this.getAttribute("data-target");
    const targetElement = document.getElementById(targetId);
    const textToCopy = targetElement.textContent;
    
    if (!textToCopy) return;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = this.textContent;
      this.textContent = "✓ Copied!";
      this.classList.add("copied");
      
      setTimeout(() => {
        this.textContent = originalText;
        this.classList.remove("copied");
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  });
});

// ==================== DIFF VIEW ====================
document.querySelectorAll(".diff-toggle-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    const target = this.getAttribute("data-target");
    const codeEl = document.getElementById(target === 'fixed' ? 'fixed-code' : 'optimized-code');
    const diffEl = document.getElementById(target + '-diff');
    
    diffEl.classList.toggle("hidden");
    
    if (!diffEl.classList.contains("hidden")) {
      const originalCode = codeInput.value;
      const fixedCode = codeEl.textContent;
      diffEl.innerHTML = generateDiffView(originalCode, fixedCode);
    }
  });
});

function generateDiffView(original, fixed) {
  const origLines = original.split('\n');
  const fixedLines = fixed.split('\n');
  
  let html = '<div class="diff-container">';
  const maxLines = Math.max(origLines.length, fixedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = origLines[i] || '';
    const fixedLine = fixedLines[i] || '';
    
    if (origLine !== fixedLine) {
      if (origLine) html += `<div class="diff-line diff-removed">- ${escapeHtml(origLine)}</div>`;
      if (fixedLine) html += `<div class="diff-line diff-added">+ ${escapeHtml(fixedLine)}</div>`;
    } else if (origLine) {
      html += `<div class="diff-line diff-neutral">  ${escapeHtml(origLine)}</div>`;
    }
  }
  
  html += '</div>';
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== INITIALIZATION ====================
initializeApp();
updateLineNumbers();
updateMetrics();
