// background.js

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    // Ensure we have a transcript to summarize
    if (!request.transcript || request.transcript.trim() === "") {
      sendResponse({ summary: "Error: Could not find a transcript for this video." });
      return true; // Indicates that the response is sent asynchronously
    }

    // Get the API key from storage
    chrome.storage.sync.get(['apiKey'], (result) => {
      if (!result.apiKey) {
        sendResponse({ summary: "Error: API key not found. Please set your Google Gemini API key in the extension's options." });
        return; // Exit if no key
      }

      const apiKey = result.apiKey;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const prompt = `Summarize the following video transcript concisely, in a few key bullet points:\n\nTranscript:\n${request.transcript}`;

      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      };

      // Make the API call to Gemini
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      .then(response => {
          if (!response.ok) {
              // Handle non-200 responses
              return response.json().then(errorData => {
                  let errorMessage = `API Error: ${response.status} ${response.statusText}.`;
                  if (errorData.error && errorData.error.message) {
                      errorMessage += ` Details: ${errorData.error.message}`;
                  }
                  // Specific check for invalid API key
                  if (errorData.error && errorData.error.message.includes("API key not valid")) {
                      errorMessage = "Error: The provided API key is not valid. Please check it in the extension's options.";
                  }
                  throw new Error(errorMessage);
              });
          }
          return response.json();
      })
      .then(data => {
        // Extract the summary text from the response
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
          const summary = data.candidates[0].content.parts[0].text;
          sendResponse({ summary: summary });
        } else {
           if (data.promptFeedback && data.promptFeedback.blockReason) {
              throw new Error(`API blocked the prompt. Reason: ${data.promptFeedback.blockReason}.`);
           }
          throw new Error("Invalid response structure from API.");
        }
      })
      .catch(error => {
        console.error("Error during summarization:", error);
        sendResponse({ summary: `Error: Could not generate summary. ${error.message}` });
      });
    });

    return true; // Keep the message channel open for the asynchronous response
  }
});
