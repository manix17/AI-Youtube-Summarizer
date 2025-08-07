/**
 * @jest-environment jsdom
 */

import { setupChromeMocks } from "../../helpers/chrome-mocks";

// Mock the API modules
const mockTestOpenApiKey = jest.fn();
const mockTestAnthropicApiKey = jest.fn();
const mockTestGeminiApiKey = jest.fn();
const mockGenerateSummary = jest.fn();
const mockTrackSummarization = jest.fn();

jest.mock("../../../src/utils/api_tester", () => ({
  testOpenApiKey: mockTestOpenApiKey,
  testAnthropicApiKey: mockTestAnthropicApiKey,
  testGeminiApiKey: mockTestGeminiApiKey,
}));

jest.mock("../../../src/utils/api", () => ({
  generateSummary: mockGenerateSummary,
}));

jest.mock("../../../src/utils/usage_tracker", () => ({
  trackSummarization: mockTrackSummarization,
}));

describe("Background Script", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;
  let messageHandler: Function;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    jest.clearAllMocks();
    
    // Mock the usage tracker to resolve successfully
    mockTrackSummarization.mockResolvedValue(undefined);

    // Mock fetch for prompts.json - matches actual structure
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          presets: {
            detailed: {
              name: "📖 Detailed Summary",
              system_prompt: "You are a helpful assistant.",
              user_prompt: "Summarize this transcript: {VIDEO_TRANSCRIPT}",
              temperature: 0.3,
            },
            brief: {
              name: "☕️ Brief Summary",
              system_prompt: "You are a concise assistant.",
              user_prompt: "Briefly summarize: {VIDEO_TRANSCRIPT}",
              temperature: 0.3,
            },
            study_notes: {
              name: "📚 Study Notes",
              system_prompt: "You are an educational assistant.",
              user_prompt: "Create study notes: {VIDEO_TRANSCRIPT}",
              temperature: 0.2,
            },
            key_takeaway: {
              name: "🎯 Key Takeaways",
              system_prompt: "You are a content strategist.",
              user_prompt: "Extract key takeaways: {VIDEO_TRANSCRIPT}",
              temperature: 0.6,
            },
            quiz_generator: {
              name: "❓ Quiz Generator",
              system_prompt: "You are an assessment designer.",
              user_prompt: "Generate quiz questions: {VIDEO_TRANSCRIPT}",
              temperature: 0.4,
            },
          },
        }),
    });
  });

  const importBackgroundScript = async () => {
    // Import the background script
    await import("../../../src/background/index");
    
    // Get the message handler that was registered
    const calls = mockChrome.runtime.onMessage.addListener.mock.calls;
    if (calls.length > 0) {
      messageHandler = calls[0][0];
    }
  };

  describe("Message Handler Registration", () => {
    it("should register message listener on import", async () => {
      await importBackgroundScript();
      
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe("API Key Testing", () => {
    beforeEach(async () => {
      await importBackgroundScript();
    });

    it("should handle OpenAI API key test", async () => {
      const mockResponse = { success: true, models: [{ name: "gpt-4", displayName: "GPT-4" }] };
      mockTestOpenApiKey.mockResolvedValue(mockResponse);

      const sendResponse = jest.fn();
      const request = {
        type: "testApiKey",
        payload: {
          platform: "openai",
          apiKey: "sk-test123",
        },
      };

      const result = messageHandler(request, {}, sendResponse);

      expect(result).toBe(true); // Should return true for async response
      expect(mockTestOpenApiKey).toHaveBeenCalledWith("sk-test123");

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sendResponse).toHaveBeenCalledWith(mockResponse);
    });

    it("should handle Anthropic API key test", async () => {
      const mockResponse = { success: true, models: [] };
      mockTestAnthropicApiKey.mockResolvedValue(mockResponse);

      const sendResponse = jest.fn();
      const request = {
        type: "testApiKey",
        payload: {
          platform: "anthropic",
          apiKey: "sk-ant-test123",
        },
      };

      messageHandler(request, {}, sendResponse);

      expect(mockTestAnthropicApiKey).toHaveBeenCalledWith("sk-ant-test123");

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sendResponse).toHaveBeenCalledWith(mockResponse);
    });

    it("should handle Gemini API key test", async () => {
      const mockResponse = { success: true, models: [{ name: "gemini-pro", displayName: "Gemini Pro" }] };
      mockTestGeminiApiKey.mockResolvedValue(mockResponse);

      const sendResponse = jest.fn();
      const request = {
        type: "testApiKey",
        payload: {
          platform: "gemini",
          apiKey: "AIzaSy-test123",
        },
      };

      messageHandler(request, {}, sendResponse);

      expect(mockTestGeminiApiKey).toHaveBeenCalledWith("AIzaSy-test123");

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sendResponse).toHaveBeenCalledWith(mockResponse);
    });

    it("should handle invalid platform for API key test", async () => {
      const sendResponse = jest.fn();
      const request = {
        type: "testApiKey",
        payload: {
          platform: "invalid",
          apiKey: "test-key",
        },
      };

      messageHandler(request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Invalid platform",
      });
    });

    it("should handle missing payload for API key test", async () => {
      const sendResponse = jest.fn();
      const request = {
        type: "testApiKey",
        payload: null,
      };

      messageHandler(request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Invalid request payload",
      });
    });

    it("should handle API key test errors", async () => {
      const error = new Error("Network error");
      mockTestOpenApiKey.mockRejectedValue(error);

      const sendResponse = jest.fn();
      const request = {
        type: "testApiKey",
        payload: {
          platform: "openai",
          apiKey: "sk-test123",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Network error",
      });
    });
  });

  describe("Summarization", () => {
    beforeEach(async () => {
      await importBackgroundScript();
    });

    it("should handle successful summarization", async () => {
      const mockSummaryResult = {
        summary: "This is a test summary of the video content.",
        tokenUsage: { inputTokens: 100, outputTokens: 50 }
      };
      mockGenerateSummary.mockResolvedValue(mockSummaryResult);

      // Mock storage response for Promise-based API with new storage structure
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({
          profile_default: {
            name: "Default Profile",
            platform: "openai",
            model: "gpt-4",
            apiKey: "sk-test123",
            language: "English",
            currentPreset: "detailed",
            presets: {}, // Empty in new structure
          },
          // Individual preset with custom modifications
          profile_default_detailed: {
            name: "Detailed",
            system_prompt: "Custom system prompt",
            user_prompt: "Custom user prompt",
            temperature: 0.8,
            isDefault: true,
          },
        });
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Hello world [0:05] This is a test transcript",
          profileId: "default",
          presetId: "detailed",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(null);
      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Default Profile",
          platform: "openai",
          model: "gpt-4",
          apiKey: "sk-test123",
          language: "English",
          currentPreset: "detailed",
          presets: expect.objectContaining({
            detailed: expect.objectContaining({
              name: "Detailed",
              system_prompt: "Custom system prompt",
              user_prompt: "Custom user prompt",
              temperature: 0.8,
              isDefault: true,
            }),
          }),
        }),
        "[0:00] Hello world [0:05] This is a test transcript",
        "Test Video",
        "10:30",
        "Test Channel",
        "Test description",
        "English"
      );

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        payload: { summary: mockSummaryResult.summary },
      });
    });

    it("should handle missing transcript", async () => {
      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "",
          profileId: "default",
          presetId: "detailed",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: "Could not find a transcript for this video.",
      });
    });

    it("should handle missing API key", async () => {
      // Mock storage response without API key
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({
          profile_default: {
            name: "Default Profile",
            platform: "openai",
            model: "gpt-4",
            // apiKey missing
            language: "English",
            presets: {},
            currentPreset: "detailed",
          },
        });
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Hello world",
          profileId: "default",
          presetId: "detailed",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: 'Error: API key for openai provider is missing in profile "default".',
      });
    });

    it("should handle missing profile", async () => {
      // Mock storage response with no profile
      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({});
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Hello world",
          profileId: "nonexistent",
          presetId: "detailed",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: 'Error: Profile "nonexistent" not found.',
      });
    });

    it("should handle generateSummary API errors", async () => {
      const apiError = new Error("API rate limit exceeded");
      mockGenerateSummary.mockRejectedValue(apiError);

      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({
          profile_default: {
            name: "Default Profile",
            platform: "openai",
            model: "gpt-4",
            apiKey: "sk-test123",
            language: "English",
            presets: {},
            currentPreset: "detailed",
          },
        });
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Hello world",
          profileId: "default",
          presetId: "detailed",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: "Error: API rate limit exceeded",
      });
    });

    it("should handle fetch errors when loading prompts", async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch prompts"));

      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({
          profile_default: {
            name: "Default Profile",
            platform: "openai",
            model: "gpt-4",
            apiKey: "sk-test123",
            language: "English",
            presets: {},
            currentPreset: "detailed",
          },
        });
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Hello world",
          profileId: "default",
          presetId: "detailed",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        error: "Error: Failed to fetch prompts",
      });
    });

    it("should merge custom presets with default presets", async () => {
      mockGenerateSummary.mockResolvedValue({
        summary: "Summary with custom preset",
        tokenUsage: { inputTokens: 80, outputTokens: 40 }
      });

      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({
          profile_default: {
            name: "Default Profile",
            platform: "openai",
            model: "gpt-4",
            apiKey: "sk-test123",
            language: "English",
            currentPreset: "custom",
            presets: {}, // Empty in new structure
          },
          // Custom preset stored individually
          profile_default_custom: {
            name: "Custom Preset",
            system_prompt: "Custom system",
            user_prompt: "Custom user",
            temperature: 1.0,
            isDefault: false,
          },
          // Modified default preset stored individually (only overridden fields)
          profile_default_detailed: {
            name: "Detailed Summary",
            system_prompt: "You are a helpful assistant.",
            user_prompt: "Summarize this transcript: {VIDEO_TRANSCRIPT}",
            temperature: 0.9, // This was modified from default
            isDefault: true,
          },
        });
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Hello world",
          profileId: "default",
          presetId: "custom",
          language: "English",
          videoTitle: "Test Video",
          videoDuration: "10:30",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPreset: "custom",
          presets: expect.objectContaining({
            // Should contain the custom preset
            custom: {
              name: "Custom Preset",
              system_prompt: "Custom system",
              user_prompt: "Custom user",
              temperature: 1.0,
              isDefault: false,
            },
            // Should contain the modified default preset
            detailed: expect.objectContaining({
              name: "Detailed Summary", // This should match the stored user override name
              system_prompt: "You are a helpful assistant.",
              user_prompt: "Summarize this transcript: {VIDEO_TRANSCRIPT}",
              temperature: 0.9, // Modified temperature
              isDefault: true,
            }),
          }),
        }),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe("Unknown Message Types", () => {
    beforeEach(async () => {
      await importBackgroundScript();
    });

    it("should return false for unknown message types", () => {
      const sendResponse = jest.fn();
      const request = {
        type: "unknownType",
        payload: {},
      };

      const result = messageHandler(request, {}, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });

  describe("Profile Reconstruction", () => {
    beforeEach(async () => {
      await importBackgroundScript();
    });

    it("should properly reconstruct profile with mixed default and custom presets", async () => {
      mockGenerateSummary.mockResolvedValue({
        summary: "Test summary",
        tokenUsage: { inputTokens: 120, outputTokens: 60 }
      });

      mockChrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({
          profile_test: {
            name: "Test Profile",
            platform: "anthropic",
            model: "claude-3-5-sonnet",
            apiKey: "sk-ant-test",
            language: "Spanish",
            currentPreset: "myCustom",
            presets: {}, // Empty in new structure
          },
          // Modified default preset stored individually
          profile_test_detailed: {
            name: "Detailed Summary", // From default
            system_prompt: "Modified system prompt", // From user override
            user_prompt: "Summarize this transcript: {VIDEO_TRANSCRIPT}", // From default
            temperature: 0.3, // From user override
            isDefault: true,
          },
          // Custom preset stored individually
          profile_test_myCustom: {
            name: "My Custom Preset",
            system_prompt: "My system",
            user_prompt: "My user prompt",
            temperature: 1.2,
            isDefault: false,
          },
        });
      });

      const sendResponse = jest.fn();
      const request = {
        type: "summarize",
        payload: {
          transcript: "[0:00] Test transcript",
          profileId: "test",
          presetId: "myCustom",
          language: "Spanish",
          videoTitle: "Test Video",
          videoDuration: "5:00",
          channelName: "Test Channel",
          videoDescription: "Test description",
        },
      };

      messageHandler(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Profile",
          platform: "anthropic",
          model: "claude-3-5-sonnet",
          apiKey: "sk-ant-test",
          language: "Spanish",
          currentPreset: "myCustom",
          presets: expect.objectContaining({
            // Should have the modified default preset
            detailed: expect.objectContaining({
              name: "Detailed Summary", // From user override
              system_prompt: "Modified system prompt", // From user override
              user_prompt: "Summarize this transcript: {VIDEO_TRANSCRIPT}", // From default
              temperature: 0.3, // From user override
              isDefault: true,
            }),
            // Should have the default brief preset (unmodified)
            brief: expect.objectContaining({
              name: "☕️ Brief Summary",
              system_prompt: "You are a concise assistant.",
              user_prompt: "Briefly summarize: {VIDEO_TRANSCRIPT}",
              temperature: 0.3,
              isDefault: true,
            }),
            // Should have the custom preset
            myCustom: {
              name: "My Custom Preset",
              system_prompt: "My system",
              user_prompt: "My user prompt",
              temperature: 1.2,
              isDefault: false,
            },
          }),
        }),
        "[0:00] Test transcript",
        "Test Video",
        "5:00",
        "Test Channel",
        "Test description",
        "Spanish"
      );

      expect(sendResponse).toHaveBeenCalledWith({
        type: "summarizeResponse",
        payload: { summary: "Test summary" },
      });
    });
  });
});