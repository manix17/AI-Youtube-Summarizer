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
 * Converts timestamp-like strings (e.g., [01:23], (1:23, 2:45), [1:23-2:45]) into clickable links.
 * Creates separate clickable links for each individual timestamp and removes brackets.
 * @param {string} text - The text to process.
 * @returns {string} The text with HTML links for timestamps.
 */
function linkifyTimestamps(text: string): string {
  // First, find patterns with brackets/parentheses containing timestamps
  const containerRegex = /[[\(]([^[\])]*\d{1,2}:\d{2}(?::\d{2})?[^[\]()]*)[)\]]/g;
  
  return text.replace(containerRegex, (match) => {
    // Extract the content inside brackets/parentheses
    const content = match.slice(1, -1); // Remove first and last character (brackets/parentheses)
    
    // Find all individual timestamps within the content
    const timestampRegex = /\d{1,2}:\d{2}(?::\d{2})?/g;
    const timestamps = content.match(timestampRegex);
    
    if (!timestamps || timestamps.length === 0) return match;
    
    // Convert each timestamp to a clickable link
    const timestampLinks = timestamps.map(timestamp => {
      const parts = timestamp.split(":").map(Number);
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        seconds = parts[0] * 60 + parts[1];
      }
      
      return `<a href="javascript:void(0)" data-seconds="${seconds}" class="timestamp-link yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color">${timestamp}</a>`;
    });
    
    // Determine separator based on original content
    let separator = " ";
    if (content.includes(",")) {
      separator = ", ";
    } else if (content.includes(" - ") || content.includes("-")) {
      separator = " - ";
    }
    
    return timestampLinks.join(separator);
  });
}

/**
 * Closes all open list tags in the HTML string.
 * @param {string[]} listStack - Array of list types to close.
 * @param {string} indent - The indentation string.
 * @returns {string} The closing HTML tags.
 */
function closeAllLists(listStack: string[], indent: string): string {
  let html = "";
  for (let i = listStack.length - 1; i >= 0; i--) {
    html += `${indent.repeat(i)}</${listStack[i]}>\n`;
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
  let listStack: string[] = [];
  const indent = "    ";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (listStack.length > 0) {
        html += closeAllLists(listStack, indent);
        listStack = [];
      }
      html += "\n";
      continue;
    }

    const leadingSpaces = line.length - line.trimStart().length;
    const currentLevel = Math.floor(leadingSpaces / 4);

    if (trimmedLine.startsWith("###")) {
      if (listStack.length > 0) {
        html += closeAllLists(listStack, indent);
        listStack = [];
      }
      const headingText = processInlineFormatting(trimmedLine.replace(/^#+\s*/, ""));
      html += `<h3>${headingText}</h3>\n`;
    } else if (trimmedLine.startsWith("*") && !/^\*\*\w+:/.test(trimmedLine)) {
      // Handle unordered lists (but not **Q1:** patterns)
      const listContent = trimmedLine.substring(1).trim();
      
      // Adjust list stack for current level
      while (listStack.length > currentLevel + 1) {
        const closedType = listStack.pop()!;
        html += `${indent.repeat(listStack.length)}</${closedType}>\n`;
      }
      
      if (listStack.length === currentLevel) {
        html += `${indent.repeat(currentLevel)}<ul>\n`;
        listStack.push('ul');
      }
      
      const processedContent = processInlineFormatting(listContent);
      html += `${indent.repeat(listStack.length)}<li>${processedContent}</li>\n`;
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      // Handle ordered lists (numbered items)
      const listContent = trimmedLine.replace(/^\d+\.\s/, "");
      
      // Adjust list stack for current level
      while (listStack.length > currentLevel + 1) {
        const closedType = listStack.pop()!;
        html += `${indent.repeat(listStack.length)}</${closedType}>\n`;
      }
      
      if (listStack.length === currentLevel) {
        html += `${indent.repeat(currentLevel)}<ol>\n`;
        listStack.push('ol');
      }
      
      const processedContent = processInlineFormatting(listContent);
      html += `${indent.repeat(listStack.length)}<li>${processedContent}</li>\n`;
    } else {
      if (listStack.length > 0) {
        html += closeAllLists(listStack, indent);
        listStack = [];
      }
      const processedContent = processInlineFormatting(trimmedLine);
      html += `<p>${processedContent}</p>\n`;
    }
  }

  if (listStack.length > 0) {
    html += closeAllLists(listStack, indent);
  }

  return html.trim();
}
