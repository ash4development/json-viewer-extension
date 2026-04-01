# JSON Vault — Chrome Extension

A professional JSON viewer with inline editing, JSONPath/jq search, structural diff, schema validation, and high-performance virtual rendering.

---

## Features

| Feature | Details |
|---------|---------|
| **Inline editing** | Click any value to edit. Double-click keys to rename. Add/delete fields. 50-step undo/redo. |
| **Search** | Text search with match highlighting, JSONPath expressions (`$.users[?(@.age>18)].name`), jq-lite (`\| map(.name) \| sort`) |
| **Diff / Compare** | Split-pane structural diff. Drop a .json file or paste JSON. Green/red/amber highlighting. |
| **Schema validation** | Paste JSON Schema (draft-07) or fetch from URL. Inline error badges on invalid nodes. |
| **Virtual rendering** | Only renders visible nodes. Handles 50MB+ files and 500k+ nodes without freezing. |
| **Themes** | Dark, light, system — persisted per browser. |

---

## Installation (Developer / Unpacked)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle, top right)
3. Click **Load unpacked**
4. Select the `json-viewer-extension/` folder
5. Navigate to any URL that returns JSON (e.g. a REST API endpoint) — the extension activates automatically

---

## How it activates

The content script checks `document.contentType`. It only runs on pages where the browser has identified the response as `application/json` or `text/json`. Regular web pages are completely unaffected.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus search bar |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Download JSON |
| `Escape` | Close search results / cancel edit |

---

## File structure

```
json-viewer-extension/
├── manifest.json          ← Extension manifest (MV3)
├── background.js          ← Service worker
├── content/
│   ├── content.js         ← Detects JSON pages, bootstraps app
│   └── content.css        ← All UI styles
├── ui/
│   ├── app.js             ← Main orchestrator
│   ├── model.js           ← In-memory JSON model + undo stack
│   ├── tree.js            ← Virtualised tree renderer
│   ├── diff.js            ← Structural diff engine
│   ├── search.js          ← Text search, JSONPath, jq-lite
│   └── validator.js       ← JSON Schema validation (draft-07)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Architecture notes

All modules are vanilla ES modules — no bundler required. The extension loads them directly via `<script type="module">`. This keeps the codebase simple and debuggable without a build step.

The model layer (`model.js`) is the single source of truth. Both the tree view and raw view read from it and write to it — they never read from each other. This is what makes editing in one view automatically update the other.

---

## Publishing to the Chrome Web Store

1. Zip the entire `json-viewer-extension/` folder
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer registration fee
4. Click **Add new item**, upload the zip
5. Fill in the store listing (description, screenshots, category: **Developer Tools**)
6. Submit for review (typically 1–3 business days)

---

## Porting to Firefox

The WebExtensions API used here is largely compatible with Firefox. To port:

1. Change `manifest.json` — replace `"background": { "service_worker": "background.js" }` with `"background": { "scripts": ["background.js"] }`
2. Replace all `chrome.*` calls with `browser.*` (or add a polyfill)
3. Submit to [Firefox Add-ons (AMO)](https://addons.mozilla.org/developers/)
