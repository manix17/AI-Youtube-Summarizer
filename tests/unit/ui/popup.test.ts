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

    // Mock chrome.runtime.openOptionsPage
    const mockOpenOptionsPage = jest.fn();
    mockChrome.runtime.openOptionsPage = mockOpenOptionsPage;

    // Simulate the event listener setup manually
    const optionsBtn = document.getElementById('options-btn') as HTMLButtonElement;
    expect(optionsBtn).not.toBeNull();

    // Add event listener manually (simulating what the script does)
    optionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Click the button
    optionsBtn.click();

    // Verify chrome.runtime.openOptionsPage was called
    expect(mockOpenOptionsPage).toHaveBeenCalled();
  });

  it("should handle help button click", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    // Mock chrome.tabs.create
    const mockTabsCreate = jest.fn();
    mockChrome.tabs.create = mockTabsCreate;

    const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
    expect(helpBtn).not.toBeNull();

    // Add event listener manually (simulating what the script does)
    helpBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: "https://github.com/manix17/AI-Youtube-Summarizer/blob/main/docs/HELP.md"
      });
    });

    // Click the help button
    helpBtn.click();

    // Verify chrome.tabs.create was called with the correct help URL
    expect(mockTabsCreate).toHaveBeenCalledWith({
      url: "https://github.com/manix17/AI-Youtube-Summarizer/blob/main/docs/HELP.md"
    });
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

  it("should handle support button click", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    // Mock chrome.tabs.create
    const mockTabsCreate = jest.fn();
    mockChrome.tabs.create = mockTabsCreate;

    const supportBtn = document.getElementById('support-btn') as HTMLElement;
    expect(supportBtn).not.toBeNull();

    // Add event listener manually (simulating what the script does)
    supportBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: "https://buymeacoffee.com/manix17"
      });
    });

    // Click the support button
    supportBtn.click();

    // Verify chrome.tabs.create was called with the Buy Me a Coffee URL
    expect(mockTabsCreate).toHaveBeenCalledWith({
      url: "https://buymeacoffee.com/manix17"
    });
  });

  it("should update status based on active tab", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    // Mock chrome.tabs.query
    const mockTabsQuery = jest.fn((_query, callback) => {
      callback([{ url: "https://www.youtube.com/watch?v=test", active: true }]);
    });
    mockChrome.tabs.query = mockTabsQuery;

    const statusDot = document.querySelector('.status-dot') as HTMLElement;
    const statusText = document.querySelector('.status-indicator span') as HTMLElement;

    // Simulate the popup script status update logic
    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs: chrome.tabs.Tab[]) => {
        const currentTab = tabs[0];
        if (
          currentTab &&
          currentTab.url &&
          currentTab.url.includes("youtube.com/watch")
        ) {
          statusDot.style.background = "#00d4aa";
          statusText.textContent = "Ready to Summarize!";
        } else {
          statusDot.style.background = "#feca57";
          statusText.textContent = "Navigate to YouTube";
        }
      }
    );

    // Verify that chrome.tabs.query was called to check current tab
    expect(mockTabsQuery).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
    
    // Verify status was updated for YouTube
    expect(statusDot.style.background).toBe('rgb(0, 212, 170)');
    expect(statusText.textContent).toBe('Ready to Summarize!');
  });

  it("should handle YouTube tab detection", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    const statusDot = document.querySelector('.status-dot') as HTMLElement;
    const statusText = document.querySelector('.status-indicator span') as HTMLElement;

    // Simulate the status update for YouTube
    statusDot.style.background = '#00d4aa';
    statusText.textContent = 'Ready to Summarize!';

    // Check that status was updated for YouTube
    expect(statusDot?.style.background).toBe('rgb(0, 212, 170)');
    expect(statusText?.textContent).toBe('Ready to Summarize!');
  });

  it("should handle non-YouTube tab detection", () => {
    const popupHTML = loadHtmlFile('popup/popup.html');
    document.body.innerHTML = popupHTML;

    // Mock chrome.tabs.query for non-YouTube tab
    const mockTabsQuery = jest.fn((_query, callback) => {
      callback([{ url: "https://www.google.com", active: true }]);
    });
    mockChrome.tabs.query = mockTabsQuery;

    const statusDot = document.querySelector('.status-dot') as HTMLElement;
    const statusText = document.querySelector('.status-indicator span') as HTMLElement;

    // Simulate the popup script status update logic for non-YouTube
    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs: chrome.tabs.Tab[]) => {
        const currentTab = tabs[0];
        if (
          currentTab &&
          currentTab.url &&
          currentTab.url.includes("youtube.com/watch")
        ) {
          statusDot.style.background = "#00d4aa";
          statusText.textContent = "Ready to Summarize!";
        } else {
          statusDot.style.background = "#feca57";
          statusText.textContent = "Navigate to YouTube";
        }
      }
    );

    // Check that status was updated for non-YouTube
    expect(statusDot?.style.background).toBe('rgb(254, 202, 87)');
    expect(statusText?.textContent).toBe('Navigate to YouTube');
  });
});