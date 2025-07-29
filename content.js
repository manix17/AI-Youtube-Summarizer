// content.js

// --- 1. Function to Inject the Summarize Button ---
function injectSummarizeButton() {
  // Find a stable element on the YouTube page to append our button to.
  // The area below the video title is a good candidate.
  const targetElement = document.querySelector("#below");

  if (targetElement && !document.getElementById("summarize-btn")) {
    const button = document.createElement("button");
    button.innerText = "✨ Summarize Video";
    button.id = "summarize-btn";
    
    // Simple styling to make the button stand out
    Object.assign(button.style, {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        margin: '10px 0'
    });

    const summaryContainer = document.createElement("div");
    summaryContainer.id = "summary-container";
    Object.assign(summaryContainer.style, {
        backgroundColor: '#f0f0f0',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '10px',
        display: 'none', // Initially hidden
        border: '1px solid #ddd'
    });

    targetElement.prepend(summaryContainer);
    targetElement.prepend(button);

    button.addEventListener("click", handleSummarizeClick);

    // Inject custom CSS for styling the summary
    injectCss('summary.css');
  }
}

function injectCss(file) {
  const link = document.createElement('link');
  link.href = chrome.runtime.getURL(file);
  link.type = 'text/css';
  link.rel = 'stylesheet';
  (document.head || document.documentElement).appendChild(link);
}

// --- 2. Function to Handle the Button Click ---
async function handleSummarizeClick() {
  const button = document.getElementById("summarize-btn");
  const summaryContainer = document.getElementById("summary-container");

  button.innerText = "⏳ Summarizing...";
  button.disabled = true;
  summaryContainer.style.display = 'block';
  summaryContainer.innerHTML = '<i>Getting transcript...</i>';

  let finalTranscript = null;

  handleResponse({summary: "Here's a concise summary of the video transcript in bullet points:\n\n*   **AI Space Overwhelm:** Developers are overwhelmed by the hype and noise surrounding AI agents, frameworks, and tools, making it difficult to discern what's truly important.\n\n*   **Focus on Foundational Building Blocks:** Instead of chasing the latest trends, developers should focus on understanding and mastering the core building blocks of AI agents, as custom solutions built on LLM APIs are more effective than relying solely on pre-built frameworks.\n\n*   **Seven Key Building Blocks:** The video outlines seven foundational building blocks for building AI agents:\n    1.  Intelligence Layer (LLM API calls)\n    2.  Memory (Conversation history)\n    3.  Tools (External system integration)\n    4.  Validation (Structured output, JSON schemas)\n    5.  Control (Deterministic decision-making with code)\n    6.  Recovery (Error handling and fallbacks)\n    7.  Feedback (Human-in-the-loop oversight)\n\n*   **Deterministic Code First:** Prioritize deterministic code and software engineering best practices whenever possible, using LLM calls sparingly for reasoning with context when code alone isn't sufficient.\n\n*   **Context Engineering is Key:** Effective AI agents require careful context engineering, meaning preprocessing information to provide LLMs with the right context at the right time for reliable results.\n\n*   **Workflow Orchestration:** AI agents are essentially workflows/DAGs where most steps should be deterministic code and not LLM calls.\n"});
  return;

  try {
    // First, try the API method
    const apiTranscript = await getTranscript();
    if (apiTranscript && apiTranscript.trim() !== '') {
      finalTranscript = apiTranscript;
    } else {
      // If API method returns empty or null, force fallback
      console.log("API method returned empty transcript, trying DOM fallback.");
      summaryContainer.innerHTML = '<i>API method returned empty. Trying fallback...</i>';
      finalTranscript = await getTranscriptFromDOM();
    }
  } catch (error) {
    console.log("API method failed, trying DOM fallback:", error.message);
    summaryContainer.innerHTML = '<i>API method failed. Trying fallback...</i>';
    
    // If API method fails, try the DOM fallback
    try {
      finalTranscript = await getTranscriptFromDOM();
    } catch (domError) {
      handleError(domError);
      return; // Exit if both methods fail
    }
  }

  if (finalTranscript && finalTranscript.trim() !== '') {
    // Send the transcript to the background script
    chrome.runtime.sendMessage({ action: "summarize", transcript: finalTranscript }, handleResponse);
  } else {
    handleError(new Error("Could not retrieve a valid transcript using either method."));
  }
}

function handleResponse(response) {
  const button = document.getElementById("summarize-btn");
  const summaryContainer = document.getElementById("summary-container");

  if (chrome.runtime.lastError) {
    handleError(new Error(chrome.runtime.lastError.message));
  } else if (response && response.summary) {
    const formattedSummary = parseMarkdown(response.summary);
    summaryContainer.innerHTML = `<h3>Summary</h3><div class="markdown-content">${formattedSummary}</div>`;

    // Add staggered animation to list items
    const listItems = summaryContainer.querySelectorAll('.markdown-content li');
    listItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        item.style.animation = 'slideUp 0.6s ease-out forwards';
    });
  } else {
    handleError(new Error("Failed to get a valid summary."));
  }
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
}

function parseMarkdown(text) {
    if (!text) return '';
    
    // Split text into lines for processing
    const lines = text.split('\n');
    let result = [];
    let inList = false;
    let inOrderedList = false;
    let currentIndent = 0;
    let listStack = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip empty lines but preserve spacing
        if (trimmedLine === '') {
            if (inList || inOrderedList) {
                // Don't add empty paragraphs inside lists
                continue;
            }
            result.push('<br>');
            continue;
        }
        
        // Handle headers
        if (trimmedLine.startsWith('### ')) {
            closeAllLists();
            result.push(`<h3>${trimmedLine.substring(4)}</h3>`);
        } else if (trimmedLine.startsWith('## ')) {
            closeAllLists();
            result.push(`<h2>${trimmedLine.substring(3)}</h2>`);
        } else if (trimmedLine.startsWith('# ')) {
            closeAllLists();
            result.push(`<h1>${trimmedLine.substring(2)}</h1>`);
        }
        // Handle bullet points
        else if (trimmedLine.startsWith('*   ') || trimmedLine.startsWith('- ')) {
            if (inOrderedList) {
                closeOrderedList();
            }
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            const content = trimmedLine.startsWith('*   ') ? 
                           trimmedLine.substring(4) : 
                           trimmedLine.substring(2);
            result.push(`<li>${parseInlineMarkdown(content)}</li>`);
        }
        // Handle numbered lists (with proper indentation detection)
        else if (trimmedLine.match(/^\s*\d+\.\s+/)) {
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1].length : 0;
            
            if (indent > 0 && inList) {
                // This is a nested numbered list within a bullet point
                if (!inOrderedList) {
                    // Remove the closing </li> from the previous bullet point
                    const lastIndex = result.length - 1;
                    if (result[lastIndex].endsWith('</li>')) {
                        result[lastIndex] = result[lastIndex].replace('</li>', '');
                    }
                    result.push('<ol class="nested-list">');
                    inOrderedList = true;
                }
                const content = trimmedLine.replace(/^\s*\d+\.\s+/, '');
                result.push(`<li>${parseInlineMarkdown(content)}</li>`);
            } else {
                // Top-level numbered list
                closeAllLists();
                if (!inOrderedList) {
                    result.push('<ol>');
                    inOrderedList = true;
                }
                const content = trimmedLine.replace(/^\d+\.\s+/, '');
                result.push(`<li>${parseInlineMarkdown(content)}</li>`);
            }
        }
        // Handle blockquotes
        else if (trimmedLine.startsWith('> ')) {
            closeAllLists();
            result.push(`<blockquote>${parseInlineMarkdown(trimmedLine.substring(2))}</blockquote>`);
        }
        // Handle regular paragraphs
        else {
            // Check if we need to close nested ordered list
            if (inOrderedList && inList) {
                result.push('</ol></li>');
                inOrderedList = false;
            } else if (inOrderedList && !inList) {
                result.push('</ol>');
                inOrderedList = false;
            } else if (inList && !trimmedLine.startsWith('*') && !trimmedLine.startsWith('-')) {
                result.push('</ul>');
                inList = false;
            }
            
            if (trimmedLine) {
                result.push(`<p>${parseInlineMarkdown(trimmedLine)}</p>`);
            }
        }
    }
    
    // Close any remaining open lists
    closeAllLists();
    
    function closeAllLists() {
        if (inOrderedList && inList) {
            result.push('</ol></li>');
            inOrderedList = false;
        }
        if (inOrderedList) {
            result.push('</ol>');
            inOrderedList = false;
        }
        if (inList) {
            result.push('</ul>');
            inList = false;
        }
    }
    
    function closeOrderedList() {
        if (inOrderedList && inList) {
            result.push('</ol></li>');
        } else if (inOrderedList) {
            result.push('</ol>');
        }
        inOrderedList = false;
    }
    
    return result.join('\n');
}

// Function to parse inline markdown (bold, italic, code, etc.)
function parseInlineMarkdown(text) {
    // Bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links (basic)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return text;
}

function handleError(error) {
  const summaryContainer = document.getElementById("summary-container");
  summaryContainer.innerHTML = `<p style="color: red;"><b>Error:</b> ${error.message}</p>`;
  const button = document.getElementById("summarize-btn");
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
}

async function getTranscriptFromDOM() {
  return new Promise(async (resolve, reject) => {
    const moreActionsButton = document.querySelector('tp-yt-paper-button#expand');
    if (moreActionsButton) {
      moreActionsButton.click();
    } else {
      console.warn("'More actions' button not found, proceeding to look for transcript button directly.");
    }

    // Give some time for the description to expand and the transcript button to appear
    await new Promise(r => setTimeout(r, 1000)); 

    // Now, look for the 'Show transcript' button within the expanded description
    const transcriptButton = document.querySelector('ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]');

    if (transcriptButton) {
      transcriptButton.click();
      setTimeout(() => {
        const transcriptSegments = document.querySelectorAll("ytd-transcript-segment-renderer .segment-text");
        if (transcriptSegments.length > 0) {
          let fullTranscript = "";
          transcriptSegments.forEach(segment => {
            fullTranscript += segment.innerText + " ";
          });
          resolve(fullTranscript.trim());
        } else {
          reject(new Error("Transcript panel opened, but no segments found."));
        }
      }, 2000); // Wait for segments to load
    } else {
      reject(new Error("Could not find the 'Show transcript' button in the menu."));
    }
  });
}

// --- 3. Function to Extract the Transcript ---
async function getTranscript() {
    try {
        const playerResponse = await getPlayerResponse();
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!captionTracks || captionTracks.length === 0) {
            throw new Error("No caption tracks found for this video.");
        }

        const transcriptInfo = captionTracks.find(track => track.languageCode === 'en') || captionTracks[0];
        const transcriptUrl = transcriptInfo.baseUrl;

        const response = await fetch(transcriptUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch transcript: ${response.statusText}`);
        }
        const xmlText = await response.text();

        // Basic XML parsing without a full library
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName('text');

        let fullTranscript = "";
        for (let i = 0; i < textNodes.length; i++) {
            fullTranscript += textNodes[i].textContent + " ";
        }

        return fullTranscript.trim();

    } catch (error) {
        console.error("Error getting transcript:", error);
        throw new Error(`Failed to retrieve transcript. ${error.message}`);
    }
}

// Helper function to get the player response object from the page
function getPlayerResponse() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // The URL for the injector script must be retrieved from the extension's resources
        script.src = chrome.runtime.getURL('injector.js');
        script.onload = () => {
            // Clean up the script tag after it has run
            script.remove();
        };
        script.onerror = (e) => {
            reject(new Error("Failed to load the injector script."));
        };
        (document.head || document.documentElement).appendChild(script);

        // Listen for the response from the injected script
        const messageListener = (event) => {
            if (event.source === window && event.data && event.data.type === 'FROM_PAGE') {
                window.removeEventListener('message', messageListener); // Clean up listener
                if (event.data.error) {
                    reject(new Error(`Could not access player data: ${event.data.error}`));
                } else if (event.data.payload) {
                    resolve(event.data.payload);
                } else {
                    reject(new Error("Could not find the YouTube player data (ytInitialPlayerResponse). This video might not have a transcript."));
                }
            }
        };

        window.addEventListener('message', messageListener);

        // Timeout to prevent the promise from hanging indefinitely
        setTimeout(() => {
            window.removeEventListener('message', messageListener);
            reject(new Error("Timeout waiting for player data."));
        }, 5000); // 5-second timeout
    });
}

// --- 4. Run the Injection Logic ---
// YouTube is a Single Page Application (SPA), so content can change without a full page reload.
// We use a MutationObserver to detect when the video player part of the page is loaded.
const observer = new MutationObserver((mutations, obs) => {
    if (document.querySelector("#below") && !document.getElementById("summarize-btn")) {
        injectSummarizeButton();
        // Once we've injected the button, we don't need to observe anymore for this page view
        obs.disconnect(); 
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Also run it once on initial load
injectSummarizeButton();
