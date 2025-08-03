/**
 * @jest-environment jsdom
 */

import {
  testOpenApiKey,
  testAnthropicApiKey,
  testGeminiApiKey,
} from "../../../src/utils/api_tester";

describe("API Tester Utils", () => {
  const mockFetch = jest.fn();
  
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  describe("testOpenApiKey", () => {
    it("should return success for a valid key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: "gpt-3.5-turbo" }],
        }),
      });

      const result = await testOpenApiKey("sk-12345");
      expect(result.success).toBe(true);
      expect(result.models).toEqual([{ name: "gpt-3.5-turbo", displayName: "gpt-3.5-turbo" }]);
    });

    it("should return an error for an invalid key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: "Invalid API key." },
        }),
      });

      const result = await testOpenApiKey("sk-invalid");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid API key.");
    });

    it("should return an error for a key with invalid format", async () => {
      const result = await testOpenApiKey("invalid-key");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid OpenAI API key format.");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await testOpenApiKey("sk-valid");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });

  describe("testAnthropicApiKey", () => {
    it("should return success for a valid key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: "test response" }],
        }),
      });

      const result = await testAnthropicApiKey("sk-ant-validkeywithenoughlengthtomeetrequirements");
      expect(result.success).toBe(true);
    });

    it("should return an error for invalid format", async () => {
      const result = await testAnthropicApiKey("invalid-key");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid Anthropic API key format.");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: "Forbidden" },
        }),
      });

      const result = await testAnthropicApiKey("sk-ant-validkeywithenoughlengthtomeetrequirements");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden");
    });
  });

  describe("testGeminiApiKey", () => {
    it("should return success for a valid key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: "models/gemini-pro", displayName: "Gemini Pro" },
            { name: "models/gemini-pro-vision", displayName: "Gemini Pro Vision" },
          ],
        }),
      });

      const result = await testGeminiApiKey("AIzaSyValidKeyWithEnoughLengthToPassValidation");
      expect(result.success).toBe(true);
      expect(result.models).toHaveLength(2);
    });

    it("should return an error for invalid format", async () => {
      const result = await testGeminiApiKey("invalid-key");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid Google Gemini API key format.");
    });

    it("should handle empty models response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [],
        }),
      });

      const result = await testGeminiApiKey("AIzaSyValidKeyWithEnoughLengthToPassValidation");
      expect(result.success).toBe(true);
      expect(result.models).toEqual([]);
    });

    it("should handle API errors with error object", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: "API key not valid",
            code: 400,
          },
        }),
      });

      const result = await testGeminiApiKey("AIzaSyValidKeyWithEnoughLengthToPassValidation");
      expect(result.success).toBe(false);
      expect(result.error).toBe("API key not valid");
    });
  });
});