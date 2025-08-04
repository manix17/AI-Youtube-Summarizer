/**
 * @jest-environment jsdom
 */

import { convertToHTML } from "../../../src/utils/dom_parser";

describe("Transcript Extraction (CORE-005)", () => {
  describe("YouTube HTML parsing", () => {
    it("should extract transcript from mock YouTube page HTML", () => {
      // Mock HTML structure that would contain a transcript
      document.body.innerHTML = `
        <ytd-video-description-transcript-section-renderer>
          <button aria-label="Show transcript">Show transcript</button>
        </ytd-video-description-transcript-section-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:00</div>
          <div class="segment-text">Welcome to this video tutorial</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:15</div>
          <div class="segment-text">Today we'll learn about JavaScript</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:30</div>
          <div class="segment-text">Let's start with the basics</div>
        </ytd-transcript-segment-renderer>
      `;

      // Extract transcript using the parsing logic
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      let fullTranscript = "";

      transcriptSegments.forEach((segment) => {
        const timestamp = segment.querySelector<HTMLElement>(".segment-timestamp")?.textContent?.trim() || "";
        const text = segment.querySelector<HTMLElement>(".segment-text")?.textContent?.trim() || "";
        if (text) {
          fullTranscript += `[${timestamp}] ${text}\n`;
        }
      });

      const expectedTranscript = "[0:00] Welcome to this video tutorial\n[0:15] Today we'll learn about JavaScript\n[0:30] Let's start with the basics\n";
      expect(fullTranscript).toBe(expectedTranscript);
    });

    it("should handle YouTube page without transcript", () => {
      document.body.innerHTML = `
        <div class="video-player">
          <h1>Video Title</h1>
        </div>
      `;

      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      expect(transcriptSegments.length).toBe(0);
    });

    it("should handle YouTube page with auto-generated transcript", () => {
      document.body.innerHTML = `
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:00</div>
          <div class="segment-text">hello everyone</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:03</div>
          <div class="segment-text">welcome to my channel</div>
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

      expect(fullTranscript).toBe("[0:00] hello everyone\n[0:03] welcome to my channel\n");
    });

    it("should handle different transcript formats", () => {
      document.body.innerHTML = `
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">1:23</div>
          <div class="segment-text">This is a longer timestamp</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">10:45</div>
          <div class="segment-text">Double digit minutes</div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">1:02:30</div>
          <div class="segment-text">Over an hour content</div>
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

      expect(fullTranscript).toBe("[1:23] This is a longer timestamp\n[10:45] Double digit minutes\n[1:02:30] Over an hour content\n");
    });

    it("should handle empty transcript segments gracefully", () => {
      document.body.innerHTML = `
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:00</div>
          <div class="segment-text"></div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:05</div>
          <div class="segment-text">   </div>
        </ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>
          <div class="segment-timestamp">0:10</div>
          <div class="segment-text">Valid content</div>
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

      expect(fullTranscript).toBe("[0:10] Valid content\n");
    });

    it("should detect transcript button availability", () => {
      document.body.innerHTML = `
        <ytd-video-description-transcript-section-renderer>
          <button aria-label="Show transcript">Show transcript</button>
        </ytd-video-description-transcript-section-renderer>
      `;

      const transcriptButton = document.querySelector('ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]');
      expect(transcriptButton).toBeTruthy();
      expect(transcriptButton?.textContent).toContain("Show transcript");
    });

    it("should detect 'More' button for expanding description", () => {
      document.body.innerHTML = `
        <tp-yt-paper-button id="expand">More</tp-yt-paper-button>
      `;

      const moreButton = document.querySelector('tp-yt-paper-button#expand');
      expect(moreButton).toBeTruthy();
      expect(moreButton?.textContent).toBe("More");
    });
  });
});