// app.js — Main orchestrator

import { JSONModel } from './model.js';
import { TreeView } from './tree.js';
import { diffJSON, buildDiffMap, diffStats } from './diff.js';
import { textSearch, jsonPath, jqLite } from './search.js';
import { validate } from './validator.js';

// ── Icons ───────────────────────────────────────────
const ICONS = {
  tree: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h3v2H2V2zm0 5h3v2H2V7zm0 5h3v2H2v-2zm4-9h8v2H6V3zm0 5h8v2H6V8zm0 5h8v2H6v-2z"/></svg>`,
  raw: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 012.5 2h11A1.5 1.5 0 0115 3.5v9A1.5 1.5 0 0113.5 14h-11A1.5 1.5 0 011 12.5v-9zm1.5-.5a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-11zm1 2a.5.5 0 01.5-.5h2a.5.5 0 010 1H4a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h6a.5.5 0 010 1H4a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h4a.5.5 0 010 1H4a.5.5 0 01-.5-.5z"/></svg>`,
  diff: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 4h14v1H1zm2-2h10v1H3zm0 4h4v1H3zm6 0h4v1H9zM3 8h4v1H3zm6 0h4v1H9zm-6 2h4v1H3zm6 0h4v1H9zm-6 2h4v1H3zm6 0h4v1H9z"/></svg>`,
  copy: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10 2H4a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2zm0 10H4V4h6v8zm2-10v1h1v8h-1v1h1a2 2 0 002-2V4a2 2 0 00-2-2h-1z"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.47 10.78a.75.75 0 001.06 0l3.25-3.25a.75.75 0 00-1.06-1.06L8.75 8.44V2.75a.75.75 0 00-1.5 0v5.69L5.28 6.47a.75.75 0 00-1.06 1.06l3.25 3.25zM2.5 13.25a.75.75 0 000 1.5h11a.75.75 0 000-1.5h-11z"/></svg>`,
  validate: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.78 5.28l-4.5 4.5a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.75 9.19l3.97-3.97a.75.75 0 111.06 1.06z"/></svg>`,
  undo: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 3.5h5a.75.75 0 010 1.5h-5a.75.75 0 010-1.5zm0 3.5h3a.75.75 0 010 1.5h-3A.75.75 0 011.75 7zM3 1.5a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 12.5h10a1.5 1.5 0 001.5-1.5V3a1.5 1.5 0 00-1.5-1.5H3zm0-1.5h10A3 3 0 0116 3v8a3 3 0 01-3 3H3a3 3 0 01-3-3V3a3 3 0 013-3z"/></svg>`,
  redo: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.25 3.5h-5a.75.75 0 010-1.5h5a.75.75 0 010 1.5zm0 3.5h-3a.75.75 0 010-1.5h3a.75.75 0 010 1.5zM1 1.5A1.5 1.5 0 012.5 0h11A1.5 1.5 0 0115 1.5v8A1.5 1.5 0 0113.5 11h-11A1.5 1.5 0 011 9.5v-8z"/></svg>`,
  sun: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 11a3 3 0 110-6 3 3 0 010 6zm0-8a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1A.75.75 0 018 3zm0 9a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1A.75.75 0 018 12zM3 8a.75.75 0 01-.75.75h-1a.75.75 0 010-1.5h1A.75.75 0 013 8zm10 0a.75.75 0 01-.75.75h-1a.75.75 0 010-1.5h1A.75.75 0 0113 8z"/></svg>`,
  collapse: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>`,
  expand: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3.5a.75.75 0 01.75.75v2h2a.75.75 0 010 1.5h-2v2a.75.75 0 01-1.5 0v-2h-2a.75.75 0 010-1.5h2v-2A.75.75 0 018 4.5z"/></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>`,
};

// ── App ─────────────────────────────────────────────
export class App {
  constructor() {
    const dataNode = document.getElementById('jv-data');
    this._raw = dataNode ? dataNode.textContent : (window.__JV_RAW__ || '');
    this._model = new JSONModel(this._raw);
    this._view = 'tree'; // tree | raw | diff
    this._searchMode = 'text'; // text | jsonpath | jq
    this._caseSensitive = false;
    this._sidebarOpen = false;
    this._schema = null;
    this._theme = 'dark';
    this._treeView = null;
    this._diffTreeR = null;
    this._diffModel = null;
    this._diffs = [];
    this._rawCache = null;
    this._searchDebounce = null;

    this._loadTheme().then(() => {
      this._buildUI();
      this._attachKeyboard();
      if (!this._model.valid) {
        this._showParseError();
      } else {
        this._initTreeView();
      }
    });
  }

  async _loadTheme() {
    try {
      const stored = await chrome.storage.sync.get('theme');
      this._theme = stored.theme || 'dark';
      this._applyTheme(this._theme);
    } catch {
      this._applyTheme('dark');
    }
  }

  _applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    }
    this._theme = theme;
  }

  // ── UI Construction ──────────────────────────────
  _buildUI() {
    const app = document.getElementById('jv-app');
    app.innerHTML = `
      ${this._buildToolbar()}
      <div id="jv-breadcrumb"></div>
      <div id="jv-main">
        <div id="jv-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;">
          <div id="jv-tree-panel" class="jv-panel"></div>
          <div id="jv-raw-panel" class="jv-panel hidden">
            <textarea id="jv-raw-textarea" spellcheck="false"></textarea>
            <div id="jv-raw-status" class="ok">Valid JSON</div>
          </div>
          <div id="jv-diff-panel" class="jv-panel hidden">
            ${this._buildDiffPanel()}
          </div>
          <div id="jv-search-results" class="hidden"></div>
        </div>
        <div id="jv-sidebar" class="hidden">
          ${this._buildSidebar()}
        </div>
      </div>
      <div id="jv-toasts"></div>
    `;

    this._wireToolbar();
    this._wireSidebar();
    this._wireDiff();
    this._wireRaw();
  }

  _buildToolbar() {
    return `
    <div id="jv-toolbar">
      <div id="jv-logo">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="6" fill="#5b8af0"/>
          <path d="M6 7h2v8H6zm4 0h2l2 4-2 4h-2l2-4-2-4zm4 0h2v8h-2z" fill="white" opacity="0.9"/>
        </svg>
        <span id="jv-logo-text">JSON Vault</span>
      </div>

      <div class="jv-sep"></div>

      <div id="jv-view-tabs">
        <button class="jv-tab active" data-view="tree">${ICONS.tree} Tree</button>
        <button class="jv-tab" data-view="raw">${ICONS.raw} Raw</button>
        <button class="jv-tab" data-view="diff">${ICONS.diff} Compare</button>
      </div>

      <div class="jv-sep"></div>

      <div id="jv-search-wrap">
        <div id="jv-search-mode">
          <button class="jv-mode-btn active" data-mode="text">Text</button>
          <button class="jv-mode-btn" data-mode="jsonpath">$.path</button>
          <button class="jv-mode-btn" data-mode="jq">jq</button>
        </div>
        <input id="jv-search-input" type="text" placeholder="Search JSON..." autocomplete="off"/>
        <div id="jv-search-opts">
          <button class="jv-opt-btn" id="jv-case-btn" title="Case sensitive">Aa</button>
          <span id="jv-match-count"></span>
        </div>
      </div>

      <div class="jv-sep"></div>

      <div id="jv-toolbar-right">
        <span id="jv-node-count"></span>
        <button class="jv-btn jv-btn-icon" id="jv-collapse-btn" title="Collapse all">${ICONS.collapse}</button>
        <button class="jv-btn jv-btn-icon" id="jv-expand-btn" title="Expand all">${ICONS.expand}</button>
        <button class="jv-btn jv-btn-icon" id="jv-undo-btn" title="Undo (Ctrl+Z)">${ICONS.undo}</button>
        <button class="jv-btn jv-btn-icon" id="jv-redo-btn" title="Redo (Ctrl+Shift+Z)">${ICONS.redo}</button>
        <div class="jv-sep"></div>
        <button class="jv-btn" id="jv-validate-open-btn">${ICONS.validate} Validate</button>
        <button class="jv-btn jv-btn-icon" id="jv-copy-btn" title="Copy JSON">${ICONS.copy}</button>
        <button class="jv-btn jv-btn-icon" id="jv-download-btn" title="Download JSON">${ICONS.download}</button>
        <button class="jv-btn jv-btn-icon" id="jv-theme-btn" title="Toggle theme">${ICONS.sun}</button>
      </div>
    </div>`;
  }

  _buildDiffPanel() {
    return `
      <div id="jv-diff-summary">
        <div class="jv-diff-stat added"><div class="dot"></div><strong id="ds-add">0</strong><span>additions</span></div>
        <div class="jv-diff-stat removed"><div class="dot"></div><strong id="ds-rem">0</strong><span>deletions</span></div>
        <div class="jv-diff-stat changed"><div class="dot"></div><strong id="ds-chg">0</strong><span>modifications</span></div>
        <button class="jv-btn" id="jv-diff-copy-btn" style="margin-left:auto">${ICONS.copy} Copy diff</button>
      </div>
      <div id="jv-diff-panes">
        <div class="jv-diff-pane" id="jv-diff-left" style="display:flex;flex-direction:column;">
          <div class="jv-diff-pane-header">
            <span>Current JSON</span>
          </div>
          <div id="jv-diff-tree-l" style="flex:1;overflow:auto;"></div>
        </div>
        <div class="jv-diff-pane" id="jv-diff-right" style="display:flex;flex-direction:column;">
          <div class="jv-diff-pane-header">
            <span>Compare with...</span>
            <button class="jv-btn" id="jv-diff-clear-btn" style="font-size:11px;height:24px;padding:0 8px;">Clear</button>
          </div>
          <div id="jv-diff-drop">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v12m-4-4l4 4 4-4"/><path d="M4 20h16"/></svg>
            <textarea id="jv-diff-paste-area" placeholder='Paste JSON here...' spellcheck="false" wrap="off" style="white-space:pre"></textarea>
          </div>
          <div id="jv-diff-tree-r" style="flex:1;overflow:auto;display:none;"></div>
        </div>
      </div>`;
  }

  _buildSidebar() {
    return `
      <div id="jv-sidebar-header">
        <h3>${ICONS.validate} Schema Validation</h3>
        <button class="jv-btn jv-btn-icon" id="jv-sidebar-close">${ICONS.close}</button>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid var(--line);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:11px;color:var(--text2);">Paste JSON Schema (draft-07)</div>
          <button id="jv-clear-schema" style="background:transparent;border:none;color:var(--accent);font-size:10px;cursor:pointer;padding:0;font-family:var(--sans);font-weight:500;">Clear</button>
        </div>
        <textarea id="jv-schema-area" placeholder='{"type":"object","required":["id"],...}' spellcheck="false" wrap="off"></textarea>
      </div>
      <div id="jv-schema-url-wrap">
        <input id="jv-schema-url" placeholder="Or fetch schema from URL..."/>
        <button id="jv-fetch-schema-btn" class="jv-btn" style="height:30px;font-size:11px;">Fetch</button>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid var(--line);display:flex;gap:8px;">
        <button id="jv-validate-btn" style="flex:2;height:34px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-size:13px;font-weight:500;font-family:var(--sans);cursor:pointer;">Run Validation</button>
        <button id="jv-clear-errors" style="flex:1;height:34px;background:var(--bg2);color:var(--text2);border:1px solid var(--line);border-radius:var(--radius);font-size:11px;font-family:var(--sans);cursor:pointer;">Clear Results</button>
      </div>
      <div id="jv-validation-results">
        <div class="jv-val-empty">Paste a schema above and click Run Validation</div>
      </div>`;
  }

  // ── Wire toolbar events ──
  _wireToolbar() {
    // View tabs
    document.querySelectorAll('.jv-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchView(tab.dataset.view));
    });

    // Search modes
    document.querySelectorAll('.jv-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.jv-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._searchMode = btn.dataset.mode;
        const input = document.getElementById('jv-search-input');
        input.placeholder = {
          text: 'Search keys and values...',
          jsonpath: '$.users[?(@.age>18)].name',
          jq: '.users | map(.name) | sort'
        }[this._searchMode];
        if (input.value) this._runSearch(input.value);
      });
    });

    // Search input
    const searchInput = document.getElementById('jv-search-input');
    searchInput.addEventListener('input', e => {
      clearTimeout(this._searchDebounce);
      this._searchDebounce = setTimeout(() => this._runSearch(e.target.value), 200);
    });
    searchInput.addEventListener('focus', e => {
      if (e.target.value.trim()) {
        const resultsEl = document.getElementById('jv-search-results');
        if (resultsEl.innerHTML.trim() !== '') {
          resultsEl.classList.remove('hidden');
        }
      }
    });

    // Case sensitive
    document.getElementById('jv-case-btn').addEventListener('click', e => {
      this._caseSensitive = !this._caseSensitive;
      e.currentTarget.classList.toggle('active', this._caseSensitive);
      const q = searchInput.value;
      if (q) this._runSearch(q);
    });

    // Collapse / expand
    document.getElementById('jv-collapse-btn').addEventListener('click', () => {
      if (this._view === 'diff') {
        this._diffTreeL?.collapseAll();
        this._diffTreeR?.collapseAll();
      } else {
        this._treeView?.collapseAll();
      }
    });

    document.getElementById('jv-expand-btn').addEventListener('click', () => {
      if (this._view === 'diff') {
        this._diffTreeL?.expandAll();
        this._diffTreeR?.expandAll();
      } else {
        this._treeView?.expandAll();
      }
    });

    // Undo / redo
    document.getElementById('jv-undo-btn').addEventListener('click', () => { this._model.undo(); this._onModelChange(); });
    document.getElementById('jv-redo-btn').addEventListener('click', () => { this._model.redo(); this._onModelChange(); });

    // Copy
    document.getElementById('jv-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(this._model.toJSON());
      this._toast('Copied to clipboard', 'success');
    });

    // Download
    document.getElementById('jv-download-btn').addEventListener('click', () => this._download());

    // Theme
    document.getElementById('jv-theme-btn').addEventListener('click', () => {
      const next = { dark: 'light', light: 'system', system: 'dark' }[this._theme] || 'dark';
      this._applyTheme(next);
      chrome.storage.sync.set({ theme: next }).catch(() => { });
    });

    // Validate sidebar
    document.getElementById('jv-validate-open-btn').addEventListener('click', () => this._toggleSidebar());

    // Diff buttons (static)
    document.getElementById('jv-diff-clear-btn').addEventListener('click', () => {
      const paste = document.getElementById('jv-diff-paste-area');
      if (paste) paste.value = '';
      document.getElementById('jv-diff-tree-r').style.display = 'none';
      document.getElementById('jv-diff-drop').style.display = 'flex';
      this._updateDiffStats({ added: 0, removed: 0, changed: 0 });
      if (this._diffTreeL) this._diffTreeL.clearDiff();
    });

    document.getElementById('jv-diff-copy-btn').addEventListener('click', () => {
      if (!this._diffs || this._diffs.length === 0) {
        navigator.clipboard.writeText('No differences found.');
        this._toast('No diffs to copy', 'success');
        return;
      }

      let patch = '';
      for (const d of this._diffs) {
        const path = d.pathB ? '$.' + d.pathB.join('.') : (d.pathA ? '$.' + d.pathA.join('.') : '$');
        const oldStr = d.oldVal !== undefined ? JSON.stringify(d.oldVal) : '';
        const newStr = d.newVal !== undefined ? JSON.stringify(d.newVal) : '';

        if (d.type === 'add') {
          patch += `+ ${path} = ${newStr}\n`;
        } else if (d.type === 'remove') {
          patch += `- ${path} = ${oldStr}\n`;
        } else {
          patch += `~ ${path} : ${oldStr} => ${newStr}\n`;
        }
      }

      navigator.clipboard.writeText(patch);
      this._toast('Git-style diff copied', 'success');
    });
  }

  _wireSidebar() {
    document.getElementById('jv-sidebar-close').addEventListener('click', () => this._toggleSidebar(false));
    document.getElementById('jv-validate-btn').addEventListener('click', () => this._runValidation());
    document.getElementById('jv-fetch-schema-btn').addEventListener('click', () => this._fetchSchema());
    document.getElementById('jv-clear-schema').addEventListener('click', () => {
      document.getElementById('jv-schema-area').value = '';
    });
    document.getElementById('jv-clear-errors').addEventListener('click', () => {
      this._treeView?.clearErrors();
      document.getElementById('jv-validation-results').innerHTML = '<div class="jv-val-empty">Paste a schema above and click Run Validation</div>';
    });
  }

  _wireDiff() {
    const drop = document.getElementById('jv-diff-drop');
    const paste = document.getElementById('jv-diff-paste-area');

    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => this._invokeDiffWorker(ev.target.result);
        reader.readAsText(file);
      }
    });

    paste.addEventListener('input', () => {
      clearTimeout(this._diffDebounce);
      this._diffDebounce = setTimeout(() => {
        if (paste.value.trim()) this._invokeDiffWorker(paste.value);
      }, 400);
    });
  }

  _wireRaw() {
    const ta = document.getElementById('jv-raw-textarea');
    ta.addEventListener('input', () => {
      clearTimeout(this._rawDebounce);
      this._rawDebounce = setTimeout(() => {
        const ok = this._model.updateFromRaw(ta.value);
        const status = document.getElementById('jv-raw-status');
        status.textContent = ok ? 'Valid JSON' : 'Invalid JSON — edits will not sync until valid';
        status.className = ok ? 'ok' : 'error';
      }, 300);
    });
  }

  // ── Views ──────────────────────────────────────────
  _switchView(view) {
    this._view = view;
    document.querySelectorAll('.jv-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    document.getElementById('jv-tree-panel')?.classList.toggle('hidden', view !== 'tree');
    document.getElementById('jv-raw-panel')?.classList.toggle('hidden', view !== 'raw');
    document.getElementById('jv-diff-panel')?.classList.toggle('hidden', view !== 'diff');

    if (view === 'raw') {
      const ta = document.getElementById('jv-raw-textarea');
      if (ta) {
        if (this._rawCache === null) this._rawCache = this._model.toJSON();
        ta.value = this._rawCache;
      }
    }
    if (view === 'diff' && !this._diffTreeL && document.getElementById('jv-diff-tree-l')) {
      const container = document.getElementById('jv-diff-tree-l');
      container.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:12px;display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Preparing structural elements...</div>';
      setTimeout(() => {
        container.innerHTML = '';
        this._initDiffLeft();
      }, 30);
    }
    this._updateBreadcrumb([]);
  }

  _initTreeView() {
    const panel = document.getElementById('jv-tree-panel');
    this._treeView = new TreeView(panel, this._model, {
      onToast: (msg, type) => this._toast(msg, type),
      onRefresh: (count) => this._updateNodeCount(count),
    });
    this._updateNodeCount(this._treeView.nodeCount);
    this._model.on('change', () => this._onModelChange());
    this._model.on('raw-change', () => {
      if (this._view === 'tree') this._treeView?.refresh();
    });
  }

  _initDiffLeft() {
    const container = document.getElementById('jv-diff-tree-l');
    this._diffTreeL = new TreeView(container, this._model, {
      onToast: (msg, type) => this._toast(msg, type),
    });
  }

  _invokeDiffWorker(jsonText) {
    if (!this._model.valid) {
      this._toast('Compare requires a valid Base JSON', 'error');
      return;
    }

    const drop = document.getElementById('jv-diff-drop');
    const treeR = document.getElementById('jv-diff-tree-r');

    // Show loading indicator
    drop.style.display = 'flex';
    drop.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>Processing diff...</span>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;
    treeR.style.display = 'none';

    // Yield to browser paint pipeline for the spinner
    setTimeout(() => {
      try {
        const rightData = JSON.parse(jsonText);
        const diffs = diffJSON(this._model.data, rightData);
        const stats = diffStats(diffs);
        const diffMap = buildDiffMap(diffs);

        this._diffModel = rightData;
        this._diffs = diffs;

        drop.style.display = 'none';
        treeR.style.display = 'block';

        // Show a loading indicator temporarily while the DOM constructs natively
        treeR.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:12px;display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Rendering tree view...</div>';

        setTimeout(() => {
          treeR.innerHTML = '';
          const rightModel = new JSONModel(this._diffModel);
          this._diffTreeR = new TreeView(treeR, rightModel, {
            onToast: (msg, type) => this._toast(msg, type),
          });

          this._updateDiffStats(stats);

          const leftMap = new Map();
          const rightMap = new Map();
          for (const d of diffs) {
            if (d.type === 'add') {
              if (d.pathStrB !== undefined) rightMap.set(d.pathStrB, 'add');
            } else if (d.type === 'remove') {
              if (d.pathStrA !== undefined) leftMap.set(d.pathStrA, 'remove');
            } else if (d.type === 'change') {
              if (d.pathStrA !== undefined) leftMap.set(d.pathStrA, 'change');
              if (d.pathStrB !== undefined) rightMap.set(d.pathStrB, 'change');
            }
          }

          this._diffTreeL?.setDiff(leftMap);
          this._diffTreeR.setDiff(rightMap);

          // Deep surgical expansion for changed branches
          this._diffTreeL?.expandToDiffs(leftMap);
          this._diffTreeR?.expandToDiffs(rightMap);

          // Synchronize both panels to the root for a baseline start
          this._diffTreeL?.scrollToPath('');
          this._diffTreeR?.scrollToPath('');

          // Restore original drop zone so you can paste again if you hit Clear
          drop.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v12m-4-4l4 4 4-4"/><path d="M4 20h16"/></svg>
            <textarea id="jv-diff-paste-area" placeholder='Paste JSON here...' spellcheck="false" wrap="off" style="white-space:pre"></textarea>
          `;
          this._wireDiff();
        }, 30);

      } catch (err) {
        drop.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span style="color:var(--red)">Invalid JSON or Error</span>
          <textarea id="jv-diff-paste-area" placeholder='Paste JSON here...' spellcheck="false" wrap="off" style="white-space:pre"></textarea>
        `;
        this._wireDiff();
        this._toast('Error comparing JSON', 'error');
      }
    }, 50);
  }

  _updateDiffStats(stats) {
    document.getElementById('ds-add').textContent = stats.added;
    document.getElementById('ds-rem').textContent = stats.removed;
    document.getElementById('ds-chg').textContent = stats.changed;
  }

  // ── Search ────────────────────────────────────────
  _runSearch(query) {
    const resultsEl = document.getElementById('jv-search-results');
    const countEl = document.getElementById('jv-match-count');

    if (!query.trim() || !this._model.valid) {
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
      countEl.textContent = '';
      this._treeView?.clearMatches();
      return;
    }

    if (this._searchMode === 'text') {
      const results = textSearch(this._model.data, query, this._caseSensitive);
      countEl.textContent = `${results.length} match${results.length !== 1 ? 'es' : ''}`;
      this._treeView?.setMatches(results.map(r => r.pathStr));
      this._showSearchResults(results.slice(0, 50), query);
    } else if (this._searchMode === 'jsonpath') {
      const { results, error } = jsonPath(this._model.data, query);
      if (error) {
        countEl.textContent = 'Error';
        resultsEl.innerHTML = `<div style="padding:10px 20px;font-size:11px;color:var(--red);font-family:var(--mono)">${error}</div>`;
        resultsEl.classList.remove('hidden');
        return;
      }
      countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
      this._treeView?.setMatches(results.map(r => r.pathStr));
      this._showSearchResults(results.slice(0, 50), query);
    } else if (this._searchMode === 'jq') {
      const { result, error } = jqLite(this._model.data, query);
      countEl.textContent = error ? 'Error' : 'Result';
      if (error) {
        resultsEl.innerHTML = `<div style="padding:10px 20px;font-size:11px;color:var(--red);font-family:var(--mono)">${error}</div>`;
      } else {
        const formatted = JSON.stringify(result, null, 2);
        resultsEl.innerHTML = `<div style="padding:12px 20px;font-family:var(--mono);font-size:12px;color:var(--text0);white-space:pre-wrap;word-break:break-all;">${this._escapeHtml(formatted)}</div>`;
      }
      resultsEl.classList.remove('hidden');
    }
  }

  _showSearchResults(results, query) {
    const el = document.getElementById('jv-search-results');
    if (results.length === 0) {
      el.innerHTML = `<div style="padding:12px 20px;font-size:12px;color:var(--text3);">No matches</div>`;
      el.classList.remove('hidden');
      return;
    }

    el.innerHTML = results.map((r, i) => {
      const pathDisplay = r.path.length ? '$.' + r.path.join('.') : '$';
      const valStr = typeof r.value === 'object' ? (Array.isArray(r.value) ? '[…]' : '{…}') : JSON.stringify(r.value);
      return `<div class="jv-search-result" data-index="${i}">
        <span class="sr-path">${this._escapeHtml(pathDisplay)}</span>
        <span class="sr-val">${this._escapeHtml(valStr.slice(0, 60))}</span>
      </div>`;
    }).join('');

    el.querySelectorAll('.jv-search-result').forEach(item => {
      item.addEventListener('click', () => {
        const pathStr = results[parseInt(item.dataset.index, 10)].pathStr;
        this._switchView('tree');
        setTimeout(() => this._treeView?.scrollToPath(pathStr), 50);
        el.classList.add('hidden');
      });
    });

    el.classList.remove('hidden');
  }

  // ── Validation ────────────────────────────────────
  _toggleSidebar(force) {
    const sidebar = document.getElementById('jv-sidebar');
    this._sidebarOpen = force !== undefined ? force : !this._sidebarOpen;
    sidebar.classList.toggle('hidden', !this._sidebarOpen);
    document.getElementById('jv-validate-open-btn').classList.toggle('active', this._sidebarOpen);
  }

  async _fetchSchema() {
    const url = document.getElementById('jv-schema-url').value.trim();
    if (!url) return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      document.getElementById('jv-schema-area').value = text;
      this._toast('Schema loaded', 'success');
    } catch (e) {
      this._toast(`Could not fetch schema: ${e.message}. Try pasting it directly.`, 'error');
    }
  }

  _runValidation() {
    const schemaText = document.getElementById('jv-schema-area').value.trim();
    const resultsEl = document.getElementById('jv-validation-results');

    let schema;
    try {
      schema = JSON.parse(schemaText);
    } catch {
      this._toast('Invalid schema JSON', 'error');
      return;
    }

    const errors = validate(this._model.data, schema);
    this._treeView?.clearErrors();

    if (errors.length === 0) {
      resultsEl.innerHTML = `<div class="jv-val-ok"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><div style="margin-top:8px">All valid!</div></div>`;
      return;
    }

    resultsEl.innerHTML = errors.map(e => `
      <div class="jv-val-item" data-path="${this._escapeAttr(e.path)}">
        <div class="jv-val-path">${this._escapeHtml(e.pathDisplay)}</div>
        <div class="jv-val-msg">${this._escapeHtml(e.message)}</div>
      </div>
    `).join('');

    resultsEl.querySelectorAll('.jv-val-item').forEach(item => {
      item.addEventListener('click', () => {
        const pathStr = item.dataset.path;
        this._switchView('tree');
        setTimeout(() => this._treeView?.scrollToPath(pathStr), 50);
      });
    });

    this._treeView?.setErrors(errors);
    this._toast(`${errors.length} validation error${errors.length !== 1 ? 's' : ''}`, 'error');

    // Save schema for this host
    try {
      const host = location.hostname;
      chrome.storage.local.set({ [`schema:${host}`]: schemaText });
    } catch { }
  }

  // ── Utilities ──────────────────────────────────────
  _onModelChange() {
    this._rawCache = null;
    if (this._view === 'tree') this._treeView?.refresh();
    if (this._view === 'raw') {
      const ta = document.getElementById('jv-raw-textarea');
      if (ta) {
        this._rawCache = this._model.toJSON();
        ta.value = this._rawCache;
      }
    }
    this._updateBreadcrumb([]);
  }

  _updateNodeCount(count) {
    const el = document.getElementById('jv-node-count');
    if (el) el.textContent = `${count.toLocaleString()} nodes`;
  }

  _updateBreadcrumb(path) {
    const el = document.getElementById('jv-breadcrumb');
    if (!el) return;
    if (path.length === 0) {
      el.innerHTML = `<span>${location.pathname}</span>`;
      return;
    }
    const parts = ['$', ...path];
    el.innerHTML = parts.map((p, i) =>
      i < parts.length - 1
        ? `<span>${this._escapeHtml(String(p))}</span><span class="bc-sep">›</span>`
        : `<span>${this._escapeHtml(String(p))}</span>`
    ).join('');
  }

  _download() {
    const blob = new Blob([this._model.toJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (location.pathname.split('/').pop() || 'data') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  _toast(msg, type = '') {
    const container = document.getElementById('jv-toasts');
    const el = document.createElement('div');
    el.className = `jv-toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  _showParseError() {
    const content = document.getElementById('jv-content');
    content.innerHTML = `
      <div id="jv-parse-error">
        <h2>Invalid JSON</h2>
        <p>${this._escapeHtml(this._model.error || 'Could not parse response')}</p>
        <div style="margin-top:16px">
          <button class="jv-btn" onclick="document.getElementById('jv-raw-textarea').value=window.__JV_RAW__;document.getElementById('jv-view-tabs').querySelector('[data-view=raw]').click()">View raw content</button>
        </div>
      </div>
      <div id="jv-raw-panel" class="jv-panel hidden">
        <textarea id="jv-raw-textarea" spellcheck="false"></textarea>
        <div id="jv-raw-status" class="error">Invalid JSON</div>
      </div>
    `;
    this._wireRaw();
    document.getElementById('jv-raw-textarea').value = this._raw;
  }

  _attachKeyboard() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('jv-search-input').focus();
        return;
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        this._model.undo(); this._onModelChange();
      }
      if ((e.key === 'z' && e.shiftKey && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        this._model.redo(); this._onModelChange();
      }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this._download();
      }
      if (e.key === 'Escape') {
        document.getElementById('jv-search-results').classList.add('hidden');
      }
    });
  }

  _escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  _escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

// Boot if in non-test document
if (typeof document !== 'undefined' && document.getElementById('jv-app')) {
  new App();
}
