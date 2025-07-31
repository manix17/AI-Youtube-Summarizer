/**
 * @jest-environment jsdom
 */

import { convertToHTML } from "../src/utils/dom_parser";

describe("convertToHTML", () => {
  it("should convert markdown-like headings and paragraphs to HTML", () => {
    const text: string = `### My Heading\n\nThis is a paragraph.`;
    const expectedHtml: string = `<h3>My Heading</h3>\n\n<p>This is a paragraph.</p>`;
    expect(convertToHTML(text)).toBe(expectedHtml);
  });

  it("should convert a simple list to an unordered list", () => {
    const text: string = `* Item 1\n* Item 2`;
    const expectedHtml: string = `<ul>\n    <li>Item 1</li>\n    <li>Item 2</li>\n</ul>`;
    expect(convertToHTML(text)).toBe(expectedHtml);
  });

  it("should handle bold text and timestamps", () => {
    const text: string = `* This is **bold** text. [01:23]`;
    const expectedHtml: string = `<ul>\n    <li>This is <strong>bold</strong> text. <a href="javascript:void(0)" data-seconds="83" class="timestamp-link yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color">[01:23]</a></li>\n</ul>`;
    expect(convertToHTML(text)).toBe(expectedHtml);
  });

  it("should handle nested lists", () => {
    const text: string = `* Item 1\n    * Nested Item 1`;
    const expectedHtml: string = `<ul>\n    <li>Item 1</li>\n        <ul>\n        <li>Nested Item 1</li>\n    </ul>\n</ul>`;
    expect(convertToHTML(text)).toBe(expectedHtml);
  });
});
