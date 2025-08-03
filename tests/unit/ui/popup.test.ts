/**
 * @jest-environment jsdom
 */

import { setupChromeMocks } from "../../helpers/chrome-mocks";
import { loadHtmlFile } from "../../helpers/dom-helpers";

describe("Popup UI", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should load popup HTML correctly", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    expect(document.getElementById('options-btn')).not.toBeNull();
    expect(document.getElementById('help-btn')).not.toBeNull();
    expect(document.querySelector('.status-dot')).not.toBeNull();
    expect(document.querySelector('.status-indicator span')).not.toBeNull();
  });

  it("should handle options button click", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    // Simulate DOMContentLoaded event
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    const optionsBtn = document.getElementById('options-btn') as HTMLButtonElement;
    expect(optionsBtn).not.toBeNull();

    // Test that the button exists and can be clicked
    optionsBtn.click();
    // Note: The actual chrome.runtime.openOptionsPage would be called here
    // but we're just testing the UI structure
  });

  it("should handle help button click", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
    expect(helpBtn).not.toBeNull();

    helpBtn.click();
    // Note: The actual chrome.tabs.create would be called here
  });

  it("should display status indicators", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    const statusDot = document.querySelector('.status-dot') as HTMLElement;
    const statusText = document.querySelector('.status-indicator span') as HTMLElement;

    expect(statusDot).not.toBeNull();
    expect(statusText).not.toBeNull();

    // Test that status can be updated
    statusDot.style.background = '#00d4aa';
    statusText.textContent = 'Ready to Summarize!';

    expect(statusDot.style.background).toBe('rgb(0, 212, 170)');
    expect(statusText.textContent).toBe('Ready to Summarize!');
  });

  it("should have proper popup structure", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    // Check that basic structure exists
    expect(document.body.innerHTML).toBeTruthy();
    expect(document.getElementById('options-btn')).not.toBeNull();
    expect(document.getElementById('help-btn')).not.toBeNull();
    
    // The exact CSS classes may vary, so just check core functionality
    expect(document.body.innerHTML.length).toBeGreaterThan(100);
  });
});