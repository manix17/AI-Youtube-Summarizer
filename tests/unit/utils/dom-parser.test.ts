/**
 * @jest-environment jsdom
 */

import { convertToHTML } from "../../../src/utils/dom_parser";
import complexMarkdown from "../../fixtures/complex_markdown.json";

describe("DOM Parser Utils", () => {
  describe("convertToHTML", () => {
    it("should return an empty string for empty input", () => {
      expect(convertToHTML("")).toBe("");
    });

    it("should handle whitespace-only input", () => {
      expect(convertToHTML(" \n\t\n ")).toBe("");
    });

    it("should convert markdown-like headings and paragraphs to HTML", () => {
      const text = `### My Heading\n\nThis is a paragraph.`;
      const expectedHtml = `<h3>My Heading</h3>\n\n<p>This is a paragraph.</p>`;
      expect(convertToHTML(text)).toBe(expectedHtml);
    });

    it("should convert a simple list to an unordered list", () => {
      const text = `* Item 1\n* Item 2`;
      const expectedHtml = `<ul>
    <li>Item 1</li>
    <li>Item 2</li>
</ul>`;
      expect(convertToHTML(text).replace(/    /g, "")).toBe(expectedHtml.replace(/    /g, ""));
    });

    it("should handle complex markdown", () => {
      const result = convertToHTML(complexMarkdown.markdown);
      expect(result).toContain("<h3>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
      expect(result).toContain("<p>");
    });

    it("should convert timestamps to clickable links", () => {
      const text = "At [1:23] something happens";
      const result = convertToHTML(text);
      expect(result).toContain('class="timestamp-link yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color"');
      expect(result).toContain('data-seconds="83"');
    });

    it("should handle multiple timestamp formats", () => {
      const text = "Events at [0:30], [1:23], and [12:45]";
      const result = convertToHTML(text);
      expect(result).toContain('data-seconds="30"');
      expect(result).toContain('data-seconds="83"');
      expect(result).toContain('data-seconds="765"');
    });

    it("should preserve bold formatting", () => {
      const text = "This is **bold** text";
      const result = convertToHTML(text);
      expect(result).toContain("<strong>bold</strong>");
    });

    it("should handle code formatting", () => {
      const text = "This has `code` in it";
      const result = convertToHTML(text);
      expect(result).toContain("<code>code</code>");
    });
  });
});