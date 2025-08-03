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
    model: platform === "openai" ? "gpt-4" : platform === "anthropic" ? "claude-3-5-sonnet" : "gemini-2.5-flash",
    apiKey: "test-key",
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
    const mockLanguage = "English";

    it("should generate summary using OpenAI", async () => {
      const profile = createMockProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "This is a test summary" } }],
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockLanguage
      );

      expect(result).toBe("This is a test summary");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-key",
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
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockLanguage
      );

      expect(result).toBe("This is an Anthropic summary");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-key",
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
        }),
      });

      const result = await generateSummary(
        profile,
        mockTranscript,
        mockVideoTitle,
        mockVideoDuration,
        mockChannelName,
        mockLanguage
      );

      expect(result).toBe("This is a Gemini summary");
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
          mockLanguage
        )
      ).rejects.toThrow("Could not generate summary");
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