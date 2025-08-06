/**
 * @jest-environment jsdom
 */

import { convertToHTML, convertHTMLToText } from "../../../src/utils/dom_parser";
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
      // Should remove brackets
      expect(result).not.toContain('[1:23]');
      expect(result).toContain('>1:23</a>');
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

    it("should convert numbered items to ordered lists", () => {
      const text = `1. First item\n2. Second item\n3. Third item`;
      const result = convertToHTML(text);
      expect(result).toContain("<ol>");
      expect(result).toContain("</ol>");
      expect(result).toContain("<li>First item</li>");
      expect(result).toContain("<li>Second item</li>");
      expect(result).toContain("<li>Third item</li>");
    });

    it("should handle ** formatting in headings", () => {
      const text = "### My **Bold** Heading";
      const result = convertToHTML(text);
      expect(result).toBe("<h3>My <strong>Bold</strong> Heading</h3>");
    });

    it("should handle Q1: format as strong text, not list items", () => {
      const text = "**Q1:** What is the main point?";
      const result = convertToHTML(text);
      expect(result).toBe("<p><strong>Q1:</strong> What is the main point?</p>");
      expect(result).not.toContain("<ul>");
      expect(result).not.toContain("<li>");
    });

    it("should handle mixed ordered and unordered lists", () => {
      const text = `1. First numbered item
2. Second numbered item

* First bullet item
* Second bullet item`;
      const result = convertToHTML(text);
      expect(result).toContain("<ol>");
      expect(result).toContain("</ol>");
      expect(result).toContain("<ul>");
      expect(result).toContain("</ul>");
    });

    it("should handle multiple timestamps within brackets with comma separation", () => {
      const text = "Key points [1:23, 2:45] discussed here";
      const result = convertToHTML(text);
      // Should create separate clickable links
      expect(result).toContain('data-seconds="83"');
      expect(result).toContain('data-seconds="165"');
      expect(result).toContain('>1:23</a>');
      expect(result).toContain('>2:45</a>');
      // Should remove brackets and maintain comma separation
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).toContain('1:23</a>, <a');
    });

    it("should handle multiple timestamps within brackets with dash separation", () => {
      const text = "Time range [1:23-2:45] covers this topic";
      const result = convertToHTML(text);
      // Should create separate clickable links
      expect(result).toContain('data-seconds="83"');
      expect(result).toContain('data-seconds="165"');
      expect(result).toContain('>1:23</a>');
      expect(result).toContain('>2:45</a>');
      // Should remove brackets and maintain dash separation
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).toContain('1:23</a> - <a');
    });

    it("should handle multiple timestamps within parentheses", () => {
      const text = "Important segments (1:23, 2:45, 5:30) need attention";
      const result = convertToHTML(text);
      // Should create separate clickable links for all timestamps
      expect(result).toContain('data-seconds="83"');
      expect(result).toContain('data-seconds="165"');
      expect(result).toContain('data-seconds="330"');
      expect(result).toContain('>1:23</a>');
      expect(result).toContain('>2:45</a>');
      expect(result).toContain('>5:30</a>');
      // Should remove parentheses around timestamps
      expect(result).not.toContain('(1:23');
      expect(result).not.toContain('5:30)');
      // Should maintain comma separation
      expect(result).toContain('1:23</a>, <a');
      expect(result).toContain('2:45</a>, <a');
    });

    it("should handle timestamps with hours format", () => {
      const text = "Long discussion [1:23:45, 1:25:30] about complex topics";
      const result = convertToHTML(text);
      // 1:23:45 = 1*3600 + 23*60 + 45 = 5025 seconds
      // 1:25:30 = 1*3600 + 25*60 + 30 = 5130 seconds
      expect(result).toContain('data-seconds="5025"');
      expect(result).toContain('data-seconds="5130"');
      expect(result).toContain('>1:23:45</a>');
      expect(result).toContain('>1:25:30</a>');
    });
  });

  describe("convertHTMLToText", () => {
    beforeEach(() => {
      // Clear the document body before each test
      document.body.innerHTML = "";
    });

    it("should convert HTML headings to markdown-like text", () => {
      const div = document.createElement("div");
      div.innerHTML = "<h3>Test Heading</h3>";
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("### Test Heading");
    });

    it("should convert HTML paragraphs with proper spacing", () => {
      const div = document.createElement("div");
      div.innerHTML = "<p>First paragraph</p><p>Second paragraph</p>";
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("First paragraph\n\nSecond paragraph");
    });

    it("should convert unordered lists with proper indentation", () => {
      const div = document.createElement("div");
      div.innerHTML = "<ul><li>First item</li><li>Second item</li></ul>";
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("* First item\n* Second item");
    });

    it("should convert ordered lists with proper indentation", () => {
      const div = document.createElement("div");
      div.innerHTML = "<ol><li>First item</li><li>Second item</li></ol>";
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("1. First item\n1. Second item");
    });

    it("should handle nested lists with proper indentation", () => {
      const div = document.createElement("div");
      div.innerHTML = `
        <ul>
          <li>Top level item</li>
          <li>Another top item
            <ul>
              <li>Nested item 1</li>
              <li>Nested item 2</li>
            </ul>
          </li>
        </ul>
      `;
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toContain("* Top level item");
      expect(result).toContain("    * Nested item 1");
      expect(result).toContain("    * Nested item 2");
    });

    it("should preserve bold and code formatting", () => {
      const div = document.createElement("div");
      div.innerHTML = "<p>This is <strong>bold</strong> and <code>code</code> text</p>";
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("This is **bold** and `code` text");
    });

    it("should handle timestamp links correctly", () => {
      const div = document.createElement("div");
      div.innerHTML = '<p>At <a href="javascript:void(0)" data-seconds="83" class="timestamp-link yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color">1:23</a> something happens</p>';
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("At 1:23 something happens");
    });

    it("should handle mixed content with proper formatting", () => {
      const div = document.createElement("div");
      div.innerHTML = `
        <h3>Summary</h3>
        <p>This is a paragraph with <strong>bold</strong> text.</p>
        <ul>
          <li>First point</li>
          <li>Second point with <code>code</code></li>
        </ul>
      `;
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toContain("### Summary");
      expect(result).toContain("This is a paragraph with **bold** text.");
      expect(result).toContain("* First point");
      expect(result).toContain("* Second point with `code`");
    });

    it("should handle empty elements gracefully", () => {
      const div = document.createElement("div");
      div.innerHTML = "";
      document.body.appendChild(div);
      
      const result = convertHTMLToText(div);
      expect(result).toBe("");
    });

    it("should round-trip conversion maintain basic structure", () => {
      const originalMarkdown = `### Test Heading

This is a paragraph with **bold** text.

* First item
* Second item
    * Nested item

1. Numbered item
1. Another numbered item`;
      
      // Convert to HTML and back to text
      const html = convertToHTML(originalMarkdown);
      const div = document.createElement("div");
      div.innerHTML = html;
      document.body.appendChild(div);
      const roundTripText = convertHTMLToText(div);
      
      // Should maintain basic structure
      expect(roundTripText).toContain("### Test Heading");
      expect(roundTripText).toContain("**bold**");
      expect(roundTripText).toContain("* First item");
      expect(roundTripText).toContain("1. Numbered item");
    });
  });
});