// src/utils/dom_parser.ts

/**
 * Pre-processes text that might be an escaped JSON string.
 * @param {string} text - The input text.
 * @returns {string} The cleaned text.
 */
function preprocessText(text: string): string {
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\\n/g, "\n");
  text = text.replace(/\\r/g, "\r");
  text = text.replace(/\\t/g, "\t");
  text = text.replace(/\\\\/g, "\\");
  return text;
}

/**
 * Processes inline formatting like bold, code, and timestamps.
 * @param {string} text - The line of text to process.
 * @returns {string} The HTML-formatted string.
 */
function processInlineFormatting(text: string): string {
  text = linkifyTimestamps(text);
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\(e\\.g\\.,([^)]+)\)/g, "<em>(e.g.,$1)</em>");
  return text;
}

/**
 * Converts timestamp-like strings (e.g., [01:23]) into clickable links.
 * @param {string} text - The text to process.
 * @returns {string} The text with HTML links for timestamps.
 */
function linkifyTimestamps(text: string): string {
  const timestampRegex =
    /[[\](\(]((\d{1,2}:\d{2}(?::\d{2})?)(?:(?:[-\s]|\s*,\s*)\d{1,2}:\d{2}(?::\d{2})?)*)[[\])]/g;
  return text.replace(timestampRegex, (match) => {
    const startTimeMatch = match.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (!startTimeMatch) return match;

    const startTime = startTimeMatch[0];
    const parts = startTime.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parts[0] * 60 + parts[1];
    }

    match = match.replace(/[(]/g, "[").replace(/[)]/g, "]");
    return `<a href="javascript:void(0)" data-seconds="${seconds}" class="timestamp-link yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color">${match}</a>`;
  });
}

/**
 * Closes all open list tags in the HTML string.
 * @param {number} levels - The number of levels to close.
 * @param {string} indent - The indentation string.
 * @returns {string} The closing HTML tags.
 */
function closeAllLists(levels: number, indent: string): string {
  let html = "";
  for (let i = levels; i > 0; i--) {
    html += `${indent.repeat(i - 1)}</ul>\n`;
  }
  return html;
}

/**
 * Converts a markdown-like text string into HTML.
 * @param {string} text - The input text with markdown formatting.
 * @returns {string} The resulting HTML string.
 */
export function convertToHTML(text: string): string {
  text = preprocessText(text);
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  let listLevel = 0;
  const indent = "    ";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (inList) {
        html += closeAllLists(listLevel, indent);
        inList = false;
        listLevel = 0;
      }
      html += "\n";
      continue;
    }

    const leadingSpaces = line.length - line.trimStart().length;
    const currentLevel = Math.floor(leadingSpaces / 4);

    if (trimmedLine.startsWith("###")) {
      if (inList) {
        html += closeAllLists(listLevel, indent);
        inList = false;
        listLevel = 0;
      }
      const headingText = trimmedLine.replace(/^#+\s*/, "");
      html += `<h3>${headingText}</h3>\n`;
    } else if (trimmedLine.startsWith("*")) {
      const listContent = trimmedLine.substring(1).trim();
      if (!inList) {
        html += `${indent}<ul>\n`;
        inList = true;
        listLevel = 1;
      } else if (currentLevel > listLevel - 1) {
        html += `${indent.repeat(listLevel + 1)}<ul>\n`;
        listLevel++;
      } else if (currentLevel < listLevel - 1) {
        const levelsToClose = listLevel - 1 - currentLevel;
        for (let j = 0; j < levelsToClose; j++) {
          listLevel--;
          html += `${indent.repeat(listLevel)}</ul>\n`;
        }
      }
      const processedContent = processInlineFormatting(listContent);
      html += `${indent.repeat(listLevel)}<li>${processedContent}</li>\n`;
    } else {
      if (inList) {
        html += closeAllLists(listLevel, indent);
        inList = false;
        listLevel = 0;
      }
      const processedContent = processInlineFormatting(trimmedLine);
      html += `<p>${processedContent}</p>\n`;
    }
  }

  if (inList) {
    html += closeAllLists(listLevel, indent);
  }

  return html.trim();
}
