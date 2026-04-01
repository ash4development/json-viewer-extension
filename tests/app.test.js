import { jest, expect } from '@jest/globals';
import { App } from '../ui/app.js';

// Mock chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({ theme: 'dark' }),
      set: jest.fn().mockResolvedValue()
    },
    local: {
      set: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    getURL: (path) => path
  }
};

describe('App Orchestrator', () => {
  let appEl;

  beforeEach(() => {
    // Setup minimal DOM required by App
    document.body.innerHTML = `
      <div id="jv-data">{"a": 1}</div>
      <div id="jv-app"></div>
    `;
    // We need to wait for theme loading in constructor
  });

  test('should initialize and build UI', async () => {
    const app = new App();
    // App constructor calls _loadTheme which is async
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.getElementById('jv-toolbar')).not.toBeNull();
    expect(document.getElementById('jv-tree-panel')).not.toBeNull();
  });

  test('should switch views', async () => {
    const app = new App();
    await new Promise(resolve => setTimeout(resolve, 0));

    const rawTab = document.querySelector('[data-view="raw"]');
    rawTab.click();

    expect(document.getElementById('jv-raw-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('jv-tree-panel').classList.contains('hidden')).toBe(true);
  });

  test('should run search and show results', async () => {
    const app = new App();
    await new Promise(resolve => setTimeout(resolve, 0));

    const searchInput = document.getElementById('jv-search-input');
    searchInput.value = 'a';
    searchInput.dispatchEvent(new Event('input'));

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 300));

    const results = document.getElementById('jv-search-results');
    expect(results.classList.contains('hidden')).toBe(false);
    expect(results.querySelectorAll('.jv-search-result').length).toBeGreaterThan(0);
  });

  test('should toggle sidebar', async () => {
    const app = new App();
    await new Promise(resolve => setTimeout(resolve, 0));

    const validateBtn = document.getElementById('jv-validate-open-btn');
    validateBtn.click();

    expect(document.getElementById('jv-sidebar').classList.contains('hidden')).toBe(false);
  });

  test('should handle keyboard shortcuts', async () => {
    const app = new App();
    await new Promise(resolve => setTimeout(resolve, 0));

    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(document.getElementById('jv-search-input'));
  });
});
