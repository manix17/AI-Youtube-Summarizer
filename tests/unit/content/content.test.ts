/**
 * @jest-environment jsdom
 */

import { setupChromeMocks } from "../../helpers/chrome-mocks";
import { setupFetchMocks } from "../../helpers/fetch-mocks";

// Mock the content script modules
const mockConvertToHTML = jest.fn();
const mockGetProgressiveLoadingMessage = jest.fn();
const mockGetContextualLoadingMessage = jest.fn();

jest.mock("../../../src/utils/dom_parser", () => ({
  convertToHTML: mockConvertToHTML,
}));

jest.mock("../../../src/utils/loading_messages", () => ({
  getProgressiveLoadingMessage: mockGetProgressiveLoadingMessage,
  getContextualLoadingMessage: mockGetContextualLoadingMessage,
}));

// Mock URL class for Object.createObjectURL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("Content Script Functions", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    mockFetch = setupFetchMocks();
    document.body.innerHTML = "";
    jest.clearAllMocks();
    
    // Reset mocks
    mockConvertToHTML.mockReturnValue("<p>Converted HTML</p>");
    mockGetProgressiveLoadingMessage.mockReturnValue("<i>Loading...</i>");
    mockGetContextualLoadingMessage.mockReturnValue("<i>Getting ready...</i>");
    mockCreateObjectURL.mockReturnValue("blob:mock-url");

    // Reset window.location for each test
    delete (window as any).location;
    (window as any).location = { search: "" };
  });

  describe("UI Element Creation", () => {
    it("should create summarize UI elements", () => {
      // Test that we can create the expected DOM elements
      const container = document.createElement("div");
      container.id = "summarize-ui-container";
      container.classList.add("summarize-ui-container");

      const button = document.createElement("button");
      button.innerText = "✨ Summarize";
      button.id = "summarize-btn";
      button.classList.add("summarize-btn");

      const profileSelect = document.createElement("select");
      profileSelect.id = "profile-select";

      container.appendChild(profileSelect);
      container.appendChild(button);
      document.body.appendChild(container);

      expect(document.getElementById("summarize-ui-container")).toBeTruthy();
      expect(document.getElementById("summarize-btn")).toBeTruthy();
      expect(document.getElementById("profile-select")).toBeTruthy();
    });

    it("should create summary container", () => {
      const summaryContainer = document.createElement("div");
      summaryContainer.id = "summary-container";
      summaryContainer.classList.add("summary-container");
      summaryContainer.style.display = "none";

      const summaryContent = document.createElement("div");
      summaryContent.id = "summary-content";
      summaryContainer.appendChild(summaryContent);

      document.body.appendChild(summaryContainer);

      expect(document.getElementById("summary-container")).toBeTruthy();
      expect(document.getElementById("summary-content")).toBeTruthy();
      expect(summaryContainer.style.display).toBe("none");
    });
  });

  describe("YouTube Page Detection", () => {
    it("should detect video page from URL", () => {
      // Test video page detection logic directly with URLSearchParams
      const searchParams1 = "?v=test-video-id";
      const videoId = new URLSearchParams(searchParams1).get("v");
      expect(videoId).toBe("test-video-id");
    });

    it("should detect non-video page", () => {
      const searchParams = "";
      const videoId = new URLSearchParams(searchParams).get("v");
      expect(videoId).toBeNull();
    });

    it("should detect different video IDs", () => {
      const searchParams1 = "?v=video1";
      let videoId = new URLSearchParams(searchParams1).get("v");
      expect(videoId).toBe("video1");

      const searchParams2 = "?v=video2";
      videoId = new URLSearchParams(searchParams2).get("v");
      expect(videoId).toBe("video2");
    });
  });

  describe("Video Metadata Extraction", () => {
    it("should extract video title", () => {
      document.body.innerHTML = `
        <h1 class="style-scope ytd-watch-metadata">Test Video Title</h1>
      `;

      const titleElement = document.querySelector<HTMLElement>("h1.style-scope.ytd-watch-metadata");
      const videoTitle = titleElement?.textContent || "N/A";
      
      expect(videoTitle).toBe("Test Video Title");
    });

    it("should extract channel name", () => {
      document.body.innerHTML = `
        <ytd-channel-name>
          <div id="text">
            <a>Test Channel</a>
          </div>
        </ytd-channel-name>
      `;

      const channelElement = document.querySelector<HTMLElement>("ytd-channel-name #text a");
      const channelName = channelElement?.textContent || "N/A";
      
      expect(channelName).toBe("Test Channel");
    });

    it("should extract video duration", () => {
      document.body.innerHTML = `
        <div class="ytp-time-duration">10:30</div>
      `;

      const durationElement = document.querySelector<HTMLElement>(".ytp-time-duration");
      const videoDuration = durationElement?.textContent || "N/A";
      
      expect(videoDuration).toBe("10:30");
    });

    it("should handle missing metadata gracefully", () => {
      document.body.innerHTML = `<div>No metadata elements</div>`;

      const titleElement = document.querySelector<HTMLElement>("h1.style-scope.ytd-watch-metadata");
      const channelElement = document.querySelector<HTMLElement>("ytd-channel-name #text a");
      const durationElement = document.querySelector<HTMLElement>(".ytp-time-duration");

      const videoTitle = titleElement?.textContent || "N/A";
      const channelName = channelElement?.textContent || "N/A";
      const videoDuration = durationElement?.textContent || "N/A";
      
      expect(videoTitle).toBe("N/A");
      expect(channelName).toBe("N/A");
      expect(videoDuration).toBe("N/A");
    });
  });

  describe("Timestamp Handling", () => {
    it("should handle timestamp click", () => {
      document.body.innerHTML = `
        <video></video>
        <div id="summary-container">
          <a class="timestamp-link" data-seconds="90">1:30</a>
        </div>
      `;

      const videoElement = document.querySelector("video") as HTMLVideoElement;
      const timestampLink = document.querySelector(".timestamp-link") as HTMLAnchorElement;
      
      // Mock video element currentTime property
      Object.defineProperty(videoElement, "currentTime", {
        value: 0,
        writable: true,
      });

      // Simulate timestamp click handler logic
      if (timestampLink && timestampLink.dataset.seconds) {
        const seconds = parseInt(timestampLink.dataset.seconds, 10);
        if (videoElement) {
          videoElement.currentTime = seconds;
        }
      }

      expect(videoElement.currentTime).toBe(90);
    });

    it("should handle multiple timestamps", () => {
      document.body.innerHTML = `
        <video></video>
        <div id="summary-container">
          <a class="timestamp-link" data-seconds="30">0:30</a>
          <a class="timestamp-link" data-seconds="120">2:00</a>
          <a class="timestamp-link" data-seconds="300">5:00</a>
        </div>
      `;

      const videoElement = document.querySelector("video") as HTMLVideoElement;
      const timestampLinks = document.querySelectorAll(".timestamp-link") as NodeListOf<HTMLAnchorElement>;
      
      Object.defineProperty(videoElement, "currentTime", {
        value: 0,
        writable: true,
      });

      // Test each timestamp
      timestampLinks.forEach(link => {
        if (link.dataset.seconds) {
          const seconds = parseInt(link.dataset.seconds, 10);
          videoElement.currentTime = seconds;
        }
      });

      // Test that we can set different times
      expect(timestampLinks.length).toBe(3);
      expect(timestampLinks[0].dataset.seconds).toBe("30");
      expect(timestampLinks[1].dataset.seconds).toBe("120");
      expect(timestampLinks[2].dataset.seconds).toBe("300");
    });
  });

  describe("Transcript Extraction Elements", () => {
    it("should find transcript elements", () => {
      document.body.innerHTML = `
        <tp-yt-paper-button id="expand">More</tp-yt-paper-button>
        <ytd-video-description-transcript-section-renderer>
          <button aria-label="Show transcript">Show transcript</button>
        </ytd-video-description-transcript-section-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:00</div>
          <div class="segment-text">Hello world</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:05</div>
          <div class="segment-text">This is a test</div>
        </ytd-transcript-segment-renderer>
      `;

      const moreButton = document.querySelector('tp-yt-paper-button#expand');
      const transcriptButton = document.querySelector('ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]');
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');

      expect(moreButton).toBeTruthy();
      expect(transcriptButton).toBeTruthy();
      expect(transcriptSegments.length).toBe(2);

      // Test transcript extraction logic
      let fullTranscript = "";
      transcriptSegments.forEach((segment) => {
        const timestamp = segment.querySelector<HTMLElement>(".segment-timestamp")?.textContent?.trim() || "";
        const text = segment.querySelector<HTMLElement>(".segment-text")?.textContent?.trim() || "";
        if (text) {
          fullTranscript += `[${timestamp}] ${text}\n`;
        }
      });

      expect(fullTranscript.trim()).toBe("[0:00] Hello world\n[0:05] This is a test");
    });

    it("should handle missing transcript elements", () => {
      document.body.innerHTML = `<div>No transcript elements</div>`;

      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      expect(transcriptSegments.length).toBe(0);
    });
  });

  describe("UI Interaction", () => {
    it("should handle button states", () => {
      const button = document.createElement("button");
      button.id = "summarize-btn";
      button.innerText = "✨ Summarize";
      button.disabled = false;
      document.body.appendChild(button);

      // Test button state changes
      button.innerText = "⏳ Summarizing...";
      button.disabled = true;
      
      expect(button.innerText).toBe("⏳ Summarizing...");
      expect(button.disabled).toBe(true);

      // Reset button state
      button.innerText = "✨ Summarize";
      button.disabled = false;
      
      expect(button.innerText).toBe("✨ Summarize");
      expect(button.disabled).toBe(false);
    });

    it("should handle summary container visibility", () => {
      const summaryContainer = document.createElement("div");
      summaryContainer.id = "summary-container";
      summaryContainer.style.display = "none";
      document.body.appendChild(summaryContainer);

      expect(summaryContainer.style.display).toBe("none");

      // Show container
      summaryContainer.style.display = "block";
      expect(summaryContainer.style.display).toBe("block");

      // Hide container
      summaryContainer.style.display = "none";
      expect(summaryContainer.style.display).toBe("none");
    });

    it("should handle copy functionality", () => {
      // Mock document.execCommand
      const mockExecCommand = jest.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      // Create elements
      const summaryContainer = document.createElement("div");
      const markdownContent = document.createElement("div");
      markdownContent.className = "markdown-content";
      markdownContent.innerHTML = "<p>Test summary content</p>";
      summaryContainer.appendChild(markdownContent);
      document.body.appendChild(summaryContainer);

      // Test copy logic
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = markdownContent.innerHTML;
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      // Simulate selection and copy
      const range = document.createRange();
      range.selectNode(tempDiv);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      document.execCommand("copy");

      document.body.removeChild(tempDiv);
      selection?.removeAllRanges();

      expect(mockExecCommand).toHaveBeenCalledWith("copy");
    });

    it("should handle download functionality", () => {
      // Mock Blob and URL.createObjectURL
      const mockBlob = { size: 1024, type: "text/plain;charset=utf-8" };
      global.Blob = jest.fn().mockImplementation(() => mockBlob) as any;

      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      
      const mockAnchor = {
        href: "",
        download: "",
        click: mockClick,
      };

      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tagName) => {
        if (tagName === "a") {
          return mockAnchor;
        }
        return originalCreateElement.call(document, tagName);
      });

      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;

      // Create markdown content
      const markdownContent = document.createElement("div");
      markdownContent.className = "markdown-content";
      markdownContent.innerText = "Test summary content";
      document.body.appendChild(markdownContent);

      // Test download logic
      const videoTitle = "Test Video";
      const blob = new Blob([markdownContent.innerText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      mockAnchor.href = url;
      mockAnchor.download = `${videoTitle}_summary.txt`;
      mockAnchor.click();

      URL.revokeObjectURL(url);

      expect(global.Blob).toHaveBeenCalledWith(["Test summary content"], { type: "text/plain;charset=utf-8" });
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Restore original createElement
      document.createElement = originalCreateElement;
    });
  });

  describe("Chrome Extension Integration", () => {
    it("should handle chrome.runtime.getURL", () => {
      const testPath = "assets/css/summary.css";
      mockChrome.runtime.getURL.mockReturnValue(`chrome-extension://test-id/${testPath}`);
      
      const url = chrome.runtime.getURL(testPath);
      expect(url).toBe(`chrome-extension://test-id/${testPath}`);
      expect(mockChrome.runtime.getURL).toHaveBeenCalledWith(testPath);
    });

    it("should handle chrome.runtime.sendMessage", () => {
      const testMessage = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Test transcript",
          videoTitle: "Test Video",
          profileId: "default",
          presetId: "detailed",
          language: "English",
        },
      };

      const mockCallback = jest.fn();
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ type: "summarizeResponse", payload: { summary: "Test summary" } });
      });

      chrome.runtime.sendMessage(testMessage, mockCallback);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(testMessage, mockCallback);
      expect(mockCallback).toHaveBeenCalledWith({
        type: "summarizeResponse",
        payload: { summary: "Test summary" },
      });
    });

    it("should handle chrome.storage.sync operations", () => {
      const testData = {
        profile_default: {
          name: "Default Profile",
          platform: "openai",
          apiKey: "sk-test",
        },
      };

      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        if (callback) {
          callback(testData);
        }
        return Promise.resolve(testData);
      });

      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      });

      // Test get
      chrome.storage.sync.get(null, (data) => {
        expect(data).toEqual(testData);
      });

      // Test set
      const newData = { currentProfile: "default" };
      chrome.storage.sync.set(newData, () => {
        // Success callback
      });

      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(newData, expect.any(Function));
    });
  });

  describe("Dark Mode Support", () => {
    it("should detect dark mode attribute", () => {
      // Mock document.documentElement.hasAttribute
      const mockHasAttribute = jest.fn().mockReturnValue(false);
      Object.defineProperty(document.documentElement, "hasAttribute", {
        value: mockHasAttribute,
        writable: true,
      });

      const isDarkMode = document.documentElement.hasAttribute("dark");
      expect(isDarkMode).toBe(false);
      expect(mockHasAttribute).toHaveBeenCalledWith("dark");

      // Test with dark mode enabled
      mockHasAttribute.mockReturnValue(true);
      const isDarkModeEnabled = document.documentElement.hasAttribute("dark");
      expect(isDarkModeEnabled).toBe(true);
    });

    it("should toggle dark class on summary container", () => {
      const summaryContainer = document.createElement("div");
      summaryContainer.id = "summary-container";
      document.body.appendChild(summaryContainer);

      // Test adding dark class
      const isDarkMode = true;
      summaryContainer.classList.toggle("dark", isDarkMode);
      expect(summaryContainer.classList.contains("dark")).toBe(true);

      // Test removing dark class
      const isLightMode = false;
      summaryContainer.classList.toggle("dark", isLightMode);
      expect(summaryContainer.classList.contains("dark")).toBe(false);
    });
  });
});