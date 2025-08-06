// src/content/index.ts

import { convertToHTML, convertHTMLToText } from "../utils/dom_parser";
import {
  getProgressiveLoadingMessage,
  getContextualLoadingMessage,
} from "../utils/loading_messages";
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
function injectSummarizeUI(): void {
  const targetElement = document.querySelector<HTMLElement>("#below");

  if (targetElement && !document.getElementById("summarize-ui-container")) {
    const uiContainer = document.createElement("div");
    uiContainer.id = "summarize-ui-container";
    uiContainer.classList.add("summarize-ui-container");

    const profileSelect = document.createElement("select");
    profileSelect.id = "profile-select";
    profileSelect.classList.add("summary-select");

    const presetSelect = document.createElement("select");
    presetSelect.id = "preset-select";
    presetSelect.classList.add("summary-select");

    const languageSelect = document.createElement("select");
    languageSelect.id = "language-select";
    languageSelect.classList.add("summary-select");

    const button = document.createElement("button");
    button.innerText = "✨ Summarize";
    button.id = "summarize-btn";
    button.classList.add("summarize-btn");

    uiContainer.appendChild(profileSelect);
    uiContainer.appendChild(presetSelect);
    uiContainer.appendChild(languageSelect);
    uiContainer.appendChild(button);

    const summaryContainer = document.createElement("div");
    summaryContainer.id = "summary-container";
    summaryContainer.classList.add("summary-container");
    summaryContainer.style.display = "none";

    // ... (rest of the summary container setup is the same)
    const closeButton = document.createElement("button");
    closeButton.id = "close-summary-btn";
    closeButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="m12.71 12 8.15 8.15-.71.71L12 12.71l-8.15 8.15-.71-.71L11.29 12 3.15 3.85l.71-.71L12 11.29l8.15-8.15.71.71L12.71 12z"></path></svg>';
    closeButton.classList.add("close-summary-btn");
    closeButton.addEventListener("click", () => {
      summaryContainer.style.display = "none";
    });

    const copyButton = document.createElement("button");
    copyButton.id = "copy-summary-btn";
    copyButton.title = "Copy to Clipboard";
    copyButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="M15 1H4c-1.1 0-2 .9-2 2v14h2V3h11V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h10v14z"></path></svg>';
    copyButton.classList.add("copy-summary-btn");
    copyButton.addEventListener("click", handleCopyToClipboard);

    const downloadButton = document.createElement("button");
    downloadButton.id = "download-summary-btn";
    downloadButton.title = "Download Summary";
    downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>`;
    downloadButton.classList.add("download-summary-btn");
    downloadButton.addEventListener("click", handleDownloadSummary);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("summary-button-container");
    buttonContainer.appendChild(downloadButton);
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(closeButton);
    summaryContainer.appendChild(buttonContainer);

    const summaryContent = document.createElement("div");
    summaryContent.id = "summary-content";
    summaryContainer.appendChild(summaryContent);

    targetElement.prepend(summaryContainer);
    targetElement.prepend(uiContainer);

    button.addEventListener("click", handleSummarizeClick);
    summaryContainer.addEventListener("click", handleTimestampClick);

    initialize();
    profileSelect.addEventListener("change", handleProfileChange);
    presetSelect.addEventListener("change", handlePresetChange);
    languageSelect.addEventListener("change", handleLanguageChange);

    injectCss("assets/css/summary.css");
    setupDarkModeObserver();
  }
}

/**
 * Sets up a MutationObserver to watch for changes to YouTube's dark mode attribute.
 */
function setupDarkModeObserver(): void {
  const targetNode = document.documentElement;
  const config = { attributes: true, attributeFilter: ["dark"] };

  const callback = (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "attributes" && mutation.attributeName === "dark") {
        const isDarkMode = targetNode.hasAttribute("dark");
        const summaryContainer = document.getElementById("summary-container");
        const uiContainer = document.getElementById("summarize-ui-container");
        if (summaryContainer) {
          summaryContainer.classList.toggle("dark", isDarkMode);
        }
        if (uiContainer) {
          uiContainer.classList.toggle("dark", isDarkMode);
        }
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);

  // Initial check
  const isDarkMode = targetNode.hasAttribute("dark");
  const summaryContainer = document.getElementById("summary-container");
  const uiContainer = document.getElementById("summarize-ui-container");
  if (summaryContainer) {
    summaryContainer.classList.toggle("dark", isDarkMode);
  }
  if (uiContainer) {
    uiContainer.classList.toggle("dark", isDarkMode);
  }
}

function handleDownloadSummary(): void {
  const summaryContent =
    document.querySelector<HTMLElement>(".markdown-content");
  const videoTitle = getVideoMetadata().videoTitle;
  if (summaryContent) {
    // Use the new conversion function to preserve formatting
    const formattedText = convertHTMLToText(summaryContent);
    const blob = new Blob([formattedText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoTitle}_summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Handles the click event for the copy to clipboard button.
 */
function handleCopyToClipboard(): void {
  const summaryContent =
    document.querySelector<HTMLElement>(".markdown-content");
  if (summaryContent) {
    // Create a temporary div to hold the HTML content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = summaryContent.innerHTML;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);

    // Select the content of the temporary div
    const range = document.createRange();
    range.selectNode(tempDiv);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    try {
      // Copy the selected content to the clipboard
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }

    // Clean up the temporary div and selection
    document.body.removeChild(tempDiv);
    selection?.removeAllRanges();

    const copyButton = document.getElementById(
      "copy-summary-btn"
    ) as HTMLButtonElement;
    copyButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>';
    setTimeout(() => {
      copyButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentcolor;"><path d="M15 1H4c-1.1 0-2 .9-2 2v14h2V3h11V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h10v14z"></path></svg>';
    }, 2000);
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

let profiles: Record<string, any> = {};
let defaultPrompts: any = {};
let currentProfileId: string = "default";
let loadingInterval: number | null = null;

async function initialize() {
  try {
    const promptsRes = await fetch(
      chrome.runtime.getURL("assets/prompts.json")
    );
    defaultPrompts = await promptsRes.json();
    await loadProfiles();
  } catch (error) {
    console.error("Error initializing summarizer UI:", error);
  }
}

async function loadProfiles() {
  const profileSelect = document.getElementById(
    "profile-select"
  ) as HTMLSelectElement;

  chrome.storage.sync.get(null, (data) => {
    let storedProfiles: Record<string, any> = {};

    if (data.profile_ids && data.profile_ids.length > 0) {
      const profileIds = data.profile_ids;
      for (const id of profileIds) {
        if (data[`profile_${id}`]) {
          storedProfiles[id] = data[`profile_${id}`];
        }
      }
      currentProfileId = data.currentProfile || "default";
    } else {
      // No profiles in storage, so create a default one for the UI to use.
      storedProfiles = {
        default: {
          name: "Default",
          presets: {}, // This will be populated by the reconstruction logic below
          currentPreset: "detailed",
        },
      };
      currentProfileId = "default";
    }

    // Reconstruct full profiles by merging stored data with defaults
    profiles = {};
    for (const profileId in storedProfiles) {
      const userProfile = storedProfiles[profileId];
      const fullPresets = JSON.parse(JSON.stringify(defaultPrompts.presets));

      for (const key in fullPresets) {
        fullPresets[key].isDefault = true;
        if (
          userProfile.presets &&
          userProfile.presets[key] &&
          userProfile.presets[key].isDefault
        ) {
          Object.assign(fullPresets[key], userProfile.presets[key]);
        }
      }

      if (userProfile.presets) {
        for (const key in userProfile.presets) {
          if (!userProfile.presets[key].isDefault) {
            fullPresets[key] = userProfile.presets[key];
          }
        }
      }
      profiles[profileId] = {
        ...userProfile,
        presets: fullPresets,
      };
    }

    // Populate the UI now that profiles are guaranteed to exist
    profileSelect.innerHTML = "";
    for (const id in profiles) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = profiles[id].name;
      profileSelect.appendChild(option);
    }
    profileSelect.value = currentProfileId;
    handleProfileChange();
  });
}

async function handleProfileChange() {
  const profileSelect = document.getElementById(
    "profile-select"
  ) as HTMLSelectElement;
  const presetSelect = document.getElementById(
    "preset-select"
  ) as HTMLSelectElement;
  const languageSelect = document.getElementById(
    "language-select"
    ) as HTMLSelectElement;
  currentProfileId = profileSelect.value;

  // Save the newly selected profile as the current one
  chrome.storage.sync.set({ currentProfile: currentProfileId });

  const profile = profiles[currentProfileId];

  if (profile && profile.presets) {
    presetSelect.innerHTML = "";
    for (const presetId in profile.presets) {
      const preset = profile.presets[presetId];
      const option = document.createElement("option");
      option.value = presetId;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
    presetSelect.value = profile.currentPreset;
  }
  if (profile) {
    languageSelect.innerHTML = "";
    try {
      const response = await fetch(chrome.runtime.getURL("assets/supported_languages.json"));
      const languages = await response.json();
      for (const language of languages) {
          const option = document.createElement("option");
          option.value = language;
          option.textContent = language;
          languageSelect.appendChild(option);
      }
      languageSelect.value = profile.language || "English";
    } catch (error) {
      console.error("Error loading languages:", error);
      // Fallback to a minimal list if loading fails
      const fallbackLanguages = ["English", "Spanish", "French"];
      for (const language of fallbackLanguages) {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
      }
    }
  }
}

function handlePresetChange() {
  const presetSelect = document.getElementById(
    "preset-select"
  ) as HTMLSelectElement;
  const selectedPresetId = presetSelect.value;

  // Update the currentPreset value for the active profile in storage
  const profileKey = `profile_${currentProfileId}`;
  chrome.storage.sync.get(profileKey, (data) => {
    if (data[profileKey]) {
      const profile = data[profileKey];
      profile.currentPreset = selectedPresetId;
      chrome.storage.sync.set({ [profileKey]: profile });
    }
  });
}

function handleLanguageChange() {
    const languageSelect = document.getElementById(
        "language-select"
    ) as HTMLSelectElement;
    const selectedLanguage = languageSelect.value;

    const profileKey = `profile_${currentProfileId}`;
    chrome.storage.sync.get(profileKey, (data) => {
        if (data[profileKey]) {
            const profile = data[profileKey];
            profile.language = selectedLanguage;
            chrome.storage.sync.set({ [profileKey]: profile });
        }
    });
}

/**
 * Main handler for the "Summarize" button click.
 */
async function handleSummarizeClick(): Promise<void> {
  const button = document.getElementById("summarize-btn") as HTMLButtonElement;
  const summaryContainer = document.getElementById(
    "summary-container"
  ) as HTMLDivElement;
  const profileSelect = document.getElementById(
    "profile-select"
  ) as HTMLSelectElement;
  const presetSelect = document.getElementById(
    "preset-select"
  ) as HTMLSelectElement;
    const languageSelect = document.getElementById(
    "language-select"
    ) as HTMLSelectElement;

  button.innerText = "⏳ Summarizing...";
  button.disabled = true;
  summaryContainer.style.display = "block";

  const metadata = getVideoMetadata();
  const initialMessage = getContextualLoadingMessage(
    metadata.videoTitle,
    metadata.channelName
  );
  updateSummaryContent(initialMessage);

  // Start loading messages
  const startTime = Date.now();
  if (loadingInterval) clearInterval(loadingInterval);
  loadingInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    updateSummaryContent(getProgressiveLoadingMessage(elapsed));
  }, 4000);

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
        profileId: profileSelect.value,
        presetId: presetSelect.value,
        language: languageSelect.value,
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
  if (loadingInterval) clearInterval(loadingInterval);
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
  if (loadingInterval) clearInterval(loadingInterval);
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

let currentVideoId: string | null = null;

function resetAndInjectUI() {
  const videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) {
    // Not a video page, do nothing.
    return;
  }

  const uiContainer = document.getElementById("summarize-ui-container");

  if (videoId !== currentVideoId) {
    // This is a new video page.
    currentVideoId = videoId;

    // Remove old UI if it exists from a previous page.
    if (uiContainer) {
      uiContainer.remove();
    }
    const summaryContainer = document.getElementById("summary-container");
    if (summaryContainer) {
      summaryContainer.remove();
    }

    // Inject fresh UI.
    injectSummarizeUI();
  } else {
    // This is the same video page.
    // Check if the UI is missing and needs to be re-injected.
    if (!uiContainer && document.querySelector("#below")) {
      injectSummarizeUI();
    }
  }
}

/**
 * Use a MutationObserver to detect when navigation to a new video page occurs.
 */
const observer = new MutationObserver(resetAndInjectUI);

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial run on page load
resetAndInjectUI();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_VIDEO_METADATA") {
    const metadata = getVideoMetadata();
    sendResponse({ payload: metadata });
  }
});
