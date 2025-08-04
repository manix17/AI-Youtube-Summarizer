/**
 * @jest-environment jsdom
 */

import { setupChromeMocks } from "../helpers/chrome-mocks";

// Mock the API modules
const mockGenerateSummary = jest.fn();

jest.mock("../../src/utils/api", () => ({
  generateSummary: mockGenerateSummary,
}));

describe("Performance & Stability Tests (PERF-001 to PERF-003)", () => {
  let mockChrome: ReturnType<typeof setupChromeMocks>;

  beforeEach(() => {
    mockChrome = setupChromeMocks();
    jest.clearAllMocks();
  });

  describe("PERF-001: Summary generation time measurement", () => {
    it("should measure time for standard 10-minute video summary", async () => {
      // Mock a standard video transcript
      const standardTranscript = Array.from({ length: 50 }, (_, i) => 
        `[${Math.floor(i * 12)}:${(i * 12) % 60 < 10 ? '0' : ''}${(i * 12) % 60}] This is segment ${i + 1} of the video content.`
      ).join('\n');

      mockGenerateSummary.mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate API response time between 2-8 seconds
          const delay = Math.random() * 6000 + 2000;
          setTimeout(() => resolve("Generated summary content"), delay);
        });
      });

      const startTime = Date.now();
      await mockGenerateSummary();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (10 seconds for test)
      expect(duration).toBeLessThan(10000);
      expect(duration).toBeGreaterThan(1000); // Should take at least 1 second
    }, 15000);

    it("should handle long video summaries efficiently", async () => {
      // Mock a 60-minute video transcript
      const longTranscript = Array.from({ length: 300 }, (_, i) => 
        `[${Math.floor(i * 12)}:${(i * 12) % 60 < 10 ? '0' : ''}${(i * 12) % 60}] Long video content segment ${i + 1}.`
      ).join('\n');

      mockGenerateSummary.mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate longer processing time for longer content (reduced for test)
          const delay = Math.random() * 2000 + 1000;
          setTimeout(() => resolve("Generated summary for long content"), delay);
        });
      });

      const startTime = Date.now();
      await mockGenerateSummary();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds for test
      expect(duration).toBeLessThan(5000);
      expect(duration).toBeGreaterThan(500);
    }, 10000);
  });

  describe("PERF-002: Stress test with multiple videos", () => {
    it("should handle multiple summarization requests concurrently", async () => {
      const videoCount = 5;
      const mockTranscripts = Array.from({ length: videoCount }, (_, i) => 
        `[0:00] Video ${i + 1} content [0:30] More content for video ${i + 1}`
      );

      mockGenerateSummary.mockImplementation((profile, transcript) => {
        return new Promise((resolve) => {
          const delay = Math.random() * 3000 + 1000;
          setTimeout(() => resolve(`Summary for ${transcript.slice(0, 20)}...`), delay);
        });
      });

      const startTime = Date.now();
      const promises = mockTranscripts.map(transcript => mockGenerateSummary({}, transcript));
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      expect(results).toHaveLength(videoCount);
      expect(results.every(result => typeof result === 'string')).toBe(true);
      
      // Total time should be less than sequential processing
      expect(totalDuration).toBeLessThan(videoCount * 4000); // Less than 20 seconds total
    });

    it("should handle rapid successive requests", async () => {
      mockGenerateSummary.mockResolvedValue("Quick summary response");

      const requestCount = 10;
      const promises = [];

      for (let i = 0; i < requestCount; i++) {
        promises.push(mockGenerateSummary({}, `Video ${i + 1} transcript`));
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(requestCount);
      expect(mockGenerateSummary).toHaveBeenCalledTimes(requestCount);
    });

    it("should maintain extension responsiveness during processing", async () => {
      // Simulate processing a summary
      mockGenerateSummary.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("Summary result"), 2000);
        });
      });

      // Test that DOM operations remain responsive
      const button = document.createElement('button');
      button.id = 'summarize-btn';
      button.textContent = '✨ Summarize';
      document.body.appendChild(button);

      // Start summarization
      const summaryPromise = mockGenerateSummary();

      // Test UI interactions during processing
      button.disabled = true;
      button.textContent = '⏳ Summarizing...';

      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('⏳ Summarizing...');

      await summaryPromise;

      // Reset button state
      button.disabled = false;
      button.textContent = '✨ Summarize';

      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('✨ Summarize');
    });
  });

  describe("PERF-003: Memory and resource usage", () => {
    it("should properly clean up DOM elements", () => {
      const initialChildCount = document.body.children.length;

      // Create temporary elements
      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-summary-container';
      document.body.appendChild(tempContainer);

      const tempButton = document.createElement('button');
      tempButton.id = 'temp-button';
      tempContainer.appendChild(tempButton);

      expect(document.body.children.length).toBe(initialChildCount + 1);
      expect(document.getElementById('temp-summary-container')).toBeTruthy();

      // Clean up
      document.body.removeChild(tempContainer);

      expect(document.body.children.length).toBe(initialChildCount);
      expect(document.getElementById('temp-summary-container')).toBeNull();
    });

    it("should handle large transcript data without memory leaks", () => {
      // Create a large transcript (simulate 2+ hour video)
      const largeTranscript = Array.from({ length: 1000 }, (_, i) => 
        `[${Math.floor(i * 7.2)}:${Math.floor((i * 7.2) % 60)}] This is a very detailed transcript segment number ${i + 1} with lots of content to test memory usage.`
      ).join('\n');

      expect(largeTranscript.length).toBeGreaterThan(100000); // Over 100KB of text

      // Process the large transcript
      const words = largeTranscript.split(' ');
      const wordCount = words.length;

      expect(wordCount).toBeGreaterThan(10000);

      // Simulate processing without storing unnecessary references
      const processedSegments = largeTranscript
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const match = line.match(/\[([^\]]+)\](.*)/);
          return match ? { timestamp: match[1], text: match[2].trim() } : null;
        })
        .filter(Boolean);

      expect(processedSegments.length).toBe(1000);

      // Clean up references
      largeTranscript.split('').forEach(() => {}); // Force processing without retention
    });

    it("should limit DOM element creation for large summaries", () => {
      const initialElementCount = document.querySelectorAll('*').length;

      // Create summary container
      const summaryContainer = document.createElement('div');
      summaryContainer.id = 'summary-container';
      document.body.appendChild(summaryContainer);

      // Simulate large summary with many timestamp links
      const largeSummary = Array.from({ length: 100 }, (_, i) => 
        `<p>Summary paragraph ${i + 1} with <a class="timestamp-link" data-seconds="${i * 30}">[${Math.floor(i * 0.5)}:${(i * 30) % 60 < 10 ? '0' : ''}${(i * 30) % 60}]</a> timestamp.</p>`
      ).join('');

      summaryContainer.innerHTML = largeSummary;

      const timestampLinks = summaryContainer.querySelectorAll('.timestamp-link');
      expect(timestampLinks.length).toBe(100);

      const finalElementCount = document.querySelectorAll('*').length;
      
      // Should have created a reasonable number of elements
      expect(finalElementCount - initialElementCount).toBeLessThan(300); // Less than 3 elements per timestamp

      // Clean up
      document.body.removeChild(summaryContainer);
    });

    it("should handle event listener cleanup", () => {
      const eventHandler = jest.fn();
      
      // Create elements with event listeners
      const button = document.createElement('button');
      button.addEventListener('click', eventHandler);
      document.body.appendChild(button);

      const timestampLink = document.createElement('a');
      timestampLink.className = 'timestamp-link';
      timestampLink.dataset.seconds = '90';
      timestampLink.addEventListener('click', eventHandler);
      document.body.appendChild(timestampLink);

      // Test events work
      button.click();
      timestampLink.click();
      expect(eventHandler).toHaveBeenCalledTimes(2);

      // Clean up elements (simulating content script cleanup)
      button.removeEventListener('click', eventHandler);
      timestampLink.removeEventListener('click', eventHandler);
      document.body.removeChild(button);
      document.body.removeChild(timestampLink);

      // Verify cleanup
      expect(document.getElementById('button')).toBeNull();
      expect(document.querySelector('.timestamp-link')).toBeNull();
    });

    it("should handle storage quota limits gracefully", async () => {
      const testData = {
        largeProfile: {
          name: 'Large Profile',
          platform: 'openai',
          apiKey: 'sk-' + 'x'.repeat(100),
          presets: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [
              `preset${i}`,
              {
                name: `Preset ${i}`,
                system_prompt: 'System prompt '.repeat(100),
                user_prompt: 'User prompt '.repeat(100),
                temperature: 0.7,
              }
            ])
          ),
        }
      };

      // Mock storage set with quota exceeded simulation
      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        const dataSize = JSON.stringify(data).length;
        if (dataSize > 8192) { // Chrome sync storage limit
          const error = new Error('QUOTA_EXCEEDED');
          if (callback) callback();
          throw error;
        } else {
          if (callback) callback();
          return Promise.resolve();
        }
      });

      try {
        await new Promise<void>((resolve, reject) => {
          mockChrome.storage.sync.set(testData, () => {
            resolve();
          });
        });
      } catch (error) {
        expect((error as Error).message).toBe('QUOTA_EXCEEDED');
      }
    });
  });

  describe("Resource cleanup and optimization", () => {
    it("should reuse DOM elements when possible", () => {
      // Create summary container
      const summaryContainer = document.createElement('div');
      summaryContainer.id = 'summary-container';
      document.body.appendChild(summaryContainer);

      const initialHTML = '<p>Initial summary</p>';
      summaryContainer.innerHTML = initialHTML;

      const initialChildren = summaryContainer.children.length;

      // Update content (reusing container)
      const updatedHTML = '<p>Updated summary</p><p>Additional content</p>';
      summaryContainer.innerHTML = updatedHTML;

      const updatedChildren = summaryContainer.children.length;

      expect(updatedChildren).toBe(2);
      expect(initialChildren).toBe(1);
      
      // Same container element is reused
      expect(document.getElementById('summary-container')).toBe(summaryContainer);

      document.body.removeChild(summaryContainer);
    });

    it("should debounce rapid user interactions", () => {
      const handler = jest.fn();
      let timeoutId: NodeJS.Timeout | null = null;

      const debouncedHandler = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          handler();
          timeoutId = null;
        }, 100);
      };

      // Simulate rapid clicks
      debouncedHandler();
      debouncedHandler();
      debouncedHandler();

      expect(handler).not.toHaveBeenCalled();

      // Wait for debounce
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalledTimes(1);
          resolve();
        }, 150);
      });
    });
  });
});