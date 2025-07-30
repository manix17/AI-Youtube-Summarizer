// src/content/index.ts

import { convertToHTML } from "../utils/dom_parser";
import type {
  VideoMetadata,
  PlayerResponse,
  SummarizeRequest,
  SummarizeResponseMessage,
  PageResponseMessage,
  CaptionTrack,
} from "../types";

// --- 1. UI Injection and Management ---

/**
 * Injects the main "Summarize Video" button and summary container into the page.
 */
function injectSummarizeButton(): void {
  const targetElement = document.querySelector<HTMLElement>("#below");

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

    summaryContainer.addEventListener("click", handleTimestampClick);

    injectCss("assets/css/summary.css");
  }
}

/**
 * Injects a CSS file into the page's head.
 * @param {string} file - The path to the CSS file.
 */
function injectCss(file: string): void {
  const link = document.createElement("link");
  link.href = chrome.runtime.getURL(file);
  link.type = "text/css";
  link.rel = "stylesheet";
  (document.head || document.documentElement).appendChild(link);
}

/**
 * Handles clicks on timestamp links within the summary.
 * @param {MouseEvent} e - The click event.
 */
function handleTimestampClick(e: MouseEvent): void {
  const target = (e.target as HTMLElement).closest<HTMLAnchorElement>(
    ".timestamp-link"
  );
  if (target) {
    e.preventDefault();
    const seconds = parseInt(target.dataset.seconds!, 10);
    const player = document.querySelector<HTMLVideoElement>("video");
    if (player) {
      player.currentTime = seconds;
    }
  }
}

// --- 2. Summarization Logic ---

/**
 * Main handler for the "Summarize" button click.
 */
async function handleSummarizeClick(): Promise<void> {
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;
  const summaryContainer = document.getElementById(
    "summary-container"
  ) as HTMLDivElement;

  button.innerText = "⏳ Summarizing...";
  button.disabled = true;
  summaryContainer.style.display = "block";
  updateSummaryContent("<i>Getting transcript...</i>");

  try {
    const transcript = await getTranscript();
    if (!transcript || transcript.trim() === "") {
      throw new Error("Could not retrieve a valid transcript.");
    }

    const metadata = getVideoMetadata();

    const message: SummarizeRequest = {
      type: "summarize",
      payload: {
        transcript: transcript,
        ...metadata,
      },
    };

    chrome.runtime.sendMessage(message, handleResponse);
  } catch (error) {
    handleError(error as Error);
  }
}

/**
 * Handles the response from the background script.
 * @param {SummarizeResponseMessage} response - The response object from the background script.
 */
function handleResponse(response: SummarizeResponseMessage): void {
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;

  console.log("handleResponse: ", response, chrome.runtime.lastError);
  if (response.error) {
    handleError(new Error(response.error));
  } else if (chrome.runtime.lastError) {
    handleError(new Error(chrome.runtime.lastError.message));
  } else if (response && response.payload?.summary) {
    if (response.payload.summary.startsWith("Error:")) {
      handleError(new Error(response.payload.summary));
    } else {
      const formattedSummary = convertToHTML(response.payload.summary);
      updateSummaryContent(
        `<h3>Summary</h3><div class="markdown-content">${formattedSummary}</div>`
      );
    }
  } else {
    handleError(new Error("Failed to get a valid summary."));
  }
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
}

/**
 * Displays an error message in the summary container.
 * @param {Error} error - The error object.
 */
function handleError(error: Error): void {
  updateSummaryContent(
    `<p style="color: red;"><b>Error:</b> ${error.message}</p>`
  );
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;
  button.innerText = "✨ Summarize Video";
  button.disabled = false;
}

/**
 * Updates the content of the summary container.
 * @param {string} html - The HTML string to display.
 */
function updateSummaryContent(html: string): void {
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = html;
  }
}

// --- 3. Transcript and Metadata Extraction ---

/**
 * Tries to get the transcript using the API method first, then falls back to DOM scraping.
 * @returns {Promise<string>} A promise that resolves with the transcript text.
 */
async function getTranscript(): Promise<string> {
  try {
    const apiTranscript = await getTranscriptFromApi();
    if (apiTranscript && apiTranscript.trim() !== "") {
      return apiTranscript;
    }
  } catch (error) {
    console.log(
      "API transcript method failed, falling back to DOM scraping:",
      (error as Error).message
    );
    updateSummaryContent("<i>API method failed. Trying fallback...</i>");
  }
  // If API method fails or returns empty, try the DOM fallback
  return getTranscriptFromDOM();
}

/**
 * Extracts video metadata from the page.
 * @returns {VideoMetadata} An object containing video title, duration, and channel name.
 */
function getVideoMetadata(): VideoMetadata {
  return {
    videoTitle:
      document.querySelector<HTMLElement>("h1.style-scope.ytd-watch-metadata")
        ?.innerText || "N/A",
    channelName:
      document.querySelector<HTMLElement>("ytd-channel-name #text a")
        ?.innerText ||
      document.querySelector<HTMLElement>("#owner-name a.yt-simple-endpoint")
        ?.innerText ||
      "N/A",
    videoDuration:
      document.querySelector<HTMLElement>(".ytp-time-duration")?.innerText ||
      "N/A",
  };
}

/**
 * Extracts the transcript by scraping the DOM.
 * @returns {Promise<string>} A promise that resolves with the transcript text.
 */
async function getTranscriptFromDOM(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const moreActionsButton = document.querySelector<HTMLButtonElement>(
        "tp-yt-paper-button#expand"
      );
      if (moreActionsButton) {
        moreActionsButton.click();
        await new Promise((r) => setTimeout(r, 500));
      }

      const transcriptButton = document.querySelector<HTMLButtonElement>(
        'ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]'
      );
      if (transcriptButton) {
        transcriptButton.click();
        await new Promise((r) => setTimeout(r, 1500));
      }

      let transcriptSegments: NodeListOf<HTMLElement> =
        document.querySelectorAll("ytd-transcript-segment-renderer");
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
            segment
              .querySelector<HTMLElement>(".segment-timestamp")
              ?.innerText.trim() || "";
          const text =
            segment
              .querySelector<HTMLElement>(".segment-text")
              ?.innerText.trim() || "";
          if (text) {
            fullTranscript += `[${timestamp}] ${text}\n`;
          }
        });
        resolve(fullTranscript.trim());
      } else {
        reject(
          new Error(
            "Could not find transcript segments via DOM. The video may not have a transcript."
          )
        );
      }
    } catch (error) {
      reject(
        new Error(
          "An unexpected error occurred while scraping the transcript from the page."
        )
      );
    }
  });
}

/**
 * Extracts the transcript using YouTube's internal player data.
 * @returns {Promise<string>} A promise that resolves with the transcript text.
 */
async function getTranscriptFromApi(): Promise<string> {
  const playerResponse = await getPlayerResponse();
  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks found in player data.");
  }

  const transcriptInfo =
    captionTracks.find((track: CaptionTrack) => track.languageCode === "en") ||
    captionTracks[0];
  const response = await fetch(transcriptInfo.baseUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript XML: ${response.statusText}`);
  }
  const xmlText = await response.text();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const textNodes = xmlDoc.getElementsByTagName("text");

  let fullTranscript = "";
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const start = parseFloat(node.getAttribute("start")!);
    const text = node.textContent!;
    const minutes = Math.floor(start / 60);
    const seconds = Math.floor(start % 60)
      .toString()
      .padStart(2, "0");
    fullTranscript += `[${minutes}:${seconds}] ${text
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim()}\n`;
  }
  return fullTranscript.trim();
}

/**
 * Injects a script to access the `ytInitialPlayerResponse` object from the page.
 * @returns {Promise<PlayerResponse>} A promise that resolves with the player response data.
 */
function getPlayerResponse(): Promise<PlayerResponse> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injector.bundle.js");
    script.onload = () => script.remove();
    script.onerror = () =>
      reject(new Error("Failed to load the injector script."));
    (document.head || document.documentElement).appendChild(script);

    const messageListener = (event: MessageEvent) => {
      if (event.source === window && event.data?.type === "FROM_PAGE") {
        window.removeEventListener("message", messageListener);
        const message = event.data as PageResponseMessage;
        if (message.error) {
          reject(new Error(`Injector script error: ${message.error}`));
        } else if (message.payload) {
          resolve(message.payload);
        } else {
          reject(new Error("Could not find ytInitialPlayerResponse."));
        }
      }
    };
    window.addEventListener("message", messageListener);
    setTimeout(() => {
      window.removeEventListener("message", messageListener);
      reject(new Error("Timeout waiting for player data."));
    }, 5000);
  });
}

// --- 4. Initialization ---

/**
 * Use a MutationObserver to detect when navigation to a new video page occurs.
 */
const observer = new MutationObserver(() => {
  if (
    document.querySelector("#below") &&
    !document.getElementById("summarize-btn")
  ) {
    injectSummarizeButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial run on page load
injectSummarizeButton();
