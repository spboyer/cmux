import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';

test.describe('Application', () => {
  test('should launch and display three panes', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../.webpack/main/index.js')],
    });

    const window = await electronApp.firstWindow();
    
    // Wait for the app to load
    await window.waitForSelector('.app');

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

    await electronApp.close();
  });
});
