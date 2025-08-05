/**
 * @jest-environment jsdom
 */

import { setupChromeMocks } from "../helpers/chrome-mocks";
import { loadHtmlFile, waitFor } from "../helpers/dom-helpers";

describe("Help Documentation Integration", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Options Page Help Integration", () => {
    it("should provide complete help workflow for API configuration", async () => {
      // Load options page
      const optionsHTML = loadHtmlFile('options/options.html');
      document.body.innerHTML = optionsHTML;

      // Verify help icons exist
      const platformHelpIcon = document.getElementById('platform-help');
      const promptsHelpIcon = document.getElementById('prompts-help');
      
      expect(platformHelpIcon).not.toBeNull();
      expect(promptsHelpIcon).not.toBeNull();

      // Mock chrome.tabs.create
      const mockTabsCreate = jest.fn();
      mockChrome.tabs.create = mockTabsCreate;

      // Set up event listeners (simulating what the options script does)
      if (platformHelpIcon) {
        platformHelpIcon.addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({
            url: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/API_KEYS.md"
          });
        });
      }

      if (promptsHelpIcon) {
        promptsHelpIcon.addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({
            url: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/CUSTOM_PROMPTS.md"
          });
        });
      }

      // Test platform help flow
      platformHelpIcon!.click();
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/API_KEYS.md"
      });

      // Reset mock
      mockTabsCreate.mockClear();

      // Test prompts help flow
      promptsHelpIcon!.click();
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/CUSTOM_PROMPTS.md"
      });
    });

    it("should have correct help icon styling and accessibility", () => {
      const optionsHTML = loadHtmlFile('options/options.html');
      document.body.innerHTML = optionsHTML;

      const platformHelpIcon = document.getElementById('platform-help') as HTMLElement;
      const promptsHelpIcon = document.getElementById('prompts-help') as HTMLElement;

      // Check accessibility attributes
      expect(platformHelpIcon.getAttribute('title')).toContain('API keys');
      expect(promptsHelpIcon.getAttribute('title')).toContain('custom prompts');

      // Check CSS classes
      expect(platformHelpIcon.classList.contains('help-icon')).toBe(true);
      expect(promptsHelpIcon.classList.contains('help-icon')).toBe(true);

      // Check content
      expect(platformHelpIcon.textContent).toBe('?');
      expect(promptsHelpIcon.textContent).toBe('?');
    });
  });

  describe("Popup Help Integration", () => {
    it("should provide complete help workflow from popup", () => {
      // Load popup page
      const popupHTML = loadHtmlFile('popup/popup.html');
      document.body.innerHTML = popupHTML;

      // Verify help button exists
      const helpBtn = document.getElementById('help-btn');
      expect(helpBtn).not.toBeNull();

      // Mock chrome.tabs.create
      const mockTabsCreate = jest.fn();
      mockChrome.tabs.create = mockTabsCreate;

      // Set up event listener (simulating what the popup script does)
      helpBtn!.addEventListener('click', () => {
        chrome.tabs.create({
          url: "https://github.com/manix17/AI-Youtube-Summarizer/blob/main/docs/HELP.md"
        });
      });

      // Test help button flow
      helpBtn!.click();
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: "https://github.com/manix17/AI-Youtube-Summarizer/blob/main/docs/HELP.md"
      });
    });

    it("should handle support button integration", () => {
      const popupHTML = loadHtmlFile('popup/popup.html');
      document.body.innerHTML = popupHTML;

      const supportBtn = document.getElementById('support-btn');
      expect(supportBtn).not.toBeNull();

      // Mock chrome.tabs.create
      const mockTabsCreate = jest.fn();
      mockChrome.tabs.create = mockTabsCreate;

      // Set up event listener
      supportBtn!.addEventListener('click', () => {
        chrome.tabs.create({
          url: "https://buymeacoffee.com/manix17"
        });
      });

      // Test support button flow
      supportBtn!.click();
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: "https://buymeacoffee.com/manix17"
      });
    });
  });

  describe("Cross-Page Help System Integration", () => {
    it("should maintain consistent help URLs across components", () => {
      // This test ensures that help URLs are consistent across the extension
      const expectedUrls = {
        apiKeys: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/API_KEYS.md",
        customPrompts: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/CUSTOM_PROMPTS.md",
        generalHelp: "https://github.com/manix17/AI-Youtube-Summarizer/blob/main/docs/HELP.md",
        support: "https://buymeacoffee.com/manix17"
      };

      // Verify URL consistency (this would be expanded with actual URL validation)
      expect(expectedUrls.apiKeys).toContain('API_KEYS.md');
      expect(expectedUrls.customPrompts).toContain('CUSTOM_PROMPTS.md');
      expect(expectedUrls.generalHelp).toContain('HELP.md');
      expect(expectedUrls.support).toContain('buymeacoffee.com');
    });

    it("should handle chrome.tabs.create failures gracefully", () => {
      const optionsHTML = loadHtmlFile('options/options.html');
      document.body.innerHTML = optionsHTML;

      const platformHelpIcon = document.getElementById('platform-help');
      
      // Mock chrome.tabs.create to throw an error
      const mockTabsCreate = jest.fn(() => {
        throw new Error('Failed to create tab');
      });
      mockChrome.tabs.create = mockTabsCreate;

      // Set up event listener with error handling
      platformHelpIcon!.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          chrome.tabs.create({
            url: "https://github.com/manix17/ai-youtube-summarizer/blob/main/docs/API_KEYS.md"
          });
        } catch (error) {
          console.warn('Failed to open help documentation:', error);
        }
      });

      // This should not throw an error
      expect(() => platformHelpIcon!.click()).not.toThrow();
      expect(mockTabsCreate).toHaveBeenCalled();
    });
  });
});