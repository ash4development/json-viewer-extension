(function () {
  'use strict';

  // Only activate on JSON pages
  const ct = document.contentType || '';
  const isJson = ct.includes('application/json') || ct.includes('text/json');
  if (!isJson) return;

  // Hide immediately to prevent FOUC
  const style = document.createElement('style');
  style.textContent = ':root { background-color: #0d1117; } body { display: none !important; }';
  document.documentElement.appendChild(style);

  function initApp() {
    // Grab raw text before browser mangles it
    const rawText = document.body?.textContent || document.documentElement.textContent || '';
    if (!rawText.trim()) {
      document.body.style.display = ''; // Restore if empty
      return;
    }

    // Clear the page
    document.documentElement.innerHTML = '';
    document.documentElement.style.cssText = 'margin:0;padding:0;height:100%;';

    // Inject CSS link
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = chrome.runtime.getURL('content/content.css');
    cssLink.onload = () => style.remove();
    cssLink.onerror = () => style.remove();
    document.head.appendChild(cssLink);

    // Google Fonts
    const gf = document.createElement('link');
    gf.rel = 'stylesheet';
    gf.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(gf);

    // Pass raw text to the app via a script tag (DOM based passing for isolated worlds)
    const dataNode = document.createElement('script');
    dataNode.id = 'jv-data';
    dataNode.type = 'text/plain';
    dataNode.textContent = rawText;
    document.head.appendChild(dataNode);

    // Mount point
    const app = document.createElement('div');
    app.id = 'jv-app';
    document.body.appendChild(app);

    // Load the main UI module
    const script = document.createElement('script');
    script.type = 'module';
    script.src = chrome.runtime.getURL('ui/app.js');
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
