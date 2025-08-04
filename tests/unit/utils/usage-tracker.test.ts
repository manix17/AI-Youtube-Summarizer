/**
 * @jest-environment jsdom
 */

import {
  estimateTokenCount,
  formatLargeNumber,
  formatBytes,
  getTokenUsage,
  updateTokenUsage,
  resetTokenUsage,
  getStorageInfo,
  getStorageUsagePercentage,
  trackSummarization,
} from "../../../src/utils/usage_tracker";
import { setupChromeMocks } from "../../helpers/chrome-mocks";

describe("Usage Tracker Utils", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    jest.clearAllMocks();
  });

  describe("estimateTokenCount", () => {
    it("should estimate token count for text", () => {
      expect(estimateTokenCount("")).toBe(0);
      expect(estimateTokenCount("hello")).toBe(2); // 5 chars / 4 = 1.25, rounded up to 2
      expect(estimateTokenCount("this is a test")).toBe(4); // 14 chars / 4 = 3.5, rounded up to 4
      expect(estimateTokenCount("a".repeat(100))).toBe(25); // 100 chars / 4 = 25
    });

    it("should handle whitespace correctly", () => {
      expect(estimateTokenCount("  hello   world  ")).toBe(3); // "hello world" = 11 chars / 4 = 2.75, rounded up to 3
    });
  });

  describe("formatLargeNumber", () => {
    it("should format numbers correctly", () => {
      expect(formatLargeNumber(0)).toBe("0");
      expect(formatLargeNumber(999)).toBe("999");
      expect(formatLargeNumber(1000)).toBe("1.0K");
      expect(formatLargeNumber(1500)).toBe("1.5K");
      expect(formatLargeNumber(1000000)).toBe("1.0M");
      expect(formatLargeNumber(1500000)).toBe("1.5M");
      expect(formatLargeNumber(1000000000)).toBe("1.0B");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes to KiB", () => {
      expect(formatBytes(0)).toBe("0.0 KiB");
      expect(formatBytes(1024)).toBe("1.0 KiB");
      expect(formatBytes(1536)).toBe("1.5 KiB");
      expect(formatBytes(102400)).toBe("100.0 KiB");
    });
  });

  describe("getTokenUsage", () => {
    it("should return default usage when no data exists", async () => {
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        if (callback) {
          callback({});
        } else {
          return Promise.resolve({});
        }
      });

      const usage = await getTokenUsage();
      
      expect(usage.totalTokens).toBe(0);
      expect(usage.totalRequests).toBe(0);
      expect(usage.platformUsage).toEqual({});
      expect(usage.lastReset).toBeDefined();
    });

    it("should return existing usage data", async () => {
      const existingUsage = {
        totalTokens: 1000,
        totalRequests: 5,
        lastReset: "2024-01-01T00:00:00.000Z",
        platformUsage: {
          openai: { tokens: 600, requests: 3, lastUsed: "2024-01-01T00:00:00.000Z" },
          anthropic: { tokens: 400, requests: 2, lastUsed: "2024-01-01T00:00:00.000Z" },
        },
      };

      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        if (callback) {
          callback({ token_usage_stats: existingUsage });
        } else {
          return Promise.resolve({ token_usage_stats: existingUsage });
        }
      });

      const usage = await getTokenUsage();
      
      expect(usage).toEqual(existingUsage);
    });
  });

  describe("updateTokenUsage", () => {
    it("should update token usage for new platform", async () => {
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        const data = {
          token_usage_stats: {
            totalTokens: 0,
            totalRequests: 0,
            lastReset: "2024-01-01T00:00:00.000Z",
            platformUsage: {},
          },
        };
        if (callback) {
          callback(data);
        } else {
          return Promise.resolve(data);
        }
      });

      const mockSet = jest.fn((data, callback) => callback && callback());
      mockChrome.storage.sync.set = mockSet;

      await updateTokenUsage("openai", 100);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          token_usage_stats: expect.objectContaining({
            totalTokens: 100,
            totalRequests: 1,
            platformUsage: expect.objectContaining({
              openai: expect.objectContaining({
                tokens: 100,
                requests: 1,
              }),
            }),
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe("resetTokenUsage", () => {
    it("should reset all token usage statistics", async () => {
      const mockSet = jest.fn((data, callback) => callback && callback());
      mockChrome.storage.sync.set = mockSet;

      await resetTokenUsage();

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          token_usage_stats: expect.objectContaining({
            totalTokens: 0,
            totalRequests: 0,
            platformUsage: {},
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe("getStorageInfo", () => {
    it("should calculate storage information correctly", async () => {
      const mockStorageData = {
        profile_default: { name: "Default", platform: "openai" },
        profile_custom: { name: "Custom", platform: "anthropic" },
        token_usage_stats: { totalTokens: 1000 },
        other_data: "some other data",
      };

      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        if (callback) {
          callback(mockStorageData);
        } else {
          return Promise.resolve(mockStorageData);
        }
      });

      const storageInfo = await getStorageInfo();

      expect(storageInfo.totalSize).toBeGreaterThan(0);
      expect(storageInfo.maxSize).toBe(102400); // 100KB
      expect(storageInfo.profiles).toHaveProperty("default");
      expect(storageInfo.profiles).toHaveProperty("custom");
      expect(storageInfo.usage).toBeDefined();
      expect(storageInfo.other).toBeGreaterThan(0);
    });
  });

  describe("getStorageUsagePercentage", () => {
    it("should calculate storage usage percentage", () => {
      const storageInfo = {
        totalSize: 25600, // 25KB
        maxSize: 102400, // 100KB
        profiles: {},
        usage: {} as any,
        other: 0,
      };

      const percentage = getStorageUsagePercentage(storageInfo);
      expect(percentage).toBe(25); // 25KB / 100KB = 25%
    });
  });

  describe("trackSummarization", () => {
    it("should track token usage for a summarization", async () => {
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        const data = {
          token_usage_stats: {
            totalTokens: 0,
            totalRequests: 0,
            lastReset: "2024-01-01T00:00:00.000Z",
            platformUsage: {},
          },
        };
        if (callback) {
          callback(data);
        } else {
          return Promise.resolve(data);
        }
      });

      const mockSet = jest.fn((data, callback) => callback && callback());
      mockChrome.storage.sync.set = mockSet;

      await trackSummarization(
        "openai",
        "You are a helpful assistant.",
        "Summarize this: {transcript}",
        "This is a test transcript with some content.",
        "This is a summary of the content."
      );

      // Should have been called with updated token counts
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          token_usage_stats: expect.objectContaining({
            totalTokens: expect.any(Number),
            totalRequests: 1,
            platformUsage: expect.objectContaining({
              openai: expect.objectContaining({
                tokens: expect.any(Number),
                requests: 1,
              }),
            }),
          }),
        }),
        expect.any(Function)
      );

      // Verify that tokens were estimated and tracked
      const setCall = mockSet.mock.calls[0][0];
      const trackedUsage = setCall.token_usage_stats;
      expect(trackedUsage.totalTokens).toBeGreaterThan(0);
      expect(trackedUsage.platformUsage.openai.tokens).toBeGreaterThan(0);
    });
  });
});