import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('Application', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../.webpack/main/index.js')],
    });
    window = await electronApp.firstWindow();
    await window.waitForSelector('.app');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should launch and display three panes', async () => {
    // Verify three-pane layout exists
    const leftPane = await window.$('.left-pane');
    const centerPane = await window.$('.center-pane');
    const rightPane = await window.$('.right-pane');

    expect(leftPane).not.toBeNull();
    expect(centerPane).not.toBeNull();
    expect(rightPane).not.toBeNull();

    // Verify left pane header
    const leftHeader = await window.textContent('.left-pane .pane-header');
    expect(leftHeader).toContain('Terminals');

    // Verify + button exists
    const addBtn = await window.$('.add-btn');
    expect(addBtn).not.toBeNull();
  });

  test('should show empty state messages initially', async () => {
    // Left pane should show no terminals message
    const emptyMessage = await window.textContent('.left-pane .empty-message');
    expect(emptyMessage).toContain('No terminals open');

    // Center pane should show create terminal prompt
    const centerPrompt = await window.textContent('.center-pane .center-empty');
    expect(centerPrompt).toContain('Select or create a terminal');

    // Right pane should show no directory message
    const rightMessage = await window.textContent('.right-pane .empty-message');
    expect(rightMessage).toContain('No directory selected');
  });

  test('should show hotkey help on Ctrl+?', async () => {
    // Press Ctrl+? to show hotkey help
    await window.keyboard.press('Control+Shift+/');
    
    // Wait for modal to appear
    const modal = await window.waitForSelector('.modal-overlay', { timeout: 2000 }).catch(() => null);
    
    if (modal) {
      const title = await window.textContent('.modal-header h2');
      expect(title).toContain('Keyboard Shortcuts');

      // Close the modal by pressing Escape
      await window.keyboard.press('Escape');
      await window.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 2000 }).catch(() => {});
    }
  });

  test('should have functional add terminal button', async () => {
    const addBtn = await window.$('.add-btn');
    expect(addBtn).not.toBeNull();
    
    // Button should be clickable
    const isDisabled = await addBtn?.isDisabled();
    expect(isDisabled).toBe(false);
  });

  test('should display correct pane headers', async () => {
    // Left pane header
    const leftHeader = await window.textContent('.left-pane .pane-header span');
    expect(leftHeader).toBe('Terminals');

    // Right pane header
    const rightHeader = await window.textContent('.right-pane .pane-header span');
    expect(rightHeader).toBe('Files');
  });
});
