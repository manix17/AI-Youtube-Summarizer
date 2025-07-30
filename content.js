// content.js

// --- 1. Function to Inject the Summarize Button ---
function injectSummarizeButton() {
  const targetElement = document.querySelector("#below");

  if (targetElement && !document.getElementById("summarize-btn")) {
    const button = document.createElement("button");
    button.innerText = "✨ Summarize Video";
    button.id = "summarize-btn";
    button.classList.add('summarize-btn');

    const summaryContainer = document.createElement("div");
    summaryContainer.id = "summary-container";
    summaryContainer.classList.add('summary-container');
    summaryContainer.style.display = 'none';

    const closeButton = document.createElement("button");
    closeButton.id = "close-summary-btn";
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="m12.71 12 8.15 8.15-.71.71L12 12.71l-8.15 8.15-.71-.71L11.29 12 3.15 3.85l.71-.71L12 11.29l8.15-8.15.71.71L12.71 12z"></path></svg>';
    closeButton.classList.add('close-summary-btn');
    closeButton.addEventListener('click', () => {
        summaryContainer.style.display = 'none';
    });
    summaryContainer.appendChild(closeButton);

    const summaryContent = document.createElement("div");
    summaryContent.id = "summary-content";
    summaryContainer.appendChild(summaryContent);

    targetElement.prepend(summaryContainer);
    targetElement.prepend(button);

    button.addEventListener("click", handleSummarizeClick);

    // Add a delegated click listener for our timestamp links
    summaryContainer.addEventListener('click', (e) => {
      
        const target = e.target.closest('.timestamp-link');
        
        if (target) {
            e.preventDefault();
            const seconds = parseInt(target.dataset.seconds, 10);
            const player = document.querySelector('video');
            if (player) {
                player.currentTime = seconds;
            }
        }
    });

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
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = '<i>Getting transcript...</i>';
  }

  let finalTranscript = null;

  // handleResponse({summary: "Here is a comprehensive summary of the YouTube video transcript.\n\n### **Overview**\n\nThis video demystifies the chaotic AI agent space by teaching developers to ignore the hype and instead focus on seven foundational building blocks, arguing that the most reliable and effective AI agents are built with deterministic software and strategic, minimal LLM calls.\n\n### **Key Points**\n\n*   **Thesis: Build with First Principles, Not Frameworks (5:05)**\n    *   The current AI landscape is filled with noise and hype, leading to developer confusion. The speaker advises ignoring 99% of this, including many high-level agentic frameworks (**LangChain, Llama Index**), which are often abstractions built on \"quicksand.\" (4:21)\n    *   The most effective AI agents are not fully \"agentic\" but are **deterministic software** with LLM calls used sparingly and strategically only for tasks that require reasoning with context. (5:11)\n    *   An **LLM API call** is described as the \"most expensive and dangerous operation in software engineering\" today and should be avoided unless absolutely necessary, especially in **background automation systems**. (6:01, 6:48)\n\n*   **The 7 Foundational Building Blocks for AI Agents (7:56)**\n    1.  **Intelligence Layer (8:09):** This is the core LLM API call (e.g., to OpenAI). It's the only truly \"AI\" component, turning regular software into an AI application.\n    2.  **Memory (9:09):** This block handles context persistence. Since LLMs are **stateless**, you must manually pass the conversation history with each new request to maintain a coherent dialogue. This is fundamental state management, similar to web apps.\n    3.  **Tools (10:58):** This allows the LLM to interact with external systems like APIs or databases. The LLM suggests a function to call (e.g., `get_weather`), and your code is responsible for executing it and returning the result to the LLM.\n    4.  **Validation (13:14):** This is a critical step for quality assurance. It involves forcing the LLM to return data in a predefined **structured output** (JSON schema). This is crucial for building reliable, predictable systems.\n        *   **Tool Mentioned:** **Pydantic** is used in the Python example to define and validate the expected data structure. (15:03)\n    5.  **Control (16:55):** This block uses deterministic code (like `if/else` statements) to manage workflow and routing. Instead of letting an LLM decide which tool to use, a more robust pattern is to have the LLM classify the user's intent and then use simple code to route the request to the correct function.\n        *   **Counterintuitive Insight:** This classification-then-routing approach is often more reliable and easier to debug for production systems than relying on native tool-calling. (19:56)\n    6.  **Recovery (21:25):** This is standard software engineering error handling. It involves implementing `try/catch` blocks, retry logic with exponential backoff, and fallback responses to gracefully handle API failures, rate limits, or invalid LLM outputs.\n    7.  **Feedback (23:22):** This incorporates a **human-in-the-loop** for critical or sensitive tasks. It creates a full stop in the workflow, requiring human approval (e.g., via a Slack notification or UI button) before an action is executed, ensuring safety and quality.\n\n### **Actionable Takeaways**\n\n*   **Adopt a Software Engineering Mindset:** Break large problems into smaller sub-problems. Solve as much as possible with regular, deterministic code before considering an LLM call. (5:52)\n*   **Prioritize Structured Output:** Whenever you need data from an LLM, force it into a validated JSON schema using tools like **Pydantic**. This makes the output predictable and allows you to build reliable application logic around it. (13:55)\n*   **Favor Classification and Routing Over Tool-Calling:** For complex workflows, use the LLM to classify intent into predefined categories. Then, use simple `if/else` logic in your code to call the appropriate functions. This gives you more control and makes debugging easier than letting the LLM choose from a list of tools. (20:04)\n*   **Differentiate Between Assistants and Automation:** The design patterns for a **personal assistant** (where a user is in the loop) are different from a **fully automated background system**. The latter requires much stricter controls, fewer LLM calls, and more robust validation and recovery mechanisms. (6:18)\n\n### **Notable Mentions**\n\n*   **Tools & Libraries:** OpenAI Python SDK (8:44), Pydantic (15:03)\n*   **Concepts:** Function Calling (4:28), Structured Output (13:55), DAGs (Directed Acyclic Graphs) (7:32)\n*   **People:** Jason Liu (2:18), Dan Martell (2:20)\n*   **Resources:** The speaker recommends his own free YouTube course, **\"Building AI Agents in Pure Python,\"** and its accompanying **GitHub repository** as a practical follow-up for orchestrating these building blocks into complete workflows. (13:00, 27:27)"});
  // return;

  try {
    // First, try the API method
    const apiTranscript = await getTranscript();
    if (apiTranscript && apiTranscript.trim() !== '') {
      finalTranscript = apiTranscript;
    } else {
      // If API method returns empty or null, force fallback
      console.log("API method returned empty transcript, trying DOM fallback.");
      const summaryContent = document.getElementById("summary-content");
      if (summaryContent) {
        summaryContent.innerHTML = '<i>API method returned empty. Trying fallback...</i>';
      }
      finalTranscript = await getTranscriptFromDOM();
    }
  } catch (error) {
    console.log("API method failed, trying DOM fallback:", error.message);
    const summaryContent = document.getElementById("summary-content");
    if (summaryContent) {
      summaryContent.innerHTML = '<i>API method failed. Trying fallback...</i>';
    }
    
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
    const summaryContent = document.getElementById("summary-content");
    summaryContent.innerHTML = `<h3>Summary</h3><div class="markdown-content">${formattedSummary}</div>`;

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
    
    const lines = text.split('\n');
    let result = [];
    let inList = false;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            result.push('<br>');
            continue;
        }
        
        if (trimmedLine.startsWith('### ')) {
            if (inList) result.push('</ul>');
            inList = false;
            result.push(`<h3>${linkifyTimestamps(trimmedLine.substring(4))}</h3>`);
        } else if (trimmedLine.startsWith('## ')) {
            if (inList) result.push('</ul>');
            inList = false;
            result.push(`<h2>${linkifyTimestamps(trimmedLine.substring(3))}</h2>`);
        } else if (trimmedLine.startsWith('# ')) {
            if (inList) result.push('</ul>');
            inList = false;
            result.push(`<h1>${linkifyTimestamps(trimmedLine.substring(2))}</h1>`);
        } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            result.push(`<li>${linkifyTimestamps(parseInlineMarkdown(trimmedLine.substring(2)))}</li>`);
        } else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            result.push(`<p>${linkifyTimestamps(parseInlineMarkdown(trimmedLine))}</p>`);
        }
    }
    
    if (inList) {
        result.push('</ul>');
    }
    
    return result.join('');
}

function parseInlineMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function linkifyTimestamps(text) {
    // Regex to find timestamps like [7:10], (7:10), [7:10-7:29], or (7:10-7:29)
    const timestampRegex = /[\[\(](\d{1,2}:\d{2}(?::\d{2})?)(?:-\d{1,2}:\d{2}(?::\d{2})?)?[\]\)]/g;
    
    return text.replace(timestampRegex, (match) => {
        // Extract the start time, which is the first timestamp found in the match
        const startTimeMatch = match.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (!startTimeMatch) return match; // Should not happen with the regex, but as a safeguard
        
        const startTime = startTimeMatch[0];
        const parts = startTime.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) { // HH:MM:SS
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else { // MM:SS
            seconds = parts[0] * 60 + parts[1];
        }
        
        return `<a href="javascript:void(0)" data-seconds="${seconds}" class="timestamp-link yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color">${match}</a>`;
    });
}

function handleError(error) {
  const summaryContainer = document.getElementById("summary-container");
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = `<p style="color: red;"><b>Error:</b> ${error.message}</p>`;
  } else {
    // Fallback if summaryContent is not found (shouldn't happen if injected correctly)
    summaryContainer.innerHTML = `<p style="color: red;"><b>Error:</b> ${error.message}</p>`;
  }
  const button = document.getElementById("summarize-btn");
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
}

async function getTranscriptFromDOM() {
  return new Promise(async (resolve, reject) => {
    try {
      // Click "more" to show description
      const moreActionsButton = document.querySelector('tp-yt-paper-button#expand');
      if (moreActionsButton) {
        moreActionsButton.click();
        await new Promise(r => setTimeout(r, 500)); // Wait for animation
      }

      // Find and click "Show transcript" button
      const transcriptButton = document.querySelector('ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]');
      if (transcriptButton) {
        transcriptButton.click();
        await new Promise(r => setTimeout(r, 1500)); // Wait for transcript to load
      }

      // At this point, the transcript should be visible.
      // Poll for transcript segments to appear.
      let transcriptSegments = [];
      let retries = 5;
      while (retries > 0 && transcriptSegments.length === 0) {
        transcriptSegments = document.querySelectorAll("ytd-transcript-segment-renderer");
        if (transcriptSegments.length > 0) break;
        await new Promise(r => setTimeout(r, 500));
        retries--;
      }

      if (transcriptSegments.length > 0) {
        let fullTranscript = "";
        transcriptSegments.forEach(segment => {
          const timestamp = segment.querySelector('.segment-timestamp')?.innerText.trim() || '';
          const text = segment.querySelector('.segment-text')?.innerText.trim() || '';
          if (text) {
            fullTranscript += `[${timestamp}] ${text}\n`;
          }
        });
        resolve(fullTranscript.trim());
      } else {
        reject(new Error("Could not find transcript segments. The video may not have a transcript, or the page structure has changed."));
      }
    } catch (error) {
      console.error("Error in getTranscriptFromDOM:", error);
      reject(new Error("An unexpected error occurred while trying to get the transcript from the page."));
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

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName('text');

        let fullTranscript = "";
        for (let i = 0; i < textNodes.length; i++) {
            const node = textNodes[i];
            const start = parseFloat(node.getAttribute('start'));
            const text = node.textContent;

            // Format timestamp from seconds to MM:SS
            const minutes = Math.floor(start / 60);
            const seconds = Math.floor(start % 60).toString().padStart(2, '0');
            const timestamp = `${minutes}:${seconds}`;

            fullTranscript += `[${timestamp}] ${text.replace(/&#39;/g, "'").replace(/\n/g, ' ').trim()}\n`;
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
