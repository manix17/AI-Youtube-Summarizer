# Plan: Transcript Retrieval with DOM Fallback

This document outlines a two-pronged strategy to reliably fetch YouTube video transcripts, combining an API-based approach with a DOM-based fallback to ensure maximum resilience.

### 1. Primary Method: API-based Retrieval

- **Goal**: To get the transcript data quickly and efficiently from YouTube's internal player data.
- **Process**:
    1.  The content script (`content.js`) will first attempt to get the transcript URL from the page's `ytInitialPlayerResponse` object using the CSP-compliant `injector.js` method.
    2.  If a valid URL is found, it will be sent to the background script (`background.js`).
    3.  The background script will fetch the transcript using the user's cookies for authentication, parse the XML, and proceed with the summary.

### 2. Fallback Method: DOM-based Scraping

- **Goal**: To provide a reliable backup if the primary API method is unsuccessful.
- **Trigger**: This method is automatically triggered within `content.js` if:
    - The primary API method throws an error.
    - The primary API method returns an empty or null transcript.
- **Process**:
    1.  The script will first attempt to click the "...more" button (`tp-yt-paper-button#expand`) to expand the video description.
    2.  After a short delay to allow the DOM to update, it will then locate and click the "Show transcript" button (specifically, a button with `aria-label="Show transcript"` within `ytd-video-description-transcript-section-renderer`).
    3.  It will then wait for the transcript panel to load.
    4.  Once loaded, it will scrape the text content from all the transcript segment elements.
    5.  The complete, concatenated transcript text will be sent directly to the background script for summarization.

### 3. Background Script (`background.js`) Updates

- The message listener in the background script will be updated to handle two types of incoming requests:
    - A request containing a `transcriptUrl` (from the primary method).
    - A request containing the full `transcript` text (from the fallback method).
- This ensures that no matter which method succeeds, the summary process can be completed.

This dual-method approach ensures the extension is robust and can handle various scenarios, providing a more consistent user experience.
