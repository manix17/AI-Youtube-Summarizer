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
 * Apply timestamp links to already parsed HTML
 */
function applyTimestampLinks(html: string): string {
  // Find text nodes in HTML and apply timestamp processing
  return html.replace(/>([^<]+)</g, (_, textContent) => {
    const processedText = linkifyTimestamps(textContent);
    return `>${processedText}<`;
  });
}

/**
 * Add target="_blank" and rel="noopener noreferrer" to external links
 */
function addTargetBlankToLinks(html: string): string {
  return html.replace(/<a\s+([^>]*href="[^"]*"[^>]*)>/gi, (match, attributes) => {
    // Skip if it's already a timestamp link (internal functionality)
    if (attributes.includes('class="timestamp-link')) {
      return match;
    }
    
    // Skip if it's a relative link or anchor link
    const hrefMatch = attributes.match(/href="([^"]*)"/i);
    if (hrefMatch) {
      const href = hrefMatch[1];
      // Skip internal links (anchors, relative paths)
      if (href.startsWith('#') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
        return match;
      }
    }
    
    // Check if target and rel attributes already exist
    const hasTarget = /target\s*=/i.test(attributes);
    const hasRel = /rel\s*=/i.test(attributes);
    
    let newAttributes = attributes;
    
    // Add target="_blank" if not present
    if (!hasTarget) {
      newAttributes += ' target="_blank"';
    }
    
    // Add or update rel attribute with noopener noreferrer
    if (!hasRel) {
      newAttributes += ' rel="noopener noreferrer"';
    } else {
      // Update existing rel attribute to include noopener noreferrer
      newAttributes = newAttributes.replace(/rel\s*=\s*"([^"]*)"/i, (relMatch: string, relValue: string) => {
        const relParts = relValue.split(/\s+/);
        if (!relParts.includes('noopener')) {
          relParts.push('noopener');
        }
        if (!relParts.includes('noreferrer')) {
          relParts.push('noreferrer');
        }
        return `rel="${relParts.join(' ')}"`;
      });
    }
    
    return `<a ${newAttributes}>`;
  });
}

/**
 * Apply syntax highlighting to code blocks in HTML
 */
function applyCodeHighlighting(html: string): string {
  // Find code blocks and apply highlighting
  return html.replace(/<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g, 
    (_, language: string | undefined, code: string) => {
      // Decode HTML entities more comprehensively
      code = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&'); // Keep &amp; last to avoid double-decoding
      
      // Check if hljs is available
      if (typeof hljs !== 'undefined') {
        try {
          if (language && hljs.getLanguage(language)) {
            // Language specified and supported
            const highlighted = hljs.highlight(code, { language }).value;
            const languageDisplay = language.charAt(0).toUpperCase() + language.slice(1);
            return `<pre class="hljs" data-language="${languageDisplay}"><code class="hljs language-${language}">${highlighted}</code></pre>`;
          } else {
            // Auto-detect language
            const highlighted = hljs.highlightAuto(code);
            const detectedLanguage = highlighted.language || 'plaintext';
            const languageDisplay = detectedLanguage === 'plaintext' ? 'Text' : 
                                  detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1);
            return `<pre class="hljs" data-language="${languageDisplay}"><code class="hljs language-${detectedLanguage}">${highlighted.value}</code></pre>`;
          }
        } catch (error) {
          console.warn('Highlight.js error:', error);
        }
      }
      
      // Fallback when hljs is not available or fails
      const langClass = language ? ` language-${language}` : '';
      const languageDisplay = language ? 
        language.charAt(0).toUpperCase() + language.slice(1) : 'Code';
      return `<pre class="hljs" data-language="${languageDisplay}"><code class="hljs${langClass}">${code}</code></pre>`;
    });
}

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
        case 'h1':
          return `# ${processChildren(node).trim()}\n\n`;
        case 'h2':
          return `## ${processChildren(node).trim()}\n\n`;
        case 'h3':
          return `### ${processChildren(node).trim()}\n\n`;
        case 'h4':
          return `#### ${processChildren(node).trim()}\n\n`;
        case 'h5':
          return `##### ${processChildren(node).trim()}\n\n`;
        case 'h6':
          return `###### ${processChildren(node).trim()}\n\n`;
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
        case 'pre':
          // Handle code blocks
          const codeContent = processChildren(node).trim();
          return `\`\`\`\n${codeContent}\n\`\`\`\n\n`;
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
        case 'details':
          const isOpen = (el as HTMLDetailsElement).hasAttribute('open');
          const detailsContent = processChildren(node).trim();
          return `${detailsContent}${isOpen ? '\n\n' : '\n\n'}`;
        case 'summary':
          const summaryContent = processChildren(node).trim();
          return `**${summaryContent}**\n\n`;
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
 * Converts markdown text to HTML using marked.js with DOMPurify sanitization
 * @param {string} text - The input markdown text
 * @returns {string} The sanitized HTML string
 */
export function convertToHTML(text: string): string {
  // Preprocess the text to handle escaped JSON strings
  text = preprocessText(text);
  
  // Use marked.js to parse markdown to HTML
  const rawHtml = marked(text, {
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  }) as string;
  
  // Apply syntax highlighting after marked.js parsing
  const highlightedHtml = applyCodeHighlighting(rawHtml);
  
  // Apply timestamp processing after highlighting  
  const timestampHtml = applyTimestampLinks(highlightedHtml);
  
  // Make external links open in new tabs
  const processedHtml = addTargetBlankToLinks(timestampHtml);
  
  // Sanitize the HTML with DOMPurify, allowing our custom timestamp links and collapsible sections
  const cleanHtml = DOMPurify.sanitize(processedHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'code', 'pre',
      'ul', 'ol', 'li',
      'a', 'span', 'details', 'summary'
    ],
    ALLOWED_ATTR: [
      'href', 'data-seconds', 'class', 'target', 'rel', 'open',
      'data-*' // Allow all data attributes for timestamp functionality
    ],
    ALLOW_DATA_ATTR: true
  });
  
  return cleanHtml.trim();
}