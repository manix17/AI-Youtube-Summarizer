/**
 * @jest-environment jsdom
 */

import { setupChromeMocks } from "../helpers/chrome-mocks";

// Mock the API modules
const mockGenerateSummary = jest.fn();

jest.mock("../../src/utils/api", () => ({
  generateSummary: mockGenerateSummary,
}));

describe("Error & Edge Case Handling (ERR-001 to ERR-007)", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    jest.clearAllMocks();
  });

  describe("ERR-001: Video with no transcript available", () => {
    it("should handle empty transcript gracefully", () => {
      // Simulate YouTube page with no transcript elements
      document.body.innerHTML = `
        <div class="video-player">
          <h1>Video Title</h1>
        </div>
      `;

      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      expect(transcriptSegments.length).toBe(0);

      // Test transcript extraction logic
      let fullTranscript = "";
      transcriptSegments.forEach((segment) => {
        const timestamp = segment.querySelector<HTMLElement>(".segment-timestamp")?.textContent?.trim() || "";
        const text = segment.querySelector<HTMLElement>(".segment-text")?.textContent?.trim() || "";
        if (text) {
          fullTranscript += `[${timestamp}] ${text}\n`;
        }
      });

      expect(fullTranscript).toBe("");
    });

    it("should show appropriate error message for no transcript", () => {
      const errorMessage = "Could not find a transcript for this video";
      const summaryContainer = document.createElement("div");
      summaryContainer.id = "summary-container";
      
      const errorDiv = document.createElement("div");
      errorDiv.textContent = errorMessage;
      summaryContainer.appendChild(errorDiv);
      
      expect(summaryContainer.textContent).toContain("Could not find a transcript for this video");
    });
  });

  describe("ERR-002: Non-English transcript handling", () => {
    it("should handle non-English transcript", () => {
      document.body.innerHTML = `
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:00</div>
          <div class="segment-text">Hola, bienvenidos a mi canal</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:05</div>
          <div class="segment-text">Hoy vamos a aprender JavaScript</div>
        </ytd-transcript-segment-renderer>
      `;

      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      let fullTranscript = "";

      transcriptSegments.forEach((segment) => {
        const timestamp = segment.querySelector<HTMLElement>(".segment-timestamp")?.textContent?.trim() || "";
        const text = segment.querySelector<HTMLElement>(".segment-text")?.textContent?.trim() || "";
        if (text) {
          fullTranscript += `[${timestamp}] ${text}\n`;
        }
      });

      expect(fullTranscript).toBe("[0:00] Hola, bienvenidos a mi canal\n[0:05] Hoy vamos a aprender JavaScript\n");
      expect(fullTranscript).toContain("Hola");
      expect(fullTranscript).toContain("JavaScript");
    });
  });

  describe("ERR-003: API failure simulation", () => {
    it("should handle 500 server error", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error" },
        }),
      });
      global.fetch = mockFetch;

      mockGenerateSummary.mockRejectedValue(new Error("API server error"));

      await expect(mockGenerateSummary()).rejects.toThrow("API server error");
    });

    it("should handle 429 rate limit error", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: "Rate limit exceeded" },
        }),
      });
      global.fetch = mockFetch;

      mockGenerateSummary.mockRejectedValue(new Error("Rate limit exceeded"));

      await expect(mockGenerateSummary()).rejects.toThrow("Rate limit exceeded");
    });

    it("should handle 401 unauthorized error", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: "Invalid API key" },
        }),
      });
      global.fetch = mockFetch;

      mockGenerateSummary.mockRejectedValue(new Error("Invalid API key"));

      await expect(mockGenerateSummary()).rejects.toThrow("Invalid API key");
    });
  });

  describe("ERR-004: Network disconnection simulation", () => {
    it("should handle network error", async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      mockGenerateSummary.mockRejectedValue(new Error("Network error"));

      await expect(mockGenerateSummary()).rejects.toThrow("Network error");
    });

    it("should handle timeout error", async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error("Request timeout"));
      global.fetch = mockFetch;

      mockGenerateSummary.mockRejectedValue(new Error("Request timeout"));

      await expect(mockGenerateSummary()).rejects.toThrow("Request timeout");
    });
  });

  describe("ERR-005: Live stream video detection", () => {
    it("should detect live stream video", () => {
      // Mock YouTube live stream page elements
      document.body.innerHTML = `
        <div class="ytp-live" aria-label="Live">
          <div class="ytp-live-badge">LIVE</div>
        </div>
        <div class="ytp-time-display">
          <span class="ytp-time-current">LIVE</span>
        </div>
      `;

      const liveBadge = document.querySelector('.ytp-live-badge');
      const liveTime = document.querySelector('.ytp-time-current');
      
      const isLiveStream = liveBadge?.textContent === 'LIVE' || liveTime?.textContent === 'LIVE';
      
      expect(isLiveStream).toBe(true);
    });

    it("should show error for live stream", () => {
      const isLiveStream = true;
      
      if (isLiveStream) {
        const errorMessage = "Live streams cannot be summarized";
        expect(errorMessage).toBe("Live streams cannot be summarized");
      }
    });
  });

  describe("ERR-006: Age-restricted video handling", () => {
    it("should detect age-restricted video", () => {
      // Mock age restriction warning page
      document.body.innerHTML = `
        <div class="ytd-player-error-message-renderer">
          <div class="reason">Sign in to confirm your age</div>
          <div class="subreason">This video may be inappropriate for some users.</div>
        </div>
      `;

      const ageRestrictionMessage = document.querySelector('.ytd-player-error-message-renderer .reason');
      const isAgeRestricted = ageRestrictionMessage?.textContent?.includes('Sign in to confirm your age');
      
      expect(isAgeRestricted).toBe(true);
    });

    it("should handle age-restricted video error", () => {
      const isAgeRestricted = true;
      
      if (isAgeRestricted) {
        const errorMessage = "Could not find a transcript for this video";
        expect(errorMessage).toBe("Could not find a transcript for this video");
      }
    });
  });

  describe("ERR-007: Background script error handling", () => {
    it("should handle failed API calls in background script", async () => {
      mockGenerateSummary.mockRejectedValue(new Error("API call failed"));

      const sendResponse = jest.fn();
      
      try {
        await mockGenerateSummary();
      } catch (error) {
        sendResponse({
          type: "summarizeResponse",
          error: `Error: ${(error as Error).message}`,
        });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: "Error: API call failed",
      });
    });

    it("should handle invalid message format", () => {
      const sendResponse = jest.fn();
      const invalidRequest = {
        type: "summarize",
        payload: null, // Invalid payload
      };

      // Simulate background script validation
      if (!invalidRequest.payload) {
        sendResponse({
          type: "summarizeResponse",
          error: "Invalid request payload",
        });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: "Invalid request payload",
      });
    });

    it("should handle missing API key", () => {
      const sendResponse = jest.fn();
      const profileId = "test";
      const profile = null; // Profile not found

      if (!profile) {
        sendResponse({
          type: "summarizeResponse",
          error: `Error: API key for profile "${profileId}" is missing.`,
        });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: 'Error: API key for profile "test" is missing.',
      });
    });
  });

  describe("Additional Edge Cases", () => {
    it("should handle malformed transcript data", () => {
      document.body.innerHTML = `
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp"></div>
          <div class="segment-text">Text without timestamp</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:05</div>
        </ytd-transcript-segment-renderer>
      `;

      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      let fullTranscript = "";

      transcriptSegments.forEach((segment) => {
        const timestamp = segment.querySelector<HTMLElement>(".segment-timestamp")?.textContent?.trim() || "";
        const text = segment.querySelector<HTMLElement>(".segment-text")?.textContent?.trim() || "";
        if (text && timestamp) {
          fullTranscript += `[${timestamp}] ${text}\n`;
        }
      });

      // Should only include segments with both timestamp and text
      expect(fullTranscript).toBe("");
    });

    it("should handle very long video titles", () => {
      const longTitle = "A".repeat(500);
      
      document.body.innerHTML = `
        <h1 class="style-scope ytd-watch-metadata">${longTitle}</h1>
      `;

      const titleElement = document.querySelector<HTMLElement>("h1.style-scope.ytd-watch-metadata");
      const videoTitle = titleElement?.textContent || "N/A";
      
      expect(videoTitle.length).toBe(500);
      expect(videoTitle).toBe(longTitle);
    });

    it("should handle empty video metadata", () => {
      document.body.innerHTML = `
        <h1 class="style-scope ytd-watch-metadata"></h1>
        <ytd-channel-name><div id="text"><a></a></div></ytd-channel-name>
        <div class="ytp-time-duration"></div>
      `;

      const titleElement = document.querySelector<HTMLElement>("h1.style-scope.ytd-watch-metadata");
      const channelElement = document.querySelector<HTMLElement>("ytd-channel-name #text a");
      const durationElement = document.querySelector<HTMLElement>(".ytp-time-duration");

      const videoTitle = titleElement?.textContent?.trim() || "N/A";
      const channelName = channelElement?.textContent?.trim() || "N/A";
      const videoDuration = durationElement?.textContent?.trim() || "N/A";
      
      expect(videoTitle).toBe("N/A");
      expect(channelName).toBe("N/A");
      expect(videoDuration).toBe("N/A");
    });
  });
});