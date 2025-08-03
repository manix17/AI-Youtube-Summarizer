/**
 * @jest-environment jsdom
 */

import { readFileSync } from 'fs';
import path from 'path';
import { setupChromeMocks } from "../helpers/chrome-mocks";
import { setupFetchMocks } from "../helpers/fetch-mocks";
import { createYouTubeMockPage, setupYouTubeGlobals, loadHtmlFile } from "../helpers/dom-helpers";

describe("Extension Integration", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    mockFetch = setupFetchMocks();
    document.body.innerHTML = '';
  });

  describe("Manifest Validation", () => {
    it("should have valid extension manifest", () => {
      const manifestPath = path.join(__dirname, '../../manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBe('AI YouTube Summarizer');
      expect(manifest.permissions).toContain('activeTab');
      expect(manifest.permissions).toContain('storage');
      expect(manifest.content_scripts).toHaveLength(1);
      expect(manifest.content_scripts[0].matches).toContain('*://www.youtube.com/watch?v=*');
    });

    it("should have required permissions", () => {
      const manifestPath = path.join(__dirname, '../../manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      
      const requiredPermissions = ['activeTab', 'scripting', 'storage', 'clipboardWrite'];
      requiredPermissions.forEach(permission => {
        expect(manifest.permissions).toContain(permission);
      });
    });

    it("should have correct host permissions", () => {
      const manifestPath = path.join(__dirname, '../../manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      
      expect(manifest.host_permissions).toContain('https://generativelanguage.googleapis.com/');
    });
  });

  describe("Build Validation", () => {
    it("should have built extension files", () => {
      const buildDir = path.join(__dirname, '../../build');
      
      const requiredFiles = [
        'manifest.json',
        'background.bundle.js',
        'content.bundle.js',
        'popup.bundle.js',
        'options.bundle.js',
        'popup.html',
        'options.html'
      ];

      requiredFiles.forEach(file => {
        expect(() => readFileSync(path.join(buildDir, file))).not.toThrow();
      });
    });

    it("should have required assets", () => {
      const buildDir = path.join(__dirname, '../../build');
      
      const requiredAssets = [
        'assets/css/summary.css',
        'assets/images/icon16.png',
        'assets/images/icon48.png',
        'assets/images/icon128.png',
        'assets/prompts.json',
        'assets/platform_configs.json'
      ];

      requiredAssets.forEach(asset => {
        expect(() => readFileSync(path.join(buildDir, asset))).not.toThrow();
      });
    });
  });

  describe("UI Components Integration", () => {
    it("should initialize popup interface correctly", () => {
      const popupHTML = loadHtmlFile('popup/popup.html');
      document.body.innerHTML = popupHTML;

      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      const optionsBtn = document.getElementById('options-btn');
      const helpBtn = document.getElementById('help-btn');
      const statusDot = document.querySelector('.status-dot');

      expect(optionsBtn).not.toBeNull();
      expect(helpBtn).not.toBeNull();
      expect(statusDot).not.toBeNull();
    });

    it("should initialize options page correctly", async () => {
      const optionsHTML = loadHtmlFile('options/options.html');
      document.body.innerHTML = optionsHTML;

      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({
          currentProfile: 'default',
          profile_ids: ['default'],
          profile_default: {
            name: 'Default',
            platform: 'gemini',
            model: 'gemini-2.5-flash',
            apiKey: '',
            language: 'English',
            presets: {},
            currentPreset: 'detailed',
          },
        });
      });

      const platformSelect = document.getElementById('platform-select') as HTMLSelectElement;
      const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
      const addProfileBtn = document.getElementById('add-profile-btn') as HTMLButtonElement;
      const profileModal = document.getElementById('profile-modal') as HTMLDivElement;

      expect(platformSelect).not.toBeNull();
      expect(apiKeyInput).not.toBeNull();
      expect(addProfileBtn).not.toBeNull();
      expect(profileModal).not.toBeNull();

      expect(platformSelect.value).toBe('gemini');
      expect(apiKeyInput.value).toBe('');
    });
  });

  describe("Content Script Integration", () => {
    it("should simulate YouTube page structure", () => {
      document.body.innerHTML = createYouTubeMockPage();
      setupYouTubeGlobals();

      const belowElement = document.getElementById('below');
      const watchElement = document.getElementById('watch');
      
      expect(belowElement).not.toBeNull();
      expect(watchElement).not.toBeNull();
      
      // Verify YouTube globals are set
      expect((window as any).ytInitialPlayerResponse).toBeDefined();
      expect((window as any).ytInitialPlayerResponse.videoDetails.title).toBe('Mock Video Title');
    });

    it("should simulate content script injection", () => {
      document.body.innerHTML = createYouTubeMockPage();
      setupYouTubeGlobals();

      const belowElement = document.getElementById('below');
      
      // Simulate content script injection
      const mockSummarizeButton = document.createElement('button');
      mockSummarizeButton.id = 'summarize-btn';
      mockSummarizeButton.textContent = '✨ Summarize';
      mockSummarizeButton.classList.add('summarize-btn');
      belowElement?.prepend(mockSummarizeButton);

      const injectedButton = document.getElementById('summarize-btn');
      expect(injectedButton).not.toBeNull();
      expect(injectedButton?.textContent).toContain('Summarize');
      expect(injectedButton?.classList.contains('summarize-btn')).toBe(true);
    });

    it("should simulate summary container injection", () => {
      document.body.innerHTML = createYouTubeMockPage();
      
      const belowElement = document.getElementById('below');
      
      // Simulate summary container injection
      const summaryContainer = document.createElement('div');
      summaryContainer.id = 'summary-container';
      summaryContainer.classList.add('summary-container');
      summaryContainer.style.display = 'none';
      
      const summaryContent = document.createElement('div');
      summaryContent.id = 'summary-content';
      summaryContainer.appendChild(summaryContent);
      
      belowElement?.prepend(summaryContainer);

      const injectedContainer = document.getElementById('summary-container');
      const contentArea = document.getElementById('summary-content');
      
      expect(injectedContainer).not.toBeNull();
      expect(contentArea).not.toBeNull();
      expect(injectedContainer?.style.display).toBe('none');
    });
  });

  describe("Chrome API Integration", () => {
    it("should mock chrome.runtime APIs", () => {
      expect(mockChrome.runtime.getURL).toBeDefined();
      expect(mockChrome.runtime.sendMessage).toBeDefined();
      expect(mockChrome.runtime.onMessage.addListener).toBeDefined();

      const testUrl = mockChrome.runtime.getURL('test.json');
      expect(testUrl).toBe('chrome-extension://mock-extension-id/test.json');
    });

    it("should mock chrome.storage APIs", () => {
      expect(mockChrome.storage.sync.get).toBeDefined();
      expect(mockChrome.storage.sync.set).toBeDefined();

      const callback = jest.fn();
      mockChrome.storage.sync.get(['test'], callback);
      expect(callback).toHaveBeenCalled();
    });

    it("should mock chrome.tabs APIs", () => {
      expect(mockChrome.tabs.query).toBeDefined();
      expect(mockChrome.tabs.create).toBeDefined();
    });
  });

  describe("Data Flow Integration", () => {
    it("should simulate message passing between components", () => {
      const testMessage = { type: 'testApiKey', payload: { platform: 'openai', apiKey: 'test-key' } };
      const callback = jest.fn();

      mockChrome.runtime.sendMessage(testMessage, callback);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(testMessage, callback);
      expect(callback).toHaveBeenCalledWith({ 
        success: true, 
        models: [{ name: "model-1", displayName: "Model 1" }] 
      });
    });

    it("should simulate storage operations", () => {
      const testData = { test: 'value' };
      const callback = jest.fn();

      mockChrome.storage.sync.set(testData, callback);
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(testData, callback);
      expect(callback).toHaveBeenCalled();
    });

    it("should handle fetch operations", async () => {
      const response = await fetch('assets/prompts.json');
      const data = await response.json();

      expect(data.presets).toBeDefined();
      expect(data.presets.detailed).toBeDefined();
      expect(data.presets.detailed.name).toBe('Detailed Summary');
    });
  });
});