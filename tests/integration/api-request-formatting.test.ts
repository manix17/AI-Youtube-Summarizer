/**
 * @jest-environment jsdom
 */

import { generateSummary } from "../../src/utils/api";
import type { Profile } from "../../src/types";

describe("API Request Formatting Integration (CORE-006)", () => {
  const mockFetch = jest.fn();
  
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  const createTestProfile = (platform: string, overrides: Partial<Profile> = {}): Profile => ({
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
        system_prompt: "You are a helpful assistant that summarizes videos.",
        user_prompt: "Please summarize this video transcript: {VIDEO_TRANSCRIPT}. Video title: {VIDEO_TITLE}, Duration: {VIDEO_DURATION}, Channel: {CHANNEL_NAME}",
        temperature: 0.7,
      },
    },
    currentPreset: "detailed",
    ...overrides,
  });

  describe("OpenAI API Request Formatting", () => {
    it("should format OpenAI request with correct structure", async () => {
      const profile = createTestProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Test summary" } }],
        }),
      });

      await generateSummary(
        profile,
        "[0:00] Hello world [0:30] This is a test",
        "Test Video",
        "5:30",
        "Test Channel",
        "English"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("messages"),
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(requestBody).toHaveProperty("model", "gpt-4");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("temperature", 0.7);
      expect(requestBody.messages).toHaveLength(2); // system + user
      expect(requestBody.messages[0].role).toBe("system");
      expect(requestBody.messages[1].role).toBe("user");
    });

    it("should replace placeholders in OpenAI prompts", async () => {
      const profile = createTestProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Test summary" } }],
        }),
      });

      await generateSummary(
        profile,
        "[0:00] Test transcript content",
        "My Test Video",
        "10:45",
        "My Channel",
        "English"
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = requestBody.messages[1].content;
      
      expect(userMessage).toContain("My Test Video");
      expect(userMessage).toContain("10:45");
      expect(userMessage).toContain("My Channel");
      expect(userMessage).toContain("[0:00] Test transcript content");
    });
  });

  describe("Anthropic API Request Formatting", () => {
    it("should format Anthropic request with correct structure", async () => {
      const profile = createTestProfile("anthropic");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "Test summary" }],
        }),
      });

      await generateSummary(
        profile,
        "[0:00] Hello world",
        "Test Video",
        "3:45",
        "Test Channel",
        "English"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-api-key",
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          }),
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(requestBody).toHaveProperty("model", "claude-3-5-sonnet");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("system");
      expect(requestBody).toHaveProperty("temperature", 0.7);
      expect(requestBody).toHaveProperty("max_tokens");
      expect(requestBody.messages).toHaveLength(1); // user only (system separate)
      expect(requestBody.messages[0].role).toBe("user");
    });

    it("should replace placeholders in Anthropic prompts", async () => {
      const profile = createTestProfile("anthropic");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "Test summary" }],
        }),
      });

      await generateSummary(
        profile,
        "[0:00] Anthropic test content",
        "Anthropic Video",
        "7:20",
        "Claude Channel",
        "Spanish"
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = requestBody.messages[0].content;
      
      expect(userMessage).toContain("Anthropic Video");
      expect(userMessage).toContain("7:20");
      expect(userMessage).toContain("Claude Channel");
      expect(userMessage).toContain("[0:00] Anthropic test content");
    });
  });

  describe("Gemini API Request Formatting", () => {
    it("should format Gemini request with correct structure", async () => {
      const profile = createTestProfile("gemini");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Test summary" }] } }],
        }),
      });

      await generateSummary(
        profile,
        "[0:00] Hello Gemini",
        "Gemini Test",
        "2:15",
        "Google Channel",
        "English"
      );

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("generativelanguage.googleapis.com");
      expect(callUrl).toContain("key=test-api-key");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(requestBody).toHaveProperty("contents");
      expect(requestBody).toHaveProperty("generationConfig");
      expect(requestBody.generationConfig).toHaveProperty("temperature", 0.7);
      expect(requestBody.contents).toHaveLength(1); // Combined user message
      expect(requestBody.contents[0].role).toBe("user");
    });

    it("should replace placeholders in Gemini prompts", async () => {
      const profile = createTestProfile("gemini");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Test summary" }] } }],
        }),
      });

      await generateSummary(
        profile,
        "[0:00] Gemini transcript data",
        "Amazing Gemini Video",
        "15:30",
        "AI Channel",
        "French"
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userContent = requestBody.contents[0].parts[0].text;
      
      expect(userContent).toContain("Amazing Gemini Video");
      expect(userContent).toContain("15:30");
      expect(userContent).toContain("AI Channel");
      expect(userContent).toContain("[0:00] Gemini transcript data");
    });
  });

  describe("Error Response Handling", () => {
    it("should handle OpenAI error responses", async () => {
      const profile = createTestProfile("openai");
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Invalid request format" },
        }),
      });

      await expect(
        generateSummary(profile, "[0:00] Test", "Test", "1:00", "Test", "English")
      ).rejects.toThrow("Could not generate summary");
    });

    it("should handle Anthropic error responses", async () => {
      const profile = createTestProfile("anthropic");
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: "Rate limit exceeded" },
        }),
      });

      await expect(
        generateSummary(profile, "[0:00] Test", "Test", "1:00", "Test", "English")
      ).rejects.toThrow("Could not generate summary");
    });

    it("should handle Gemini error responses", async () => {
      const profile = createTestProfile("gemini");
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: "API key invalid" },
        }),
      });

      await expect(
        generateSummary(profile, "[0:00] Test", "Test", "1:00", "Test", "English")
      ).rejects.toThrow("Could not generate summary");
    });
  });

  describe("Custom Temperature and Model Settings", () => {
    it("should use custom temperature in requests", async () => {
      const profile = createTestProfile("openai");
      profile.presets.detailed.temperature = 1.2;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Test" } }] }),
      });

      await generateSummary(profile, "[0:00] Test", "Test", "1:00", "Test", "English");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(1.2);
    });

    it("should use correct model in requests", async () => {
      const profile = createTestProfile("anthropic");
      profile.models.anthropic = "claude-3-opus";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ text: "Test" }] }),
      });

      await generateSummary(profile, "[0:00] Test", "Test", "1:00", "Test", "English");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe("claude-3-opus");
    });
  });

  describe("Large Content Handling", () => {
    it("should handle large transcripts", async () => {
      const profile = createTestProfile("openai");
      const largeTranscript = Array.from({ length: 500 }, (_, i) => 
        `[${Math.floor(i * 6 / 60)}:${(i * 6) % 60 < 10 ? '0' : ''}${(i * 6) % 60}] This is transcript segment ${i + 1} with detailed content.`
      ).join(' ');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Large summary" } }] }),
      });

      const result = await generateSummary(
        profile,
        largeTranscript,
        "Long Video",
        "50:00",
        "Channel",
        "English"
      );

      expect(result).toBe("Large summary");
      
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = requestBody.messages[1].content;
      expect(userMessage.length).toBeGreaterThan(10000);
    });
  });

  describe("Special Characters and Encoding", () => {
    it("should handle special characters in content", async () => {
      const profile = createTestProfile("openai");
      const specialTranscript = "[0:00] Hello 世界! This has émojis 🎉 and spëcial chars & symbols <>&\"'";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Special summary" } }] }),
      });

      await generateSummary(
        profile,
        specialTranscript,
        "Spëcial Video! 🎬",
        "1:30",
        "Channel & Co",
        "English"
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = requestBody.messages[1].content;
      
      expect(userMessage).toContain("世界");
      expect(userMessage).toContain("🎉");
      expect(userMessage).toContain("émojis");
      expect(userMessage).toContain("Spëcial Video! 🎬");
      expect(userMessage).toContain("Channel & Co");
    });
  });
});