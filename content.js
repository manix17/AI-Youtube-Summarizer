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
  }
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

  try {
    // First, try the API method
    const apiTranscript = await getTranscript();
    if (apiTranscript && apiTranscript.trim() !== '') {
      finalTranscript = apiTranscript;
    } else {
      // If API method returns empty or null, force fallback
      console.warn("API method returned empty transcript, trying DOM fallback.");
      summaryContainer.innerHTML = '<i>API method returned empty. Trying fallback...</i>';
      finalTranscript = await getTranscriptFromDOM();
    }
  } catch (error) {
    console.warn("API method failed, trying DOM fallback:", error.message);
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
    summaryContainer.innerHTML = `<h3 style="margin-top:0;">Summary</h3><p>${response.summary.replace(/\n/g, '<br>')}</p>`;
  } else {
    handleError(new Error("Failed to get a valid summary."));
  }
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
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
