// src/utils/dom_parser.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

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
 * Note: This function is kept for backward compatibility but is mostly replaced by marked.js
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
 * Note: This function is kept for backward compatibility but is not used in the new marked.js implementation
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
/**
 * Converts HTML back to markdown-like formatted text with proper indentation.
 * @param {HTMLElement} element - The HTML element to convert.
 * @returns {string} The formatted text.
 */
export function convertHTMLToText(element: HTMLElement): string {
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h3':
          return `### ${processChildren(node).trim()}\n\n`;
        case 'p':
          const pContent = processChildren(node).trim();
          return pContent ? `${pContent}\n\n` : '';
        case 'ul':
        case 'ol':
          const listContent = processChildren(node).trim();
          return listContent ? `${listContent}\n\n` : '';
        case 'li':
          const parentTag = el.parentElement?.tagName.toLowerCase();
          const prefix = parentTag === 'ol' ? '1. ' : '- ';
          const depth = getListDepth(el);
          const indent = "  ".repeat(depth); // Use 2 spaces for better readability
          const liContent = processChildren(node).trim();
          return liContent ? `${indent}${prefix}${liContent}\n` : '';
        case 'strong':
          return `**${processChildren(node).trim()}**`;
        case 'code':
          return `\`${processChildren(node).trim()}\``;
        case 'em':
          return `*${processChildren(node).trim()}*`;
        case 'a':
          const linkElement = el as HTMLAnchorElement;
          if (linkElement.classList.contains('timestamp-link')) {
            // Format timestamps with brackets for clarity
            return `[${linkElement.textContent || ''}]`;
          } else {
            return `[${processChildren(node).trim()}](${linkElement.href})`;
          }
        default:
          return processChildren(node);
      }
    }
    
    return "";
  }
  
  function processChildren(node: Node): string {
    let result = "";
    for (let i = 0; i < node.childNodes.length; i++) {
      result += processNode(node.childNodes[i]);
    }
    return result;
  }
  
  function getListDepth(element: Element): number {
    let depth = 0;
    let current = element.parentElement;
    
    while (current && current !== element.ownerDocument?.body) {
      if (current.tagName === 'UL' || current.tagName === 'OL') {
        depth++;
      }
      current = current.parentElement;
    }
    
    // Subtract 1 because the first level should be at depth 0
    return Math.max(0, depth - 1);
  }
  
  let result = processNode(element);
  
  // Clean up excessive newlines while preserving paragraph structure
  result = result.replace(/\n{4,}/g, '\n\n\n'); // Max 3 newlines
  result = result.replace(/\n{3,}/g, '\n\n'); // Convert 3+ newlines to 2
  result = result.trim();
  
  return result;
}

/**
 * Converts markdown text to HTML using marked.js with custom renderer and DOMPurify sanitization
 * @param {string} text - The input markdown text
 * @returns {string} The sanitized HTML string
 */
export function convertToHTML(text: string): string {
  // Preprocess the text to handle escaped JSON strings
  text = preprocessText(text);
  
  // For now, use a simple marked approach with post-processing
  // This avoids complex renderer API issues while still providing benefits
  const rawHtml = marked(text, {
    breaks: true,
    gfm: true,
  }) as string;
  
  // Apply timestamp processing after marked.js parsing
  const processedHtml = applyTimestampLinks(rawHtml);
  
  // Sanitize the HTML with DOMPurify
  const cleanHtml = DOMPurify.sanitize(processedHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'code', 'pre',
      'ul', 'ol', 'li',
      'a', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'data-seconds', 'class',
      'data-*'
    ],
    ALLOW_DATA_ATTR: true
  });
  
  return cleanHtml.trim();
}

/**
 * Apply timestamp links to already parsed HTML
 */
function applyTimestampLinks(html: string): string {
  // Find text nodes in HTML and apply timestamp processing
  return html.replace(/>([^<]+)</g, (match, textContent) => {
    const processedText = linkifyTimestamps(textContent);
    return `>${processedText}<`;
  });
}

/**
 * Legacy convertToHTML function for backward compatibility
 * @deprecated Use the new convertToHTML function instead
 */
export function convertToHTMLLegacy(text: string): string {
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
