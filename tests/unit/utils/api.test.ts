/**
 * @jest-environment jsdom
 */

import { generateSummary } from "../../../src/utils/api";
import type { Profile } from "../../../src/types";

describe("API Utils", () => {
  const mockFetch = jest.fn();
  
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  const createMockProfile = (platform: string): Profile => ({
    name: "Test Profile",
    platform: platform as any,
    models: {
      openai: "gpt-4",
      anthropic: "claude-3-5-sonnet",
      gemini: "models/gemini-2.5-flash",
      openrouter: "openrouter/auto",
    },
    apiKeys: {
      openai: "test-openai-key",
      anthropic: "test-anthropic-key",
      gemini: "test-gemini-key",
      openrouter: "test-openrouter-key",
    },
    language: "English",
    presets: {
      detailed: {
        name: "Detailed Summary",
        system_prompt: "You are a helpful assistant.",
        user_prompt: "Summarize this transcript: {transcript}",
        temperature: 0.7,
      },
    },
    currentPreset: "detailed",
  });

  describe("generateSummary", () => {
    const mockTranscript = "[0:00] Hello world [0:05] This is a test transcript";
    const mockVideoTitle = "Test Video";
    const mockVideoDuration = "10";
    const mockChannelName = "Test Channel";
    const mockVideoDescription = "This is a test video description.";
    const mockLanguage = "English";

    it("should generate summary using OpenAI", async () => {
      const profile = createMockProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "This is a test summary" } }],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 25,
            total_tokens: 75,
          },
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockVideoDescription,
        mockLanguage
      );

      expect(result.summary).toBe("This is a test summary");
      expect(result.tokenUsage).toEqual({
        inputTokens: 50,
        outputTokens: 25,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-openai-key",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should generate summary using Anthropic", async () => {
      const profile = createMockProfile("anthropic");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "This is an Anthropic summary" }],
          usage: {
            input_tokens: 60,
            output_tokens: 30,
          },
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockVideoDescription,
        mockLanguage
      );

      expect(result.summary).toBe("This is an Anthropic summary");
      expect(result.tokenUsage).toEqual({
        inputTokens: 60,
        outputTokens: 30,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-anthropic-key",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should generate summary using Gemini", async () => {
      const profile = createMockProfile("gemini");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "This is a Gemini summary" }] } }],
          usageMetadata: {
            promptTokenCount: 40,
            candidatesTokenCount: 20,
            totalTokenCount: 70,
            thoughtsTokenCount: 10,
          },
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockVideoDescription,
        mockLanguage
      );

      expect(result.summary).toBe("This is a Gemini summary");
      expect(result.tokenUsage).toEqual({
        inputTokens: 40,
        outputTokens: 30, // 20 candidates + 10 thoughts
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      const profile = createMockProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Internal server error." },
        }),
      });

      await expect(
        generateSummary(
          profile,
          mockTranscript,
          mockVideoTitle,
          mockVideoDuration,
          mockChannelName,
          mockVideoDescription,
          mockLanguage
        )
      ).rejects.toThrow("Could not generate summary");
    });

    it("should handle network errors", async () => {
      const profile = createMockProfile("openai");
      
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        generateSummary(
          profile,
          mockTranscript,
          mockVideoTitle,
          mockVideoDuration,
          mockChannelName,
          mockVideoDescription,
          mockLanguage
        )
      ).rejects.toThrow("Could not generate summary");
    });

    it("should handle API responses without token usage", async () => {
      const profile = createMockProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "This is a test summary" } }],
          // No usage field provided
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockVideoDescription,
        mockLanguage
      );

      expect(result.summary).toBe("This is a test summary");
      expect(result.tokenUsage).toBeUndefined();
    });

    it("should handle Gemini responses without thoughts token count", async () => {
      const profile = createMockProfile("gemini");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "This is a Gemini summary" }] } }],
          usageMetadata: {
            promptTokenCount: 40,
            candidatesTokenCount: 20,
            totalTokenCount: 60,
            // No thoughtsTokenCount provided
          },
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockVideoDescription,
        mockLanguage
      );

      expect(result.summary).toBe("This is a Gemini summary");
      expect(result.tokenUsage).toEqual({
        inputTokens: 40,
        outputTokens: 20, // Only candidates tokens since no thoughts
      });
    });

    it("should handle blocked content from Gemini", async () => {
      const profile = createMockProfile("gemini");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          promptFeedback: {
            blockReason: "SAFETY",
          },
        }),
      });

      await expect(
        generateSummary(
          profile,
          mockTranscript,
          mockVideoTitle,
          mockVideoDuration,
          mockChannelName,
          mockVideoDescription,
          mockLanguage
        )
      ).rejects.toThrow("Could not generate summary");
    });

    it("should replace placeholders in prompts", async () => {
      const profile = createMockProfile("openai");
      profile.presets.detailed.user_prompt = "Title: {VIDEO_TITLE}, Duration: {VIDEO_DURATION}, Transcript: {VIDEO_TRANSCRIPT}";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Test summary" } }],
        }),
      });

      await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockVideoDescription,
        mockLanguage
      );

      const fetchCall = mockFetch.mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      const userMessage = body.messages.find((m: any) => m.role === "user");
      
      expect(userMessage.content).toContain("Test Video");
      expect(userMessage.content).toContain("10");
      expect(userMessage.content).toContain(mockTranscript);
    });
  });
});