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
  summaryContainer.innerHTML = '<i>Getting transcript and generating summary...</i>';

  try {
    const transcript = await getTranscript();
    if (!transcript) {
        throw new Error("Transcript not available or couldn't be found. Please open the transcript panel first by clicking '... More' -> 'Show transcript'.");
    }

    // Send the transcript to the background script
    chrome.runtime.sendMessage({ action: "summarize", transcript: transcript }, (response) => {
      if (chrome.runtime.lastError) {
          // Handle potential errors during message passing
          summaryContainer.innerHTML = `<p style="color: red;">Error: ${chrome.runtime.lastError.message}</p>`;
      } else if (response && response.summary) {
        // Display the summary received from the background script
        summaryContainer.innerHTML = `<h3 style="margin-top:0;">Summary</h3><p>${response.summary.replace(/\n/g, '<br>')}</p>`;
      } else {
        summaryContainer.innerHTML = `<p style="color: red;">Failed to get a summary.</p>`;
      }
      button.innerText = "✨ Summarize Video";
      button.disabled = false;
    });

  } catch (error) {
    summaryContainer.innerHTML = `<p style="color: red;"><b>Error:</b> ${error.message}</p>`;
    button.innerText = "✨ Summarize Video";
    button.disabled = false;
  }
}

// --- 3. Function to Extract the Transcript ---
async function getTranscript() {
  // YouTube loads transcripts dynamically. The easiest way for the user
  // is to have them open it first.
  const transcriptSegments = document.querySelectorAll("ytd-transcript-segment-renderer .segment-text");

  if (transcriptSegments.length === 0) {
    // If we can't find it, we prompt the user.
    return null;
  }

  let fullTranscript = "";
  transcriptSegments.forEach(segment => {
    fullTranscript += segment.innerText + " ";
  });

  return fullTranscript.trim();
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
