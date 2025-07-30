// content.js

// --- 1. Function to Inject the Summarize Button ---
function injectSummarizeButton() {
  const targetElement = document.querySelector("#below");

  if (targetElement && !document.getElementById("summarize-btn")) {
    const button = document.createElement("button");
    button.innerText = "✨ Summarize Video";
    button.id = "summarize-btn";
    button.classList.add("summarize-btn");

    const summaryContainer = document.createElement("div");
    summaryContainer.id = "summary-container";
    summaryContainer.classList.add("summary-container");
    summaryContainer.style.display = "none";

    const closeButton = document.createElement("button");
    closeButton.id = "close-summary-btn";
    closeButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="m12.71 12 8.15 8.15-.71.71L12 12.71l-8.15 8.15-.71-.71L11.29 12 3.15 3.85l.71-.71L12 11.29l8.15-8.15.71.71L12.71 12z"></path></svg>';
    closeButton.classList.add("close-summary-btn");
    closeButton.addEventListener("click", () => {
      summaryContainer.style.display = "none";
    });
    summaryContainer.appendChild(closeButton);

    const summaryContent = document.createElement("div");
    summaryContent.id = "summary-content";
    summaryContainer.appendChild(summaryContent);

    targetElement.prepend(summaryContainer);
    targetElement.prepend(button);

    button.addEventListener("click", handleSummarizeClick);

    // Add a delegated click listener for our timestamp links
    summaryContainer.addEventListener("click", (e) => {
      const target = e.target.closest(".timestamp-link");

      if (target) {
        e.preventDefault();
        const seconds = parseInt(target.dataset.seconds, 10);
        const player = document.querySelector("video");
        if (player) {
          player.currentTime = seconds;
        }
      }
    });

    injectCss("summary.css");
  }
}

function injectCss(file) {
  const link = document.createElement("link");
  link.href = chrome.runtime.getURL(file);
  link.type = "text/css";
  link.rel = "stylesheet";
  (document.head || document.documentElement).appendChild(link);
}

// --- 2. Function to Handle the Button Click ---
async function handleSummarizeClick() {
  const button = document.getElementById("summarize-btn");
  const summaryContainer = document.getElementById("summary-container");

  button.innerText = "⏳ Summarizing...";
  button.disabled = true;
  summaryContainer.style.display = "block";
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = "<i>Getting transcript...</i>";
  }

  let finalTranscript = null;

  // const response = await fetch(chrome.runtime.getURL("md_rendering_test.json"));
  // summaries = await response.json();
  // console.log("Summary: ", summaries);
  // handleResponse(summaries[3]);
  // return;

  try {
    // First, try the API method
    const apiTranscript = await getTranscript();
    if (apiTranscript && apiTranscript.trim() !== "") {
      finalTranscript = apiTranscript;
    } else {
      // If API method returns empty or null, force fallback
      console.log("API method returned empty transcript, trying DOM fallback.");
      // const summaryContent = document.getElementById("summary-content");
      // if (summaryContent) {
      //   summaryContent.innerHTML = '<i>API method returned empty. Trying fallback...</i>';
      // }
      finalTranscript = await getTranscriptFromDOM();
    }
  } catch (error) {
    console.log("API method failed, trying DOM fallback:", error.message);
    const summaryContent = document.getElementById("summary-content");
    if (summaryContent) {
      summaryContent.innerHTML = "<i>API method failed. Trying fallback...</i>";
    }

    // If API method fails, try the DOM fallback
    try {
      finalTranscript = await getTranscriptFromDOM();
    } catch (domError) {
      handleError(domError);
      return; // Exit if both methods fail
    }
  }

  if (finalTranscript && finalTranscript.trim() !== "") {
    // Gather metadata
    const videoTitle =
      document.querySelector("h1.style-scope.ytd-watch-metadata")?.innerText ||
      "N/A";
    const channelName =
      document.querySelector("ytd-channel-name #text a")?.innerText ||
      document.querySelector("#owner-name a.yt-simple-endpoint")?.innerText ||
      "N/A";
    const videoDuration =
      document.querySelector(".ytp-time-duration")?.innerText || "N/A";

    // Send the transcript and metadata to the background script
    chrome.runtime.sendMessage(
      {
        action: "summarize",
        transcript: finalTranscript,
        videoTitle: videoTitle,
        videoDuration: videoDuration,
        channelName: channelName,
      },
      handleResponse
    );
  } else {
    handleError(
      new Error("Could not retrieve a valid transcript using either method.")
    );
  }
}

function handleResponse(response) {
  const button = document.getElementById("summarize-btn");
  const summaryContainer = document.getElementById("summary-container");

  if (chrome.runtime.lastError) {
    handleError(new Error(chrome.runtime.lastError.message));
  } else if (response && response.summary) {
    const formattedSummary = convertToHTML(response.summary);
    const summaryContent = document.getElementById("summary-content");
    summaryContent.innerHTML = `<h3>Summary</h3><div class="markdown-content">${formattedSummary}</div>`;

    // Add staggered animation to list items
    // const listItems = summaryContainer.querySelectorAll(".markdown-content li");
    // listItems.forEach((item, index) => {
    //   item.style.animationDelay = `${index * 0.1}s`;
    //   item.style.animation = "slideUp 0.6s ease-out forwards";
    // });
  } else {
    handleError(new Error("Failed to get a valid summary."));
  }
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
}

function convertToHTML(text) {
  // Clean up the input text - handle JSON string escaping
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

    // Count leading spaces to determine nesting level
    const leadingSpaces = line.length - line.trimStart().length;
    const currentLevel = Math.floor(leadingSpaces / 4);

    // Handle headings
    if (trimmedLine.startsWith("###")) {
      if (inList) {
        html += closeAllLists(listLevel, indent);
        inList = false;
        listLevel = 0;
      }
      const headingText = trimmedLine.replace(/^#+\s*/, "");
      html += `<h3>${headingText}</h3>\n`;
    }
    // Handle list items
    else if (trimmedLine.startsWith("*")) {
      const listContent = trimmedLine.substring(1).trim();

      if (!inList) {
        html += `${indent}<ul>\n`;
        inList = true;
        listLevel = 1;
      } else if (currentLevel > listLevel - 1) {
        // Nested list
        html += `${indent.repeat(listLevel + 1)}<ul>\n`;
        listLevel++;
      } else if (currentLevel < listLevel - 1) {
        // Close nested lists
        const levelsToClose = listLevel - 1 - currentLevel;
        for (let j = 0; j < levelsToClose; j++) {
          listLevel--;
          html += `${indent.repeat(listLevel)}</ul>\n`;
        }
      }

      const processedContent = processInlineFormatting(listContent);
      html += `${indent.repeat(listLevel)}<li>${processedContent}</li>\n`;
    }
    // Handle regular paragraphs
    else {
      if (inList) {
        html += closeAllLists(listLevel, indent);
        inList = false;
        listLevel = 0;
      }

      const processedContent = processInlineFormatting(trimmedLine);
      html += `<p>${processedContent}</p>\n`;
    }
  }

  // Close any remaining lists
  if (inList) {
    html += closeAllLists(listLevel, indent);
  }

  return html.trim();
}

function preprocessText(text) {
  // Handle escaped JSON string format
  if (text.startsWith('"') && text.endsWith('"')) {
    // Remove outer quotes
    text = text.slice(1, -1);
  }

  // Unescape common JSON escape sequences
  text = text.replace(/\\"/g, '"'); // Escaped quotes
  text = text.replace(/\\n/g, "\n"); // Escaped newlines
  text = text.replace(/\\r/g, "\r"); // Escaped carriage returns
  text = text.replace(/\\t/g, "\t"); // Escaped tabs
  text = text.replace(/\\\\/g, "\\"); // Escaped backslashes (do this last)

  return text;
}

function processInlineFormatting(text) {
  // Handle timestamps [00:00]
  // text = text.replace(/\[(\d+:\d+)\]/g, '<span class="timestamp">$1</span>');
  text = linkifyTimestamps(text);

  // Handle bold text **text**
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Handle code/emphasis `text`
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Handle parenthetical notes (e.g., text)
  text = text.replace(/\(e\.g\.,([^)]+)\)/g, "<em>(e.g.,$1)</em>");

  return text;
}

function closeAllLists(levels, indent) {
  let html = "";
  for (let i = levels; i > 0; i--) {
    html += `${indent.repeat(i - 1)}</ul>\n`;
  }
  return html;
}

function linkifyTimestamps(text) {
  // Regex to find timestamps like [7:10], (7:10), [7:10-7:29], or (7:10-7:29)
  const timestampRegex =
    /[\[\(](\d{1,2}:\d{2}(?::\d{2})?)(?:-\d{1,2}:\d{2}(?::\d{2})?)?[\]\)]/g;

  return text.replace(timestampRegex, (match) => {
    // Extract the start time, which is the first timestamp found in the match
    const startTimeMatch = match.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (!startTimeMatch) return match; // Should not happen with the regex, but as a safeguard

    const startTime = startTimeMatch[0];
    const parts = startTime.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      // HH:MM:SS
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      // MM:SS
      seconds = parts[0] * 60 + parts[1];
    }

    match = match.replace(/[\[\]()]/g, '');

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
      const moreActionsButton = document.querySelector(
        "tp-yt-paper-button#expand"
      );
      if (moreActionsButton) {
        moreActionsButton.click();
        await new Promise((r) => setTimeout(r, 500)); // Wait for animation
      }

      // Find and click "Show transcript" button
      const transcriptButton = document.querySelector(
        'ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]'
      );
      if (transcriptButton) {
        transcriptButton.click();
        await new Promise((r) => setTimeout(r, 1500)); // Wait for transcript to load
      }

      // At this point, the transcript should be visible.
      // Poll for transcript segments to appear.
      let transcriptSegments = [];
      let retries = 5;
      while (retries > 0 && transcriptSegments.length === 0) {
        transcriptSegments = document.querySelectorAll(
          "ytd-transcript-segment-renderer"
        );
        if (transcriptSegments.length > 0) break;
        await new Promise((r) => setTimeout(r, 500));
        retries--;
      }

      if (transcriptSegments.length > 0) {
        let fullTranscript = "";
        transcriptSegments.forEach((segment) => {
          const timestamp =
            segment.querySelector(".segment-timestamp")?.innerText.trim() || "";
          const text =
            segment.querySelector(".segment-text")?.innerText.trim() || "";
          if (text) {
            fullTranscript += `[${timestamp}] ${text}\n`;
          }
        });
        resolve(fullTranscript.trim());
      } else {
        reject(
          new Error(
            "Could not find transcript segments. The video may not have a transcript, or the page structure has changed."
          )
        );
      }
    } catch (error) {
      console.error("Error in getTranscriptFromDOM:", error);
      reject(
        new Error(
          "An unexpected error occurred while trying to get the transcript from the page."
        )
      );
    }
  });
}

// --- 3. Function to Extract the Transcript ---
async function getTranscript() {
  try {
    const playerResponse = await getPlayerResponse();
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No caption tracks found for this video.");
    }

    const transcriptInfo =
      captionTracks.find((track) => track.languageCode === "en") ||
      captionTracks[0];
    const transcriptUrl = transcriptInfo.baseUrl;

    const response = await fetch(transcriptUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript: ${response.statusText}`);
    }
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");

    let fullTranscript = "";
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const start = parseFloat(node.getAttribute("start"));
      const text = node.textContent;

      // Format timestamp from seconds to MM:SS
      const minutes = Math.floor(start / 60);
      const seconds = Math.floor(start % 60)
        .toString()
        .padStart(2, "0");
      const timestamp = `${minutes}:${seconds}`;

      fullTranscript += `[${timestamp}] ${text
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim()}\n`;
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
    const script = document.createElement("script");
    // The URL for the injector script must be retrieved from the extension's resources
    script.src = chrome.runtime.getURL("injector.js");
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
      if (
        event.source === window &&
        event.data &&
        event.data.type === "FROM_PAGE"
      ) {
        window.removeEventListener("message", messageListener); // Clean up listener
        if (event.data.error) {
          reject(
            new Error(`Could not access player data: ${event.data.error}`)
          );
        } else if (event.data.payload) {
          resolve(event.data.payload);
        } else {
          reject(
            new Error(
              "Could not find the YouTube player data (ytInitialPlayerResponse). This video might not have a transcript."
            )
          );
        }
      }
    };

    window.addEventListener("message", messageListener);

    // Timeout to prevent the promise from hanging indefinitely
    setTimeout(() => {
      window.removeEventListener("message", messageListener);
      reject(new Error("Timeout waiting for player data."));
    }, 5000); // 5-second timeout
  });
}

// --- 4. Run the Injection Logic ---
// YouTube is a Single Page Application (SPA), so content can change without a full page reload.
// We use a MutationObserver to detect when the video player part of the page is loaded.
const observer = new MutationObserver((mutations, obs) => {
  if (
    document.querySelector("#below") &&
    !document.getElementById("summarize-btn")
  ) {
    injectSummarizeButton();
    // Once we've injected the button, we don't need to observe anymore for this page view
    obs.disconnect();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also run it once on initial load
injectSummarizeButton();
